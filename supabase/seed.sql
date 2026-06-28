-- KitchenKit seed data
-- Run after migrations to populate demo recipes.
-- Uses a fixed demo user UUID — replace with a real auth.users id before running.

-- NOTE: This seed is for local dev only. Do not run against production.

-- Insert a demo profile (replace UUID with your actual Supabase user ID)
insert into public.profiles (id, display_name)
values ('00000000-0000-0000-0000-000000000001', 'Demo Chef')
on conflict (id) do nothing;

-- Demo Recipe: Brioche Dough
with r as (
  insert into public.recipes (id, user_id, name, description, base_ingredient, yield_unit, tags, is_public)
  values (
    '10000000-0000-0000-0000-000000000001',
    '00000000-0000-0000-0000-000000000001',
    'Brioche Dough',
    'Rich enriched dough. Baker''s percentage based on bread flour.',
    'bread_flour',
    'g',
    array['bread', 'enriched', 'pastry'],
    true
  )
  on conflict (id) do nothing
  returning id
)
insert into public.ingredients (recipe_id, name, ratio, unit, sort_order)
select r.id, v.name, v.ratio, v.unit, v.sort_order
from r,
  (values
    ('bread_flour',   1.000, 'g', 1),
    ('whole_eggs',    0.500, 'g', 2),
    ('butter',        0.450, 'g', 3),
    ('sugar',         0.100, 'g', 4),
    ('whole_milk',    0.120, 'g', 5),
    ('salt',          0.018, 'g', 6),
    ('instant_yeast', 0.015, 'g', 7)
  ) as v(name, ratio, unit, sort_order)
on conflict do nothing;

-- Demo Recipe: Simple Vinaigrette
with r as (
  insert into public.recipes (id, user_id, name, description, base_ingredient, yield_unit, tags, is_public)
  values (
    '10000000-0000-0000-0000-000000000002',
    '00000000-0000-0000-0000-000000000001',
    'Classic Vinaigrette',
    '3:1 oil to acid ratio. Scale the acid to scale the whole recipe.',
    'acid',
    'ml',
    array['sauce', 'dressing', 'ratio'],
    true
  )
  on conflict (id) do nothing
  returning id
)
insert into public.ingredients (recipe_id, name, ratio, unit, sort_order)
select r.id, v.name, v.ratio, v.unit, v.sort_order
from r,
  (values
    ('acid',         1.000, 'ml', 1),
    ('oil',          3.000, 'ml', 2),
    ('dijon',        0.100, 'g',  3),
    ('shallot',      0.150, 'g',  4),
    ('salt',         0.015, 'g',  5),
    ('black_pepper', 0.005, 'g',  6)
  ) as v(name, ratio, unit, sort_order)
on conflict do nothing;

-- Demo par levels
insert into public.par_levels (user_id, ingredient_name, par_amount, current_stock, unit)
values
  ('00000000-0000-0000-0000-000000000001', 'Brioche Dough',   1000, 200,  'g'),
  ('00000000-0000-0000-0000-000000000001', 'Hollandaise',      500,   0,  'g'),
  ('00000000-0000-0000-0000-000000000001', 'Béarnaise',        400, 150,  'g'),
  ('00000000-0000-0000-0000-000000000001', 'Chicken Stock',   2000, 500, 'ml'),
  ('00000000-0000-0000-0000-000000000001', 'Pasta Dough',      800,   0,  'g'),
  ('00000000-0000-0000-0000-000000000001', 'Classic Vinaigrette', 600, 600, 'ml')
on conflict do nothing;
