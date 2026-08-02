## 2026-08-02T17:14:24Z

You are Worker 1 for Milestone 1 (R1 Production Deployment Readiness & Database Migration Audit) of KitchenKit.

Working Directory: c:\Users\white\OneDrive\Documents\GitHub\KitchenKit\.agents\teamwork_preview_worker_m1
Project Scope: c:\Users\white\OneDrive\Documents\GitHub\KitchenKit\PROJECT.md

Mandatory Instructions:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context & Explorer Handing:
Review Explorer reports at:
- `.agents/teamwork_preview_explorer_m1_1/handoff.md`
- `.agents/teamwork_preview_explorer_m1_2/handoff.md`
- `.agents/teamwork_preview_explorer_m1_3/handoff.md`

Your Objective:
1. Fix Monorepo TypeScript Compilation:
   - Fix `packages/prep-engine/tsconfig.json` (resolve TS6059 `rootDir`/`paths` error).
   - Fix `apps/web/src/vite-env.d.ts` (ensure `import.meta.env` has typed `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`).
   - Fix `apps/web/src/hooks/useRecipes.ts` (export `CreateRecipeInput` and `UpdateRecipeInput`).
   - Resolve type mismatches between `apps/web` and `@kitchenkit/prep-engine` / `@kitchenkit/ratio-engine`.
   - Add `@types/node` to `mcp/recipe-mcp` and `mcp/prep-mcp` `devDependencies` (or fix `tsconfig.json`) to resolve `process` global TS2580 errors. Add `type-check` script to their `package.json`.
   - Verify `pnpm build` or `pnpm --recursive exec tsc --noEmit` runs with 0 errors across the monorepo workspace.

2. Create Forward-Only Migration V009:
   - REMEMBER PROJECT RULE 1: Never modify existing V001-V008 SQL files!
   - Create `supabase/migrations/V009__fix_trigger_and_rpc_security.sql`.
   - Fix `decrement_stock_on_prep_complete()` trigger function: change `NEW.plan_id` to `NEW.prep_plan_id` (fixes critical runtime crash!). Add `SET search_path = public` for security.
   - Add missing `get_dashboard_stats(p_user_id uuid)` RPC function (returning total recipes, par level items count, below par items count, active prep plans count) with `SET search_path = public`.
   - Ensure all `SECURITY DEFINER` functions set `search_path = public` and check `p_user_id = auth.uid()` where applicable.

3. Environment Variables & Documentation Polish:
   - Fix JSDoc comment typo in `mcp/recipe-mcp/src/index.ts`.
   - Update `ARCHITECTURE.md` to accurately reflect MCP env vars (`KITCHENKIT_SUPABASE_URL`, `KITCHENKIT_SUPABASE_SERVICE_KEY`) and Supabase Auth redirect requirements (`/auth/callback`).
   - Update `TODO.md` checklist items completed in Phase 1 setup.

4. Run Verification:
   - Run workspace TypeScript compilation checks and build scripts.
   - Document commands executed and output in `.agents/teamwork_preview_worker_m1/handoff.md`.
   - Send message back to parent orchestrator upon completion.
