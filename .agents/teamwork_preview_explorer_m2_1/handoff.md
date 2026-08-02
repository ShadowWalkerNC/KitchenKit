# Milestone 2 (R2 CulinaryOS MCP Server Polish) — `recipe-mcp` Audit Report

## 1. Observation

### Server Setup & Architecture
- **Location**: `mcp/recipe-mcp/src/index.ts` (lines 16–34, 194–195)
- **SDK**: `@modelcontextprotocol/sdk` v1.0.0 (`McpServer`, `StdioServerTransport`).
- **Initialization**:
  ```ts
  const server = new McpServer({ name: 'recipe-mcp', version: '0.2.0' });
  const transport = new StdioServerTransport();
  await server.connect(transport);
  ```
- **Environment**: Relies on `process.env.KITCHENKIT_SUPABASE_URL` and `process.env.KITCHENKIT_SUPABASE_SERVICE_KEY`. Exits with `process.exit(1)` if missing.

### Tool Audit

#### 1. `scale_recipe` (lines 38–69)
- **Input Schema**:
  ```ts
  {
    recipe_id:          z.string().uuid().describe('UUID of the recipe to scale'),
    target_base_weight: z.number().positive().describe('Target weight of the base ingredient in grams (or yield unit)'),
  }
  ```
- **Error Behavior**:
  - Line 51: RPC error returns `{ content: [{ type: 'text', text: `Error: ${error.message}` }], isError: true }`. (Correct)
  - Line 56: Recipe not found / empty ingredients returns `{ content: [{ type: 'text', text: `No recipe found with ID ${recipe_id}, or it has no ingredients.` }] }`. (**Missing `isError: true`**)
- **Output Payload**:
  - Lines 59–67: Plain text output using fixed `row.ingredient_name.padEnd(24)` and `String(row.scaled_amount).padStart(8)`. No JSON payload returned.

#### 2. `get_ratio` (lines 74–102)
- **Input Schema**:
  ```ts
  {
    recipe_id:       z.string().uuid().describe('UUID of the recipe'),
    ingredient_name: z.string().describe('Name of the ingredient (case-insensitive)'),
  }
  ```
  - `ingredient_name` is `z.string()` without `.trim()` or `.min(1)`.
- **Error Behavior**:
  - Line 89–93: `if (error || !data) return { content: [{ type: 'text', text: `Ingredient "${ingredient_name}" not found in recipe ${recipe_id}.` }] };`. (**Missing `isError: true`**)
- **Output Payload**:
  - Lines 95–100: Single plain text line `${data.name}: ratio = ...`. No structured JSON returned.

#### 3. `list_recipes` (lines 107–147)
- **Input Schema**:
  ```ts
  {
    tag:   z.string().optional().describe('Filter by tag (e.g. "bread", "sauce")'),
    limit: z.number().int().min(1).max(100).optional().default(20).describe('Max results to return'),
  }
  ```
  - `tag` is `z.string().optional()` without `.trim()` or `.min(1)`.
- **Error Behavior**:
  - Line 128: Database query error returns `isError: true`. (Correct)
- **Output Payload**:
  - Lines 135–145: Plain text array formatted as `[${r.id}] ${r.name}...`. No structured JSON returned.

#### 4. `generate_prep_list` (lines 152–192)
- **Input Schema**:
  ```ts
  {
    recipe_id:          z.string().uuid().describe('UUID of the recipe'),
    target_base_weight: z.number().positive().describe('Target base ingredient weight in grams'),
    label:              z.string().optional().describe('Optional label for the prep list (e.g. "Saturday Brunch")'),
  }
  ```
  - `label` is `z.string().optional()` without `.trim()` or `.min(1)`.
- **Error Behavior**:
  - Lines 167–169: Recipe not found returns `{ content: [{ type: 'text', text: `Recipe ${recipe_id} not found.` }] }`. (**Missing `isError: true`**)
  - Line 171: Scaling RPC error returns `isError: true`. (Correct)
- **Output Payload**:
  - Lines 179–188: ASCII checklist string formatted with `□` and `padEnd(24)`. No structured JSON payload returned.

---

## 2. Logic Chain

1. **SDK & Server Initialization Conformance**:
   - The code imports `McpServer` and `StdioServerTransport` from `@modelcontextprotocol/sdk`, initializes `new McpServer({ name: 'recipe-mcp', version: '0.2.0' })`, and calls `await server.connect(transport)`.
   - *Reasoning*: The server initialization pattern is 100% compliant with the official Anthropic MCP SDK standard.

2. **Error Protocol Inconsistency (`isError: true`)**:
   - Observations on lines 56 (`scale_recipe`), 89–93 (`get_ratio`), and 167–169 (`generate_prep_list`) reveal that when a target recipe or ingredient is not found, the tool returns a standard content object without setting `isError: true`.
   - *Reasoning*: Per the Anthropic MCP protocol specification, missing entities or failed lookups should be signaled with `isError: true`. Without this flag, client AI models interpret error message strings as valid output data rather than handling execution failure.

3. **Input Validation Gaps**:
   - String inputs (`ingredient_name` in `get_ratio`, `tag` in `list_recipes`, `label` in `generate_prep_list`) are declared as `z.string()` or `z.string().optional()` without `.trim()` or `.min(1)`.
   - Numeric input `target_base_weight` has `.positive()` but lacks an upper bound sanity check (e.g., `.max(1_000_000)`).
   - *Reasoning*: Adding string trimming, min length checks, and numeric upper bounds prevents invalid queries (like empty whitespace searches) from hitting Supabase.

4. **Output Payload Formatting Gaps**:
   - Observations across all tool handlers show outputs formatted strictly as plain text strings with fixed space padding (`padEnd(24)`).
   - *Reasoning*: Plain text tables with `padEnd(24)` break visual layout if an ingredient name exceeds 24 characters. Furthermore, downstream AI agents in CulinaryOS cannot programmatically extract typed JSON objects without brittle string parsing. Formatting output as Markdown (tables/lists) combined with an embedded JSON code block (or structured dual payload) allows both human-friendly chat display and zero-ambiguity AI processing.

---

## 3. Caveats

- **Runtime Supabase Interaction**: Database queries and RPC executions were audited statically from code. Live network execution against a Supabase backend requires setting `KITCHENKIT_SUPABASE_URL` and `KITCHENKIT_SUPABASE_SERVICE_KEY`.
- **Scope Limit**: This audit covers `mcp/recipe-mcp`. `mcp/prep-mcp` is covered under a separate Explorer audit.

---

## 4. Conclusion

`mcp/recipe-mcp` provides a solid baseline implementation using `@modelcontextprotocol/sdk`. To achieve full production polish for Milestone 2, the implementer should execute the following recommendations:

1. **Protocol Compliance**: Add `isError: true` to all resource-not-found error returns (`scale_recipe`, `get_ratio`, `generate_prep_list`).
2. **Schema Hardening**: Refine Zod input schemas with `.trim().min(1)` for strings and `.max(1_000_000)` for weights.
3. **Structured Dual Output**: Upgrade response format for all 4 tools to include Markdown formatting (tables, checklists) along with a structured JSON code block containing typed result objects.

---

## 5. Verification Method

### Command Verification
Run type-checking and build validation from repository root:
```bash
pnpm --filter @kitchenkit/recipe-mcp type-check
pnpm --filter @kitchenkit/recipe-mcp build
```

### Inspection Checklist
1. Open `mcp/recipe-mcp/src/index.ts`.
2. Verify every return branch handling a missing resource or database error contains `isError: true`.
3. Verify Zod schemas use `.trim().min(1)` on string parameters.
4. Verify tool handlers return clean Markdown + JSON structured content.
