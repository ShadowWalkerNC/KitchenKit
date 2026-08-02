# Handoff Report — Explorer 3 (Milestone 3 UX & Hook Audit)

## 1. Observation

### A. TanStack Query Hooks & Toast Feedback Audit
Inspected all files in `apps/web/src/hooks/`:
- **`useRecipes.ts`**:
  - `useCreateRecipe` (Line 112): `onSuccess` calls `toast.success(\`Recipe "${data.name}" created\`)` (Line 144); `onError` calls `toast.error(\`Failed to create recipe: ${err.message}\`)` (Line 147).
  - `useUpdateRecipe` (Line 155): `onSuccess` calls `toast.success('Recipe updated')` (Line 184); `onError` calls `toast.error(\`Failed to update recipe: ${err.message}\`)` (Line 187).
  - `useDeleteRecipe` (Line 195): `onSuccess` calls `toast.success('Recipe deleted')` (Line 204); `onError` calls `toast.error(\`Failed to delete recipe: ${err.message}\`)` (Line 207).
- **`usePrepPlans.ts`**:
  - `useSavePrepPlan` (Line 49): `onSuccess` calls `toast.success('Prep plan saved')` (Line 91); `onError` calls `toast.error(\`Failed to save plan: ${err.message}\`)` (Line 94).
  - `useTogglePrepItem` (Line 99): `onSuccess` calls `toast.success('Item marked done')` when `isDone` is true (Line 120); `onError` calls `toast.error(\`Failed to update item: ${err.message}\`)` (Line 123).
  - `useCompletePrepPlan` (Line 128): `onSuccess` calls `toast.success('Shift complete! 🎉')` (Line 156); `onError` calls `toast.error(\`Failed to complete shift: ${err.message}\`)` (Line 159).
- **`useParLevels.ts`**:
  - `useUpsertParLevel` (Line 75): `onSuccess` calls `toast.success(...)` (Line 98); `onError` calls `toast.error(\`Failed to save par level: ${err.message}\`)` (Line 101).
  - `useDeleteParLevel` (Line 106): `onSuccess` calls `toast.success('Par item removed')` (Line 116); `onError` calls `toast.error(\`Failed to delete par item: ${err.message}\`)` (Line 119).

All 8 mutations across the codebase are encapsulated in TanStack Query hooks and provide feedback via `toast.success` and `toast.error`. No direct Supabase mutation calls exist in page/view components.

### B. Auth Session Handling & RLS Policy Compliance
- **`AuthContext.tsx`**:
  - Lines 29–32: Hydrates session on mount via `supabase.auth.getSession()`.
  - Lines 35–40: Listens to auth state changes via `supabase.auth.onAuthStateChange()`, updating session state and cleaning up `subscription.unsubscribe()`.
  - `RequireAuth.tsx`: Wraps protected routes, rendering `FullScreenSpinner` when `loading` is true and redirecting to `/login` when `session` is null.
- **Database RLS Policies (`supabase/migrations/V001` - `V009`)**:
  - `public.profiles`: RLS enabled (V001:42); SELECT/UPDATE restricted to `auth.uid() = id`.
  - `public.recipes`: RLS enabled (V002:25); SELECT allowed for owner or `is_public = true`; INSERT/UPDATE/DELETE restricted to `auth.uid() = user_id`.
  - `public.ingredients`: RLS enabled (V003:25); inherited recipe ownership checks for SELECT/INSERT/UPDATE/DELETE.
  - `public.par_levels`: RLS enabled (V004:30); policy for ALL operations enforced by `auth.uid() = user_id`.
  - `public.prep_plans`: RLS enabled (V005:49); policy for ALL operations enforced by `auth.uid() = user_id`.
  - `public.prep_plan_items`: RLS enabled (V005:57); inherited plan ownership checks for SELECT/INSERT/UPDATE/DELETE.
  - RPC Security: `V009__fix_trigger_and_rpc_security.sql` sets `search_path = public` and validates `p_user_id = auth.uid()` for security definer RPC functions.

### C. Web App UX Rules Audit
- **Rule: No `localStorage` or `sessionStorage`**: Grep search across `apps/web/src/` returned 0 matches for `localStorage` and `sessionStorage`. All UI state relies on React state and TanStack Query cache.
- **Rule: Text size capped at `--text-xl` inside authenticated layout**:
  - `apps/web/src/pages/DashboardPage.tsx`:
    - Line 46: `<h2 className="text-2xl font-bold text-zinc-100">` (`text-2xl` exceeds `--text-xl`).
    - Line 60: `<p className="text-3xl font-bold tabular-nums text-zinc-100">` (`text-3xl` exceeds `--text-xl`).
    - Line 99: `<span className="text-2xl">🧠</span>` (`text-2xl` exceeds `--text-xl`).
  - `apps/web/src/pages/RecipeDetailPage.tsx`:
    - Line 82: `<h2 className="text-2xl font-bold text-zinc-100">{recipe.name}</h2>` (`text-2xl` exceeds `--text-xl`).

### D. Identified Bugs & Issues
1. **BUG 1 — ParLevel Delete UUID Mismatch (`apps/web/src/pages/ParLevelsPage.tsx`)**:
   - `ParLevelsPage.tsx` line 13: `const [confirmDelete, setConfirmDelete] = useState<string | null>(null);` (commented `// ingredient_name`).
   - Line 110: `onClick={() => setConfirmDelete(item.ingredient_name)}` passes ingredient name string.
   - Line 144: `deleteParLevel(confirmDelete)` calls `useDeleteParLevel` mutation.
   - `useParLevels.ts` line 109: `supabase.from('par_levels').delete().eq('id', id)`.
   - `par_levels.id` is a UUID column (V004:6). Passing an ingredient name string causes Postgres error `invalid input syntax for type uuid: "<name>"`.
2. **BUG 2 — Table Name Mismatch (`apps/web/src/hooks/useRecipes.ts`)**:
   - `useRecipes.ts` (lines 81, 99, 135, 172, 176) queries `.from('recipe_ingredients')`.
   - Migration `V003__ingredients.sql` creates `public.ingredients` (and RPC `V006` queries `public.ingredients`).
   - Querying `recipe_ingredients` instead of `ingredients` will fail at runtime with table not found error (`42P01`).
3. **BUG 3 — Topbar Route Title Omission (`apps/web/src/components/layout/Topbar.tsx`)**:
   - Line 6: `titles: Record<string, string> = { '/dashboard': 'Dashboard', '/recipes': 'Recipes', '/prep': 'Prep Planner' }`.
   - Missing entry for `'/par-levels'`. When navigating to Par Levels page, Topbar displays fallback `'KitchenKit'` instead of `'Par Levels'`.

---

## 2. Logic Chain

1. **Toast Notification Verification**:
   - Analyzed each hook in `apps/web/src/hooks/`.
   - All 8 mutation hooks (`useCreateRecipe`, `useUpdateRecipe`, `useDeleteRecipe`, `useSavePrepPlan`, `useTogglePrepItem`, `useCompletePrepPlan`, `useUpsertParLevel`, `useDeleteParLevel`) implement both `onSuccess` (triggering `toast.success`) and `onError` (triggering `toast.error`).
   - Conclusion: 100% compliance with mutation toast feedback rule.

2. **RLS & Auth Session Handling Verification**:
   - `AuthContext.tsx` handles initial session fetch and runtime session subscription via `onAuthStateChange`.
   - All database tables defined in `V001`-`V009` have `ROW LEVEL SECURITY` explicitly enabled and user-scoped policies (`auth.uid() = user_id`).
   - Conclusion: RLS enforcement and session state management conform to security requirements.

3. **Web App Layout Rule Compliance**:
   - Audited storage APIs: No `localStorage` or `sessionStorage` references found in `apps/web/src/`.
   - Audited typography: AGENTS.md rule 9 requires capping font sizes at `--text-xl` inside the authenticated layout.
   - Identified 4 violations of typography capping: `DashboardPage.tsx` lines 46 (`text-2xl`), 60 (`text-3xl`), 99 (`text-2xl`), and `RecipeDetailPage.tsx` line 82 (`text-2xl`).

4. **UI State & Deletion Bug Analysis**:
   - In `ParLevelsPage.tsx`, `confirmDelete` state is set to `item.ingredient_name`.
   - `deleteParLevel` mutation executes `.delete().eq('id', confirmDelete)`.
   - Because `id` is a UUID column, passing `ingredient_name` causes a UUID cast error in PostgreSQL. The row is never deleted and an error toast appears.
   - Proposed fix snippet for `ParLevelsPage.tsx`: Store `DBParLevel` or `{ id: string, name: string }` in `confirmDelete`, and pass `confirmDelete.id` to `deleteParLevel`.

---

## 3. Caveats

- Investigation was performed in strict read-only mode — no source code files in `apps/web/` or `supabase/` were edited.
- Live database queries were not executed against a live Supabase instance; findings are based on static code analysis of hooks, components, and SQL migration files.

---

## 4. Conclusion

- **Toast Notifications**: Complete compliance across all TanStack Query mutation hooks.
- **Auth & RLS**: Fully compliant. Session management and RLS policy design are solid.
- **Storage Rules**: 0 instances of `localStorage`/`sessionStorage`.
- **Text Size Rule Violations**: Found 4 font size violations (`text-2xl` and `text-3xl`) in authenticated pages (`DashboardPage.tsx`, `RecipeDetailPage.tsx`).
- **Actionable Bugs**:
  1. Fix `ParLevelsPage.tsx` deletion handler to pass `item.id` instead of `item.ingredient_name`.
  2. Reconcile table name `recipe_ingredients` in `useRecipes.ts` with `ingredients` in `V003__ingredients.sql`.
  3. Add `'/par-levels': 'Par Levels'` to `titles` map in `Topbar.tsx`.

---

## 5. Verification Method

To verify these findings independently:
1. **Toast Notification & Hook Compliance**:
   - Inspect `apps/web/src/hooks/useRecipes.ts`, `usePrepPlans.ts`, and `useParLevels.ts`. Confirm every `useMutation` block contains both `onSuccess` calling `toast.success` and `onError` calling `toast.error`.
2. **Text Size Violations**:
   - Search for `text-[2-9]xl` in `apps/web/src/`:
     `grep -rn "text-[2-9]xl" apps/web/src/`
   - Observe matches in `DashboardPage.tsx` (lines 46, 60, 99) and `RecipeDetailPage.tsx` (line 82).
3. **ParLevel Deletion Bug**:
   - Open `apps/web/src/pages/ParLevelsPage.tsx` at line 110 (`setConfirmDelete(item.ingredient_name)`) and line 144 (`deleteParLevel(confirmDelete)`).
   - Compare against `apps/web/src/hooks/useParLevels.ts` line 109 (`.delete().eq('id', id)`).
4. **Table Name Discrepancy**:
   - Inspect `apps/web/src/hooks/useRecipes.ts` line 81 vs `supabase/migrations/V003__ingredients.sql` line 7.
