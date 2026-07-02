import { useQuery } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';
import type { DBPrepPlan, DBPrepPlanItem } from './usePrepPlans';

export interface PrepHistoryPage {
  plans: DBPrepPlan[];
  hasMore: boolean;
}

const PAGE_SIZE = 20;

export function usePrepHistory(page = 0) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['prep_history', user?.id, page],
    enabled: !!user,
    queryFn: async (): Promise<PrepHistoryPage> => {
      const from = page * PAGE_SIZE;
      const to   = from + PAGE_SIZE; // fetch one extra to detect hasMore

      const { data, error } = await supabase
        .from('prep_plans')
        .select('*, items:prep_plan_items(*)')
        .eq('is_completed', true)
        .order('plan_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(from, to);

      if (error) throw error;

      const rows = (data ?? []) as (DBPrepPlan & { items: DBPrepPlanItem[] })[];
      const hasMore = rows.length > PAGE_SIZE;
      const plans   = hasMore ? rows.slice(0, PAGE_SIZE) : rows;

      // Sort items within each plan by sort_order
      plans.forEach((p) => {
        p.items = (p.items ?? []).sort((a, b) => a.sort_order - b.sort_order);
      });

      return { plans, hasMore };
    },
  });
}
