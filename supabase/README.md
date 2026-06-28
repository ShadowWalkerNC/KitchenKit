# KitchenKit — Supabase Schema

## Migrations

Forward-only. Run in order. Never edit a migration after it has been applied.

| File | Description |
|------|-------------|
| `V001__init_users.sql` | `profiles` table + `handle_new_user` trigger + `set_updated_at` helper |
| `V002__recipes.sql` | `recipes` table + RLS |
| `V003__ingredients.sql` | `ingredients` table (ratio-based) + RLS |
| `V004__par_levels.sql` | `par_levels` table (standing inventory targets) + RLS |
| `V005__prep_plans.sql` | `prep_plans` + `prep_plan_items` tables + RLS |
| `V006__rpc_helpers.sql` | RPC functions: `scale_recipe`, `build_shift_prep`, `get_recipe_with_ingredients` |

## Applying Migrations

```bash
# Via Supabase CLI (local dev)
supabase db reset

# Or manually via Supabase dashboard SQL editor
# Copy-paste each V00X file in order
```

## Seed Data

`seed.sql` populates two demo recipes (Brioche Dough, Classic Vinaigrette) and demo par levels.
Update the demo user UUID before running.

```bash
supabase db seed
```

## RPC Functions (callable from app + MCP)

### `scale_recipe(recipe_id, target_base_weight)`
Returns all ingredients scaled to the target base weight.
```ts
const { data } = await supabase.rpc('scale_recipe', {
  p_recipe_id: 'uuid',
  p_target_base_weight: 500,
});
```

### `build_shift_prep(user_id, shift, date?)`
Returns all par items below par for a given shift.
```ts
const { data } = await supabase.rpc('build_shift_prep', {
  p_user_id: userId,
  p_shift: 'AM',
  p_date: '2026-06-28',
});
```

### `get_recipe_with_ingredients(recipe_id)`
Single call — returns recipe + all ingredients as JSON.
```ts
const { data } = await supabase.rpc('get_recipe_with_ingredients', {
  p_recipe_id: 'uuid',
});
```

## Table Overview

```
profiles           — user profile (extends auth.users)
recipes            — recipe blueprints (ratio-based)
  └── ingredients  — one row per ingredient, stored as ratio
par_levels         — standing stock targets per ingredient
prep_plans         — shift prep plans
  └── prep_plan_items — line items (what to prep + how much)
```

## RLS Policy Summary

All tables enforce Row Level Security.
- Users can only read/write their own data.
- Recipes marked `is_public = true` are readable by anyone.
- Ingredients and prep items inherit permissions from their parent record.
