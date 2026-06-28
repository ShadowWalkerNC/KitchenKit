/**
 * recipe-mcp
 * MCP server exposing KitchenKit recipe tools to CulinaryOS AI.
 *
 * Tools:
 *   scale_recipe         — scale a recipe to a target base weight via Supabase RPC
 *   get_ratio            — get ratio of a specific ingredient from Supabase
 *   list_recipes         — list all recipes for the authenticated user
 *   generate_prep_list   — generate full mise en place from a recipe
 *
 * Auth: uses KITCHENKIT_SERVICE_ROLE_KEY for server-side MCP access.
 * The calling AI agent must pass user_id in tool arguments for RLS enforcement
 * (or use the service role with explicit user scoping).
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { createClient } from '@supabase/supabase-js';
import { z } from 'zod';

const supabaseUrl     = process.env.KITCHENKIT_SUPABASE_URL;
const supabaseKey     = process.env.KITCHENKIT_SUPABASE_SERVICE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('[recipe-mcp] Missing KITCHENKIT_SUPABASE_URL or KITCHENKIT_SUPABASE_SERVICE_KEY');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey, {
  auth: { persistSession: false },
});

const server = new McpServer({ name: 'recipe-mcp', version: '0.2.0' });

// ---------------------------------------------------------------------------
// scale_recipe
// ---------------------------------------------------------------------------
server.tool(
  'scale_recipe',
  'Scale a KitchenKit recipe to a target base ingredient weight. Returns each ingredient with its ratio and scaled amount.',
  {
    recipe_id:           z.string().uuid().describe('UUID of the recipe to scale'),
    target_base_weight:  z.number().positive().describe('Target weight of the base ingredient in grams (or yield unit)'),
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
      return { content: [{ type: 'text', text: `No recipe found with ID ${recipe_id}, or it has no ingredients.` }] };
    }

    const lines = [
      `Scaled recipe (base weight: ${target_base_weight}g):`,
      '',
      ...data.map((row: { ingredient_name: string; ratio: number; scaled_amount: number; unit: string }) =>
        `  ${row.ingredient_name.padEnd(24)} ${String(row.scaled_amount).padStart(8)}${row.unit}   (${(row.ratio * 100).toFixed(1)}%)`
      ),
    ];

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }
);

// ---------------------------------------------------------------------------
// get_ratio
// ---------------------------------------------------------------------------
server.tool(
  'get_ratio',
  'Get the ratio of a specific ingredient in a KitchenKit recipe.',
  {
    recipe_id:       z.string().uuid().describe('UUID of the recipe'),
    ingredient_name: z.string().describe('Name of the ingredient (case-insensitive)'),
  },
  async ({ recipe_id, ingredient_name }) => {
    const { data, error } = await supabase
      .from('ingredients')
      .select('name, ratio, unit')
      .eq('recipe_id', recipe_id)
      .ilike('name', ingredient_name)
      .single();

    if (error || !data) {
      return {
        content: [{ type: 'text', text: `Ingredient "${ingredient_name}" not found in recipe ${recipe_id}.` }],
      };
    }

    return {
      content: [{
        type: 'text',
        text: `${data.name}: ratio = ${data.ratio} (${(Number(data.ratio) * 100).toFixed(2)}%) · unit: ${data.unit}`,
      }],
    };
  }
);

// ---------------------------------------------------------------------------
// list_recipes
// ---------------------------------------------------------------------------
server.tool(
  'list_recipes',
  'List all KitchenKit recipes. Optionally filter by tag.',
  {
    tag:     z.string().optional().describe('Filter by tag (e.g. "bread", "sauce")'),
    limit:   z.number().int().min(1).max(100).optional().default(20).describe('Max results to return'),
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
      return { content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true };
    }

    if (!data || data.length === 0) {
      return { content: [{ type: 'text', text: 'No recipes found.' }] };
    }

    const lines = [
      `${data.length} recipe(s) found:`,
      '',
      ...data.map((r: { id: string; name: string; base_ingredient: string; tags: string[]; is_public: boolean }) =>
        `  [${r.id}] ${r.name}  (base: ${r.base_ingredient})${
          r.tags.length ? '  tags: ' + r.tags.join(', ') : ''
        }${r.is_public ? '  [public]' : ''}`
      ),
    ];

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }
);

// ---------------------------------------------------------------------------
// generate_prep_list
// ---------------------------------------------------------------------------
server.tool(
  'generate_prep_list',
  'Generate a full mise en place prep list for a recipe at a given base weight.',
  {
    recipe_id:          z.string().uuid().describe('UUID of the recipe'),
    target_base_weight: z.number().positive().describe('Target base ingredient weight in grams'),
    label:              z.string().optional().describe('Optional label for the prep list (e.g. "Saturday Brunch")'),
  },
  async ({ recipe_id, target_base_weight, label }) => {
    // Fetch recipe name + scaled ingredients in one RPC call
    const [recipeRes, scaledRes] = await Promise.all([
      supabase.from('recipes').select('name, base_ingredient, yield_unit').eq('id', recipe_id).single(),
      supabase.rpc('scale_recipe', { p_recipe_id: recipe_id, p_target_base_weight: target_base_weight }),
    ]);

    if (recipeRes.error || !recipeRes.data) {
      return { content: [{ type: 'text', text: `Recipe ${recipe_id} not found.` }] };
    }
    if (scaledRes.error) {
      return { content: [{ type: 'text', text: `Error scaling recipe: ${scaledRes.error.message}` }], isError: true };
    }

    const recipe   = recipeRes.data;
    const scaled   = scaledRes.data ?? [];
    const heading  = label ? `Mise en Place — ${label}` : `Mise en Place — ${recipe.name}`;
    const subhead  = `Recipe: ${recipe.name} · Base: ${target_base_weight}${recipe.yield_unit} ${recipe.base_ingredient}`;

    const lines = [
      heading,
      subhead,
      '─'.repeat(48),
      ...scaled.map((row: { ingredient_name: string; scaled_amount: number; unit: string }) =>
        `  □  ${row.ingredient_name.padEnd(24)} ${String(row.scaled_amount).padStart(8)}${row.unit}`
      ),
      '─'.repeat(48),
      `Total ingredients: ${scaled.length}`,
    ];

    return { content: [{ type: 'text', text: lines.join('\n') }] };
  }
);

const transport = new StdioServerTransport();
await server.connect(transport);
