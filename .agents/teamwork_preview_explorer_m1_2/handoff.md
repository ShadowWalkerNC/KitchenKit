# Handoff Report — Database Migration Audit (V001–V008)

**Agent**: Explorer 2  
**Milestone**: Milestone 1 (R1 Production Deployment Readiness & Database Migration Audit)  
**Working Directory**: `c:\Users\white\OneDrive\Documents\GitHub\KitchenKit\.agents\teamwork_preview_explorer_m1_2`  
**Date**: 2026-08-02  

---

## 1. Observation

Direct observations from auditing `supabase/migrations/` (`V001__init_users.sql` through `V008__stock_decrement_trigger.sql`), `apps/web/src/hooks/`, `ARCHITECTURE.md`, and `seed.sql`:

### Obs 1.1: `V008__stock_decrement_trigger.sql` Column Name Mismatch
- **File**: `supabase/migrations/V008__stock_decrement_trigger.sql` (Line 24)
- **Verbatim Code**:
  ```sql
  SELECT pp.user_id, NEW.ingredient_name
  INTO v_user_id, v_ingredient_name
  FROM prep_plans pp
  WHERE pp.id = NEW.plan_id;
  ```
- **Definition in V005**: `supabase/migrations/V005__prep_plans.sql` (Line 33)
  ```sql
  create table if not exists public.prep_plan_items (
    id              uuid primary key default gen_random_uuid(),
    prep_plan_id    uuid not null references public.prep_plans(id) on delete cascade,
    ...
  ```
- The column name on `prep_plan_items` is `prep_plan_id`, but `V008` references `NEW.plan_id`.

### Obs 1.2: `V008__stock_decrement_trigger.sql` Missing `search_path` Security Setting
- **File**: `supabase/migrations/V008__stock_decrement_trigger.sql` (Lines 5–9)
- **Verbatim Code**:
  ```sql
  CREATE OR REPLACE FUNCTION decrement_stock_on_prep_complete()
  RETURNS TRIGGER
  LANGUAGE plpgsql
  SECURITY DEFINER
  AS $$
  ```
- Functions in `V001`, `V006`, and `V007` all include `SET search_path = public`. `V008` is missing `SET search_path = public`.

### Obs 1.3: `build_shift_prep` RPC Unrestricted `p_user_id` Parameter
- **File**: `supabase/migrations/V006__rpc_helpers.sql` (Lines 31–44, 53)
- **Verbatim Code**:
  ```sql
  create or replace function public.build_shift_prep(
    p_user_id  uuid,
    p_shift    public.shift_name,
    p_date     date default current_date
  )
  ...
  where pl.user_id = p_user_id
  ```
- The function is `SECURITY DEFINER` and takes `p_user_id` as an unvalidated parameter without checking if `p_user_id = auth.uid()`.

### Obs 1.4: Missing RPC Function `get_dashboard_stats`
- **Prompt Task 3 & `ARCHITECTURE.md`**: References RPC function `get_dashboard_stats`.
- **`supabase/migrations/V006__rpc_helpers.sql`**: Contains `scale_recipe`, `build_shift_prep`, and `get_recipe_with_ingredients`. `get_dashboard_stats` does not exist in any migration file (`V001` to `V008`).

### Obs 1.5: `V008` Case-Sensitive Ingredient Name Matching
- **File**: `supabase/migrations/V008__stock_decrement_trigger.sql` (Lines 33–34)
- **Verbatim Code**:
  ```sql
  WHERE user_id         = v_user_id
    AND ingredient_name = v_ingredient_name;
  ```
- `V004__par_levels.sql` (Line 23) enforces unique index on `(user_id, lower(ingredient_name))`. The trigger uses strict exact string equality `=`.

### Obs 1.6: Foreign Key Indexes Missing
- **`V004__par_levels.sql`**: `recipe_id uuid references public.recipes(id)` (Line 13) has no index on `par_levels(recipe_id)`.
- **`V005__prep_plans.sql`**: `recipe_id uuid references public.recipes(id)` (Line 38) has no index on `prep_plan_items(recipe_id)`.

### Obs 1.7: Documentation & Schema Discrepancies
- Table name: `ARCHITECTURE.md` lists table as `recipe_ingredients`; migration `V003__ingredients.sql` creates `public.ingredients`.
- Enum values: `ARCHITECTURE.md` lists shifts as `morning`, `afternoon`, `evening`; `V005__prep_plans.sql` creates enum `public.shift_name as enum ('AM', 'PM', 'Brunch', 'Dinner', 'Overnight', 'Custom')`.

---

## 2. Logic Chain

1. **Trigger Failure (Obs 1.1)**:
   - When a prep plan item is marked completed (`is_done = true`), PostgreSQL executes `trg_decrement_stock_on_prep_complete`.
   - The trigger function executes `WHERE pp.id = NEW.plan_id;`.
   - Because `prep_plan_items` table schema defines the column as `prep_plan_id`, PostgreSQL throws runtime exception: `record "new" has no field "plan_id"`.
   - Result: Shift completion and item toggling fail with a database exception.

2. **Security Vulnerability (Obs 1.2 & 1.3)**:
   - `decrement_stock_on_prep_complete` runs as `SECURITY DEFINER`. Without explicit `SET search_path = public`, execution is vulnerable to search path hijacking in multi-schema or untrusted function contexts.
   - `build_shift_prep` in `V006` runs as `SECURITY DEFINER` and accepts `p_user_id`. Any authenticated user calling this RPC directly with another user's UUID can read that user's low-stock inventory items, bypassing RLS.

3. **RPC Function Deficit (Obs 1.4)**:
   - Milestone verification scope requires validating `get_dashboard_stats`.
   - Since no migration defines `get_dashboard_stats`, any query attempting to invoke `supabase.rpc('get_dashboard_stats')` will fail with `42883: function public.get_dashboard_stats() does not exist`.

4. **Stock Decrement Edge Cases (Obs 1.5)**:
   - `par_levels` unique constraint uses `lower(ingredient_name)`.
   - If an item in `prep_plan_items` has casing variation (e.g. created via custom batch or API), `WHERE ingredient_name = v_ingredient_name` will fail to match, causing stock decrement to silently be skipped.

5. **Performance & Cascade Locks (Obs 1.6)**:
   - Unindexed foreign key columns `recipe_id` in `par_levels` and `prep_plan_items` will lead to sequential scans on `par_levels` and `prep_plan_items` whenever a recipe is deleted or updated.

---

## 3. Caveats

- **Supabase Production Environment**: Live Supabase instance execution was not run directly since no active database connection string is configured in local CLI; analysis was performed by static verification of PostgreSQL AST, SQL syntax, and standard Supabase RLS mechanics.
- **Frontend Mismatch**: `apps/web/src/hooks/usePrepPlans.ts` also references `.eq('plan_id', plan.id)` in JavaScript code. Migration fix V009 must align with whether column should remain `prep_plan_id` or if a view/alias is provided.

---

## 4. Conclusion

The current migration set (`V001` through `V008`) **cannot be deployed to production as-is** due to a blocking runtime crash in `V008` (`NEW.plan_id` reference) and security flaws in `V006`/`V008`.

A new forward-only migration `V009__fix_trigger_and_rpc_security.sql` must be created to:
1. Fix `decrement_stock_on_prep_complete()` trigger function to use `NEW.prep_plan_id`, add `SET search_path = public`, and use `lower(ingredient_name)` matching.
2. Fix `build_shift_prep` RPC function to enforce `p_user_id = auth.uid()` or default to `auth.uid()`.
3. Implement `get_dashboard_stats` RPC function if server-side aggregation is desired.
4. Add indexes on `par_levels(recipe_id)` and `prep_plan_items(recipe_id)`.

---

## 5. Verification Method

To verify these findings independently:

1. **Verify Trigger Bug**:
   - Inspect `supabase/migrations/V008__stock_decrement_trigger.sql` line 24 vs `supabase/migrations/V005__prep_plans.sql` line 33.
   - Run SQL command against PostgreSQL test database:
     ```sql
     UPDATE prep_plan_items SET is_done = true WHERE id = '<item_id>';
     ```
   - Invalidation condition: Output throws `ERROR: record "new" has no field "plan_id"`.

2. **Verify Missing `get_dashboard_stats`**:
   - Grep search `get_dashboard_stats` across `supabase/migrations/`.
   - Result: 0 matches found.

3. **Verify Security Definer Search Path**:
   - Run `SELECT proname, prosecdef, proconfig FROM pg_proc WHERE proname = 'decrement_stock_on_prep_complete';`.
   - Invalidation condition: `proconfig` is NULL (missing `search_path=public`).
