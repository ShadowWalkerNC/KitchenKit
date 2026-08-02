# Handoff Report: Milestone 1 - Environment Variables & Deployment Audit

**Explorer**: Explorer 3 (Milestone 1)  
**Working Directory**: `.agents/teamwork_preview_explorer_m1_3`  
**Date**: 2026-08-02  
**Status**: Task Complete (Read-Only Audit)

---

## 1. Observation

### Codebase & Configuration Files Inspected

1. **Client-side Supabase Client (`apps/web/src/lib/supabase.ts:1-11`)**:
   - `const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;` (Line 3)
   - `const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;` (Line 4)
   - Runtime assertion: `if (!supabaseUrl || !supabaseAnonKey) { throw new Error('Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY'); }` (Lines 6-8)
   - Export: `export const supabase = createClient(supabaseUrl, supabaseAnonKey);` (Line 10)

2. **Vite Build Configuration (`apps/web/vite.config.ts:1-13`)**:
   - Standard Vite setup with React plugin and `@` alias mapping to `./src`.
   - Uses default Vite `VITE_` prefix matching rule; no custom `envPrefix` required.

3. **`apps/web/.env.example`**:
   - Exists in `apps/web/.env.example` with content:
     ```env
     VITE_SUPABASE_URL=your_supabase_project_url
     VITE_SUPABASE_ANON_KEY=your_supabase_anon_key
     ```

4. **MCP Server Environment Variables**:
   - `mcp/prep-mcp/src/index.ts:19-20`: `process.env.KITCHENKIT_SUPABASE_URL`, `process.env.KITCHENKIT_SUPABASE_SERVICE_KEY`
   - `mcp/recipe-mcp/src/index.ts:21-22`: `process.env.KITCHENKIT_SUPABASE_URL`, `process.env.KITCHENKIT_SUPABASE_SERVICE_KEY`
   - `mcp/recipe-mcp/src/index.ts:11`: JSDoc comment references `KITCHENKIT_SERVICE_ROLE_KEY` (naming mismatch with implementation).
   - Both `mcp/prep-mcp/.env.example` and `mcp/recipe-mcp/.env.example` exist with matching keys: `KITCHENKIT_SUPABASE_URL` and `KITCHENKIT_SUPABASE_SERVICE_KEY`.

5. **GitHub Actions CI/CD (`.github/workflows/deploy.yml:29-41`)**:
   - Pass secrets to Vite build:
     ```yaml
     env:
       VITE_SUPABASE_URL: ${{ secrets.VITE_SUPABASE_URL }}
       VITE_SUPABASE_ANON_KEY: ${{ secrets.VITE_SUPABASE_ANON_KEY }}
     ```
   - Deployment uses `amondnet/vercel-action@v25` with `VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`.

6. **Documentation Files (`ARCHITECTURE.md`, `TODO.md`, `AGENTS.md`, `README.md`)**:
   - `ARCHITECTURE.md:244-251`: Documents `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`. Omits MCP environment variables in main table.
   - `AGENTS.md:107-114`: Lists `VITE_SUPABASE_URL` and `VITE_SUPABASE_ANON_KEY`.
   - `TODO.md:11,22`:
     - Line 11: `- [ ] Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to Vercel project environment variables`
     - Line 22: `- [ ] apps/web/.env.example — confirm this file exists with VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY keys (no values)`
   - `apps/web/src/lib/auth.ts:7`: `emailRedirectTo: `${window.location.origin}/auth/callback``

---

## 2. Logic Chain

1. **Client-Side Env Var Verification**:
   - `import.meta.env` references in `apps/web/src/lib/supabase.ts` correctly align with Vite's client-side environment variable model.
   - The runtime check explicitly guards against missing variables and fails fast with a clear descriptive error message during application startup.

2. **`.env.example` Alignment**:
   - `apps/web/.env.example` exists, contains exact key names (`VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`), and uses dummy placeholder values.
   - Therefore, task item 22 in `TODO.md` (`confirm this file exists...`) has been verified and can be checked off `[x]`.

3. **Supabase Project Configuration Guidelines**:
   - **Client-Side**: Requires `VITE_SUPABASE_URL` (HTTPS REST endpoint) and `VITE_SUPABASE_ANON_KEY` (public JWT anon key). Safe for browser exposure.
   - **Auth Redirects**: `signInWithMagicLink` in `apps/web/src/lib/auth.ts` dynamically sets `emailRedirectTo` to `window.location.origin + '/auth/callback'`.
     - *Requirement*: Production Supabase Project -> Authentication -> URL Configuration MUST have Site URL set to production domain (e.g., `https://kitchenkit.vercel.app`), and Redirect URLs must include `https://*.vercel.app/auth/callback` and `http://localhost:5173/auth/callback`.
   - **Row-Level Security (RLS)**: Verified all 8 migration files (V001–V008) enforce RLS policies targeting `auth.uid() = user_id`.
   - **Service Role Key**: `KITCHENKIT_SUPABASE_SERVICE_KEY` is reserved strictly for server-side MCP servers (`mcp/`) and MUST NOT be exposed in Vercel client environment variables.

4. **Identified Discrepancies & Documentation Gaps**:
   - **Discrepancy 1 (`TODO.md:22`)**: Item 22 is unchecked `[ ]`, but `apps/web/.env.example` already exists and is complete.
   - **Discrepancy 2 (`ARCHITECTURE.md:251`)**: States "No server-side secrets exist yet", omitting the MCP servers' `KITCHENKIT_SUPABASE_SERVICE_KEY`.
   - **Discrepancy 3 (`mcp/recipe-mcp/src/index.ts:11`)**: JSDoc comment names `KITCHENKIT_SERVICE_ROLE_KEY` while the implementation uses `KITCHENKIT_SUPABASE_SERVICE_KEY`.
   - **Discrepancy 4 (`AGENTS.md:21` vs `.github/workflows/deploy.yml`)**: `AGENTS.md` describes CI/CD as "Manual deploy → Vercel Git integration (planned)", but GitHub Actions deploy workflow `.github/workflows/deploy.yml` is already present.
   - **Discrepancy 5 (Deployment Secrets Checklist)**: Neither `TODO.md` nor `AGENTS.md` explicitly lists GitHub Action secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`) required if deploying via GitHub Actions workflow.

---

## 3. Caveats

- **No Live Production Credentials**: Live Vercel dashboard and live Supabase project settings could not be queried directly via API in read-only / CODE_ONLY mode.
- **MCP Server Deployment**: MCP servers currently run locally or as sidecars; they do not get built or deployed by `apps/web` Vercel builds.

---

## 4. Conclusion

- `apps/web/src/lib/supabase.ts` and `apps/web/.env.example` are **100% compliant** with production deployment standards and Vite environment variable handling.
- Documentation and checklist items require minor reconciliation to ensure smooth production onboarding for new developers and automated CI/CD runs.

### Recommended Fix Strategy (For Implementer / Docs Update)

1. **Mark Completed Item in `TODO.md`**:
   - Change line 22 in `TODO.md` from `[ ]` to `[x]` for `apps/web/.env.example`.

2. **Update `ARCHITECTURE.md` Environment Variables Table**:
   - Add MCP server environment variables (`KITCHENKIT_SUPABASE_URL`, `KITCHENKIT_SUPABASE_SERVICE_KEY`) to the environment variable table with scope `mcp/*`.
   - Clarify that service role keys are used exclusively by MCP servers and never included in client-side bundles.

3. **Fix JSDoc Typo in `mcp/recipe-mcp/src/index.ts:11`**:
   - Update comment from `KITCHENKIT_SERVICE_ROLE_KEY` to `KITCHENKIT_SUPABASE_SERVICE_KEY`.

4. **Align CI/CD Documentation in `AGENTS.md` & `TODO.md`**:
   - Note the presence of `.github/workflows/deploy.yml` and document required GitHub secrets (`VERCEL_TOKEN`, `VERCEL_ORG_ID`, `VERCEL_PROJECT_ID`, `VITE_SUPABASE_URL`, `VITE_SUPABASE_ANON_KEY`).

---

## 5. Verification Method

To independently verify these findings:

1. **TypeScript Build Check**:
   ```bash
   pnpm --recursive exec tsc --noEmit
   ```
   *Expected Output*: 0 errors.

2. **Web Package Build Check**:
   ```bash
   pnpm --filter @kitchenkit/web build
   ```
   *Expected Output*: Successful Vite bundle output in `apps/web/dist`.

3. **File Content Inspection**:
   - `apps/web/.env.example` contains `VITE_SUPABASE_URL` & `VITE_SUPABASE_ANON_KEY`.
   - `apps/web/src/lib/supabase.ts` correctly references `import.meta.env.VITE_SUPABASE_URL` and `import.meta.env.VITE_SUPABASE_ANON_KEY`.

### Invalidation Conditions
- Any rename of `VITE_SUPABASE_URL` or `VITE_SUPABASE_ANON_KEY` in `apps/web/src/lib/supabase.ts`.
- Introduction of non-`VITE_` prefixed environment variables intended for browser consumption.
