import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/lib/supabase';
import { useAuth } from '@/context/AuthContext';

export interface DBPrepPlan {
  id: string;
  user_id: string;
  shift: string;
  plan_date: string;
  notes: string | null;
  is_completed: boolean;
  completed_at: string | null;
  created_at: string;
  items: DBPrepPlanItem[];
}

export interface DBPrepPlanItem {
  id: string;
  prep_plan_id: string;
  ingredient_name: string;
  prep_amount: number;
  unit: string;
  recipe_id: string | null;
  is_done: boolean;
  done_at: string | null;
  note: string | null;
  sort_order: number;
}

/** Load an existing saved prep plan for a given shift + date. */
export function usePrepPlan(shift: string, date: string) {
  const { user } = useAuth();
  return useQuery({
    queryKey: ['prep_plan', user?.id, shift, date],
    enabled: !!user,
    queryFn: async () => {
      const { data, error } = await supabase
        .from('prep_plans')
        .select('*, items:prep_plan_items(*)')
        .eq('shift', shift)
        .eq('plan_date', date)
        .maybeSingle();
      if (error) throw error;
      if (!data) return null;
      const plan = data as DBPrepPlan & { items: DBPrepPlanItem[] };
      plan.items = (plan.items ?? []).sort((a, b) => a.sort_order - b.sort_order);
      return plan;
    },
  });
}

/** Save (upsert) a prep plan from the current shift prep calculation. */
export function useSavePrepPlan() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({
      shift,
      date,
      items,
    }: {
      shift: string;
      date: string;
      items: Array<{
        ingredient_name: string;
        prep_amount: number;
        unit: string;
        recipe_id?: string | null;
        sort_order?: number;
      }>;
    }) => {
      // 1. Upsert the plan header
      const { data: plan, error: planErr } = await supabase
        .from('prep_plans')
        .upsert(
          { user_id: user!.id, shift, plan_date: date, is_completed: false },
          { onConflict: 'user_id,shift,plan_date' }
        )
        .select()
        .single();
      if (planErr) throw planErr;

      // 2. Delete existing undone items so we start clean
      const { error: delErr } = await supabase
        .from('prep_plan_items')
        .delete()
        .eq('prep_plan_id', plan.id)
        .eq('is_done', false);
      if (delErr) throw delErr;

      // 3. Insert fresh items
      if (items.length > 0) {
        const { error: insertErr } = await supabase
          .from('prep_plan_items')
          .insert(
            items.map((item, idx) => ({
              prep_plan_id:    plan.id,
              ingredient_name: item.ingredient_name,
              prep_amount:     item.prep_amount,
              unit:            item.unit,
              recipe_id:       item.recipe_id ?? null,
              sort_order:      item.sort_order ?? idx,
              is_done:         false,
            }))
          );
        if (insertErr) throw insertErr;
      }

      return plan as DBPrepPlan;
    },
    onSuccess: (_data, vars) => {
      queryClient.invalidateQueries({ queryKey: ['prep_plan', user?.id, vars.shift, vars.date] });
      // activePlansCount on dashboard changes when a plan is saved
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
    },
  });
}

/** Toggle a single prep plan item done/undone. */
export function useTogglePrepItem() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ id, is_done }: { id: string; is_done: boolean }) => {
      const { error } = await supabase
        .from('prep_plan_items')
        .update({ is_done, done_at: is_done ? new Date().toISOString() : null })
        .eq('id', id);
      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prep_plan', user?.id] });
    },
  });
}

/** Mark the entire prep plan as complete. */
export function useCompletePrepPlan() {
  const queryClient = useQueryClient();
  const { user } = useAuth();

  return useMutation({
    mutationFn: async ({ planId }: { planId: string }) => {
      const now = new Date().toISOString();

      // Mark all remaining items done
      const { error: itemsErr } = await supabase
        .from('prep_plan_items')
        .update({ is_done: true, done_at: now })
        .eq('prep_plan_id', planId)
        .eq('is_done', false);
      if (itemsErr) throw itemsErr;

      // Mark plan complete
      const { error: planErr } = await supabase
        .from('prep_plans')
        .update({ is_completed: true, completed_at: now })
        .eq('id', planId);
      if (planErr) throw planErr;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['prep_plan', user?.id] });
      // Refresh par levels (stock may have changed) and dashboard stats
      queryClient.invalidateQueries({ queryKey: ['par_levels'] });
      queryClient.invalidateQueries({ queryKey: ['dashboard_stats'] });
    },
  });
}
