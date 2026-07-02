import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import { supabase } from '../lib/supabase';

export interface DBParLevel {
  id: string;
  user_id: string;
  ingredient_name: string;
  par_amount: number;
  current_stock: number;
  unit: string;
  updated_at: string;
}

export function useParLevels() {
  return useQuery<DBParLevel[]>({
    queryKey: ['par_levels'],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return [];
      const { data, error } = await supabase
        .from('par_levels')
        .select('*')
        .eq('user_id', user.id)
        .order('ingredient_name', { ascending: true });
      if (error) throw error;
      return data as DBParLevel[];
    },
  });
}

export function useUpsertParLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (payload: {
      id?: string;
      ingredient_name: string;
      par_amount: number;
      current_stock: number;
      unit: string;
    }) => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('Not authenticated');

      const { error } = await supabase
        .from('par_levels')
        .upsert(
          { ...payload, user_id: user.id },
          { onConflict: 'user_id,ingredient_name' }
        );
      if (error) throw error;
    },
    onSuccess: (_data, variables) => {
      qc.invalidateQueries({ queryKey: ['par_levels'] });
      qc.invalidateQueries({ queryKey: ['dashboard_stats'] });
      toast.success(variables.id ? 'Par level updated' : `"${variables.ingredient_name}" added`);
    },
    onError: (err: Error) => {
      toast.error(`Failed to save par level: ${err.message}`);
    },
  });
}

export function useDeleteParLevel() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: async (id: string) => {
      const { error } = await supabase.from('par_levels').delete().eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['par_levels'] });
      qc.invalidateQueries({ queryKey: ['dashboard_stats'] });
      toast.success('Par item removed');
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete par item: ${err.message}`);
    },
  });
}
