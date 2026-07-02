import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';
import type { Recipe } from '@kitchenkit/ratio-engine';

export interface DBIngredient {
  id: string;
  recipe_id: string;
  name: string;
  ratio: number;
  unit: string;
  sort_order: number;
}

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

export function toEngineRecipe(r: DBRecipe): Recipe {
  const ingredients: Record<string, number> = {};
  for (const ing of r.ingredients) {
    ingredients[ing.name] = Number(ing.ratio);
  }
  return { baseIngredient: r.base_ingredient, ingredients };
}

// ---------------------------------------------------------------------------
// useRecipes
// ---------------------------------------------------------------------------
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

// ---------------------------------------------------------------------------
// useRecipe
// ---------------------------------------------------------------------------
export function useRecipe(id: string | undefined) {
  return useQuery<DBRecipe>({
    queryKey: ['recipe', id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*, ingredients:recipe_ingredients(*)')
        .eq('id', id!)
        .single();
      if (error) throw error;
      return data as DBRecipe;
    },
    enabled: Boolean(id),
  });
}

// ---------------------------------------------------------------------------
// useCreateRecipe
// ---------------------------------------------------------------------------
export function useCreateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      name: string;
      description?: string;
      base_ingredient: string;
      yield_unit: string;
      tags?: string[];
      ingredients: Array<{ name: string; ratio: number; unit: string; sort_order: number }>;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { data: recipe, error: recipeErr } = await supabase
        .from('recipes')
        .insert({
          user_id:         user.id,
          name:            payload.name,
          description:     payload.description ?? null,
          base_ingredient: payload.base_ingredient,
          yield_unit:      payload.yield_unit,
          tags:            payload.tags ?? [],
        })
        .select()
        .single();
      if (recipeErr) throw recipeErr;

      if (payload.ingredients.length > 0) {
        const { error: ingErr } = await supabase
          .from('recipe_ingredients')
          .insert(payload.ingredients.map(ing => ({ ...ing, recipe_id: recipe.id })));
        if (ingErr) throw ingErr;
      }

      return recipe;
    },
    onSuccess: (data) => {
      qc.invalidateQueries({ queryKey: ['recipes'] });
      toast.success(`Recipe "${data.name}" created`);
    },
    onError: (err: Error) => {
      toast.error(`Failed to create recipe: ${err.message}`);
    },
  });
}

// ---------------------------------------------------------------------------
// useUpdateRecipe
// ---------------------------------------------------------------------------
export function useUpdateRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id: string;
      name: string;
      description?: string;
      base_ingredient: string;
      yield_unit: string;
      tags?: string[];
      ingredients: Array<{ name: string; ratio: number; unit: string; sort_order: number }>;
    }) => {
      const { error: recipeErr } = await supabase
        .from('recipes')
        .update({
          name:            payload.name,
          description:     payload.description ?? null,
          base_ingredient: payload.base_ingredient,
          yield_unit:      payload.yield_unit,
          tags:            payload.tags ?? [],
        })
        .eq('id', payload.id);
      if (recipeErr) throw recipeErr;

      await supabase.from('recipe_ingredients').delete().eq('recipe_id', payload.id);

      if (payload.ingredients.length > 0) {
        const { error: ingErr } = await supabase
          .from('recipe_ingredients')
          .insert(payload.ingredients.map(ing => ({ ...ing, recipe_id: payload.id })));
        if (ingErr) throw ingErr;
      }
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['recipes'] });
      qc.invalidateQueries({ queryKey: ['recipe', variables.id] });
      toast.success('Recipe updated');
    },
    onError: (err: Error) => {
      toast.error(`Failed to update recipe: ${err.message}`);
    },
  });
}

// ---------------------------------------------------------------------------
// useDeleteRecipe
// ---------------------------------------------------------------------------
export function useDeleteRecipe() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recipes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['recipes'] });
      toast.success('Recipe deleted');
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete recipe: ${err.message}`);
    },
  });
}
