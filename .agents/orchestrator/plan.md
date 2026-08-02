# Orchestration Plan — KitchenKit Phase 1 Production Deployment & Integration Polish

## Objectives
Execute requirements R1, R2, R3 and pass all acceptance criteria:
1. R1: Production Deployment & DB Audit (TS check, env vars, V001-V008 migrations audit).
2. R2: CulinaryOS MCP Servers Polish (`recipe-mcp`, `prep-mcp` tools, Zod schemas, stdio MCP spec compliance, structured payload outputs).
3. R3: Web App UX Enhancements (RecipesPage tag chips & sorting; PrepPlannerPage station prep sheet print/export view; toast/RLS/TQ pattern enforcement).

## Milestones Breakdown

### Milestone 1: Production Deployment Readiness & Database Audit (R1)
- **Explorer**: Inspect `apps/web/.env.example`, `ARCHITECTURE.md`, `TODO.md`, `supabase/migrations/V001-V008*.sql`, `package.json`, build scripts. Identify any missing env vars, migration issues, or build script mismatches.
- **Worker**: Ensure `apps/web/.env.example` has `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`, document Supabase configuration in `ARCHITECTURE.md` and `TODO.md` as needed. Run `pnpm build` or `pnpm --recursive exec tsc --noEmit` to verify 0 errors. Fix any migration issues if found.
- **Reviewer**: Verify build output and DB migration safety/correctness.

### Milestone 2: CulinaryOS MCP Server Polish (R2)
- **Explorer**: Audit `mcp/recipe-mcp` and `mcp/prep-mcp` files (`index.ts`, `server.ts`, tool handlers for `scale_recipe`, `get_ratio`, `list_recipes`, `build_shift_prep`, `get_mise_en_place`, `project_batch_size`, `generate_prep_list`). Check Zod schemas, output payload formatting, stdio MCP initialization, and absence of `apps/web/` imports.
- **Worker**: Update tool implementations in `mcp/recipe-mcp` and `mcp/prep-mcp` to ensure strict Zod schema validation, compliant MCP tool output formatting (content blocks with formatted text/JSON payloads), error handling, and robust stdio initialization.
- **Reviewer**: Inspect code to ensure full Anthropic MCP spec compliance, clean TS compile, and boundary separation.

### Milestone 3: Web App UX Enhancements (R3)
- **Explorer**: Inspect `apps/web/src/pages/RecipesPage.tsx`, `apps/web/src/pages/PrepPlannerPage.tsx`, `apps/web/src/hooks/useRecipes.ts`, `apps/web/src/hooks/usePrepPlans.ts`, styling, and existing layout components. Detail specifications for:
  - Recipe tag chips & sorting controls (name, created_at, updated_at) with client/hook integration.
  - Station prep sheet view (print CSS `@media print`, print action button, station layout for active shift prep plan).
- **Worker**: Implement tag filtering chips & sorting options in `RecipesPage.tsx` and `useRecipes.ts` (or page component). Implement station prep sheet print/export view in `PrepPlannerPage.tsx` with dedicated print styles/modal/view. Ensure TanStack Query mutations have toast notifications and follow RLS/web app rules (e.g. text size <= --text-xl inside auth layout, no localStorage).
- **Reviewer**: Verify UX functionality, toast triggers, RLS compliance, and code quality.

### Milestone 4: Integration Verification, Stress Testing & Forensic Integrity Audit
- **Worker**: Perform full monorepo build verification.
- **Challenger**: Run test harnesses / verification scripts to confirm MCP tools work via stdio and web components render/compile cleanly.
- **Forensic Auditor**: Run static and runtime checks to verify no hardcoded cheats, mock facades, or integrity violations exist.
