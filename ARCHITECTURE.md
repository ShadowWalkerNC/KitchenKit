# ARCHITECTURE.md — KitchenKit

> Living document. Update whenever a significant structural decision is made.
> Cross-reference: `TODO.md` for open work · `CHANGELOG.md` for history.

---

## System Overview

KitchenKit is a **pnpm Turborepo monorepo** with three workspace types:

| Workspace | Path | Purpose |
|---|---|---|
| **Web app** | `apps/web` | React 18 + Vite SPA, the primary user interface |
| **Shared packages** | `packages/*` | Pure TypeScript logic with zero runtime deps |
| **MCP servers** | `mcp/*` | Anthropic Model Context Protocol servers for AI integration |

The Supabase project is external — schema is managed entirely through versioned SQL migrations in `supabase/migrations/`.

---

## Dependency Graph

```
          ┌─────────────────────────────────┐
          │         Supabase (hosted)        │
          │   PostgreSQL · Auth · RLS · RPC  │
          └───────────────┬─────────────────┘
                          │ supabase-js v2
          ┌───────────────▼─────────────────┐
          │           apps/web              │
          │  React 18 · Vite · TQ v5 · TS  │
          └──────┬──────────────┬───────────┘
                 │              │
    ┌────────────▼───┐  ┌───────▼──────────┐
    │ ratio-engine   │  │  prep-engine     │
    │ (pure TS)      │  │  (pure TS)       │
    └────────────────┘  └──────────────────┘
                 │              │
    ┌────────────▼───┐  ┌───────▼──────────┐
    │  recipe-mcp    │  │   prep-mcp       │
    │ MCP server     │  │  MCP server      │
    └────────────────┘  └──────────────────┘
```

Packages flow **downward only** — `packages/*` may not import from `apps/*` or `mcp/*`.

---

## Frontend Architecture (`apps/web`)

### Routing

React Router v6 with a single layout shell. All authenticated routes are children of the `<Layout>` route, wrapped in `<RequireAuth>` and `<ErrorBoundary>`.

```
/ (redirect → /dashboard)
/login                     ← magic link login page
/auth/callback             ← Supabase OAuth/magic-link callback
/dashboard                 ← stats overview
/recipes                   ← recipe list
/recipes/:id               ← recipe detail + ScaleWidget
/prep                      ← prep planner
/prep/history              ← completed shift history
/par-levels                ← par level management
* (catch-all)              ← NotFoundPage (404)
```

### Data Layer

All server state lives in **TanStack Query v5**. The pattern is: one file per domain in `src/hooks/`, exporting typed `useQuery` and `useMutation` hooks. Page components never call `supabase` directly.

| Hook file | Query keys | Mutations |
|---|---|---|
| `useRecipes.ts` | `['recipes']` · `['recipe', id]` | create · update · delete |
| `useParLevels.ts` | `['par_levels']` | upsert · delete |
| `usePrepPlans.ts` | `['prep_plan', shift, date]` | save · toggleItem · complete |

`staleTime` is 5 minutes globally. Mutations invalidate their own query key plus `['dashboard_stats']` where relevant.

### Auth

`AuthContext` wraps the app and exposes `{ session, user, loading }`. It listens to `supabase.auth.onAuthStateChange`. `RequireAuth` redirects to `/login` when `session` is null and loading is false.

### Error Handling

- **Render errors**: `ErrorBoundary` class component wrapping `<Layout>`. Shows a friendly card with a "Try again" button.
- **Mutation errors**: `toast.error()` in every `onMutation.onError`. User always sees a message.
- **Unknown routes**: `NotFoundPage` renders for any unmatched path within the authenticated subtree.

---

## Database Schema

All tables use `uuid` primary keys (default `gen_random_uuid()`), have `user_id uuid REFERENCES auth.users` for RLS scoping, and `created_at` / `updated_at` timestamps managed by trigger.

### Tables

#### `users` (profiles)
Mirrors `auth.users`. Created automatically via trigger on sign-up.

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | matches `auth.users.id` |
| `email` | text | |
| `display_name` | text | nullable |
| `created_at` | timestamptz | |

#### `recipes`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | RLS anchor |
| `name` | text | not null |
| `description` | text | nullable |
| `base_ingredient` | text | e.g. `bread_flour` |
| `yield_unit` | text | e.g. `g`, `kg`, `portions` |
| `is_public` | boolean | default false |
| `tags` | text[] | default `{}` |
| `created_at` | timestamptz | |
| `updated_at` | timestamptz | auto-updated by trigger |

#### `recipe_ingredients`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `recipe_id` | uuid FK → recipes | cascade delete |
| `name` | text | ingredient name |
| `ratio` | numeric | relative to base ingredient (100 = 100%) |
| `unit` | text | |
| `sort_order` | integer | |

#### `par_levels`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | RLS anchor |
| `ingredient_name` | text | |
| `par_amount` | numeric | target stock level |
| `current_stock` | numeric | current stock |
| `unit` | text | |
| `updated_at` | timestamptz | |

Unique constraint: `(user_id, ingredient_name)` — used as the upsert conflict target.

#### `prep_plans`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `user_id` | uuid FK | RLS anchor |
| `shift` | text | `morning` · `afternoon` · `evening` |
| `plan_date` | date | |
| `is_completed` | boolean | default false |
| `completed_at` | timestamptz | nullable |
| `created_at` | timestamptz | |

Unique constraint: `(user_id, shift, plan_date)` — upsert conflict target in `useSavePrepPlan`.

#### `prep_plan_items`

| Column | Type | Notes |
|---|---|---|
| `id` | uuid PK | |
| `plan_id` | uuid FK → prep_plans | cascade delete |
| `ingredient_name` | text | |
| `prep_amount` | numeric | |
| `unit` | text | |
| `is_done` | boolean | default false |
| `done_at` | timestamptz | nullable |

### Migration History

| File | Description |
|---|---|
| V001__init_users.sql | `users` profile table + auto-create trigger |
| V002__recipes.sql | `recipes` table + RLS policies |
| V003__ingredients.sql | `recipe_ingredients` table + RLS |
| V004__par_levels.sql | `par_levels` table + RLS |
| V005__prep_plans.sql | `prep_plans` + `prep_plan_items` + RLS |
| V006__rpc_helpers.sql | `get_dashboard_stats` RPC |
| V007__prep_plan_rpc.sql | `get_prep_plan_with_items` + `build_and_save_shift_prep` RPCs |
| V008__stock_decrement_trigger.sql | Trigger: decrement `par_levels.current_stock` when item marked done |

---

## RPC / Database Functions

| Function | Defined in | Returns | Purpose |
|---|---|---|---|
| `get_dashboard_stats(user_id)` | V006 | JSON | Recipe count, par item count, below-par count, active prep plans |
| `get_prep_plan_with_items(shift, date)` | V007 | JSON | Single round-trip fetch of plan + items (used by `prep-mcp`) |
| `build_and_save_shift_prep(shift, date)` | V007 | uuid | Atomic server-side plan creation preserving done items |

---

## Shared Packages

### `@kitchenkit/ratio-engine`

Pure TypeScript, zero runtime dependencies. Exports:

- `type Recipe` — `{ baseIngredient: string, ingredients: Record<string, number> }`
- `scaleRecipe(recipe, targetAmount)` — returns scaled ingredient map
- `getRatio(recipe, ingredient)` — returns ratio for a named ingredient
- `generatePrepList(recipe, batchSize)` — returns `PrepListItem[]`

### `@kitchenkit/prep-engine`

Builds on `ratio-engine`. Exports:

- `buildShiftPrep(parLevels, recipes)` — computes what needs prepping based on current stock vs par
- `getMiseEnPlace(recipe, portions)` — returns mise en place breakdown
- `projectBatchSize(parLevel, recipe)` — calculates how many batches to run

---

## MCP Servers

Both servers are stdio MCP servers conforming to the [Anthropic MCP spec](https://github.com/anthropics/mcp).

### `recipe-mcp`

| Tool | Input | Output |
|---|---|---|
| `scale_recipe` | `recipe_id`, `target_amount` | Scaled ingredient list |
| `get_ratio` | `recipe_id`, `ingredient` | Ratio value |
| `list_recipes` | `user_id` | Recipe summaries |
| `generate_prep_list` | `recipe_id`, `batch_size` | PrepListItem[] |

### `prep-mcp`

| Tool | Input | Output |
|---|---|---|
| `build_shift_prep` | `shift`, `date` | Prep plan items |
| `get_mise_en_place` | `recipe_id`, `portions` | Mise en place breakdown |
| `project_batch_size` | `ingredient`, `par_level` | Recommended batch count |

---

## Environment Variables

| Variable | Where used | Description |
|---|---|---|
| `VITE_SUPABASE_URL` | `apps/web` | Supabase project REST URL |
| `VITE_SUPABASE_ANON_KEY` | `apps/web` | Supabase anon/public key (safe to expose client-side) |

All variables are prefixed `VITE_` for Vite client-side exposure. No server-side secrets exist yet (Stripe keys will be added in Phase 2).

---

## Key Design Decisions

| Decision | Rationale |
|---|---|
| Ratios not absolute amounts | Enables true scaling and AI-assisted adaptation without unit conversion edge cases |
| TanStack Query for all server state | Eliminates custom loading/error state boilerplate; cache invalidation is explicit and auditable |
| Mutations in hooks, never in pages | Pages stay declarative; data logic is testable in isolation |
| Forward-only migrations | Simplifies Supabase hosting — no down migrations needed |
| RLS on every table | Auth enforcement at the DB layer means compromised client code cannot leak data |
| react-hot-toast over custom toasts | Zero-config, accessible, dark-themed — consistent feedback across all mutations |
| ErrorBoundary wrapping Layout | Any unhandled render error shows a recoverable UI instead of a white screen |
| MCP servers as a separate workspace | Keeps AI tooling decoupled from the web app — can be deployed independently |

---

*Last updated: 2026-07-02*
