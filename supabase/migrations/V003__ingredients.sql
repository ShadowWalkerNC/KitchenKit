-- V003: Ingredients table
-- Each row is one ingredient in a recipe, stored as a ratio.
--
-- ratio: decimal relative to the base ingredient weight.
--   e.g. bread_flour = 1.0, butter = 0.45 means butter is 45% of the flour weight.

create table if not exists public.ingredients (
  id           uuid primary key default gen_random_uuid(),
  recipe_id    uuid not null references public.recipes(id) on delete cascade,
  name         text not null,
  ratio        numeric(10, 6) not null check (ratio > 0),
  unit         text not null default 'g',
  sort_order   integer not null default 0,
  note         text,
  created_at   timestamptz not null default now()
);

create index ingredients_recipe_id_idx on public.ingredients(recipe_id);

-- Unique ingredient name per recipe
create unique index ingredients_recipe_name_uidx
  on public.ingredients(recipe_id, lower(name));

-- RLS — inherit recipe ownership (select via recipe join; write requires recipe ownership)
alter table public.ingredients enable row level security;

create policy "Ingredients readable if recipe is readable"
  on public.ingredients for select
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id
        and (r.user_id = auth.uid() or r.is_public = true)
    )
  );

create policy "Ingredients writable by recipe owner"
  on public.ingredients for insert
  with check (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  );

create policy "Ingredients updatable by recipe owner"
  on public.ingredients for update
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  );

create policy "Ingredients deletable by recipe owner"
  on public.ingredients for delete
  using (
    exists (
      select 1 from public.recipes r
      where r.id = recipe_id and r.user_id = auth.uid()
    )
  );
