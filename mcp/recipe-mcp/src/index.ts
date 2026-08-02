/**
 * recipe-mcp
 * MCP server exposing KitchenKit recipe tools to CulinaryOS AI.
 *
 * Tools:
 *   scale_recipe         — scale a recipe to a target base weight
 *   get_ratio            — get ratio of a specific ingredient from Supabase
 *   list_recipes         — list all recipes for the user / public
 *   generate_prep_list   — generate full mise en place prep list from a recipe
 *
 * Auth: uses KITCHENKIT_SUPABASE_SERVICE_KEY for server-side MCP access.
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl = process.env.KITCHENKIT_SUPABASE_URL;
const supabaseKey = process.env.KITCHENKIT_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[recipe-mcp] Missing KITCHENKIT_SUPABASE_URL or KITCHENKIT_SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const server = new McpServer({ name: 'recipe-mcp', version: '0.2.0' });

/** Helper to format dual outputs (Markdown + JSON) */
function formatDualOutput(markdown: string, jsonPayload: unknown) {
  const jsonBlock = `\`\`\`json\n${JSON.stringify(jsonPayload, null, 2)}\n\`\`\``;
  return `${markdown}\n\n${jsonBlock}`;
}

// ---------------------------------------------------------------------------
// scale_recipe
// ---------------------------------------------------------------------------
server.tool(
  'scale_recipe',
  'Scale a KitchenKit recipe to a target base ingredient weight. Returns ingredients with ratios and scaled amounts.',
  {
    recipe_id: z.string().trim().uuid().describe('UUID of the recipe to scale'),
    target_base_weight: z.number().positive().describe('Target weight of the base ingredient in grams (or yield unit)'),
    user_id: z.string().trim().uuid().optional().describe('Optional user UUID for scaling private recipes'),
  },
  async ({ recipe_id, target_base_weight, user_id }) => {
    // 1. Fetch recipe to check access and metadata
    const { data: recipe, error: recipeErr } = await supabase
      .from('recipes')
      .select('id, name, base_ingredient, yield_unit, user_id, is_public')
      .eq('id', recipe_id)
      .single();

    if (recipeErr || !recipe) {
      return {
        content: [{ type: 'text', text: `Error: Recipe with ID "${recipe_id}" was not found.` }],
        isError: true,
      };
    }

    if (!recipe.is_public && user_id && recipe.user_id !== user_id) {
      return {
        content: [{ type: 'text', text: `Error: Recipe "${recipe_id}" is private and does not belong to user "${user_id}".` }],
        isError: true,
      };
    }

    // 2. Fetch ingredients
    const { data: ingredients, error: ingErr } = await supabase
      .from('ingredients')
      .select('name, ratio, unit, sort_order')
      .eq('recipe_id', recipe_id)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (ingErr) {
      return {
        content: [{ type: 'text', text: `Error fetching recipe ingredients: ${ingErr.message}` }],
        isError: true,
      };
    }

    if (!ingredients || ingredients.length === 0) {
      return {
        content: [{ type: 'text', text: `Error: Recipe "${recipe.name}" (${recipe_id}) has no ingredients.` }],
        isError: true,
      };
    }

    const scaledIngredients = ingredients.map((ing) => {
      const ratioNum = Number(ing.ratio);
      const scaledAmount = Math.round(ratioNum * target_base_weight * 100) / 100;
      return {
        ingredient_name: ing.name,
        ratio: ratioNum,
        scaled_amount: scaledAmount,
        unit: ing.unit ?? 'g',
      };
    });

    const rowsMarkdown = scaledIngredients
      .map(
        (row) =>
          `| ${row.ingredient_name} | ${row.scaled_amount.toFixed(2)} | ${row.unit} | ${(row.ratio * 100).toFixed(1)}% |`
      )
      .join('\n');

    const markdown = [
      `### Scaled Recipe: ${recipe.name}`,
      `**Base Weight**: ${target_base_weight}${recipe.yield_unit ?? 'g'} ${recipe.base_ingredient}`,
      '',
      '| Ingredient | Scaled Amount | Unit | Baker\'s Ratio |',
      '| :--- | ---: | :--- | ---: |',
      rowsMarkdown,
    ].join('\n');

    const jsonPayload = {
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      base_ingredient: recipe.base_ingredient,
      target_base_weight,
      yield_unit: recipe.yield_unit ?? 'g',
      ingredients: scaledIngredients,
    };

    return {
      content: [{ type: 'text', text: formatDualOutput(markdown, jsonPayload) }],
    };
  }
);

// ---------------------------------------------------------------------------
// get_ratio
// ---------------------------------------------------------------------------
server.tool(
  'get_ratio',
  'Get the ratio of a specific ingredient in a KitchenKit recipe.',
  {
    recipe_id: z.string().trim().uuid().describe('UUID of the recipe'),
    ingredient_name: z.string().trim().min(1).describe('Name of the ingredient (case-insensitive)'),
  },
  async ({ recipe_id, ingredient_name }) => {
    const { data: recipe, error: recipeErr } = await supabase
      .from('recipes')
      .select('name')
      .eq('id', recipe_id)
      .single();

    if (recipeErr || !recipe) {
      return {
        content: [{ type: 'text', text: `Error: Recipe with ID "${recipe_id}" was not found.` }],
        isError: true,
      };
    }

    const { data, error } = await supabase
      .from('ingredients')
      .select('name, ratio, unit')
      .eq('recipe_id', recipe_id)
      .ilike('name', ingredient_name)
      .single();

    if (error || !data) {
      return {
        content: [{ type: 'text', text: `Error: Ingredient "${ingredient_name}" not found in recipe "${recipe.name}" (${recipe_id}).` }],
        isError: true,
      };
    }

    const ratioNum = Number(data.ratio);
    const percentage = `${(ratioNum * 100).toFixed(2)}%`;

    const markdown = [
      `### Ingredient Ratio: ${data.name}`,
      `**Recipe**: ${recipe.name}`,
      `**Ratio**: ${ratioNum} (${percentage})`,
      `**Unit**: ${data.unit ?? 'g'}`,
    ].join('\n');

    const jsonPayload = {
      recipe_id,
      recipe_name: recipe.name,
      ingredient_name: data.name,
      ratio: ratioNum,
      percentage,
      unit: data.unit ?? 'g',
    };

    return {
      content: [{ type: 'text', text: formatDualOutput(markdown, jsonPayload) }],
    };
  }
);

// ---------------------------------------------------------------------------
// list_recipes
// ---------------------------------------------------------------------------
server.tool(
  'list_recipes',
  'List KitchenKit recipes with optional tag filtering.',
  {
    tag: z.string().trim().min(1).optional().describe('Filter by tag (e.g. "bread", "sauce")'),
    limit: z.number().int().min(1).max(100).optional().default(20).describe('Max results to return'),
  },
  async ({ tag, limit }) => {
    let query = supabase
      .from('recipes')
      .select('id, name, base_ingredient, yield_unit, tags, is_public, created_at')
      .order('created_at', { ascending: false })
      .limit(limit ?? 20);

    if (tag) {
      query = query.contains('tags', [tag]);
    }

    const { data, error } = await query;

    if (error) {
      return { content: [{ type: 'text', text: `Error querying recipes: ${error.message}` }], isError: true };
    }

    if (!data || data.length === 0) {
      const msg = tag ? `No recipes found with tag "${tag}".` : 'No recipes found.';
      const markdown = `### Recipe Directory\n\n${msg}`;
      return {
        content: [{ type: 'text', text: formatDualOutput(markdown, []) }],
      };
    }

    const rowsMarkdown = data
      .map((r) => {
        const tagList = Array.isArray(r.tags) && r.tags.length > 0 ? r.tags.join(', ') : '—';
        const access = r.is_public ? 'Public' : 'Private';
        return `| \`${r.id.slice(0, 8)}...\` | ${r.name} | ${r.base_ingredient} | ${tagList} | ${access} |`;
      })
      .join('\n');

    const markdown = [
      '### Recipe Directory',
      `Found ${data.length} recipe(s)${tag ? ` matching tag "${tag}"` : ''}.`,
      '',
      '| ID | Recipe Name | Base Ingredient | Tags | Access |',
      '| :--- | :--- | :--- | :--- | :--- |',
      rowsMarkdown,
    ].join('\n');

    return {
      content: [{ type: 'text', text: formatDualOutput(markdown, data) }],
    };
  }
);

// ---------------------------------------------------------------------------
// generate_prep_list
// ---------------------------------------------------------------------------
server.tool(
  'generate_prep_list',
  'Generate a full mise en place prep list for a recipe at a given base weight.',
  {
    recipe_id: z.string().trim().uuid().describe('UUID of the recipe'),
    target_base_weight: z.number().positive().describe('Target base ingredient weight in grams'),
    label: z.string().trim().min(1).optional().describe('Optional label for the prep list (e.g. "Saturday Brunch")'),
    user_id: z.string().trim().uuid().optional().describe('Optional user UUID for scaling private recipes'),
  },
  async ({ recipe_id, target_base_weight, label, user_id }) => {
    const { data: recipe, error: recipeErr } = await supabase
      .from('recipes')
      .select('id, name, base_ingredient, yield_unit, user_id, is_public')
      .eq('id', recipe_id)
      .single();

    if (recipeErr || !recipe) {
      return {
        content: [{ type: 'text', text: `Error: Recipe with ID "${recipe_id}" was not found.` }],
        isError: true,
      };
    }

    if (!recipe.is_public && user_id && recipe.user_id !== user_id) {
      return {
        content: [{ type: 'text', text: `Error: Recipe "${recipe_id}" is private and does not belong to user "${user_id}".` }],
        isError: true,
      };
    }

    const { data: ingredients, error: ingErr } = await supabase
      .from('ingredients')
      .select('name, ratio, unit, sort_order')
      .eq('recipe_id', recipe_id)
      .order('sort_order', { ascending: true })
      .order('name', { ascending: true });

    if (ingErr) {
      return {
        content: [{ type: 'text', text: `Error fetching recipe ingredients: ${ingErr.message}` }],
        isError: true,
      };
    }

    if (!ingredients || ingredients.length === 0) {
      return {
        content: [{ type: 'text', text: `Error: Recipe "${recipe.name}" (${recipe_id}) has no ingredients.` }],
        isError: true,
      };
    }

    const scaledItems = ingredients.map((ing) => {
      const ratioNum = Number(ing.ratio);
      const scaledAmount = Math.round(ratioNum * target_base_weight * 100) / 100;
      return {
        ingredient_name: ing.name,
        scaled_amount: scaledAmount,
        unit: ing.unit ?? 'g',
      };
    });

    const headerText = label ? `Mise en Place — ${label}` : `Mise en Place — ${recipe.name}`;
    const checklistMarkdown = scaledItems
      .map((item) => `- [ ] **${item.ingredient_name}**: ${item.scaled_amount}${item.unit}`)
      .join('\n');

    const markdown = [
      `### ${headerText}`,
      `**Recipe**: ${recipe.name} · **Target Base**: ${target_base_weight}${recipe.yield_unit ?? 'g'} ${recipe.base_ingredient}`,
      '',
      checklistMarkdown,
      '',
      `*Total ingredients: ${scaledItems.length}*`,
    ].join('\n');

    const jsonPayload = {
      label: label ?? null,
      recipe_id: recipe.id,
      recipe_name: recipe.name,
      base_ingredient: recipe.base_ingredient,
      target_base_weight,
      yield_unit: recipe.yield_unit ?? 'g',
      items: scaledItems,
    };

    return {
      content: [{ type: 'text', text: formatDualOutput(markdown, jsonPayload) }],
    };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
