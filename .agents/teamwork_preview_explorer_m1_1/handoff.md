# Handoff Report: Monorepo Build Setup & TypeScript Audit (Milestone 1)

**Agent:** Explorer 1  
**Milestone:** 1 — R1 Production Deployment Readiness & Database Migration Audit  
**Target:** KitchenKit Monorepo Build Setup & Workspace Compilation Audit  

---

## 1. Observation

### Build Setup & Scripts Inspection
- **Monorepo Layout**: Turborepo + pnpm monorepo configured via `pnpm-workspace.yaml` containing `apps/*`, `packages/*`, and `mcp/*`.
- **Root `package.json`**:
  - `scripts`: `"build": "turbo run build"`, `"type-check": "turbo run type-check"`, `"lint": "turbo run lint"`, `"clean": "turbo run clean"`.
  - `devDependencies`: `"turbo": "^2.0.0"`, `"typescript": "^5.4.0"`.
- **Missing Build / Typecheck Scripts**:
  - `mcp/recipe-mcp/package.json` has `"build": "tsc"`, `"dev": "tsx src/index.ts"`, `"clean": "rm -rf dist"`. It **lacks** `"type-check"` and `"lint"` scripts.
  - `mcp/prep-mcp/package.json` has `"build": "tsc"`, `"dev": "tsx src/index.ts"`, `"clean": "rm -rf dist"`. It **lacks** `"type-check"` and `"lint"` scripts.
  - `packages/ratio-engine/package.json` and `packages/prep-engine/package.json` have `"build": "tsc"` and `"type-check": "tsc --noEmit"`, but **lack** `"lint"` scripts.
  - Because `mcp/recipe-mcp` and `mcp/prep-mcp` lack a `"type-check"` script, running `turbo run type-check` completely ignores both MCP servers.

---

### Workspace Compilation Audit Results

#### Package 1: `@kitchenkit/ratio-engine` (`packages/ratio-engine`)
- **Command**: `node node_modules/typescript/lib/tsc.js -p packages/ratio-engine --noEmit`
- **Result**: Success (0 errors).
- **Build Output**: `dist/index.js`, `dist/index.d.ts` generated cleanly.

#### Package 2: `@kitchenkit/prep-engine` (`packages/prep-engine`)
- **Command**: `node node_modules/typescript/lib/tsc.js -p packages/prep-engine --noEmit`
- **Result**: Failed (1 TypeScript error).
- **Verbatim Error**:
  ```text
  packages/prep-engine/src/index.ts(6,42): error TS6059: File 'C:/Users/white/OneDrive/Documents/GitHub/KitchenKit/packages/ratio-engine/src/index.ts' is not under 'rootDir' 'C:/Users/white/OneDrive/Documents/GitHub/KitchenKit/packages/prep-engine/src'. 'rootDir' is expected to contain all source files.
  ```
- **Configuration Root Cause**: `packages/prep-engine/tsconfig.json` lines 13–15 specify:
  ```json
  "paths": {
    "@kitchenkit/ratio-engine": ["../ratio-engine/src/index"]
  }
  ```
  Path mapping points directly to the source `.ts` file of `ratio-engine` outside `prep-engine`'s `rootDir`, causing TS6059. Removing or adjusting this path mapping allows `tsc` to resolve `@kitchenkit/ratio-engine` via node_modules/workspace declaration files.

#### Package 3: `@kitchenkit/web` (`apps/web`)
- **Command**: `node node_modules/typescript/lib/tsc.js -p apps/web --noEmit`
- **Result**: Failed (8 TypeScript errors).
- **Verbatim Errors**:
  ```text
  apps/web/src/components/recipes/CreateRecipeModal.tsx(3,32): error TS2305: Module '"@/hooks/useRecipes"' has no exported member 'CreateRecipeInput'.
  apps/web/src/components/recipes/EditRecipeModal.tsx(3,47): error TS2305: Module '"@/hooks/useRecipes"' has no exported member 'UpdateRecipeInput'.
  apps/web/src/hooks/useRecipes.ts(34,47): error TS2740: Type 'Record<string, number>' is missing the following properties from type 'Ingredient[]': length, pop, push, concat, and 28 more.
  apps/web/src/lib/supabase.ts(3,33): error TS2339: Property 'env' does not exist on type 'ImportMeta'.
  apps/web/src/lib/supabase.ts(4,37): error TS2339: Property 'env' does not exist on type 'ImportMeta'.
  apps/web/src/pages/ParLevelsPage.tsx(90,30): error TS2339: Property 'shifts' does not exist on type 'DBParLevel'.
  apps/web/src/pages/ParLevelsPage.tsx(93,31): error TS2339: Property 'shifts' does not exist on type 'DBParLevel'.
  apps/web/src/types/index.ts(2,46): error TS2307: Cannot find module '@kitchenkit/prep-engine' or its corresponding type declarations.
  ```
- **Error Causes**:
  1. `CreateRecipeModal.tsx:3` & `EditRecipeModal.tsx:3`: `useRecipes.ts` defines mutation payload types inline instead of exporting `export type CreateRecipeInput` and `export type UpdateRecipeInput`.
  2. `useRecipes.ts:34`: `toEngineRecipe()` returns `{ baseIngredient, ingredients }` where `ingredients` is formatted as `Record<string, number>` instead of `Ingredient[]` (`Array<{ name: string; ratio: number; unit?: string }>`).
  3. `supabase.ts:3-4`: Vite client types are missing because `apps/web/src/vite-env.d.ts` is missing and `"types": ["vite/client"]` is absent from `apps/web/tsconfig.json`.
  4. `ParLevelsPage.tsx:90,93`: `ParLevelsPage` accesses `item.shifts` in rendering, but `DBParLevel` in `useParLevels.ts` does not declare `shifts?: string[]`.
  5. `types/index.ts:2`: Cannot resolve `@kitchenkit/prep-engine` because `prep-engine` build is broken by TS6059 (see Package 2 above).

#### Package 4: `@kitchenkit/recipe-mcp` (`mcp/recipe-mcp`)
- **Command**: `node node_modules/typescript/lib/tsc.js -p mcp/recipe-mcp --noEmit`
- **Result**: Failed (3 TypeScript errors).
- **Verbatim Errors**:
  ```text
  mcp/recipe-mcp/src/index.ts(21,25): error TS2580: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node`.
  mcp/recipe-mcp/src/index.ts(22,25): error TS2580: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node`.
  mcp/recipe-mcp/src/index.ts(26,3): error TS2580: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node`.
  ```
- **Cause**: `@types/node` is omitted from `devDependencies` in `mcp/recipe-mcp/package.json`.

#### Package 5: `@kitchenkit/prep-mcp` (`mcp/prep-mcp`)
- **Command**: `node node_modules/typescript/lib/tsc.js -p mcp/prep-mcp --noEmit`
- **Result**: Failed (3 TypeScript errors).
- **Verbatim Errors**:
  ```text
  mcp/prep-mcp/src/index.ts(19,21): error TS2580: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node`.
  mcp/prep-mcp/src/index.ts(20,21): error TS2580: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node`.
  mcp/prep-mcp/src/index.ts(24,3): error TS2580: Cannot find name 'process'. Do you need to install type definitions for node? Try `npm i --save-dev @types/node`.
  ```
- **Cause**: `@types/node` is omitted from `devDependencies` in `mcp/prep-mcp/package.json`.

---

## 2. Logic Chain

1. **Monorepo Script Completeness**:
   - `turbo.json` schedules `build`, `dev`, `lint`, and `type-check` tasks across workspaces.
   - `mcp/recipe-mcp/package.json` and `mcp/prep-mcp/package.json` lack `"type-check": "tsc --noEmit"` and `"lint"` scripts, causing Turborepo to skip type safety checks on both MCP packages during `pnpm run type-check`.

2. **Package Dependency & Build Ordering**:
   - `@kitchenkit/web` depends on `@kitchenkit/ratio-engine` and `@kitchenkit/prep-engine`.
   - `@kitchenkit/prep-engine` depends on `@kitchenkit/ratio-engine`.
   - `prep-engine`'s `tsconfig.json` paths point to `../ratio-engine/src/index` instead of built declarations, triggering TS6059 (`File is not under rootDir`).
   - Because `prep-engine` fails to compile, `apps/web/src/types/index.ts` fails to resolve `@kitchenkit/prep-engine`, propagating build failure upwards.

3. **Application Type Mismatches in `apps/web`**:
   - `CreateRecipeModal.tsx` and `EditRecipeModal.tsx` attempt to import named types `CreateRecipeInput` and `UpdateRecipeInput` from `useRecipes.ts`, but `useRecipes.ts` failed to export them.
   - `toEngineRecipe()` in `useRecipes.ts` produces a key-value record `{ [name]: ratio }` instead of an array of ingredient objects `{ name, ratio, unit }`, violating `Recipe` in `@kitchenkit/ratio-engine`.
   - `ParLevelsPage.tsx` expects `shifts?: string[]` on `DBParLevel` for shift badges, but `useParLevels.ts` omitted `shifts` from `DBParLevel`.
   - `import.meta.env` requires Vite ambient type declarations (`vite/client`), which are missing due to absent `vite-env.d.ts` and absent `compilerOptions.types: ["vite/client"]`.

4. **MCP Environment Types**:
   - Both `recipe-mcp` and `prep-mcp` reference global `process.env.KITCHENKIT_SUPABASE_URL` and `process.env.KITCHENKIT_SUPABASE_SERVICE_KEY`.
   - Without `@types/node` in `devDependencies`, `tsc` under `NodeNext` target cannot resolve global `process`.

---

## 3. Caveats

- **Runtime Execution**: We performed static TypeScript compilation (`tsc --noEmit`) and package structure auditing. Database connections to live Supabase instances were not executed as part of this static build audit.
- **Node environment / tool execution**: Commands were executed using the workspace Node environment (`node node_modules/typescript/lib/tsc.js`). Native `pnpm` runner behavior on Windows powershell was accommodated via node script invocation.

---

## 4. Conclusion & Recommended Fix Strategy

Only 1 out of 5 workspace packages (`@kitchenkit/ratio-engine`) currently compiles with zero TypeScript errors. The remaining 4 packages fail compilation with 15 distinct TypeScript/configuration errors and 2 missing workspace build scripts.

### Actionable Fix Strategy for Implementer:

1. **Fix `packages/prep-engine/tsconfig.json`**:
   - Remove or update `"paths": { "@kitchenkit/ratio-engine": ["../ratio-engine/src/index"] }` so `prep-engine` resolves the built declaration files or workspace package instead of raw `.ts` source files across packages.

2. **Fix `mcp/recipe-mcp` & `mcp/prep-mcp`**:
   - Add `@types/node`: `^20.0.0` to `devDependencies` in `mcp/recipe-mcp/package.json` and `mcp/prep-mcp/package.json`.
   - Add `"type-check": "tsc --noEmit"` and `"lint": "eslint src"` (or `"type-check": "tsc --noEmit"`) scripts to `package.json` in both MCP directories.

3. **Fix `@kitchenkit/web` (`apps/web`)**:
   - Create `apps/web/src/vite-env.d.ts` with `/// <reference types="vite/client" />`.
   - In `apps/web/src/hooks/useRecipes.ts`:
     - Export `CreateRecipeInput` and `UpdateRecipeInput` types.
     - Update `toEngineRecipe(r: DBRecipe): Recipe` to return `{ id: r.id, name: r.name, baseIngredient: r.base_ingredient, ingredients: r.ingredients.map(ing => ({ name: ing.name, ratio: Number(ing.ratio), unit: ing.unit })) }`.
   - In `apps/web/src/hooks/useParLevels.ts`:
     - Add `shifts?: string[];` to `DBParLevel` interface.

---

## 5. Verification Method

To independently verify all workspace packages compile cleanly after applying fixes:

1. **Build base packages**:
   `node node_modules/typescript/lib/tsc.js -p packages/ratio-engine`
   `node node_modules/typescript/lib/tsc.js -p packages/prep-engine`

2. **Typecheck all packages**:
   `node node_modules/typescript/lib/tsc.js -p packages/ratio-engine --noEmit`
   `node node_modules/typescript/lib/tsc.js -p packages/prep-engine --noEmit`
   `node node_modules/typescript/lib/tsc.js -p apps/web --noEmit`
   `node node_modules/typescript/lib/tsc.js -p mcp/recipe-mcp --noEmit`
   `node node_modules/typescript/lib/tsc.js -p mcp/prep-mcp --noEmit`

3. **Invalidation condition**: Any non-zero exit code or error output from `tsc --noEmit` on any of the 5 workspace packages indicates compilation failure.
