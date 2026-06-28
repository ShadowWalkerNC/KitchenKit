# KitchenKit MCP Servers

Two MCP servers expose KitchenKit data to the CulinaryOS AI hub and any other MCP-compatible AI tool.

---

## Servers

| Server | Version | Tools |
|--------|---------|-------|
| `recipe-mcp` | 0.2.0 | `scale_recipe` · `get_ratio` · `list_recipes` · `generate_prep_list` |
| `prep-mcp`   | 0.2.0 | `build_shift_prep` · `get_mise_en_place` · `project_batch_size` · `update_stock` |

---

## Environment Variables

Both servers require the same two env vars:

```env
KITCHENKIT_SUPABASE_URL=https://your-project.supabase.co
KITCHENKIT_SUPABASE_SERVICE_KEY=your-service-role-key
```

> ⚠️ Use the **service role key** (not the anon key). MCP servers run server-side and bypass RLS where needed. Never expose the service key to the browser.

Copy `.env.example` → `.env` in each server directory.

---

## Running Locally

```bash
# recipe-mcp
cd mcp/recipe-mcp
cp .env.example .env   # fill in your Supabase creds
pnpm dev

# prep-mcp
cd mcp/prep-mcp
cp .env.example .env
pnpm dev
```

---

## Tool Reference

### recipe-mcp

#### `scale_recipe`
```json
{
  "recipe_id": "uuid",
  "target_base_weight": 500
}
```
Returns each ingredient scaled to the target base weight.

#### `get_ratio`
```json
{
  "recipe_id": "uuid",
  "ingredient_name": "bread_flour"
}
```
Returns ratio and unit for a single ingredient.

#### `list_recipes`
```json
{
  "tag": "bread",
  "limit": 20
}
```
Lists recipes. Optional tag filter.

#### `generate_prep_list`
```json
{
  "recipe_id": "uuid",
  "target_base_weight": 1000,
  "label": "Saturday Brunch"
}
```
Returns a formatted mise en place checklist.

---

### prep-mcp

#### `build_shift_prep`
```json
{
  "user_id": "uuid",
  "shift": "AM",
  "date": "2026-06-28"
}
```
Returns all par items below par for the given shift.

#### `get_mise_en_place`
```json
{
  "recipe_id": "uuid",
  "target_base_weight": 500
}
```
Returns a formatted mise en place list.

#### `project_batch_size`
```json
{
  "portion_weight": 180,
  "covers": 40,
  "waste_factor": 1.1
}
```
Projects total batch size needed for a cover count.

#### `update_stock`
```json
{
  "user_id": "uuid",
  "ingredient_name": "Hollandaise",
  "current_stock": 350
}
```
Updates current stock level for a par item.

---

## CulinaryOS Integration

These servers are registered in the `culinaryos-mcp` master router:

```
CulinaryOS AI
  ├──▶ recipe-mcp   [KitchenKit]
  └──▶ prep-mcp     [KitchenKit]
```

When connected, the CulinaryOS AI can answer prompts like:
- *"Scale the brioche recipe to 48 portions for Saturday service."*
- *"What's my AM prep list for today?"*
- *"Update hollandaise stock to 350g."*
