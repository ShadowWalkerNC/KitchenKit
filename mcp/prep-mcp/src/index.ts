/**
 * prep-mcp
 * MCP server exposing KitchenKit shift prep tools to CulinaryOS AI.
 *
 * Tools:
 *   build_shift_prep    — build a shift prep plan from par levels via Supabase RPC
 *   save_prep_plan      — persist a prep plan to the database
 *   complete_prep_item  — mark a single prep plan item as done
 *   get_mise_en_place   — get scaled mise en place for a recipe
 *   project_batch_size  — project batch size needed for a given cover count
 *   update_stock        — update current stock level for a par item
 *
 * Auth: uses KITCHENKIT_SUPABASE_SERVICE_KEY for server-side MCP access.
 */

import { projectBatchSize } from '@kitchenkit/prep-engine';
import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl = process.env.KITCHENKIT_SUPABASE_URL;
const supabaseKey = process.env.KITCHENKIT_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[prep-mcp] Missing KITCHENKIT_SUPABASE_URL or KITCHENKIT_SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const server = new McpServer({ name: 'prep-mcp', version: '0.3.0' });

/** Helper to format dual outputs (Markdown + JSON) */
function formatDualOutput(markdown: string, jsonPayload: unknown) {
  const jsonBlock = `\`\`\`json\n${JSON.stringify(jsonPayload, null, 2)}\n\`\`\``;
  return `${markdown}\n\n${jsonBlock}`;
}

const CANONICAL_SHIFTS = ['AM', 'PM', 'Brunch', 'Dinner', 'Overnight', 'Custom'] as const;
type CanonicalShift = (typeof CANONICAL_SHIFTS)[number];

/** Normalize shift input strings (e.g. "morning" -> "AM", "evening" -> "Dinner") */
function normalizeShift(val: unknown): CanonicalShift {
  if (typeof val !== 'string') return 'Custom';
  const trimmed = val.trim();
  const lower = trimmed.toLowerCase();

  switch (lower) {
    case 'am':
    case 'morning':
    case 'breakfast':
    case 'early':
      return 'AM';
    case 'pm':
    case 'afternoon':
    case 'midday':
    case 'lunch':
      return 'PM';
    case 'brunch':
      return 'Brunch';
    case 'dinner':
    case 'evening':
    case 'night':
    case 'supper':
      return 'Dinner';
    case 'overnight':
    case 'graveyard':
    case 'late':
      return 'Overnight';
    case 'custom':
      return 'Custom';
    default: {
      const match = CANONICAL_SHIFTS.find((s) => s.toLowerCase() === lower);
      if (match) return match;
      return 'Custom';
    }
  }
}

const shiftSchema = z.preprocess(
  normalizeShift,
  z.enum(CANONICAL_SHIFTS).describe("Shift name ('AM', 'PM', 'Brunch', 'Dinner', 'Overnight', 'Custom'; also accepts 'morning', 'afternoon', 'evening', etc.)")
);

// ---------------------------------------------------------------------------
// build_shift_prep
// ---------------------------------------------------------------------------
server.tool(
  'build_shift_prep',
  'Build a shift prep plan from par levels. Returns items currently below par that need to be prepared.',
  {
    user_id: z.string().trim().uuid().describe('KitchenKit user UUID'),
    shift: shiftSchema,
    date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional().describe('Date YYYY-MM-DD (defaults to today)'),
  },
  async ({ user_id, shift, date }) => {
    const planDate = date ?? new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase.rpc('build_shift_prep', {
      p_user_id: user_id,
      p_shift: shift,
      p_date: planDate,
    });

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    if (!data || data.length === 0) {
      const markdown = `### ${shift} Prep Plan — ${planDate}\n\nAll items are at par! Nothing to prep. ✅`;
      const jsonPayload = {
        user_id,
        shift,
        date: planDate,
        total_items: 0,
        items: [],
      };
      return {
        content: [{ type: 'text', text: formatDualOutput(markdown, jsonPayload) }],
      };
    }

    const rowsMarkdown = data
      .map(
        (row: {
          ingredient_name: string;
          current_stock: number;
          par_amount: number;
          prep_amount: number;
          unit: string;
        }) =>
          `| ${row.ingredient_name} | ${Number(row.current_stock).toFixed(2)} | ${Number(row.par_amount).toFixed(2)} | +${Number(row.prep_amount).toFixed(2)} | ${row.unit} |`
      )
      .join('\n');

    const markdown = [
      `### ${shift} Prep Plan — ${planDate}`,
      `Found ${data.length} item(s) below par.`,
      '',
      '| Ingredient | Stock | Par Level | Needed Prep | Unit |',
      '| :--- | ---: | ---: | ---: | :--- |',
      rowsMarkdown,
    ].join('\n');

    const jsonPayload = {
      user_id,
      shift,
      date: planDate,
      total_items: data.length,
      items: data.map(
        (r: {
          ingredient_name: string;
          current_stock: number;
          par_amount: number;
          prep_amount: number;
          unit: string;
        }) => ({
          ingredient_name: r.ingredient_name,
          current_stock: Number(r.current_stock),
          par_amount: Number(r.par_amount),
          prep_amount: Number(r.prep_amount),
          unit: r.unit,
        })
      ),
    };

    return {
      content: [{ type: 'text', text: formatDualOutput(markdown, jsonPayload) }],
    };
  }
);

// ---------------------------------------------------------------------------
// save_prep_plan
// ---------------------------------------------------------------------------
server.tool(
  'save_prep_plan',
  'Persist a prep plan to the database. Upserts the plan header and replaces undone items.',
  {
    user_id: z.string().trim().uuid().describe('KitchenKit user UUID'),
    shift: shiftSchema,
    date: z.string().trim().regex(/^\d{4}-\d{2}-\d{2}$/, 'Date must be YYYY-MM-DD').optional().describe('Date YYYY-MM-DD (defaults to today)'),
    items: z
      .array(
        z.object({
          ingredient_name: z.string().trim().min(1),
          prep_amount: z.number().positive(),
          unit: z.string().trim().min(1),
        })
      )
      .describe('Items to prep'),
  },
  async ({ user_id, shift, date, items }) => {
    const planDate = date ?? new Date().toISOString().slice(0, 10);

    const { data: plan, error: planErr } = await supabase
      .from('prep_plans')
      .upsert({ user_id, shift, plan_date: planDate }, { onConflict: 'user_id,shift,plan_date' })
      .select()
      .single();

    if (planErr) {
      return { content: [{ type: 'text', text: `Error upserting plan: ${planErr.message}` }], isError: true };
    }

    const { error: delErr } = await supabase
      .from('prep_plan_items')
      .delete()
      .eq('plan_id', plan.id)
      .eq('is_done', false);

    if (delErr) {
      return { content: [{ type: 'text', text: `Error clearing previous prep items: ${delErr.message}` }], isError: true };
    }

    if (items.length > 0) {
      const { error: insErr } = await supabase
        .from('prep_plan_items')
        .insert(items.map((item) => ({ ...item, plan_id: plan.id })));

      if (insErr) {
        return { content: [{ type: 'text', text: `Error inserting prep items: ${insErr.message}` }], isError: true };
      }
    }

    const markdown = [
      '### Shift Prep Plan Saved',
      `**Shift**: ${shift}`,
      `**Date**: ${planDate}`,
      `**Plan ID**: \`${plan.id}\``,
      `**Queued Items**: ${items.length}`,
    ].join('\n');

    const jsonPayload = {
      plan_id: plan.id,
      user_id,
      shift,
      date: planDate,
      items_count: items.length,
      items,
    };

    return {
      content: [{ type: 'text', text: formatDualOutput(markdown, jsonPayload) }],
    };
  }
);

// ---------------------------------------------------------------------------
// complete_prep_item
// ---------------------------------------------------------------------------
server.tool(
  'complete_prep_item',
  'Mark a single prep plan item as done. Returns updated plan progress (done / total).',
  {
    item_id: z.string().trim().uuid().describe('UUID of the prep_plan_items row to mark done'),
  },
  async ({ item_id }) => {
    const { data: item, error: itemErr } = await supabase
      .from('prep_plan_items')
      .update({ is_done: true, done_at: new Date().toISOString() })
      .eq('id', item_id)
      .select('plan_id, ingredient_name, prep_amount, unit')
      .single();

    if (itemErr || !item) {
      return { content: [{ type: 'text', text: `Error: Prep item with ID "${item_id}" not found or failed to update.` }], isError: true };
    }

    const { data: allItems, error: progErr } = await supabase
      .from('prep_plan_items')
      .select('is_done')
      .eq('plan_id', item.plan_id);

    if (progErr) {
      return { content: [{ type: 'text', text: `Error fetching plan progress: ${progErr.message}` }], isError: true };
    }

    const total = allItems?.length ?? 1;
    const done = allItems?.filter((r: { is_done: boolean }) => r.is_done).length ?? 1;
    const allDone = done === total;
    const percent = Math.round((done / total) * 100);

    const markdown = [
      '### Prep Item Completed',
      `✅ Marked **${item.ingredient_name}** done (+${item.prep_amount}${item.unit}).`,
      `**Progress**: ${done}/${total} items complete (${percent}%).`,
      allDone ? '🎉 All items done — shift prep complete!' : '',
    ].filter(Boolean).join('\n');

    const jsonPayload = {
      item_id,
      plan_id: item.plan_id,
      ingredient_name: item.ingredient_name,
      prep_amount: Number(item.prep_amount),
      unit: item.unit,
      progress: {
        completed: done,
        total,
        percentage: percent,
        all_done: allDone,
      },
    };

    return {
      content: [{ type: 'text', text: formatDualOutput(markdown, jsonPayload) }],
    };
  }
);

// ---------------------------------------------------------------------------
// get_mise_en_place
// ---------------------------------------------------------------------------
server.tool(
  'get_mise_en_place',
  'Get a formatted mise en place checklist for a recipe at a given batch size.',
  {
    recipe_id: z.string().trim().uuid().describe('UUID of the recipe'),
    target_base_weight: z.number().positive().describe('Target base weight in grams'),
    user_id: z.string().trim().uuid().optional().describe('Optional user UUID for scaling private recipes'),
  },
  async ({ recipe_id, target_base_weight, user_id }) => {
    const { data: recipe, error: recipeErr } = await supabase
      .from('recipes')
      .select('id, name, base_ingredient, yield_unit, user_id, is_public')
      .eq('id', recipe_id)
      .single();

    if (recipeErr || !recipe) {
      return { content: [{ type: 'text', text: `Error: Recipe with ID "${recipe_id}" was not found.` }], isError: true };
    }

    if (!recipe.is_public && user_id && recipe.user_id !== user_id) {
      return { content: [{ type: 'text', text: `Error: Recipe "${recipe_id}" is private and does not belong to user "${user_id}".` }], isError: true };
    }

    const { data: ingredients, error: ingErr } = await supabase
      .from('ingredients')
      .select('name, ratio, unit, sort_order')
      .eq('recipe_id', recipe_id)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (ingErr) {
      return { content: [{ type: 'text', text: `Error fetching recipe ingredients: ${ingErr.message}` }], isError: true };
    }

    if (!ingredients || ingredients.length === 0) {
      return { content: [{ type: 'text', text: `Error: Recipe "${recipe.name}" (${recipe_id}) has no ingredients.` }], isError: true };
    }

    const items = ingredients.map((ing) => {
      const ratioNum = Number(ing.ratio);
      const scaledAmount = Math.round(ratioNum * target_base_weight * 100) / 100;
      return {
        ingredient_name: ing.name,
        scaled_amount: scaledAmount,
        unit: ing.unit ?? 'g',
      };
    });

    const checklistMarkdown = items
      .map((item) => `- [ ] **${item.ingredient_name}**: ${item.scaled_amount}${item.unit}`)
      .join('\n');

    const markdown = [
      `### Mise en Place — ${recipe.name}`,
      `**Target Base**: ${target_base_weight}${recipe.yield_unit ?? 'g'} ${recipe.base_ingredient}`,
      '',
      checklistMarkdown,
      '',
      `*Total ingredients: ${items.length}*`,
    ].join('\n');

    const jsonPayload = {
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      target_base_weight,
      yield_unit: recipe.yield_unit ?? 'g',
      ingredients: items,
    };

    return {
      content: [{ type: 'text', text: formatDualOutput(markdown, jsonPayload) }],
    };
  }
);

// ---------------------------------------------------------------------------
// project_batch_size
// ---------------------------------------------------------------------------
server.tool(
  'project_batch_size',
  'Project the batch size needed to serve a given number of covers, with an optional waste factor.',
  {
    portion_weight: z.number().positive().describe('Portion weight per cover in grams (or yield unit)'),
    covers: z.number().int().min(1).describe('Number of covers (guests) to serve'),
    waste_factor: z.number().min(1).max(3).optional().default(1.1).describe('Waste buffer multiplier (default 1.1 = 10%)'),
  },
  async ({ portion_weight, covers, waste_factor }) => {
    const wf = waste_factor ?? 1.1;
    const rawBatch = portion_weight * covers;
    const bufferedBatch = projectBatchSize(portion_weight, covers, wf);

    const bufferPercent = Math.round((wf - 1) * 100);

    const markdown = [
      '### Batch Size Projection',
      `- **Covers**: ${covers}`,
      `- **Portion Weight**: ${portion_weight}g`,
      `- **Waste Buffer**: ${bufferPercent}% (×${wf})`,
      `- **Raw Requirement**: ${rawBatch.toFixed(1)}g`,
      `- **Recommended Buffered Batch**: **${bufferedBatch.toFixed(1)}g**`,
    ].join('\n');

    const jsonPayload = {
      covers,
      portion_weight,
      waste_factor: wf,
      waste_buffer_percent: bufferPercent,
      raw_batch: Math.round(rawBatch * 100) / 100,
      buffered_batch: Math.round(bufferedBatch * 100) / 100,
    };

    return {
      content: [{ type: 'text', text: formatDualOutput(markdown, jsonPayload) }],
    };
  }
);

// ---------------------------------------------------------------------------
// update_stock
// ---------------------------------------------------------------------------
server.tool(
  'update_stock',
  'Update the current stock level for a par item by ingredient name.',
  {
    user_id: z.string().trim().uuid().describe('KitchenKit user UUID'),
    ingredient_name: z.string().trim().min(1).describe('Name of the par item to update (case-insensitive)'),
    current_stock: z.number().min(0).describe('New current stock value'),
  },
  async ({ user_id, ingredient_name, current_stock }) => {
    const { error, count } = await supabase
      .from('par_levels')
      .update({ current_stock }, { count: 'exact' })
      .eq('user_id', user_id)
      .ilike('ingredient_name', ingredient_name);

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    if (!count || count === 0) {
      return {
        content: [{ type: 'text', text: `Error: No par item found matching "${ingredient_name}" for user ${user_id}.` }],
        isError: true,
      };
    }

    const markdown = [
      '### Stock Updated',
      `Updated stock for **${ingredient_name}** to **${current_stock}**. Par levels refreshed.`,
    ].join('\n');

    const jsonPayload = {
      user_id,
      ingredient_name,
      current_stock,
      updated_rows: count,
    };

    return {
      content: [{ type: 'text', text: formatDualOutput(markdown, jsonPayload) }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
