## 2026-08-02T17:38:48Z
You are Explorer 3 for Milestone 3 (R3 Web App UX Enhancements) of KitchenKit.

Working Directory: c:\Users\white\OneDrive\Documents\GitHub\KitchenKit\.agents\teamwork_preview_explorer_m3_3
Project Scope: c:\Users\white\OneDrive\Documents\GitHub\KitchenKit\PROJECT.md

Task:
1. Create your working directory `.agents/teamwork_preview_explorer_m3_3/` if needed, write `progress.md` and `BRIEFING.md`.
2. Audit all TanStack Query hooks in `apps/web/src/hooks/` (`useRecipes.ts`, `usePrepPlans.ts`, `useParLevels.ts`).
3. Verify that ALL mutations call `toast.success(...)` on success and `toast.error(...)` on error.
4. Verify RLS policy compliance, auth session handling in `AuthContext.tsx`, and web app rules:
   - Text size capped at `--text-xl` inside authenticated layout.
   - No usage of `localStorage` or `sessionStorage`.
5. Identify any missing toast notifications or UI state bugs across pages.
6. Write your findings to `.agents/teamwork_preview_explorer_m3_3/handoff.md` and notify parent. Do NOT edit any source code.
