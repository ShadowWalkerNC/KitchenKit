## 2026-08-02T17:45:11Z
<USER_REQUEST>
You are Worker 1 for Milestone 3 (R3 Web App UX Enhancements) of KitchenKit.

Working Directory: c:\Users\white\OneDrive\Documents\GitHub\KitchenKit\.agents\teamwork_preview_worker_m3
Project Scope: c:\Users\white\OneDrive\Documents\GitHub\KitchenKit\PROJECT.md

Mandatory Instructions:
DO NOT CHEAT. All implementations must be genuine. DO NOT hardcode test results, create dummy/facade implementations, or circumvent the intended task. A Forensic Auditor will independently verify your work. Integrity violations WILL be detected and your work WILL be rejected.

Context & Explorer Handing:
Review Explorer handoff reports at:
- `.agents/teamwork_preview_explorer_m3_1/handoff.md`
- `.agents/teamwork_preview_explorer_m3_2/handoff.md`
- `.agents/teamwork_preview_explorer_m3_3/handoff.md`

Your Objective:
1. Implement Recipe Tag Filtering Chips & Sorting on `RecipesPage.tsx`:
   - Extract unique tags from recipes (`tags: string[]`).
   - Add interactive tag filter chips (`All` + individual tag chips with active state).
   - Add Sort dropdown (`Name A-Z`, `Name Z-A`, `Created Newest/Oldest`, `Updated Newest/Oldest`).
   - Dynamic client-side filtering and sorting without page reloads.

2. Implement Station Prep Sheet View & Printing (`PrepPlannerPage.tsx`):
   - Create `apps/web/src/components/prep/StationPrepSheet.tsx` formatted for kitchen line station prep use.
   - Create `apps/web/src/components/prep/StationExportModal.tsx` modal with Print button, Copy Text List button (formatted text for messaging), and station view.
   - Add `@media print` CSS rules in `apps/web/src/index.css` hiding `.no-print` elements (sidebar, topbar, controls, buttons) and displaying clean printable prep sheet.
   - Wire "Station Sheet" button in `PrepPlannerPage.tsx`.

3. Fix UX Violations & Bugs:
   - Replace any `text-2xl` or `text-3xl` classes inside auth layout with `text-xl` (in `DashboardPage.tsx` and `RecipeDetailPage.tsx` per Project Rule 9).
   - Fix `ParLevelsPage.tsx` delete button: pass `item.id` to `deleteParLevel` mutation instead of `item.ingredient_name`.
   - Add `'/par-levels'` title mapping in `Topbar.tsx`.

4. Run Monorepo Build & Verification:
   - Run `pnpm --recursive exec tsc --noEmit` and `pnpm build` across workspace (ensure 0 TS errors).
   - Write handoff report to `.agents/teamwork_preview_worker_m3/handoff.md` and send message to parent orchestrator.
</USER_REQUEST>
