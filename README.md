<!-- HEADER -->
<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=180&section=header&text=KitchenKit&fontSize=52&fontColor=fff&animation=fadeIn&fontAlignY=38&desc=Recipe+Manager+%C2%B7+Shift+Prep+Planner&descAlignY=60&descSize=18" width="100%" />
</div>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Planning-purple?style=for-the-badge" />
  &nbsp;
  <img src="https://img.shields.io/badge/Stack-TypeScript%20%C2%B7%20React%2018%20%C2%B7%20Supabase-3178C6?style=for-the-badge" />
  &nbsp;
  <img src="https://img.shields.io/badge/Part_of-CulinaryOS_Ecosystem-orange?style=for-the-badge" />
</p>

---

## 🍳 What is KitchenKit?

**KitchenKit** is a standalone recipe manager and shift prep planner built for anyone who cooks seriously — home cooks, personal chefs, caterers, and restaurant teams. It merges `RecipeOS` and `PrepFlow` into one product.

### Standalone
- Recipe manager with scaling, unit conversion, and metric support
- **Ratio Blueprint Engine** — stores recipes as ratios (`bread_flour: 100%`) not absolute weights
- Mise en place generation from any recipe
- Shift prep list builder — plan exactly what to prep and how much

### Connected (CulinaryOS Ecosystem)
- `recipe-mcp` → `scale_recipe` · `get_ratio` · `list_recipes` · `generate_prep_list`
- `prep-mcp` → `build_shift_prep` · `get_mise_en_place` · `project_batch_size`

---

## 🛠️ Stack

| Layer | Tech |
|-------|------|
| Monorepo | Turborepo · pnpm workspaces |
| Frontend | React 18 · Vite · TypeScript |
| Backend / DB | Supabase (PostgreSQL · Auth · Realtime) |
| Mobile (future) | Kotlin · Jetpack Compose |
| AI / MCP | Anthropic Claude via MCP servers |

---

## 📁 Structure

```
kitchenkit/
├── apps/web/             # React 18 · Vite
├── packages/
│   ├── ratio-engine/     # Pure TS ratio math (zero deps)
│   └── prep-engine/      # Shift plans · mise en place
├── mcp/
│   ├── recipe-mcp/       # scale_recipe · get_ratio · list_recipes · generate_prep_list
│   └── prep-mcp/         # build_shift_prep · get_mise_en_place · project_batch_size
└── supabase/migrations/
```

---

## 🧠 The Ratio Blueprint Engine

Other recipe apps store `bread_flour: 500g`. KitchenKit stores `bread_flour: 100%` and understands the *relationship* between ingredients — enabling true scaling, food cost projection, and AI-assisted adaptation via MCP.

---

## 🔗 Ecosystem

| Product | Role | Bridge |
|---------|------|--------|
| **CulinaryOS** | Full restaurant OS | Hub |
| **KitchenKit** | Recipe + prep planning | `recipe-mcp` · `prep-mcp` |
| **CulinaryOps** | Ops intelligence | `ops-mcp` |
| **Post-Pilot** | AI social media | `postpilot-mcp` (future) |

---

## 🚧 Status: 🟣 Planning

- [x] Repo created
- [x] Turborepo scaffold
- [x] `ratio-engine` package (core logic)
- [x] `prep-engine` package
- [x] `recipe-mcp` stub server
- [x] `prep-mcp` stub server
- [ ] `apps/web` UI build
- [ ] Supabase schema
- [ ] Auth (magic link)
- [ ] Stripe billing
- [ ] Connect MCP stubs to Supabase
- [ ] Mobile app (Kotlin)

---

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=100&section=footer" width="100%" />
  <sub>Part of the <a href="https://github.com/ShadowWalkerNC/CulinaryOS">CulinaryOS Ecosystem</a> · Built by <a href="https://github.com/ShadowWalkerNC">ShadowWalkerNC</a></sub>
</div>
