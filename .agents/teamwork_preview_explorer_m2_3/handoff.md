# Handoff Report — Explorer 3 (Milestone 2: MCP Server Polish Audit)

## 1. Observation

### 1.1 Package Dependencies & Import Boundary Analysis
- **`mcp/recipe-mcp/package.json` (lines 13–18)**:
  ```json
  "dependencies": {
    "@kitchenkit/ratio-engine": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@supabase/supabase-js": "^2.43.0",
    "zod": "^3.23.0"
  }
  ```
- **`mcp/recipe-mcp/src/index.ts` (lines 16–19)**:
  ```ts
  import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
  import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
  import { createClient } from '@supabase/supabase-js';
  import { z } from 'zod';
  ```
  *Observation*: `@kitchenkit/ratio-engine` is listed as a workspace dependency in `package.json`, but is **never imported** anywhere in `mcp/recipe-mcp/src/index.ts`.

- **`mcp/prep-mcp/package.json` (lines 13–18)**:
  ```json
  "dependencies": {
    "@kitchenkit/prep-engine": "workspace:*",
    "@modelcontextprotocol/sdk": "^1.0.0",
    "@supabase/supabase-js": "^2.43.0",
    "zod": "^3.23.0"
  }
  ```
- **`mcp/prep-mcp/src/index.ts` (lines 14–17)**:
  ```ts
  import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
  import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
  import { createClient } from '@supabase/supabase-js';
  import { z } from 'zod';
  ```
  *Observation*: `@kitchenkit/prep-engine` is listed as a workspace dependency in `package.json`, but is **never imported** anywhere in `mcp/prep-mcp/src/index.ts`.

- **Import Scope Audit**:
  - Regex grep search for `(import|require)` across `mcp/` confirms all imports in both MCP servers reference third-party modules (`@modelcontextprotocol/sdk`, `@supabase/supabase-js`, `zod`).
  - Grep search for `from ['"](\.\./|@/|apps/web)` across `mcp/` returned **0 results**. Neither `recipe-mcp` nor `prep-mcp` imports anything from `apps/web/` or `@/` aliases. Packages flow downward strictly (`packages/*` -> `mcp/*` and `apps/*`).

---

### 1.2 Supabase Database Integration & Error Handling Audit

#### Environment Variable Startup Check
Both servers perform top-level env variable validation before initializing `createClient`:
- **`mcp/recipe-mcp/src/index.ts` (lines 21–27)** & **`mcp/prep-mcp/src/index.ts` (lines 19–25)**:
  ```ts
  const supabaseUrl = process.env.KITCHENKIT_SUPABASE_URL;
  const supabaseKey = process.env.KITCHENKIT_SUPABASE_SERVICE_KEY;

  if (!supabaseUrl || !supabaseKey) {
    console.error('[...-mcp] Missing KITCHENKIT_SUPABASE_URL or KITCHENKIT_SUPABASE_SERVICE_KEY');
    process.exit(1);
  }
  ```
  *Observation*: Missing env vars immediately halt the process (`process.exit(1)`), preventing unauthenticated or misconfigured server startup.

#### Critical Bug in `prep-mcp` (`update_stock` tool)
- **`mcp/prep-mcp/src/index.ts` (lines 280–294)**:
  ```ts
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
  ```
  *Observation*: In `@supabase/supabase-js` v2, `.update()` does not return a row count unless `{ count: 'exact' }` is passed into `.update(values, { count: 'exact' })` or `.from('par_levels')`. Because `{ count: 'exact' }` is missing, `count` is returned as `null`. As a result, `!count` evaluates to `true`, causing `update_stock` to **unconditionally return `"No par item found matching..."` on every execution**, even when the database update succeeds!

#### Tool Error Reporting & Null Handling Table

| Server | Tool | Query Type | `isError: true` on DB Error? | Null / Empty Rows Handling | Audit Finding |
|---|---|---|---|---|---|
| `recipe-mcp` | `scale_recipe` | RPC (`scale_recipe`) | Yes (line 52) | Friendly text response (line 56) | Clean error handling |
| `recipe-mcp` | `get_ratio` | Table (`ingredients`) | **No** (line 89) | Masked under single error message | **Bug**: DB errors are suppressed into `"Ingredient not found"`, hiding DB failures and omitting `isError: true` |
| `recipe-mcp` | `list_recipes` | Table (`recipes`) | Yes (line 128) | Friendly text response (line 132) | Clean error handling |
| `recipe-mcp` | `generate_prep_list` | Table + RPC | Partial (line 171 sets `isError: true` for RPC, but line 167 omits it for table) | Text response | **Minor Bug**: Recipe query failure omits `isError: true` |
| `prep-mcp` | `build_shift_prep` | RPC (`build_shift_prep`) | Yes (line 54) | Friendly text response (line 58) | Clean error handling |
| `prep-mcp` | `save_prep_plan` | Multi-query (`upsert`, `delete`, `insert`) | Yes (lines 116, 126, 135) | Creates/replaces rows | **Caveat**: 3 queries run sequentially without database transaction protection |
| `prep-mcp` | `complete_prep_item` | Table (`prep_plan_items`) | Yes (line 168) | Fallback on progress count error (line 177) | Graceful fallback |
| `prep-mcp` | `get_mise_en_place` | RPC (`scale_recipe`) | Yes (line 219) | Friendly text response (line 223) | Clean error handling |
| `prep-mcp` | `project_batch_size` | Pure math | N/A | N/A | No DB calls |
| `prep-mcp` | `update_stock` | Table (`par_levels`) | Yes (line 286) | **Broken count check** | **Critical Bug**: Missing `{ count: 'exact' }` causes `count === null`, triggering `!count` condition every call |

---

### 1.3 Zod Schema Audit

- **`@modelcontextprotocol/sdk` Validation Integration**:
  The MCP SDK automatically validates incoming client arguments against the Zod schema passed to `server.tool(...)`. Invalid parameters trigger an immediate JSON-RPC `-32602 Invalid params` protocol error.

- **Schema Inconsistencies & Duplication**:
  1. **Shift Enum Duplication**: `z.enum(['AM', 'PM', 'Brunch', 'Dinner', 'Overnight', 'Custom'])` is defined twice in `prep-mcp/src/index.ts` (lines 41, 96).
  2. **Date Format Duplication**: `z.string().regex(/^\d{4}-\d{2}-\d{2}$/).optional()` is defined twice in `prep-mcp/src/index.ts` (lines 42, 97) without a custom error message.
  3. **String Sanitization**: `ingredient_name` in `get_ratio`, `save_prep_plan`, and `update_stock` uses bare `z.string()` without `.min(1)` or `.trim()`, allowing whitespace-only strings.
  4. **Waste Factor Upper Bound**: `project_batch_size` (line 248) caps `waste_factor` at `.max(2)` (100% buffer). If a user provides a waste factor of 2.1 (110% buffer), Zod rejects the call.

---

## 2. Logic Chain

1. **Import Boundary Integrity**:
   - *Observation*: Grep search for prohibited import paths (`apps/web`, `@/`) yielded 0 matches.
   - *Reasoning*: All import statements in `mcp/recipe-mcp/src/index.ts` and `mcp/prep-mcp/src/index.ts` reference standard NPM dependencies (`@modelcontextprotocol/sdk`, `@supabase/supabase-js`, `zod`).
   - *Conclusion*: Import architecture strictly satisfies Project Rule 10 ("Packages flow downward only").

2. **Unused Workspace Package Dependencies**:
   - *Observation*: `mcp/recipe-mcp/package.json` specifies `"@kitchenkit/ratio-engine": "workspace:*"`, and `mcp/prep-mcp/package.json` specifies `"@kitchenkit/prep-engine": "workspace:*"`. Neither package is imported in `src/index.ts`.
   - *Reasoning*: Both MCP servers delegate calculations to Supabase RPC functions or execute math inline instead of importing pure TypeScript logic from `packages/ratio-engine` or `packages/prep-engine`.
   - *Conclusion*: Either the MCP servers should import and use `@kitchenkit/ratio-engine` and `@kitchenkit/prep-engine` (e.g. for `project_batch_size` or fallback calculations), or the package dependencies should be cleaned up.

3. **`update_stock` Count Check Bug**:
   - *Observation*: In `prep-mcp/src/index.ts` line 280: `const { error, count } = await supabase.from('par_levels').update({ current_stock })`.
   - *Reasoning*: In `@supabase/supabase-js` v2, PostgREST does not send `Prefer: count=exact` unless requested via `{ count: 'exact' }`. Therefore, `count` is returned as `null`. Line 290 evaluates `if (!count || count === 0)` where `!null` is `true`.
   - *Conclusion*: `update_stock` always executes line 290 and returns `No par item found matching...` regardless of whether rows were actually updated.

4. **Inconsistent DB Error Reporting**:
   - *Observation*: `get_ratio` in `recipe-mcp` (lines 89–93) uses `if (error || !data)` and returns `"Ingredient ... not found"` without `isError: true`. `generate_prep_list` (line 167) omits `isError: true` on `recipeRes.error`.
   - *Reasoning*: Suppressing `error` prevents caller AI agents from distinguishing between a database error (e.g. network failure, database timeout) and a missing record. Omission of `isError: true` prevents standard MCP error handling by the client.
   - *Conclusion*: All DB query failures in MCP tools must consistently set `isError: true` and return the underlying error message.

---

## 3. Caveats

- **Read-Only Inspection**: No source code files were edited or executed against a live Supabase database during this audit.
- **Database Triggers & RPCs**: Database-level behavior (such as trigger `on_prep_item_complete` in `V008` migration) was audited via SQL files and tool calls, but live DB execution was not performed.

---

## 4. Conclusion

1. **Import Boundary**: **Pass (100% compliant)**. No imports from `apps/web/` or `@/` aliases exist in either MCP server.
2. **Workspace Dependency Usage**: `@kitchenkit/ratio-engine` and `@kitchenkit/prep-engine` are declared in `package.json` but unused in `src/index.ts`.
3. **Critical Defect (`prep-mcp/update_stock`)**: Fix `update_stock` by adding `{ count: 'exact' }` to the `.update()` query:
   ```ts
   const { error, count } = await supabase
     .from('par_levels')
     .update({ current_stock }, { count: 'exact' })
     .eq('user_id', user_id)
     .ilike('ingredient_name', ingredient_name);
   ```
4. **Error Handling Polish**:
   - Update `recipe-mcp/get_ratio` to separate `error` from `!data`, setting `isError: true` when `error` is present.
   - Update `recipe-mcp/generate_prep_list` line 167 to include `isError: true` on `recipeRes.error`.
5. **Zod Schema Refactoring**: Extract duplicated Zod schemas (`shiftEnum`, `dateString`) into a shared `schemas.ts` or constants module in `prep-mcp`.

---

## 5. Verification Method

- **TypeScript Compilation Verification**:
  ```bash
  pnpm --filter @kitchenkit/recipe-mcp type-check
  pnpm --filter @kitchenkit/prep-mcp type-check
  ```
- **Import Boundary Verification**:
  ```bash
  grep -rn "apps/web" mcp/
  grep -rn "@/" mcp/
  ```
  *Expected Output*: 0 matches found.
- **Code Inspection Verification**:
  - Open `mcp/prep-mcp/src/index.ts` lines 280–294 and verify presence/absence of `{ count: 'exact' }`.
  - Open `mcp/recipe-mcp/src/index.ts` lines 89–93 and verify error handling logic in `get_ratio`.
