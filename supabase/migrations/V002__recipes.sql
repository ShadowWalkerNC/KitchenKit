-- V002: Recipes table
-- Stores recipes as ratio blueprints, not absolute weights.

create table if not exists public.recipes (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  name             text not null,
  description      text,
  base_ingredient  text not null,         -- The ingredient ratios are calculated against (e.g. 'bread_flour')
  yield_unit       text default 'g',
  tags             text[] default '{}',
  is_public        boolean not null default false,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index recipes_user_id_idx on public.recipes(user_id);
create index recipes_tags_idx    on public.recipes using gin(tags);

create trigger recipes_updated_at
  before update on public.recipes
  for each row execute function public.set_updated_at();

-- RLS
alter table public.recipes enable row level security;

create policy "Users can view own recipes"
  on public.recipes for select
  using (auth.uid() = user_id);

create policy "Users can view public recipes"
  on public.recipes for select
  using (is_public = true);

create policy "Users can insert own recipes"
  on public.recipes for insert
  with check (auth.uid() = user_id);

create policy "Users can update own recipes"
  on public.recipes for update
  using (auth.uid() = user_id);

create policy "Users can delete own recipes"
  on public.recipes for delete
  using (auth.uid() = user_id);
