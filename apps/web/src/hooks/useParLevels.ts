import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface DBParLevel {
  id: string;
  ingredient_name: string;
  par_amount: number;
  current_stock: number;
  unit: string;
  recipe_id: string | null;
  notes: string | null;
}

export interface DBShiftPrepItem {
  ingredient_name: string;
  prep_amount: number;
  unit: string;
  par_amount: number;
  current_stock: number;
  recipe_id: string | null;
}

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

export function useShiftPrep(shift: string, date: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['shift_prep', user?.id, shift, date],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase.rpc('build_shift_prep', {
        p_user_id: user!.id,
        p_shift:   shift,
        p_date:    date,
      });
      if (error) throw error;
      return (data ?? []) as DBShiftPrepItem[];
    },
  });
}

export function useUpdateStock() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: async ({ id, current_stock }: { id: string; current_stock: number }) => {
      const { error } = await supabase
        .from('par_levels')
        .update({ current_stock })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['par_levels'] });
      queryClient.invalidateQueries({ queryKey: ['shift_prep'] });
    },
  });
}

export function useUpsertParLevel() {
  const queryClient = useQueryClient();
  const { user } = useAuth();
  return useMutation({
    mutationFn: async (input: Omit<DBParLevel, 'id' | 'recipe_id' | 'notes'>) => {
      const { error } = await supabase
        .from('par_levels')
        .upsert(
          { ...input, user_id: user!.id },
          { onConflict: 'user_id,ingredient_name' }
        );
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['par_levels'] });
      queryClient.invalidateQueries({ queryKey: ['shift_prep'] });
    },
  });
}
