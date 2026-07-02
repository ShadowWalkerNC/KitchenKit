-- V007: Additional RPC helpers for prep plan save/load flow
--
-- get_prep_plan_with_items(shift, plan_date)
-- Returns a prep plan header + all its items for a given user/shift/date.
-- Used by the web app to load a saved plan in one round-trip.

create or replace function public.get_prep_plan_with_items(
  p_shift     public.shift_name,
  p_date      date default current_date
)
returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_result json;
begin
  select json_build_object(
    'id',            pp.id,
    'shift',         pp.shift,
    'plan_date',     pp.plan_date,
    'is_completed',  pp.is_completed,
    'completed_at',  pp.completed_at,
    'notes',         pp.notes,
    'created_at',    pp.created_at,
    'items', (
      select json_agg(
        json_build_object(
          'id',              ppi.id,
          'ingredient_name', ppi.ingredient_name,
          'prep_amount',     ppi.prep_amount,
          'unit',            ppi.unit,
          'recipe_id',       ppi.recipe_id,
          'is_done',         ppi.is_done,
          'done_at',         ppi.done_at,
          'note',            ppi.note,
          'sort_order',      ppi.sort_order
        ) order by ppi.sort_order, ppi.ingredient_name
      )
      from public.prep_plan_items ppi
      where ppi.prep_plan_id = pp.id
    )
  )
  into v_result
  from public.prep_plans pp
  where pp.user_id = auth.uid()
    and pp.shift = p_shift
    and pp.plan_date = p_date;

  return v_result;
end;
$$;

-- build_and_save_shift_prep(shift, plan_date)
-- Convenience RPC: generates a prep plan from current par levels and upserts
-- it into prep_plans + prep_plan_items in a single atomic transaction.
-- Idempotent: calling it again re-builds the list (useful for stock changes).

create or replace function public.build_and_save_shift_prep(
  p_shift public.shift_name,
  p_date  date default current_date
)
returns uuid
language plpgsql security definer set search_path = public as $$
declare
  v_plan_id uuid;
begin
  -- Upsert plan header
  insert into public.prep_plans(user_id, shift, plan_date, is_completed)
  values (auth.uid(), p_shift, p_date, false)
  on conflict (user_id, shift, plan_date)
  do update set updated_at = now()
  returning id into v_plan_id;

  -- Clear existing undone items
  delete from public.prep_plan_items
  where prep_plan_id = v_plan_id
    and is_done = false;

  -- Insert fresh items from par_levels below par
  insert into public.prep_plan_items
    (prep_plan_id, ingredient_name, prep_amount, unit, recipe_id, sort_order)
  select
    v_plan_id,
    pl.ingredient_name,
    round(pl.par_amount - pl.current_stock, 2),
    pl.unit,
    pl.recipe_id,
    row_number() over (order by pl.ingredient_name) - 1
  from public.par_levels pl
  where pl.user_id = auth.uid()
    and pl.current_stock < pl.par_amount;

  return v_plan_id;
end;
$$;
