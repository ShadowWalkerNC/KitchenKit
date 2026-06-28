import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { Recipe } from '@kitchenkit/ratio-engine';

export interface DBRecipe {
  id: string;
  name: string;
  description: string | null;
  base_ingredient: string;
  yield_unit: string;
  tags: string[];
  is_public: boolean;
  created_at: string;
  ingredients: DBIngredient[];
}

export interface DBIngredient {
  id: string;
  name: string;
  ratio: number;
  unit: string;
  sort_order: number;
  note: string | null;
}

export interface CreateRecipeInput {
  name: string;
  description?: string;
  base_ingredient: string;
  yield_unit?: string;
  tags?: string[];
  ingredients: { name: string; ratio: number; unit: string; sort_order?: number }[];
}

/** Map DB row → ratio-engine Recipe shape */
export function toEngineRecipe(r: DBRecipe): Recipe {
  return {
    id: r.id,
    name: r.name,
    baseIngredient: r.base_ingredient,
    yieldUnit: r.yield_unit,
    ingredients: r.ingredients.map((i) => ({
      name: i.name,
      ratio: Number(i.ratio),
      unit: i.unit,
    })),
  };
}

export function useRecipes() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['recipes', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('recipes')
        .select('*, ingredients(*)')
        .order('created_at', { ascending: false });
      if (error) throw error;
      return (data ?? []) as DBRecipe[];
    },
  });
}

export function useRecipe(id: string | undefined) {
  return useQuery({
    queryKey: ['recipe', id],
    enabled: !!id,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_recipe_with_ingredients', { p_recipe_id: id });
      if (error) throw error;
      return data as DBRecipe | null;
    },
  });
}

export function useCreateRecipe() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: CreateRecipeInput) => {
      // 1. Insert recipe
      const { data: recipe, error: rErr } = await supabase
        .from('recipes')
        .insert({
          user_id:        user!.id,
          name:           input.name,
          description:    input.description ?? null,
          base_ingredient: input.base_ingredient,
          yield_unit:     input.yield_unit ?? 'g',
          tags:           input.tags ?? [],
        })
        .select()
        .single();
      if (rErr) throw rErr;

      // 2. Insert ingredients
      const { error: iErr } = await supabase
        .from('ingredients')
        .insert(
          input.ingredients.map((ing, idx) => ({
            recipe_id:  recipe.id,
            name:       ing.name,
            ratio:      ing.ratio,
            unit:       ing.unit,
            sort_order: ing.sort_order ?? idx,
          }))
        );
      if (iErr) throw iErr;
      return recipe;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}

export function useDeleteRecipe() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('recipes').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['recipes'] });
    },
  });
}
