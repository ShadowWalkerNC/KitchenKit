import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface DashboardStats {
  recipeCount:     number;
  ingredientCount: number;
  parItemCount:    number;
  belowParCount:   number;
}

export function useDashboardStats(): { data: DashboardStats | undefined; isLoading: boolean } {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['dashboard_stats', user?.id],
    enabled: !!user,
    queryFn: async () => {
      const [recipes, parLevels] = await Promise.all([
        supabase.from('recipes').select('id', { count: 'exact', head: true }),
        supabase.from('par_levels').select('id, current_stock, par_amount', { count: 'exact' }),
      ]);

      const parRows = parLevels.data ?? [];
      return {
        recipeCount:     recipes.count ?? 0,
        ingredientCount: 0, // populated lazily when recipes are fetched
        parItemCount:    parLevels.count ?? 0,
        belowParCount:   parRows.filter((r) => Number(r.current_stock) < Number(r.par_amount)).length,
      };
    },
  });
}
