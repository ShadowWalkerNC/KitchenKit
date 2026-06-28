-- V005: Prep plans + prep plan items
-- A prep plan is a shift's to-do list: what to make and how much.
-- Items are derived from par levels but can be manually adjusted.

create type public.shift_name as enum ('AM', 'PM', 'Brunch', 'Dinner', 'Overnight', 'Custom');

create table if not exists public.prep_plans (
  id           uuid primary key default gen_random_uuid(),
  user_id      uuid not null references public.profiles(id) on delete cascade,
  shift        public.shift_name not null,
  plan_date    date not null default current_date,
  notes        text,
  is_completed boolean not null default false,
  completed_at timestamptz,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);

create index prep_plans_user_id_idx  on public.prep_plans(user_id);
create index prep_plans_date_idx     on public.prep_plans(plan_date desc);

-- Unique plan per user/shift/date
create unique index prep_plans_user_shift_date_uidx
  on public.prep_plans(user_id, shift, plan_date);

create trigger prep_plans_updated_at
  before update on public.prep_plans
  for each row execute function public.set_updated_at();

-- Prep plan line items
create table if not exists public.prep_plan_items (
  id              uuid primary key default gen_random_uuid(),
  prep_plan_id    uuid not null references public.prep_plans(id) on delete cascade,
  ingredient_name text not null,
  prep_amount     numeric(10, 2) not null check (prep_amount >= 0),
  unit            text not null default 'g',
  -- Optional recipe link for mise en place
  recipe_id       uuid references public.recipes(id) on delete set null,
  is_done         boolean not null default false,
  done_at         timestamptz,
  note            text,
  sort_order      integer not null default 0,
  created_at      timestamptz not null default now()
);

create index prep_plan_items_plan_id_idx on public.prep_plan_items(prep_plan_id);

-- RLS — plans
alter table public.prep_plans enable row level security;

create policy "Users can manage own prep plans"
  on public.prep_plans for all
  using (auth.uid() = user_id)
  with check (auth.uid() = user_id);

-- RLS — items (inherit plan ownership)
alter table public.prep_plan_items enable row level security;

create policy "Prep items readable via plan ownership"
  on public.prep_plan_items for select
  using (
    exists (
      select 1 from public.prep_plans p
      where p.id = prep_plan_id and p.user_id = auth.uid()
    )
  );

create policy "Prep items writable via plan ownership"
  on public.prep_plan_items for insert
  with check (
    exists (
      select 1 from public.prep_plans p
      where p.id = prep_plan_id and p.user_id = auth.uid()
    )
  );

create policy "Prep items updatable via plan ownership"
  on public.prep_plan_items for update
  using (
    exists (
      select 1 from public.prep_plans p
      where p.id = prep_plan_id and p.user_id = auth.uid()
    )
  );

create policy "Prep items deletable via plan ownership"
  on public.prep_plan_items for delete
  using (
    exists (
      select 1 from public.prep_plans p
      where p.id = prep_plan_id and p.user_id = auth.uid()
    )
  );
