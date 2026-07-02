# AGENTS.md — KitchenKit

> **Extends:** `ShadowWalkerNC/.github/AGENTS.md` — all global rules apply unconditionally.
> **Purpose:** Project-specific overrides and context for AI agents working in this repository.
> **Auto-loaded by:** Claude Code · GitHub Copilot · OpenAI Codex · Cursor · Windsurf

---

## Project Identity

```
Project:      KitchenKit
Description:  Recipe manager + shift prep planner — Ratio Blueprint Engine,
              mise en place generation, prep list builder.
              Standalone for home cooks, caterers & personal chefs.
              Bridges into CulinaryOS via recipe-mcp and prep-mcp.
Status:       alpha
Phase:        1 — Build complete, pre-deploy
Priority:     active
```

---

## Tech Stack

```
Language:     TypeScript (strict)
Runtime:      Node.js 20+ · pnpm 9+ monorepo (Turborepo)
Framework:    React 18 + Vite 5 (apps/web)
Styling:      Tailwind CSS v3 + CSS variables (zinc dark palette)
State:        TanStack Query v5
Database:     Supabase (PostgreSQL + Auth + RLS)
Hosting:      Vercel (web) + Supabase hosted
Key APIs:     Supabase JS v2 · Lucide React · react-hot-toast
CI/CD:        Manual deploy → Vercel Git integration (planned)
```

---

## Repository Structure

```
kitchenkit/
├── apps/web/src/
│   ├── components/
│   │   ├── auth/          ← RequireAuth route guard
│   │   ├── layout/        ← Layout, Sidebar, Topbar
│   │   ├── prep/          ← ParLevelModal
│   │   ├── recipes/       ← RecipeForm, IngredientRow, ScaleWidget
│   │   └── ui/            ← ErrorBoundary, shared primitives
│   ├── context/           ← AuthContext (Supabase session)
│   ├── hooks/             ← useRecipes, useParLevels, usePrepPlans
│   ├── lib/               ← supabase.ts (singleton client)
│   └── pages/             ← Route-level page components
├── packages/
│   ├── ratio-engine/      ← Pure TS ratio math (zero deps)
│   └── prep-engine/       ← Shift calculations, mise en place
├── mcp/
│   ├── recipe-mcp/        ← MCP server: scale_recipe, get_ratio, list_recipes
│   └── prep-mcp/          ← MCP server: build_shift_prep, get_mise_en_place
├── supabase/
│   ├── migrations/        ← V001–V008 forward-only SQL
│   └── seed.sql           ← Dev seed (do not modify without permission)
ARCHITECTURE.md            ← System design and data flows
TODO.md                    ← Current open work — read every session
CHANGELOG.md               ← Change history
```

---

## Key Files for Every Agent Session

```
ARCHITECTURE.md    ← system design, data flows, module responsibilities
TODO.md            ← current open work — read this every session
CHANGELOG.md       ← record of what changed and when
apps/web/.env.example  ← required env vars (no values committed)
```

---

## Active Agents for This Project

```
Always active:   COHERENCE · SECURITY · DOCS
Project default: ENGINEER · DATABASE · UX · QA
Rarely needed:   BUSINESS · AI (load only when working on MCP / AI features)
```

---

## Project-Specific Rules

1. **Migrations are forward-only.** Never modify an existing `V00N__*.sql` file. Always add a new `V00(N+1)` migration.
2. **All Supabase tables use Row-Level Security (RLS).** Every new table must have `ALTER TABLE ... ENABLE ROW LEVEL SECURITY` and at least one policy in its migration.
3. **All mutations use TanStack Query `useMutation`.** No raw `supabase` calls in page components — always go through a hook in `apps/web/src/hooks/`.
4. **Toast on every mutation outcome.** Every `useMutation` must have `onSuccess` calling `toast.success()` and `onError` calling `toast.error()`. No silent failures.
5. **`seed.sql` is protected.** Do not modify `supabase/seed.sql` without explicit user permission.
6. **No `localStorage` or `sessionStorage`.** The app runs in sandboxed contexts. Use in-memory state or TanStack Query cache only.
7. **TypeScript strict mode.** No `any` types, no `// @ts-ignore` without a comment explaining why.
8. **Tailwind class ordering.** Follow the Prettier-Tailwind plugin order: layout → sizing → spacing → typography → visual → state.
9. **Components cap at `--text-xl` (web app rule).** No hero-scale display text inside the authenticated layout.
10. **MCP servers (`recipe-mcp`, `prep-mcp`) must not import from `apps/web/`.** Packages flow downward only: `packages/*` → `mcp/*` and `apps/*`.

---

## Environment Variables

| Variable | Required | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | Yes | Supabase project REST URL |
| `VITE_SUPABASE_ANON_KEY` | Yes | Supabase anon/public key |

Never commit values. See `apps/web/.env.example` for the key list.

---

## Current Phase Context

```
Phase goal:          Deploy v0.1 to Vercel and wire Supabase secrets.
                     All pages built, all mutations have toast feedback,
                     error boundary and 404 page in place.
Definition of done:  Vercel deploy succeeds, auth flow works on prod URL,
                     recipes and prep planner functional end-to-end.
Blocking issues:     Supabase project secrets not yet added to Vercel env.
Next phase:          Phase 2 — Stripe billing + subscription gating.
```

---

## Known Issues / Watch List

- `dashboard_stats` query key is invalidated by `useTogglePrepItem`, `useCompletePrepPlan`, `useUpsertParLevel`, and `useDeleteParLevel` — ensure `DashboardPage` uses this exact key when that query is added.
- `PrepHistoryPage` is a stub — it renders but has no real query yet. Next agent session should wire `useQuery` for `prep_plans` filtered by `is_completed = true`.
- `ParLevelModal` disables the ingredient name field when editing — this is intentional (upsert conflict target). Do not change without a migration to rename the unique constraint.
- V008 stock-decrement trigger fires on `prep_plan_items.is_done` update — test carefully when adding bulk-complete flows.

---

## Agent Confirmation for This Repo

After loading this file, add to your `DISPATCH CONFIRMED` block:

```
Project AGENTS.md: loaded
Project: KitchenKit
Stack: TypeScript · React 18 + Vite · Supabase · TanStack Query v5
Phase: 1 — Build complete, pre-deploy
Project rules active: 10 overrides
Known issues noted: yes (4 items)
```

---
*Last updated: 2026-07-02 | Extends: ShadowWalkerNC/.github/AGENTS.md | Repo: [KitchenKit](https://github.com/ShadowWalkerNC/KitchenKit)*
