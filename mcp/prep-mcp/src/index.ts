/**
 * prep-mcp
 * MCP server exposing KitchenKit shift prep tools to CulinaryOS AI.
 *
 * Tools: build_shift_prep · get_mise_en_place · project_batch_size
 */

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { z } from 'zod';

const server = new McpServer({ name: 'prep-mcp', version: '0.1.0' });

server.tool(
  'build_shift_prep',
  'Build a shift prep plan from current stock and par levels.',
  {
    shift: z.string().describe('Shift name e.g. AM, PM, Brunch'),
    date: z.string().describe('Date YYYY-MM-DD'),
  },
  async ({ shift, date }) => ({
    content: [{ type: 'text', text: `[stub] Prep plan for ${shift} on ${date}.` }],
  })
);

server.tool(
  'get_mise_en_place',
  'Get mise en place list for a recipe at a given batch size.',
  { recipe_id: z.string(), target_base_weight: z.number() },
  async ({ recipe_id, target_base_weight }) => ({
    content: [{ type: 'text', text: `[stub] Mise en place for recipe ${recipe_id} at ${target_base_weight}g.` }],
  })
);

server.tool(
  'project_batch_size',
  'Project batch size needed for a given cover count.',
  {
    recipe_id: z.string(),
    covers: z.number(),
    waste_factor: z.number().optional().describe('Default 1.1'),
  },
  async ({ recipe_id, covers, waste_factor }) => ({
    content: [{ type: 'text', text: `[stub] Batch for ${covers} covers of ${recipe_id} (×${waste_factor ?? 1.1}).` }],
  })
);

const transport = new StdioServerTransport();
await server.connect(transport);
