import { Search, Plus, BookOpen } from 'lucide-react';
import { useState } from 'react';
import type { Recipe } from '@kitchenkit/ratio-engine';

// Placeholder until Supabase is wired
const MOCK_RECIPES: Recipe[] = [];

export default function RecipesPage() {
  const [query, setQuery] = useState('');
  const filtered = MOCK_RECIPES.filter((r) =>
    r.name.toLowerCase().includes(query.toLowerCase())
  );

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search recipes..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input pl-9"
          />
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} />
          New Recipe
        </button>
      </div>

      {/* Recipe grid or empty state */}
      {filtered.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <BookOpen size={40} className="text-zinc-700 mb-4" />
          <h3 className="text-lg font-semibold text-zinc-300 mb-1">No recipes yet</h3>
          <p className="text-sm text-zinc-500 mb-6 max-w-xs">
            Add your first recipe and let the Ratio Blueprint Engine handle the scaling.
          </p>
          <button className="btn-primary text-sm">+ Add Recipe</button>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((recipe) => (
            <div key={recipe.id} className="card hover:border-brand-600/50 transition-colors cursor-pointer">
              <h3 className="font-semibold text-zinc-100 mb-1">{recipe.name}</h3>
              <p className="text-xs text-zinc-500">{recipe.ingredients.length} ingredients</p>
              <div className="mt-3 flex items-center gap-2">
                <span className="badge bg-brand-600/20 text-brand-300">
                  Base: {recipe.baseIngredient}
                </span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
