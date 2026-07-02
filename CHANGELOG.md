# CHANGELOG — KitchenKit

All notable changes to this project are documented here.
Format: `[vX.Y.Z] YYYY-MM-DD — Description`

---

## [v0.1.0] 2026-07-02 — Build Complete (Pre-Deploy)

### Added
- `react-hot-toast` — toast notifications on every mutation success/error
- `ErrorBoundary` class component — catches render errors, shows recovery UI
- `NotFoundPage` — 404 page for unmatched routes within the authenticated app
- `App.tsx` updated: ErrorBoundary wrapping Layout, catch-all 404 route, public unknown routes redirect to `/login`
- `Sidebar.tsx` nav fix: Dashboard link corrected from `to='/'` to `to='/dashboard'`

---

## [v0.0.9] 2026-07-02 — Prep Planner + Par Level Modal

### Added
- `usePrepPlans.ts` — `usePrepPlan`, `useSavePrepPlan`, `useTogglePrepItem`, `useCompletePrepPlan` hooks
- `ParLevelModal.tsx` — add/edit par level items with unit select
- `PrepPlannerPage.tsx` — full overhaul: live preview table vs saved plan view, checkbox rows, progress bar, Rebuild + Complete Shift buttons
- `V007__prep_plan_rpc.sql` — `get_prep_plan_with_items` and `build_and_save_shift_prep` RPCs

---

## [v0.0.8] 2026-06-30 — Recipe Scaling UI

### Added
- `ScaleWidget` component — interactive base-amount input with live scaled ingredient table
- Recipe detail page wired to `ratio-engine` `scaleRecipe()` function
- `tabular-nums` class on all numeric cells in recipe/prep tables

---

## [v0.0.7] 2026-06-30 — Stock Decrement Trigger

### Added
- `V008__stock_decrement_trigger.sql` — PostgreSQL trigger: when `prep_plan_items.is_done` flips to `true`, decrement `par_levels.current_stock` by `prep_amount` (floors at 0)

---

## [v0.0.6] 2026-06-29 — Dashboard + Par Levels

### Added
- `DashboardPage` — KPI cards: total recipes, par items, below-par count, active prep plans
- `ParLevelsPage` — table view with inline below-par highlight, add/delete
- `useParLevels.ts` — `useParLevels`, `useUpsertParLevel`, `useDeleteParLevel`
- `V006__rpc_helpers.sql` — `get_dashboard_stats` RPC

---

## [v0.0.5] 2026-06-29 — Prep Plans Schema

### Added
- `V005__prep_plans.sql` — `prep_plans` and `prep_plan_items` tables with RLS
- `PrepPlannerPage` stub
- `PrepHistoryPage` stub

---

## [v0.0.4] 2026-06-28 — Recipe CRUD + Ingredients

### Added
- `RecipesPage` — searchable recipe list with create modal
- `RecipeDetailPage` — view/edit recipe, ingredient table
- `RecipeForm` + `IngredientRow` components
- `useRecipes.ts` — `useRecipes`, `useRecipe`, `useCreateRecipe`, `useUpdateRecipe`, `useDeleteRecipe`
- `V003__ingredients.sql` — `recipe_ingredients` table with RLS
- `V004__par_levels.sql` — `par_levels` table with RLS

---

## [v0.0.3] 2026-06-28 — Auth + Layout Shell

### Added
- `AuthContext` — Supabase session state, `onAuthStateChange` listener
- `RequireAuth` — route guard redirecting unauthenticated users to `/login`
- `LoginPage` — magic link auth form
- `AuthCallbackPage` — handles Supabase redirect after magic link click
- `Layout` / `Sidebar` / `Topbar` — full app shell with responsive mobile drawer
- `App.tsx` — React Router v6 route tree
- `V001__init_users.sql` — users profile table + auto-create trigger
- `V002__recipes.sql` — recipes table with RLS

---

## [v0.0.2] 2026-06-28 — Packages + MCP Servers

### Added
- `packages/ratio-engine` — `scaleRecipe`, `getRatio`, `generatePrepList`
- `packages/prep-engine` — `buildShiftPrep`, `getMiseEnPlace`, `projectBatchSize`
- `mcp/recipe-mcp` — MCP server stub: `scale_recipe`, `get_ratio`, `list_recipes`, `generate_prep_list`
- `mcp/prep-mcp` — MCP server stub: `build_shift_prep`, `get_mise_en_place`, `project_batch_size`
- `supabase/seed.sql` — dev seed data

---

## [v0.0.1] 2026-06-28 — Monorepo Scaffold

### Added
- Turborepo + pnpm workspace scaffold
- `apps/web` — Vite + React 18 + TypeScript + Tailwind CSS v3
- `turbo.json`, `pnpm-workspace.yaml`, root `package.json`
- `vercel.json` — Vite SPA config
- `.github/` workflows
- `README.md`, `AGENTS.md` stubs
