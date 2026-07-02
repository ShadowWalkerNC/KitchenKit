import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { supabase } from '../lib/supabase';
import type { DBPrepPlanWithItems } from './usePrepPlans';

const PAGE_SIZE = 20;

export function usePrepHistory() {
  const [page, setPage] = useState(0);

  const query = useQuery<{ plans: DBPrepPlanWithItems[]; hasMore: boolean }>({
    queryKey: ['prep_history', page],
    queryFn: async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) return { plans: [], hasMore: false };

      // Fetch PAGE_SIZE + 1 to detect if more pages exist without a separate count query
      const { data, error } = await supabase
        .from('prep_plans')
        .select('*, items:prep_plan_items(*)')
        .eq('user_id', user.id)
        .eq('is_completed', true)
        .order('plan_date', { ascending: false })
        .order('created_at', { ascending: false })
        .range(page * PAGE_SIZE, page * PAGE_SIZE + PAGE_SIZE);

      if (error) throw error;

      const rows = (data ?? []) as DBPrepPlanWithItems[];
      const hasMore = rows.length > PAGE_SIZE;

      return {
        plans: hasMore ? rows.slice(0, PAGE_SIZE) : rows,
        hasMore,
      };
    },
    placeholderData: (prev) => prev,
  });

  return {
    ...query,
    page,
    nextPage: () => setPage((p) => p + 1),
    prevPage: () => setPage((p) => Math.max(0, p - 1)),
  };
}
