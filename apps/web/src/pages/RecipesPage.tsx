import { Search, Plus, BookOpen, Loader2, Tag } from 'lucide-react';
import { useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { useRecipes } from '@/hooks/useRecipes';
import CreateRecipeModal from '@/components/recipes/CreateRecipeModal';

export default function RecipesPage() {
  const { data: recipes = [], isLoading, error } = useRecipes();
  const [query, setQuery]         = useState('');
  const [activeTag, setActiveTag] = useState<string | null>(null);
  const [showModal, setShowModal] = useState(false);

  // Collect all unique tags across every recipe, sorted alphabetically
  const allTags = useMemo(() => {
    const set = new Set<string>();
    recipes.forEach((r) => r.tags.forEach((t) => set.add(t)));
    return [...set].sort();
  }, [recipes]);

  const filtered = useMemo(() => {
    const q = query.toLowerCase();
    return recipes.filter((r) => {
      const matchesText =
        !q ||
        r.name.toLowerCase().includes(q) ||
        r.tags.some((t) => t.toLowerCase().includes(q));
      const matchesTag = !activeTag || r.tags.includes(activeTag);
      return matchesText && matchesTag;
    });
  }, [recipes, query, activeTag]);

  if (error) {
    return (
      <div className="flex items-center justify-center py-24">
        <p className="text-red-400 text-sm">Failed to load recipes: {(error as Error).message}</p>
      </div>
    );
  }

  return (
    <div className="space-y-5 max-w-5xl mx-auto">
      {/* Toolbar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2 text-zinc-500" />
          <input
            type="text"
            placeholder="Search recipes or tags…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="input pl-9"
          />
        </div>
        <button
          onClick={() => setShowModal(true)}
          className="btn-primary flex items-center gap-2 text-sm shrink-0"
        >
          <Plus size={15} /> New Recipe
        </button>
      </div>

      {/* Tag filter chips */}
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
            {query || activeTag ? 'No recipes match that filter' : 'No recipes yet'}
          </h3>
          <p className="text-sm text-zinc-500 mb-6 max-w-xs">
            {query || activeTag
              ? 'Try clearing the search or selecting a different tag.'
              : 'Add your first recipe and let the Ratio Blueprint Engine handle the scaling.'}
          </p>
          {!query && !activeTag && (
            <button onClick={() => setShowModal(true)} className="btn-primary text-sm">
              + Add Recipe
            </button>
          )}
          {(query || activeTag) && (
            <button
              onClick={() => { setQuery(''); setActiveTag(null); }}
              className="btn-ghost text-sm"
            >
              Clear filters
            </button>
          )}
        </div>
      )}

      {/* Recipe grid */}
      {!isLoading && filtered.length > 0 && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.map((recipe) => {
            const visibleTags = recipe.tags.slice(0, 2);
            const overflowCount = recipe.tags.length - visibleTags.length;
            return (
              <Link
                key={recipe.id}
                to={`/recipes/${recipe.id}`}
                className="card hover:border-brand-600/50 transition-colors block"
              >
                <h3 className="font-semibold text-zinc-100 mb-1">{recipe.name}</h3>
                <p className="text-xs text-zinc-500 mb-3">
                  {recipe.ingredients?.length ?? 0} ingredient{(recipe.ingredients?.length ?? 0) !== 1 ? 's' : ''}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  <span className="badge bg-brand-600/20 text-brand-300">
                    {recipe.base_ingredient}
                  </span>
                  {recipe.is_public && (
                    <span className="badge bg-emerald-600/20 text-emerald-400">public</span>
                  )}
                  {visibleTags.map((tag) => (
                    <span key={tag} className="badge bg-zinc-700 text-zinc-400">{tag}</span>
                  ))}
                  {overflowCount > 0 && (
                    <span className="badge bg-zinc-800 text-zinc-600">+{overflowCount}</span>
                  )}
                </div>
              </Link>
            );
          })}
        </div>
      )}

      {showModal && <CreateRecipeModal onClose={() => setShowModal(false)} />}
    </div>
  );
}
