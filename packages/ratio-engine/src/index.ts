/**
 * @kitchenkit/ratio-engine
 * Pure TypeScript recipe ratio math engine.
 * Stores recipes as ratios (baker's percentages), not absolute weights.
 * Zero external dependencies.
 */

export interface Ingredient {
  name: string;
  /** Ratio relative to base ingredient weight (1.0 = 100%) */
  ratio: number;
  unit?: string;
}

export interface Recipe {
  id: string;
  name: string;
  /** The base ingredient that all ratios are calculated against */
  baseIngredient: string;
  ingredients: Ingredient[];
  yieldUnit?: string;
}

/** Scale a recipe to a target base ingredient weight. */
export function scaleRecipe(
  recipe: Recipe,
  targetBaseWeight: number
): Record<string, number> {
  const scaled: Record<string, number> = {};
  for (const ingredient of recipe.ingredients) {
    scaled[ingredient.name] = ingredient.ratio * targetBaseWeight;
  }
  return scaled;
}

/** Calculate ratio of an ingredient relative to the base ingredient weight. */
export function calculateRatio(ingredientWeight: number, baseWeight: number): number {
  if (baseWeight === 0) throw new Error('Base weight cannot be zero');
  return ingredientWeight / baseWeight;
}

/** Project total formula weight from ratios and target base weight. */
export function totalFormulaWeight(recipe: Recipe, targetBaseWeight: number): number {
  return recipe.ingredients.reduce(
    (sum, ing) => sum + ing.ratio * targetBaseWeight,
    0
  );
}
