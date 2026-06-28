-- V006: RPC helper functions
-- Callable from the app and MCP servers via supabase.rpc().

-- scale_recipe(recipe_id, target_base_weight)
-- Returns each ingredient scaled to the target base weight.
create or replace function public.scale_recipe(
  p_recipe_id          uuid,
  p_target_base_weight numeric
)
returns table (
  ingredient_name text,
  ratio           numeric,
  scaled_amount   numeric,
  unit            text
)
language sql stable security definer set search_path = public as $$
  select
    i.name                                  as ingredient_name,
    i.ratio                                 as ratio,
    round(i.ratio * p_target_base_weight, 2) as scaled_amount,
    i.unit                                  as unit
  from public.ingredients i
  join public.recipes r on r.id = i.recipe_id
  where i.recipe_id = p_recipe_id
    and (r.user_id = auth.uid() or r.is_public = true)
  order by i.sort_order, i.name;
$$;

-- build_shift_prep(shift, plan_date)
-- Returns all par items below par for a given shift, auto-creating the plan if needed.
create or replace function public.build_shift_prep(
  p_user_id  uuid,
  p_shift    public.shift_name,
  p_date     date default current_date
)
returns table (
  ingredient_name text,
  prep_amount     numeric,
  unit            text,
  par_amount      numeric,
  current_stock   numeric,
  recipe_id       uuid
)
language sql stable security definer set search_path = public as $$
  select
    pl.ingredient_name,
    round(pl.par_amount - pl.current_stock, 2) as prep_amount,
    pl.unit,
    pl.par_amount,
    pl.current_stock,
    pl.recipe_id
  from public.par_levels pl
  where pl.user_id = p_user_id
    and pl.current_stock < pl.par_amount
  order by pl.ingredient_name;
$$;

-- get_recipe_with_ingredients(recipe_id)
-- Single call to fetch a recipe + all its ingredients.
create or replace function public.get_recipe_with_ingredients(
  p_recipe_id uuid
)
returns json
language plpgsql stable security definer set search_path = public as $$
declare
  v_result json;
begin
  select json_build_object(
    'id',              r.id,
    'name',            r.name,
    'description',     r.description,
    'base_ingredient', r.base_ingredient,
    'yield_unit',      r.yield_unit,
    'tags',            r.tags,
    'is_public',       r.is_public,
    'ingredients',     (
      select json_agg(
        json_build_object(
          'id',         i.id,
          'name',       i.name,
          'ratio',      i.ratio,
          'unit',       i.unit,
          'sort_order', i.sort_order,
          'note',       i.note
        ) order by i.sort_order, i.name
      )
      from public.ingredients i
      where i.recipe_id = r.id
    )
  )
  into v_result
  from public.recipes r
  where r.id = p_recipe_id
    and (r.user_id = auth.uid() or r.is_public = true);

  return v_result;
end;
$$;
