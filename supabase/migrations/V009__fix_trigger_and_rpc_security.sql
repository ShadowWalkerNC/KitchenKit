-- V009: Fix stock decrement trigger column bug, secure RPC search_path, add get_dashboard_stats RPC and missing foreign key indexes.
-- Forward-only migration extending V001-V008.

-- ---------------------------------------------------------------------------
-- 1. Fix decrement_stock_on_prep_complete trigger function
--    Fixes bug referencing non-existent NEW.plan_id -> NEW.prep_plan_id
--    Sets search_path = public and lower(ingredient_name) matching.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.decrement_stock_on_prep_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id uuid;
  v_ingredient_name text;
  v_prep_amount numeric;
BEGIN
  -- Only act when is_done flips from false to true
  IF OLD.is_done = true OR NEW.is_done = false THEN
    RETURN NEW;
  END IF;

  -- Resolve user_id and ingredient_name from the parent prep_plan
  SELECT pp.user_id, NEW.ingredient_name
  INTO v_user_id, v_ingredient_name
  FROM public.prep_plans pp
  WHERE pp.id = NEW.prep_plan_id;

  v_prep_amount := NEW.prep_amount;

  -- Decrement current stock, flooring at 0
  UPDATE public.par_levels
  SET
    current_stock = GREATEST(0, current_stock - v_prep_amount),
    updated_at    = now()
  WHERE user_id = v_user_id
    AND lower(ingredient_name) = lower(v_ingredient_name);

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrement_stock_on_prep_complete ON public.prep_plan_items;

CREATE TRIGGER trg_decrement_stock_on_prep_complete
  AFTER UPDATE OF is_done ON public.prep_plan_items
  FOR EACH ROW
  EXECUTE FUNCTION public.decrement_stock_on_prep_complete();

COMMENT ON FUNCTION public.decrement_stock_on_prep_complete IS
  'Decrements par_levels.current_stock by prep_amount when a prep item is marked done.';

-- ---------------------------------------------------------------------------
-- 2. Secure build_shift_prep RPC function
--    Enforces p_user_id = auth.uid() check to prevent unauthorized data access.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.build_shift_prep(
  p_user_id  uuid,
  p_shift    public.shift_name,
  p_date     date default current_date
)
RETURNS TABLE (
  ingredient_name text,
  prep_amount     numeric,
  unit            text,
  par_amount      numeric,
  current_stock   numeric,
  recipe_id       uuid
)
LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    pl.ingredient_name,
    round(pl.par_amount - pl.current_stock, 2) AS prep_amount,
    pl.unit,
    pl.par_amount,
    pl.current_stock,
    pl.recipe_id
  FROM public.par_levels pl
  WHERE pl.user_id = p_user_id
    AND (auth.uid() IS NULL OR p_user_id = auth.uid())
    AND pl.current_stock < pl.par_amount
  ORDER BY pl.ingredient_name;
$$;

-- ---------------------------------------------------------------------------
-- 3. Add get_dashboard_stats RPC function
--    Returns aggregate counts for recipes, par items, below par items, and active prep plans.
-- ---------------------------------------------------------------------------
CREATE OR REPLACE FUNCTION public.get_dashboard_stats(
  p_user_id uuid DEFAULT auth.uid()
)
RETURNS json
LANGUAGE plpgsql STABLE SECURITY DEFINER SET search_path = public AS $$
DECLARE
  v_effective_user_id uuid;
  v_total_recipes bigint;
  v_total_par_items bigint;
  v_below_par_items bigint;
  v_active_prep_plans bigint;
BEGIN
  v_effective_user_id := COALESCE(p_user_id, auth.uid());

  IF v_effective_user_id IS NULL THEN
    RAISE EXCEPTION 'User not authenticated';
  END IF;

  IF auth.uid() IS NOT NULL AND auth.uid() != v_effective_user_id THEN
    RAISE EXCEPTION 'Permission denied: cannot query stats for another user';
  END IF;

  SELECT count(*) INTO v_total_recipes
  FROM public.recipes
  WHERE user_id = v_effective_user_id;

  SELECT count(*) INTO v_total_par_items
  FROM public.par_levels
  WHERE user_id = v_effective_user_id;

  SELECT count(*) INTO v_below_par_items
  FROM public.par_levels
  WHERE user_id = v_effective_user_id
    AND current_stock < par_amount;

  SELECT count(*) INTO v_active_prep_plans
  FROM public.prep_plans
  WHERE user_id = v_effective_user_id
    AND is_completed = false;

  RETURN json_build_object(
    'total_recipes',     v_total_recipes,
    'total_par_items',   v_total_par_items,
    'below_par_items',   v_below_par_items,
    'active_prep_plans', v_active_prep_plans
  );
END;
$$;

COMMENT ON FUNCTION public.get_dashboard_stats IS
  'Returns aggregate metrics for user dashboard (recipes, par levels, active prep plans).';

-- ---------------------------------------------------------------------------
-- 4. Foreign Key Indexes for Performance
-- ---------------------------------------------------------------------------
CREATE INDEX IF NOT EXISTS idx_par_levels_recipe_id ON public.par_levels(recipe_id);
CREATE INDEX IF NOT EXISTS idx_prep_plan_items_recipe_id ON public.prep_plan_items(recipe_id);
