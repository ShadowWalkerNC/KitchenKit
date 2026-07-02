-- V008: auto-decrement par_levels.current_stock when a prep_plan_item is marked done
-- Trigger fires AFTER UPDATE on prep_plan_items when is_done flips from false → true.
-- Decrements current_stock by prep_amount, flooring at 0.

CREATE OR REPLACE FUNCTION decrement_stock_on_prep_complete()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_ingredient_name text;
  v_prep_amount numeric;
BEGIN
  -- Only act when is_done flips to true
  IF OLD.is_done = true OR NEW.is_done = false THEN
    RETURN NEW;
  END IF;

  -- Resolve user_id and ingredient_name from the plan
  SELECT pp.user_id, NEW.ingredient_name
  INTO v_user_id, v_ingredient_name
  FROM prep_plans pp
  WHERE pp.id = NEW.plan_id;

  v_prep_amount := NEW.prep_amount;

  -- Decrement, floor at 0
  UPDATE par_levels
  SET
    current_stock = GREATEST(0, current_stock - v_prep_amount),
    updated_at    = now()
  WHERE user_id         = v_user_id
    AND ingredient_name = v_ingredient_name;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_decrement_stock_on_prep_complete ON prep_plan_items;

CREATE TRIGGER trg_decrement_stock_on_prep_complete
  AFTER UPDATE OF is_done ON prep_plan_items
  FOR EACH ROW
  EXECUTE FUNCTION decrement_stock_on_prep_complete();

COMMENT ON FUNCTION decrement_stock_on_prep_complete IS
  'Decrements par_levels.current_stock by prep_amount when a prep item is marked done.';
