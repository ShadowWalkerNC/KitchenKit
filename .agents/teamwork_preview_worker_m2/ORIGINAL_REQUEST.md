## 2026-08-02T17:29:30Z
You are Worker 1 for Milestone 2 (R2 CulinaryOS MCP Server Polish) of KitchenKit.

Working Directory: c:\Users\white\OneDrive\Documents\GitHub\KitchenKit\.agents\teamwork_preview_worker_m2
Project Scope: c:\Users\white\OneDrive\Documents\GitHub\KitchenKit\PROJECT.md

Mandatory Instructions:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context & Explorer Handing:
Review Explorer reports at:
- `.agents/teamwork_preview_explorer_m2_1/handoff.md`
- `.agents/teamwork_preview_explorer_m2_2/handoff.md`
- `.agents/teamwork_preview_explorer_m2_3/handoff.md`

Your Objective:
1. Polish `mcp/recipe-mcp` Tools (`scale_recipe`, `get_ratio`, `list_recipes`, `generate_prep_list`):
   - Harden Zod schemas: add `.trim().min(1)` for strings (`recipe_id`, `ingredient`, `tag`, etc.) and `.positive()` for scaling targets.
   - MCP Error Protocol: Set `isError: true` in response when database query fails or entity is not found.
   - Output Formatting: Format all tool outputs into clean dual representations (human-readable Markdown summary + JSON payload) inside the MCP text content block.
   - Remove unused dependencies if any, clean up comments.

2. Polish `mcp/prep-mcp` Tools (`build_shift_prep`, `get_mise_en_place`, `project_batch_size`, `update_stock`, `save_prep_plan`):
   - Fix `update_stock` bug: Add `{ count: 'exact' }` to `.update()` query so `count` is returned accurately instead of returning null and triggering false error.
   - Fix `get_mise_en_place` user_id parameter handling for private recipe scaling.
   - Harden Zod schemas: flexible/descriptive shift parsing (support `morning`, `afternoon`, `evening`, `AM`, `PM`, `Brunch`, `Dinner`, etc. with normalization), `.trim().min(1)` for strings, positive numbers.
   - MCP Error Protocol: Set `isError: true` when resource not found or query fails.
   - Output Formatting: Format all tool outputs into clean dual representations (human-readable Markdown summary/table + JSON payload) inside MCP content blocks.

3. Verify Architectural Boundaries & Build:
   - Ensure 0 imports from `apps/web/` in both MCP servers.
   - Verify TypeScript compilation clean across `mcp/recipe-mcp` and `mcp/prep-mcp`.
   - Test stdio initialization/typecheck scripts.
   - Write handoff report to `.agents/teamwork_preview_worker_m2/handoff.md` and send message to parent orchestrator.
