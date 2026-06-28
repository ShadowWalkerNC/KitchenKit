-- V004: Par levels table
-- Tracks the standing par (target stock level) for each ingredient per user.
-- Used by the Prep Planner to calculate what needs to be made each shift.

create table if not exists public.par_levels (
  id               uuid primary key default gen_random_uuid(),
  user_id          uuid not null references public.profiles(id) on delete cascade,
  ingredient_name  text not null,
  par_amount       numeric(10, 2) not null check (par_amount >= 0),
  current_stock    numeric(10, 2) not null default 0 check (current_stock >= 0),
  unit             text not null default 'g',
  -- Optional link to a recipe (for made-in-house items)
  recipe_id        uuid references public.recipes(id) on delete set null,
  notes            text,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);

create index par_levels_user_id_idx on public.par_levels(user_id);

-- Unique ingredient name per user
create unique index par_levels_user_ingredient_uidx
  on public.par_levels(user_id, lower(ingredient_name));

create trigger par_levels_updated_at
  before update on public.par_levels
  for each row execute function public.set_updated_at();

-- RLS
alter table public.par_levels enable row level security;

create policy "Users can manage own par levels"
  on public.par_levels for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);
