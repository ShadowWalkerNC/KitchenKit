/**
 * recipe-mcp
 * MCP server exposing KitchenKit recipe tools to CulinaryOS AI.
 *
 * Tools: scale_recipe · get_ratio · list_recipes · generate_prep_list
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({ name: 'recipe-mcp', version: '0.1.0' });

server.tool(
  'scale_recipe',
  'Scale a recipe to a target base ingredient weight.',
  {
    recipe_id: z.string().describe('The recipe ID'),
    target_base_weight: z.number().describe('Target base weight in grams'),
  },
  async ({ recipe_id, target_base_weight }) => ({
    content: [{ type: 'text', text: `[stub] Scaled recipe ${recipe_id} to ${target_base_weight}g.` }],
  })
);

server.tool(
  'get_ratio',
  'Get the ratio of a specific ingredient in a recipe.',
  { recipe_id: z.string(), ingredient_name: z.string() },
  async ({ recipe_id, ingredient_name }) => ({
    content: [{ type: 'text', text: `[stub] Ratio for ${ingredient_name} in recipe ${recipe_id}.` }],
  })
);

server.tool(
  'list_recipes',
  'List all available recipes.',
  {},
  async () => ({
    content: [{ type: 'text', text: '[stub] Recipe list from Supabase.' }],
  })
);

server.tool(
  'generate_prep_list',
  'Generate mise en place for a recipe at a given batch size.',
  {
    recipe_id: z.string(),
    target_base_weight: z.number(),
  },
  async ({ recipe_id, target_base_weight }) => ({
    content: [{ type: 'text', text: `[stub] Prep list for recipe ${recipe_id} at ${target_base_weight}g.` }],
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
