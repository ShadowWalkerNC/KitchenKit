# Milestone 3 (R3 Web App UX Enhancements): Recipe Tag Filtering & Sorting Specification Report

## 1. Observation

Direct examination of `apps/web/src/pages/RecipesPage.tsx`, `apps/web/src/hooks/useRecipes.ts`, and related modal/detail components yielded the following findings:

### A. Current Hook & Data Model (`apps/web/src/hooks/useRecipes.ts`)
- **DBRecipe Interface (lines 15–27)**:
  ```ts
  export interface DBRecipe {
    id: string;
    user_id: string;
    name: string;
    description: string | null;
    base_ingredient: string;
    yield_unit: string;
    is_public: boolean;
    tags: string[];
    created_at: string;
    updated_at: string;
    ingredients: DBIngredient[];
  }
  ```
- **Data Fetching Query (lines 73–88)**:
  ```ts
  export function useRecipes() {
    return useQuery<DBRecipe[]>({
      queryKey: ['recipes'],
      queryFn: async () => {
        const { data: { user } } = await supabase.auth.getUser();
        if (!user) return [];
        const { data, error } = await supabase
          .from('recipes')
          .select('*, ingredients:recipe_ingredients(*)')
          .eq('user_id', user.id)
          .order('created_at', { ascending: false });
        if (error) throw error;
        return data as DBRecipe[];
      },
    });
  }
  ```
- **Observations on Data Fetching**:
  - The query fetches all recipes belonging to the logged-in user and hardcodes ordering by `created_at` descending.
  - The data contains `created_at`, `updated_at`, `name`, and `tags: string[]`.

### B. Current Recipes Page Implementation (`apps/web/src/pages/RecipesPage.tsx`)
- **State Management (lines 8–11)**:
  ```ts
  const { data: recipes = [], isLoading, error } = useRecipes();
  const [query, setQuery]         = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);
  ```
- **Tag Extraction (lines 13–17)**:
  ```ts
  const allTags = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach((r) => r.tags.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [recipes]);
  ```
- **Text & Tag Filtering Logic (lines 19–30)**:
  ```ts
  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return recipes.filter((r) => {
      const matchesText =
        !q ||
        r.name.toLowerCase().includes(q) ||
        (r.description ?? '').toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q));
      const matchesTag = !activeTag || r.tags.includes(activeTag);
      return matchesText && matchesTag;
    });
  }, [recipes, query, activeTag]);
  ```
- **Tag Chip UI Rendering (lines 63–89)**:
  ```tsx
  {allTags.length > 0 && (
    <div className="flex items-center gap-2 flex-wrap">
      <Tag size={13} className="text-zinc-600 shrink-0" />
      {allTags.map((tag) => (
        <button
          key={tag}
          onClick={() => setActiveTag(activeTag === tag ? null : tag)}
          className={[
            'badge transition-colors cursor-pointer select-none',
            activeTag === tag
              ? 'bg-brand-600/30 text-brand-300 ring-1 ring-brand-600/60'
              : 'bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300',
          ].join(' ')}
        >
          {tag}
        </button>
      ))}
      {activeTag && (
        <button
          onClick={() => setActiveTag(null)}
          className="text-xs text-zinc-600 hover:text-zinc-400 transition-colors ml-1"
        >
          Clear
        </button>
      )}
    </div>
  )}
  ```

### C. Gaps Identified
1. **No "All" Chip**: The current UI hides the tag filter container altogether if `allTags` is empty, and does not provide an explicit "All" chip when tags exist (deselecting relies on re-clicking the active tag or clicking "Clear").
2. **Single-Select Tag Limitation**: `activeTag` state is `string | null`, preventing users from selecting multiple tags simultaneously (e.g. filtering for both "Pastry" and "Sourdough").
3. **No Sorting Options UI**: There is currently no dropdown or sorting state. Recipes are rendered strictly in DB returned order (`created_at` DESC).
4. **No Tag Item Counts**: Tag chips do not indicate how many recipes carry each tag.

---

## 2. Logic Chain

1. **Client-Side vs. Server-Side Execution**:
   - `useRecipes()` loads the entire user recipe list into TanStack Query cache.
   - For typical kitchen / catering usage (tens to hundreds of recipes), executing search text matching, tag filtering, and array sorting purely client-side via React state & `useMemo` avoids network latency, prevents page reloads, and delivers instant (< 16ms) interactive updates.

2. **Sorting Requirements & Data Model Alignment**:
   - Database table `recipes` contains `name` (text), `created_at` (timestamptz), and `updated_at` (timestamptz).
   - `DBRecipe` type already exposes `created_at` and `updated_at` as ISO date strings.
   - Sorting options map directly to:
     - Name A-Z: String locale compare (`a.name.localeCompare(b.name)`).
     - Name Z-A: Reverse string locale compare (`b.name.localeCompare(a.name)`).
     - Date Created (Newest First): `new Date(b.created_at).getTime() - new Date(a.created_at).getTime()`.
     - Date Created (Oldest First): `new Date(a.created_at).getTime() - new Date(b.created_at).getTime()`.
     - Last Updated (Recently Updated): `new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()`.
     - Last Updated (Oldest Updated): `new Date(a.updated_at).getTime() - new Date(b.updated_at).getTime()`.

3. **Tag Chip UX Enhancements**:
   - Extracted unique tags list should include an explicit `"All"` option at index 0.
   - Tag extraction logic should compute tag frequencies (recipe counts per tag) to display count badges (e.g. `Bread (4)`).
   - Active tag state can support multi-selection (`selectedTags: string[]`) or single selection with explicit `"All"`. Multi-selection (`string[]`) provides maximum flexibility:
     - If `selectedTags.length === 0`, `"All"` chip is active, all recipes pass.
     - If `selectedTags.length > 0`, a recipe matches if it contains any of the selected tags (`r.tags.some(t => selectedTags.includes(t))`).

---

## 3. Caveats

1. **Dataset Scale**:
   - Client-side filtering and sorting assumes recipe list sizes typical for individual users and kitchens (< 1,000 items). If a user has tens of thousands of recipes, pagination and server-side Supabase filtering (`.contains('tags', ...)` / `.order(...)`) would be needed. For Phase 1 / Milestone 3 scope, client-side filtering is appropriate and requested.
2. **Missing `updated_at` fallback**:
   - In rare legacy database records where `updated_at` might be unpopulated or equal to `created_at`, timestamp parsing falls back smoothly to `created_at`.
3. **Tag Case Sensitivity**:
   - Standard tag entries in KitchenKit are lower-cased or user-entered strings. Tag extraction and comparison should normalize whitespace and preserve user casing or perform case-insensitive tag matching for robust filtering.
4. **Source Code Modifications**:
   - Per task instructions, no source code files were edited during this exploration phase.

---

## 4. Conclusion & UX Specification

### A. TypeScript Type Definitions

Add to `apps/web/src/hooks/useRecipes.ts` or a dedicated filter types file:

```ts
export type RecipeSortOption =
  | 'created-desc' // Date Created: Newest first (default)
  | 'created-asc'  // Date Created: Oldest first
  | 'updated-desc' // Last Updated: Newest first
  | 'updated-asc'  // Last Updated: Oldest first
  | 'name-asc'     // Recipe Name: A to Z
  | 'name-desc';   // Recipe Name: Z to A

export interface RecipeFilterOptions {
  query: string;
  selectedTags: string[];
  sortBy: RecipeSortOption;
}

export interface TagWithCount {
  name: string;
  count: number;
}
```

### B. Filtering & Sorting Logic Specification (`useFilteredRecipes` or inline `useMemo`)

```ts
import { useMemo } from 'react';
import type { DBRecipe, RecipeSortOption } from '@/hooks/useRecipes';

export function useFilteredRecipes(
  recipes: DBRecipe[],
  query: string,
  selectedTags: string[],
  sortBy: RecipeSortOption
) {
  // 1. Extract unique tags with counts
  const tagCounts = useMemo(() => {
    const map = new Map<string, number>();
    recipes.forEach((r) => {
      (r.tags || []).forEach((t) => {
        const trimmed = t.trim();
        if (trimmed) {
          map.set(trimmed, (map.get(trimmed) || 0) + 1);
        }
      });
    });
    return Array.from(map.entries())
      .map(([name, count]) => ({ name, count }))
      .sort((a, b) => a.name.localeCompare(b.name));
  }, [recipes]);

  // 2. Filter & Sort recipes
  const filteredAndSorted = useMemo(() => {
    const q = query.trim().toLowerCase();

    // Filtering
    const filtered = recipes.filter((recipe) => {
      const matchesSearch =
        !q ||
        recipe.name.toLowerCase().includes(q) ||
        (recipe.description ?? '').toLowerCase().includes(q) ||
        (recipe.base_ingredient ?? '').toLowerCase().includes(q) ||
        recipe.tags.some((t) => t.toLowerCase().includes(q));

      const matchesTags =
        selectedTags.length === 0 ||
        recipe.tags.some((t) => selectedTags.includes(t));

      return matchesSearch && matchesTags;
    });

    // Sorting
    return [...filtered].sort((a, b) => {
      switch (sortBy) {
        case 'name-asc':
          return a.name.localeCompare(b.name, undefined, { sensitivity: 'base' });
        case 'name-desc':
          return b.name.localeCompare(a.name, undefined, { sensitivity: 'base' });
        case 'created-asc':
          return new Date(a.created_at).getTime() - new Date(b.created_at).getTime();
        case 'created-desc':
          return new Date(b.created_at).getTime() - new Date(a.created_at).getTime();
        case 'updated-asc':
          return (
            new Date(a.updated_at || a.created_at).getTime() -
            new Date(b.updated_at || b.created_at).getTime()
          );
        case 'updated-desc':
          return (
            new Date(b.updated_at || b.created_at).getTime() -
            new Date(a.updated_at || a.created_at).getTime()
          );
        default:
          return 0;
      }
    });
  }, [recipes, query, selectedTags, sortBy]);

  return { filteredRecipes: filteredAndSorted, tagCounts };
}
```

### C. UI Component Layout & Design Specification (`RecipesPage.tsx`)

#### 1. Toolbar Controls Layout
- **Container**: `flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3`
- **Left Group**:
  - Search Input: `<input type="text" placeholder="Search recipes, ingredients, tags…" value={query} onChange={...} className="input pl-9" />`
- **Right Group**:
  - Sort Select Dropdown:
    ```tsx
    <div className="flex items-center gap-2">
      <SlidersHorizontal size={15} className="text-zinc-500 shrink-0" />
      <select
        value={sortBy}
        onChange={(e) => setSortBy(e.target.value as RecipeSortOption)}
        className="input py-2 px-3 text-sm bg-zinc-900 border-zinc-700 text-zinc-200 rounded-xl focus:border-brand-500 focus:ring-1 focus:ring-brand-500 cursor-pointer"
      >
        <option value="created-desc">Date Created (Newest)</option>
        <option value="created-asc">Date Created (Oldest)</option>
        <option value="updated-desc">Last Updated (Recent)</option>
        <option value="updated-asc">Last Updated (Oldest)</option>
        <option value="name-asc">Name (A – Z)</option>
        <option value="name-desc">Name (Z – A)</option>
      </select>
    </div>
    ```
  - New Recipe Button: `<button onClick={() => setShowModal(true)} className="btn-primary flex items-center gap-2 text-sm shrink-0"><Plus size={15} /> New Recipe</button>`

#### 2. Dynamic Tag Filter Chips Bar Layout
- **Container**: `flex items-center gap-2 flex-wrap pt-1`
- **"All" Chip**:
  - Always rendered when recipes exist.
  - Active State (`selectedTags.length === 0`): `bg-brand-600/30 text-brand-300 ring-1 ring-brand-600/60 font-medium`
  - Inactive State: `bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300`
  - Shows total recipe count: `All (${recipes.length})`
- **Individual Tag Chips**:
  - Shows tag name and recipe count: `${tag.name} (${tag.count})`
  - Clicking toggles tag inclusion in `selectedTags`.
  - Active State (`selectedTags.includes(tag.name)`): `bg-brand-600/30 text-brand-300 ring-1 ring-brand-600/60 font-medium`
  - Inactive State: `bg-zinc-800 text-zinc-400 hover:bg-zinc-700 hover:text-zinc-300`
- **Clear Filters Button**:
  - Appears when `selectedTags.length > 0` or `query !== ''`.
  - Clicking resets `selectedTags` to `[]` and `query` to `''`.

---

## 5. Verification Method

To verify the implementation once applied by Implementer 1:

1. **Automated Verification**:
   - Run type check & linter: `pnpm --filter web check-types` or `pnpm --filter web build`
   - Execute existing test suite: `pnpm test`

2. **Manual UI Verification**:
   - Open `http://localhost:5173/recipes` after starting dev server (`pnpm dev`).
   - **Tag Chips Test**:
     - Verify "All (N)" chip displays total recipe count and is selected by default.
     - Click a tag chip (e.g. "bread") — confirm list filters instantly to recipes containing "bread".
     - Click a second tag chip — confirm multi-tag matching (OR logic).
     - Click "All" — confirm filter resets.
   - **Sorting Dropdown Test**:
     - Select "Name (A – Z)" — verify recipes sort alphabetically by title.
     - Select "Name (Z – A)" — verify reverse alphabetical order.
     - Select "Date Created (Oldest)" — verify oldest recipe renders first.
     - Select "Last Updated (Recent)" — verify recently edited recipe renders first.
   - **Combined Search & Tag Test**:
     - Enter text in search box while a tag chip is selected — confirm recipes match both criteria simultaneously without page reload.
