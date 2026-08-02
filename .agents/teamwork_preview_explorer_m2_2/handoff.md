# Handoff Report — Explorer 2 (M2 prep-mcp Audit)

**Date**: 2026-08-02
**Milestone**: M2 — CulinaryOS MCP Server Polish (`mcp/prep-mcp`)
**Author**: Explorer 2
**Status**: Completed (Read-Only Investigation)

---

## 1. Observation

Direct observations from inspecting `mcp/prep-mcp/src/index.ts`, `mcp/prep-mcp/package.json`, `packages/prep-engine/src/index.ts`, and `supabase/migrations/V004`–`V009`:

### A. Server Setup & Protocol Compliance (`mcp/prep-mcp/src/index.ts`)
- **Server Instance**: `const server = new McpServer({ name: 'prep-mcp', version: '0.3.0' });` (line 31) initialized via `@modelcontextprotocol/sdk/server/mcp.js`.
- **Transport**: `StdioServerTransport` connected at startup (`await server.connect(transport);`, lines 305-306).
- **Tool Registrations**: 6 tools registered using `server.tool(name, description, schemaObj, handler)`:
  1. `build_shift_prep` (line 36)
  2. `save_prep_plan` (line 91)
  3. `complete_prep_item` (line 152)
  4. `get_mise_en_place` (line 206)
  5. `project_batch_size` (line 242)
  6. `update_stock` (line 271)
- **Response Format**: All tools return MCP standard `{ content: [{ type: 'text', text: ... }] }` structures. Database RPC/query failures append `isError: true` (e.g. lines 54, 117, 127, 136, 168, 220, 286).

### B. Input Argument Validation (`mcp/prep-mcp/src/index.ts`)
- **Shift Parameter**:
  - `build_shift_prep` (line 41) & `save_prep_plan` (line 96):
    `shift: z.enum(['AM', 'PM', 'Brunch', 'Dinner', 'Overnight', 'Custom']).describe('Shift name')`
  - Rejects any conversational/natural inputs like `'morning'`, `'afternoon'`, `'evening'`, `'am'`, `'pm'`.
  - `.describe('Shift name')` lacks docstring enum options required for clear AI context.
- **Date Parameter**:
  - `build_shift_prep` (line 42) & `save_prep_plan` (line 97):
    `date: z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional().describe('Date YYYY-MM-DD (defaults to today)')`
  - Validates format `YYYY-MM-DD`, fallback defaults to `new Date().toISOString().slice(0, 10)`.
- **Numeric & UUID Parameters**:
  - `user_id`, `recipe_id`, `item_id`: Strictly validated with `z.string().uuid()`.
  - `target_base_weight`, `prep_amount`, `portion_weight`: Validated with `z.number().positive()`.
  - `covers`: Validated with `z.number().int().min(1)`.
  - `waste_factor`: Validated with `z.number().min(1).max(2).optional().default(1.1)`.
  - `current_stock`: Validated with `z.number().min(0)`.
- **String Validation Gaps**:
  - `save_prep_plan` (lines 99, 101) & `update_stock` (line 276): `ingredient_name` and `unit` use unconstrained `z.string()` without `.trim().min(1)`.

### C. Output Formatting (`mcp/prep-mcp/src/index.ts`)
- Plain text tables generated via fixed-width padding e.g., `row.ingredient_name.padEnd(26)` (lines 76, 231).
- Ingredient names exceeding 26 characters (e.g. `"Extra Virgin Olive Oil (Cold Pressed)"`) misalign table columns.
- Text output is human-readable, but lacks structured JSON/Markdown table format for downstream LLM parsing.

### D. Private Recipe Access Bug (`mcp/prep-mcp/src/index.ts` & `V006__rpc_helpers.sql`)
- `get_mise_en_place` (lines 207-217) accepts `recipe_id` and `target_base_weight` (does **not** accept `user_id`).
- Calls `supabase.rpc('scale_recipe', { p_recipe_id: recipe_id, p_target_base_weight: target_base_weight })`.
- In `supabase/migrations/V006__rpc_helpers.sql` (lines 24-25), `scale_recipe` contains:
  `WHERE i.recipe_id = p_recipe_id AND (r.user_id = auth.uid() OR r.is_public = true)`
- Since `prep-mcp` connects using `KITCHENKIT_SUPABASE_SERVICE_KEY`, `auth.uid()` is `NULL` during RPC execution.
- Result: `scale_recipe` returns 0 rows for **all private recipes** (`is_public = false`), returning `"No ingredients found for recipe..."`.

### E. Package Dependency Disconnect (`mcp/prep-mcp/package.json` vs `src/index.ts`)
- `package.json` includes `"@kitchenkit/prep-engine": "workspace:*"`.
- `src/index.ts` contains zero imports from `@kitchenkit/prep-engine`. `project_batch_size` (lines 250-253) reimplements calculations inline rather than importing `projectBatchSize` from `@kitchenkit/prep-engine`.

### F. Non-Atomic Client-Side Mutations (`mcp/prep-mcp/src/index.ts` lines 107-138)
- `save_prep_plan` executes 3 separate Supabase calls: `.upsert()` into `prep_plans`, `.delete()` on `prep_plan_items`, and `.insert()` on `prep_plan_items`.
- If `.insert()` fails, previously deleted undone items are lost without rollback.

---

## 2. Logic Chain

1. **Protocol Compliance**:
   - *Observation*: `McpServer` and `{ content: [{ type: 'text', text: ... }] }` format used across all 6 handlers with `isError: true` on DB errors.
   - *Logic*: Implements Anthropic MCP spec standard transport and payload schemas correctly.
   - *Conclusion*: MCP spec layer compliance is high; minor fixes needed for error state propagation on zero-row results.

2. **Input Validation**:
   - *Observation*: `shift` parameter enforces rigid `z.enum(['AM', 'PM', 'Brunch', 'Dinner', 'Overnight', 'Custom'])` with generic `.describe('Shift name')`.
   - *Logic*: Conversational AI queries (e.g. `"morning"`, `"evening"`, `"pm"`) fail Zod schema parsing before reaching tool handlers.
   - *Conclusion*: Description metadata must list valid enum values explicitly, and Zod preprocessing should map common shift synonyms (`morning -> AM`, `afternoon -> PM`, `evening -> Dinner`). String fields (`ingredient_name`, `unit`) require `.trim().min(1)`.

3. **Output Formatting**:
   - *Observation*: `ingredient_name.padEnd(26)` used for ASCII table columns.
   - *Logic*: Culinary ingredient titles often exceed 26 characters, breaking fixed ASCII spacing.
   - *Conclusion*: Replace fixed character padding with standard Markdown tables or dual structured payloads to ensure visual cleanliness and reliable LLM parsing.

4. **Security & Authorization Defect**:
   - *Observation*: `get_mise_en_place` calls `scale_recipe` RPC without passing user context. `scale_recipe` checks `r.user_id = auth.uid() OR r.is_public = true`. Service role execution sets `auth.uid() = NULL`.
   - *Logic*: Private recipes owned by users fail the `auth.uid()` check and return empty data.
   - *Conclusion*: `get_mise_en_place` must accept `user_id`, or `scale_recipe` RPC must be updated in a new migration to accept an optional `p_user_id` parameter.

5. **Architectural & Transactional Discipline**:
   - *Observation*: `prep-mcp` imports no code from `@kitchenkit/prep-engine` despite package manifest linkage. `save_prep_plan` executes multi-step client mutations.
   - *Logic*: Violates KitchenKit architecture rule (packages flow `packages/*` → `mcp/*`). Client-side multi-query mutations risk partial state corruption.
   - *Conclusion*: Wire `projectBatchSize` from `@kitchenkit/prep-engine`, and refactor `save_prep_plan` to use atomic RPC/transaction handlers.

---

## 3. Caveats

- **Read-Only Audit**: No code changes were made to `mcp/prep-mcp` or database migrations per Explorer mandate.
- **Migration Dependency**: Adding `p_user_id` to `scale_recipe` RPC will require a new forward-only migration (e.g. `V010__update_scale_recipe_rpc.sql`).
- **Offline Static Analysis**: Analysis was conducted via strict static inspection of code and SQL definitions.

---

## 4. Conclusion & Recommendations

`mcp/prep-mcp` is well-structured and follows modern MCP SDK standards, but requires targeted improvements in 4 key areas:

### Concrete Actionable Recommendations for Implementer:

1. **Fix `get_mise_en_place` Private Recipe Bug**:
   - Add `user_id: z.string().uuid()` to `get_mise_en_place` schema in `mcp/prep-mcp/src/index.ts`.
   - Either pass `p_user_id` to updated `scale_recipe` RPC or execute authenticated query to ensure private recipes scale correctly.

2. **Enhance Zod Input Validation**:
   - Update `shift` schema description: `.describe("Shift name ('AM', 'PM', 'Brunch', 'Dinner', 'Overnight', 'Custom')")`.
   - Add Zod preprocessor to map `'morning' -> 'AM'`, `'afternoon' -> 'PM'`, `'evening' -> 'Dinner'` and normalize casing.
   - Add `.trim().min(1)` to `ingredient_name` and `unit` inputs in `save_prep_plan` and `update_stock`.

3. **Improve Output Formatting**:
   - Format tabular output using standard Markdown tables (`| Item | Stock | Par | Prep | Unit |`) instead of fixed `padEnd(26)` text strings.

4. **Refactor Package Usage & Transaction Safety**:
   - Import and use `projectBatchSize` from `@kitchenkit/prep-engine` inside `project_batch_size`.
   - Refactor `save_prep_plan` to use atomic database transaction or Supabase RPC (`build_and_save_shift_prep`).

5. **Set `isError: true` on Not Found Outcomes**:
   - Return `{ content: [...], isError: true }` when recipe or par level is not found in `get_mise_en_place` and `update_stock`.

---

## 5. Verification Method

To independently verify these findings:

1. **Verify Private Recipe Bug**:
   - Inspect `mcp/prep-mcp/src/index.ts` lines 207-217 (`get_mise_en_place` lacks `user_id`).
   - Inspect `supabase/migrations/V006__rpc_helpers.sql` lines 24-25 (`scale_recipe` checks `r.user_id = auth.uid()`).
2. **Verify Shift Enum Limitation**:
   - Inspect `mcp/prep-mcp/src/index.ts` lines 41 & 96 (`z.enum(['AM', 'PM', 'Brunch', 'Dinner', 'Overnight', 'Custom'])`).
3. **Verify Unused Package**:
   - Check `mcp/prep-mcp/package.json` line 14 vs `mcp/prep-mcp/src/index.ts` (no `@kitchenkit/prep-engine` import).
4. **Verify Non-Atomic Mutations**:
   - Inspect `mcp/prep-mcp/src/index.ts` lines 107-138 (separate `upsert`, `delete`, `insert` calls).
