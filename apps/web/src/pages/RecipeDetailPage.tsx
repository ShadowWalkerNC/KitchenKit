import { useParams, Link } from 'react-router-dom';
import { ArrowLeft, Scale } from 'lucide-react';
import { useState } from 'react';
import { scaleRecipe } from '@kitchenkit/ratio-engine';
import type { Recipe } from '@kitchenkit/ratio-engine';

// Placeholder until Supabase wired — demo recipe
const DEMO_RECIPE: Recipe = {
  id: 'demo-brioche',
  name: 'Brioche Dough',
  baseIngredient: 'bread_flour',
  ingredients: [
    { name: 'bread_flour',      ratio: 1.0,   unit: 'g' },
    { name: 'whole_eggs',       ratio: 0.50,  unit: 'g' },
    { name: 'butter',           ratio: 0.45,  unit: 'g' },
    { name: 'sugar',            ratio: 0.10,  unit: 'g' },
    { name: 'salt',             ratio: 0.018, unit: 'g' },
    { name: 'instant_yeast',    ratio: 0.015, unit: 'g' },
    { name: 'whole_milk',       ratio: 0.12,  unit: 'g' },
  ],
  yieldUnit: 'g',
};

export default function RecipeDetailPage() {
  const { id } = useParams();
  const recipe = DEMO_RECIPE; // TODO: fetch from Supabase by id
  const [baseWeight, setBaseWeight] = useState(500);
  const scaled = scaleRecipe(recipe, baseWeight);

  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Back */}
      <Link to="/recipes" className="btn-ghost inline-flex items-center gap-1.5 text-sm -ml-3">
        <ArrowLeft size={15} /> Recipes
      </Link>

      {/* Header */}
      <div>
        <h2 className="text-2xl font-bold text-zinc-100">{recipe.name}</h2>
        <p className="text-sm text-zinc-500 mt-1">
          Base ingredient: <span className="text-brand-400 font-mono">{recipe.baseIngredient}</span>
        </p>
      </div>

      {/* Scale control */}
      <div className="card">
        <div className="flex items-center gap-2 mb-4">
          <Scale size={16} className="text-brand-400" />
          <h3 className="font-semibold text-zinc-100">Scale Recipe</h3>
        </div>
        <div className="flex items-center gap-3">
          <label className="text-sm text-zinc-400 shrink-0">Base weight (g)</label>
          <input
            type="number"
            min={1}
            value={baseWeight}
            onChange={(e) => setBaseWeight(Number(e.target.value))}
            className="input max-w-32"
          />
        </div>
      </div>

      {/* Ingredient table */}
      <div className="card">
        <h3 className="font-semibold text-zinc-100 mb-4">Ingredients</h3>
        <table className="w-full text-sm">
          <thead>
            <tr className="text-xs text-zinc-500 uppercase tracking-wider border-b border-surface-border">
              <th className="text-left pb-2">Ingredient</th>
              <th className="text-right pb-2">Ratio</th>
              <th className="text-right pb-2">Scaled Amount</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-surface-border">
            {recipe.ingredients.map((ing) => (
              <tr key={ing.name} className="hover:bg-surface-card/50 transition-colors">
                <td className="py-2.5 font-mono text-zinc-300">{ing.name}</td>
                <td className="py-2.5 text-right text-zinc-500">
                  {(ing.ratio * 100).toFixed(1)}%
                </td>
                <td className="py-2.5 text-right font-semibold text-zinc-100">
                  {scaled[ing.name].toFixed(1)}{ing.unit}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
