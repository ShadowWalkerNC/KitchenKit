<!-- HEADER -->
<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=180&section=header&text=KitchenKit&fontSize=52&fontColor=fff&animation=fadeIn&fontAlignY=38&desc=Recipe+Manager+%C2%B7+Shift+Prep+Planner&descAlignY=60&descSize=18" width="100%" />
</div>

<p align="center">
  <img src="https://img.shields.io/badge/Status-Alpha-green?style=for-the-badge" />
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
- Par-level tracking with below-par alerts
- Shift completion with automatic stock decrement

### Connected (CulinaryOS Ecosystem)
- `recipe-mcp` → `scale_recipe` · `get_ratio` · `list_recipes` · `generate_prep_list`
- `prep-mcp` → `build_shift_prep` · `get_mise_en_place` · `project_batch_size`

---

## 🛠️ Stack

| Layer | Tech |
|-------|------|
| Monorepo | Turborepo · pnpm workspaces |
| Frontend | React 18 · Vite · TypeScript · Tailwind CSS v3 |
| State / Data | TanStack Query v5 · react-hot-toast |
| Backend / DB | Supabase (PostgreSQL · Auth · Row-Level Security) |
| Icons | Lucide React |
| Mobile (planned) | Kotlin · Jetpack Compose |
| AI / MCP | Anthropic Claude via MCP servers |
| Deploy | Vercel (web) · Supabase hosted DB |

---

## 📁 Repository Structure

```
kitchenkit/
├── apps/
│   └── web/                    # React 18 · Vite · TypeScript
│       └── src/
│           ├── components/
│           │   ├── auth/        # RequireAuth guard
│           │   ├── layout/      # Layout, Sidebar, Topbar
│           │   ├── prep/        # ParLevelModal
│           │   ├── recipes/     # RecipeForm, IngredientRow, ScaleWidget
│           │   └── ui/          # ErrorBoundary, shared primitives
│           ├── context/         # AuthContext
│           ├── hooks/           # useRecipes, useParLevels, usePrepPlans
│           ├── lib/             # supabase.ts client
│           └── pages/           # Route-level page components
├── packages/
│   ├── ratio-engine/            # Pure TS ratio math (zero deps)
│   └── prep-engine/             # Shift plans · mise en place calculations
├── mcp/
│   ├── recipe-mcp/              # scale_recipe · get_ratio · list_recipes · generate_prep_list
│   └── prep-mcp/                # build_shift_prep · get_mise_en_place · project_batch_size
├── supabase/
│   ├── migrations/              # V001–V008 forward-only SQL migrations
│   └── seed.sql                 # Dev seed data
├── AGENTS.md                    # AI agent instructions for this repo
├── ARCHITECTURE.md              # System design, data flows, module responsibilities
├── CHANGELOG.md                 # Full change history
└── TODO.md                      # Prioritised open work
```

---

## 🧠 The Ratio Blueprint Engine

Other recipe apps store `bread_flour: 500g`. KitchenKit stores `bread_flour: 100%` and understands the *relationship* between ingredients — enabling true scaling, food cost projection, and AI-assisted adaptation via MCP.

---

## 🚀 Getting Started

### Prerequisites
- Node.js 20+
- pnpm 9+
- A Supabase project

### Install

```bash
pnpm install
```

### Environment Variables

Copy `apps/web/.env.example` to `apps/web/.env.local` and fill in:

```env
VITE_SUPABASE_URL=https://<project>.supabase.co
VITE_SUPABASE_ANON_KEY=<anon-key>
```

### Run

```bash
pnpm dev          # starts apps/web at localhost:5173
```

### Database

Apply all migrations against your Supabase project in order (V001 → V008). The Supabase Dashboard SQL editor or the Supabase CLI both work.

---

## 🚢 Deploy to Vercel

1. Push this repo to GitHub
2. Import into Vercel — set **Root Directory** to `apps/web`
3. Add env vars: `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`
4. Vercel auto-detects Vite — build command `vite build`, output `dist`

---

## 🔗 CulinaryOS Ecosystem

| Product | Role | Bridge |
|---------|------|--------|
| **CulinaryOS** | Full restaurant OS | Hub |
| **KitchenKit** | Recipe + prep planning | `recipe-mcp` · `prep-mcp` |
| **CulinaryOps** | Ops intelligence | `ops-mcp` |
| **Post-Pilot** | AI social media | `postpilot-mcp` (planned) |

---

## 🚧 Status: 🟢 Alpha — Build Complete

- [x] Turborepo monorepo scaffold
- [x] `ratio-engine` package (pure TS, zero deps)
- [x] `prep-engine` package
- [x] `recipe-mcp` server
- [x] `prep-mcp` server
- [x] Supabase schema — V001–V008 migrations
- [x] Auth — Supabase magic link + `AuthContext`
- [x] Recipes — full CRUD, ratio-based ingredients, tag support
- [x] Recipe scaling UI — interactive `ScaleWidget`
- [x] Par levels — upsert / delete, below-par highlights
- [x] Prep Planner — save plan, checkbox completion, progress bar
- [x] Prep History page
- [x] Dashboard with live stats
- [x] Toast notifications on all mutations
- [x] Error boundary + 404 page
- [x] Sidebar nav fix (Dashboard active link)
- [ ] First Vercel deploy + Supabase secrets wired
- [ ] Stripe billing
- [ ] Mobile app (Kotlin · Jetpack Compose)

---

<div align="center">
  <img src="https://capsule-render.vercel.app/api?type=waving&color=gradient&customColorList=6,11,20&height=100&section=footer" width="100%" />
  <sub>Part of the <a href="https://github.com/ShadowWalkerNC/CulinaryOS">CulinaryOS Ecosystem</a> · Built by <a href="https://github.com/ShadowWalkerNC">ShadowWalkerNC</a></sub>
</div>
