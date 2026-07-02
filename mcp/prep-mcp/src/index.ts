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
 */

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

// ---------------------------------------------------------------------------
// build_shift_prep
// ---------------------------------------------------------------------------
server.tool(
  'build_shift_prep',
  'Build a shift prep plan from par levels. Returns only items currently below par that need to be prepared.',
  {
    user_id: z.string().uuid().describe('KitchenKit user UUID'),
    shift:   z.enum(['AM', 'PM', 'Brunch', 'Dinner', 'Overnight', 'Custom']).describe('Shift name'),
    date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Date YYYY-MM-DD (defaults to today)'),
  },
  async ({ user_id, shift, date }) => {
    const planDate = date ?? new Date().toISOString().slice(0, 10);

    const { data, error } = await supabase.rpc('build_shift_prep', {
      p_user_id: user_id,
      p_shift:   shift,
      p_date:    planDate,
    });

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    if (!data || data.length === 0) {
      return {
        content: [{ type: 'text', text: `All items are at par for the ${shift} shift on ${planDate}. Nothing to prep! ✅` }],
      };
    }

    const lines = [
      `${shift} Prep Plan — ${planDate}`,
      `${data.length} item(s) below par:`,
      '',
      '  Item                      Stock    Par    Prep    Unit',
      '  ' + '─'.repeat(52),
      ...data.map((row: {
        ingredient_name: string;
        current_stock: number;
        par_amount: number;
        prep_amount: number;
        unit: string;
      }) =>
        `  ${row.ingredient_name.padEnd(26)}` +
        `${String(row.current_stock).padStart(6)}` +
        `${String(row.par_amount).padStart(7)}` +
        `  +${String(row.prep_amount).padStart(5)}` +
        `    ${row.unit}`
      ),
    ];

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }
);

// ---------------------------------------------------------------------------
// save_prep_plan
// ---------------------------------------------------------------------------
server.tool(
  'save_prep_plan',
  'Persist a prep plan to the database. Upserts the plan header and replaces undone items. Returns the plan ID.',
  {
    user_id: z.string().uuid().describe('KitchenKit user UUID'),
    shift:   z.enum(['AM', 'PM', 'Brunch', 'Dinner', 'Overnight', 'Custom']).describe('Shift name'),
    date:    z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Date YYYY-MM-DD (defaults to today)'),
    items:   z.array(z.object({
      ingredient_name: z.string(),
      prep_amount:     z.number().positive(),
      unit:            z.string(),
    })).describe('Items to prep'),
  },
  async ({ user_id, shift, date, items }) => {
    const planDate = date ?? new Date().toISOString().slice(0, 10);

    const { data: plan, error: planErr } = await supabase
      .from('prep_plans')
      .upsert(
        { user_id, shift, plan_date: planDate },
        { onConflict: 'user_id,shift,plan_date' }
      )
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
      return { content: [{ type: 'text', text: `Error clearing items: ${delErr.message}` }], isError: true };
    }

    if (items.length > 0) {
      const { error: insErr } = await supabase
        .from('prep_plan_items')
        .insert(items.map(item => ({ ...item, plan_id: plan.id })));

      if (insErr) {
        return { content: [{ type: 'text', text: `Error inserting items: ${insErr.message}` }], isError: true };
      }
    }

    return {
      content: [{
        type: 'text',
        text: `Saved ${shift} prep plan for ${planDate}. Plan ID: ${plan.id}. ${items.length} item(s) queued.`,
      }],
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
    item_id: z.string().uuid().describe('UUID of the prep_plan_items row to mark done'),
  },
  async ({ item_id }) => {
    // Mark the item done
    const { data: item, error: itemErr } = await supabase
      .from('prep_plan_items')
      .update({ is_done: true, done_at: new Date().toISOString() })
      .eq('id', item_id)
      .select('plan_id, ingredient_name, prep_amount, unit')
      .single();

    if (itemErr) {
      return { content: [{ type: 'text', text: `Error: ${itemErr.message}` }], isError: true };
    }

    // Fetch plan progress summary
    const { data: allItems, error: progErr } = await supabase
      .from('prep_plan_items')
      .select('is_done')
      .eq('plan_id', item.plan_id);

    if (progErr) {
      return {
        content: [{
          type: 'text',
          text: `✅ Marked "${item.ingredient_name}" done (+${item.prep_amount}${item.unit}).`,
        }],
      };
    }

    const total = allItems?.length ?? 0;
    const done  = allItems?.filter((r: { is_done: boolean }) => r.is_done).length ?? 0;
    const allDone = done === total;

    return {
      content: [{
        type: 'text',
        text: [
          `✅ Marked "${item.ingredient_name}" done (+${item.prep_amount}${item.unit}).`,
          `Progress: ${done}/${total} items complete.`,
          allDone ? '🎉 All items done — shift prep complete!' : '',
        ].filter(Boolean).join('\n'),
      }],
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
    recipe_id:          z.string().uuid().describe('UUID of the recipe'),
    target_base_weight: z.number().positive().describe('Target base weight in grams'),
  },
  async ({ recipe_id, target_base_weight }) => {
    const { data, error } = await supabase.rpc('scale_recipe', {
      p_recipe_id:          recipe_id,
      p_target_base_weight: target_base_weight,
    });

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    if (!data || data.length === 0) {
      return { content: [{ type: 'text', text: `No ingredients found for recipe ${recipe_id}.` }] };
    }

    const lines = [
      `Mise en Place (base: ${target_base_weight}g)`,
      '─'.repeat(40),
      ...data.map((row: { ingredient_name: string; scaled_amount: number; unit: string }) =>
        `  □  ${row.ingredient_name.padEnd(24)} ${String(row.scaled_amount).padStart(8)}${row.unit}`
      ),
    ];

    return { content: [{ type: 'text', text: lines.join('\n') }] };
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
    covers:         z.number().int().min(1).describe('Number of covers (guests) to serve'),
    waste_factor:   z.number().min(1).max(2).optional().default(1.1).describe('Waste buffer multiplier (default 1.1 = 10%)'),
  },
  async ({ portion_weight, covers, waste_factor }) => {
    const wf            = waste_factor ?? 1.1;
    const rawBatch      = portion_weight * covers;
    const bufferedBatch = rawBatch * wf;

    const lines = [
      `Batch Projection`,
      `  Covers:           ${covers}`,
      `  Portion weight:   ${portion_weight}g`,
      `  Waste factor:     ×${wf} (${((wf - 1) * 100).toFixed(0)}% buffer)`,
      `  Raw batch:        ${rawBatch.toFixed(1)}g`,
      `  Buffered batch:   ${bufferedBatch.toFixed(1)}g  ← use this`,
    ];

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }
);

// ---------------------------------------------------------------------------
// update_stock
// ---------------------------------------------------------------------------
server.tool(
  'update_stock',
  'Update the current stock level for a par item by ingredient name.',
  {
    user_id:         z.string().uuid().describe('KitchenKit user UUID'),
    ingredient_name: z.string().describe('Name of the par item to update (case-insensitive)'),
    current_stock:   z.number().min(0).describe('New current stock value'),
  },
  async ({ user_id, ingredient_name, current_stock }) => {
    const { error, count } = await supabase
      .from('par_levels')
      .update({ current_stock })
      .eq('user_id', user_id)
      .ilike('ingredient_name', ingredient_name);

    if (error) {
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    if (!count || count === 0) {
      return {
        content: [{ type: 'text', text: `No par item found matching "${ingredient_name}" for this user.` }],
      };
    }

    return {
      content: [{
        type: 'text',
        text: `Updated "${ingredient_name}" stock to ${current_stock}. Par levels refreshed.`,
      }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
