# Original User Request

## 2026-08-02T17:06:51Z

Project Description:  
KitchenKit Phase 1 Production Deployment & Integration Polish — Finalize production deployment readiness for KitchenKit (standalone recipe manager & shift prep planner and CulinaryOS MCP engine), polish the `recipe-mcp` and `prep-mcp` servers, and implement high-priority UX enhancements (recipe tag filtering/sorting and prep sheet printing/export).

Working directory: c:\Users\white\OneDrive\Documents\GitHub\KitchenKit
Integrity mode: development

Requirements

### R1. Production Deployment & Verification Checklist
- Verify and ensure strict TypeScript compilation across all monorepo packages/apps.
- Verify environment variable requirements and document Supabase project configuration.
- Audit all database migrations V001–V008 to ensure seamless application on production Supabase.

### R2. CulinaryOS MCP Server Polish
- Audit `mcp/recipe-mcp` and `mcp/prep-mcp` server tools (`scale_recipe`, `get_ratio`, `list_recipes`, `build_shift_prep`, `get_mise_en_place`, `project_batch_size`) to ensure compliance with the Anthropic MCP specification.
- Ensure all tool input arguments use strict Zod schemas and all output payloads are structured and formatted clearly for AI agent consumption.

### R3. Web App UX Enhancements
- Implement tag filtering chips and sorting options (name, date created, last updated) on `RecipesPage`.
- Implement a station prep sheet print/export view for active shift prep plans on `PrepPlannerPage`.
- Ensure toast notifications, RLS compliance, and TanStack Query state patterns are strictly followed across new UI mutations/queries.

Acceptance Criteria

### Production & Code Quality
- [ ] Monorepo build script / TypeScript check completes with 0 errors across the monorepo workspace.
- [ ] All database migrations V001–V008 pass syntax and safety checks for PostgreSQL/Supabase.

### MCP Infrastructure
- [ ] `recipe-mcp` and `prep-mcp` stdio servers initialize without errors and properly export valid schemas for all declared tools.

### Web Application UX
- [ ] Tag filtering chips and sorting controls on `RecipesPage` filter/sort recipes dynamically without full page reloads.
- [ ] Shift prep plan view has a dedicated print/export view optimized for kitchen station use.
