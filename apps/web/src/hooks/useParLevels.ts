import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface DBParLevel {
  id: string;
  user_id: string;
  ingredient_name: string;
  current_stock: number;
  par_amount: number;
  unit: string;
  shifts: string[] | null;
  created_at: string;
}

export interface ShiftPrepItem {
  ingredient_name: string;
  current_stock: number;
  par_amount: number;
  prep_amount: number;
  unit: string;
  recipe_id: string | null;
  shifts: string[] | null;
}

// All par levels for the current user
export function useParLevels() {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['par_levels', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('par_levels')
        .select('*')
        .order('ingredient_name');
      if (error) throw error;
      return (data ?? []) as DBParLevel[];
    },
  });
}

// Items that still need prep for a specific shift
export function useShiftPrep(shift: string, date: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['shift_prep', user?.id, shift, date],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .rpc('get_shift_prep_items', { p_shift: shift, p_date: date });
      if (error) throw error;
      return (data ?? []) as ShiftPrepItem[];
    },
  });
}

export function useUpsertParLevel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (input: {
      ingredient_name: string;
      current_stock: number;
      par_amount: number;
      unit: string;
      shifts?: string[];
    }) => {
      const { error } = await supabase
        .from('par_levels')
        .upsert(
          {
            user_id:         user!.id,
            ingredient_name: input.ingredient_name,
            current_stock:   input.current_stock,
            par_amount:      input.par_amount,
            unit:            input.unit,
            shifts:          input.shifts ?? [],
          },
          { onConflict: 'user_id,ingredient_name' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['par_levels'] });
      queryClient.invalidateQueries({ queryKey: ['shift_prep'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
    },
  });
}

export function useDeleteParLevel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async (ingredientName: string) => {
      const { error } = await supabase
        .from('par_levels')
        .delete()
        .eq('user_id', user!.id)
        .eq('ingredient_name', ingredientName);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['par_levels'] });
      queryClient.invalidateQueries({ queryKey: ['shift_prep'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
    },
  });
}
