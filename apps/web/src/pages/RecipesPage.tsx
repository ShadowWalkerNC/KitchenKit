import { Search, Plus, BookOpen, Loader2, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useRecipes, useDeleteRecipe } from '@/hooks/useRecipes';
import CreateRecipeModal from '@/components/recipes/CreateRecipeModal';

export default function RecipesPage() {
  const { data: recipes = [], isLoading, error } = useRecipes();
  const { mutate: deleteRecipe } = useDeleteRecipe();
  const [query, setQuery]       = useState('');
  const [showModal, setShowModal] = useState(false);

  const filtered = recipes.filter((r) =>
    r.name.toLowerCase().includes(query.toLowerCase()) ||
    r.tags.some((t) => t.toLowerCase().includes(query.toLowerCase()))
  );

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-red-400 text-sm">Failed to load recipes: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-5xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input type="text" placeholder="Search recipes or tags..."
            value={query} onChange={(e) => setQuery(e.target.value)}
            className="input pl-9" />
        </div>
        <button onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 text-sm shrink-0">
          <Plus size={15} /> New Recipe
        </button>
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-24">
          <Loader2 className="animate-spin text-brand-500" size={28} />
        </div>
      )}

      {/* Empty state */}
      {!isLoading && filtered.length === 0 && (
        <div className="flex flex-col items-center justify-center py-24 text-center">
          <BookOpen size={40} className="text-zinc-700 mb-4" />
          <h3 className="text-lg font-semibold text-zinc-300 mb-1">
            {query ? 'No recipes match that search' : 'No recipes yet'}
          </h3>
          <p className="text-sm text-zinc-500 mb-6 max-w-xs">
            Add your first recipe and let the Ratio Blueprint Engine handle the scaling.
          </p>
          {!query && (
            <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
              + Add Recipe
            </button>
          )}
        </div>
      )}

      {/* Recipe grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((recipe) => (
            <div key={recipe.id} className="card hover:border-brand-600/50 transition-colors group relative">
              <Link to={`/recipes/${recipe.id}`} className="block">
                <h3 className="font-semibold text-zinc-100 mb-1 pr-6">{recipe.name}</h3>
                <p className="text-xs text-zinc-500 mb-2">
                  {recipe.ingredients?.length ?? 0} ingredients
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="badge bg-brand-600/20 text-brand-300">
                    Base: {recipe.base_ingredient}
                  </span>
                  {recipe.is_public && (
                    <span className="badge bg-emerald-600/20 text-emerald-400">public</span>
                  )}
                  {recipe.tags.slice(0, 2).map((tag) => (
                    <span key={tag} className="badge bg-zinc-700 text-zinc-400">{tag}</span>
                  ))}
                </div>
              </Link>
              {/* Delete */}
              <button
                onClick={() => { if (confirm(`Delete "${recipe.name}"?`)) deleteRecipe(recipe.id); }}
                className="absolute top-3 right-3 text-zinc-700 hover:text-red-400 transition-colors opacity-0 group-hover:opacity-100"
              >
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
      )}

      {showModal && <CreateRecipeModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
