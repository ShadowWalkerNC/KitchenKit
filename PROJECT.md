# Project: KitchenKit Phase 1 Production Deployment & Integration Polish

## Architecture
Monorepo with pnpm + Turborepo:
- `apps/web`: React 18 + Vite SPA (TanStack Query v5, Tailwind CSS v3, Supabase client)
- `packages/ratio-engine`: Pure TS ratio math
- `packages/prep-engine`: Pure TS shift prep & mise en place calculations
- `mcp/recipe-mcp`: Stdio MCP server for recipe operations
- `mcp/prep-mcp`: Stdio MCP server for shift prep & mise en place operations
- `supabase/migrations`: Forward-only SQL migrations V001-V009

## Milestones
| # | Name | Scope | Dependencies | Status |
|---|------|-------|-------------|--------|
| 1 | R1 Production Deployment Readiness & Database Audit | Monorepo TS build check, env vars documentation, V001-V009 DB migration audit | None | DONE |
| 2 | R2 CulinaryOS MCP Servers Polish | `recipe-mcp` and `prep-mcp` Zod schemas, stdio init, output payloads, Anthropic MCP spec compliance | None | DONE |
| 3 | R3 Web App UX Enhancements | RecipesPage tag filtering & sorting; PrepPlannerPage station prep sheet print/export view; toast & TQ compliance | None | IN_PROGRESS |
| 4 | M4 E2E Integration, Challenger Testing & Forensic Audit | Full monorepo build, Challenger stress testing, Forensic Auditor verification | M1, M2, M3 | PLANNED |

## Interface Contracts
- `recipe-mcp` stdio tools: `scale_recipe`, `get_ratio`, `list_recipes`, `generate_prep_list`
- `prep-mcp` stdio tools: `build_shift_prep`, `get_mise_en_place`, `project_batch_size`, `update_stock`, `save_prep_plan`, `complete_prep_item`
- Web app: TanStack Query hooks in `apps/web/src/hooks/` returning data and typed mutations with toast notifications

## Code Layout
- `apps/web/src/components/`
- `apps/web/src/pages/`
- `apps/web/src/hooks/`
- `mcp/recipe-mcp/src/`
- `mcp/prep-mcp/src/`
- `packages/ratio-engine/src/`
- `packages/prep-engine/src/`
- `supabase/migrations/`
