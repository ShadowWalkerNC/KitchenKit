# TODO — KitchenKit

> Read this file at the start of every agent session.
> Mark items `[x]` when done. Add new items at the top of the relevant section.
> Cross-reference: `ARCHITECTURE.md` for design context · `CHANGELOG.md` for history.

---

## 🔴 Blocking — Must do before first deploy

- [ ] Add `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` to Vercel project environment variables
- [ ] Run all migrations V001–V008 against production Supabase project
- [ ] Verify Supabase magic link redirect URL is set to the Vercel production URL
- [ ] Run `pnpm install` after pulling — `react-hot-toast` is new in `apps/web/package.json`

---

## 🟡 High Priority — Next session

- [ ] Wire `PrepHistoryPage` — query `prep_plans` filtered by `is_completed = true`, ordered by `completed_at DESC`; display as a table of completed shifts with item count and completion time
- [ ] Add `DashboardPage` query — `get_dashboard_stats` RPC is defined in V006 but `DashboardPage` still uses mock/static values; wire to `useQuery` with key `['dashboard_stats']`
- [ ] `apps/web/.env.example` — confirm this file exists with `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY` keys (no values)

---

## 🟢 Normal — Near-term improvements

- [ ] Edit existing par level item from the planner page — currently `ParLevelModal` is add-only from `ParLevelsPage`; wire an edit button per row in `PrepPlannerPage` that opens the modal with the existing item
- [ ] `usePrepPlans` invalidate `['dashboard_stats']` in `useTogglePrepItem` already done — confirm `DashboardPage` uses that exact query key
- [ ] Recipe tag filtering — `RecipesPage` has a search input but no tag filter UI; add tag chip filters above the recipe list
- [ ] Recipe sort options — sort by name, date created, last updated
- [ ] Prep history delete — add a delete button per row on `PrepHistoryPage` (soft delete: set `is_completed = false` or hard delete)
- [ ] Mobile bottom nav — the current mobile sidebar drawer works but a bottom tab bar would be faster for kitchen tablet use

---

## 🔵 Phase 2 — Stripe billing

- [ ] Stripe product + price setup (monthly subscription)
- [ ] Stripe webhook handler (Supabase Edge Function or Vercel API route)
- [ ] `subscriptions` table in Supabase tracking `user_id`, `stripe_customer_id`, `status`
- [ ] Subscription gate on recipe count (free tier: 10 recipes max)
- [ ] Billing page in the web app (`/settings/billing`)
- [ ] Stripe Checkout redirect flow

---

## 🟣 Phase 3 — Mobile (Kotlin)

- [ ] Kotlin + Jetpack Compose project scaffold under `apps/android/`
- [ ] Supabase Kotlin client integration
- [ ] Auth (magic link deep-link handling on Android)
- [ ] Recipe list + detail screens
- [ ] Prep planner screen with checkbox completion

---

## ✅ Done

- [x] Turborepo monorepo scaffold
- [x] `ratio-engine` + `prep-engine` packages
- [x] `recipe-mcp` + `prep-mcp` MCP server stubs
- [x] Supabase migrations V001–V008
- [x] Auth — magic link + AuthContext + RequireAuth
- [x] Layout shell — Sidebar (responsive), Topbar
- [x] Recipes — full CRUD with ratio-based ingredients
- [x] Recipe scaling UI — `ScaleWidget` on detail page
- [x] Par levels — `ParLevelsPage`, `ParLevelModal`, `useParLevels`
- [x] Prep Planner — save plan, checkbox items, progress bar, Complete Shift
- [x] Dashboard — KPI stats page
- [x] Toast notifications — `react-hot-toast` on all mutations
- [x] Error boundary — `ErrorBoundary` wrapping `<Layout>`
- [x] 404 page — `NotFoundPage` + catch-all route
- [x] Sidebar nav fix — Dashboard link to `/dashboard`
