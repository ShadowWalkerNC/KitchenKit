import { ClipboardList, Plus, Loader2, Check, RefreshCw } from 'lucide-react';
import { useState } from 'react';
import { useShiftPrep } from '@/hooks/useParLevels';

const SHIFTS = ['AM', 'PM', 'Brunch', 'Dinner'] as const;
type Shift = typeof SHIFTS[number];

export default function PrepPlannerPage() {
  const [shift, setShift] = useState<Shift>('AM');
  const today = new Date().toISOString().slice(0, 10);
  const { data: items = [], isLoading, error, refetch } = useShiftPrep(shift, today);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Shift Prep Planner</h2>
          <p className="text-sm text-zinc-500 mt-0.5">{today}</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => refetch()}
            className="btn-ghost flex items-center gap-1.5 text-sm">
            <RefreshCw size={13} /> Refresh
          </button>
          <button className="btn-primary flex items-center gap-2 text-sm">
            <Plus size={15} /> Add Item
          </button>
        </div>
      </div>

      {/* Shift selector */}
      <div className="flex gap-2">
        {SHIFTS.map((s) => (
          <button key={s} onClick={() => setShift(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              shift === s
                ? 'bg-brand-600 text-white'
                : 'bg-surface-card text-zinc-400 hover:text-zinc-100 border border-surface-border'
            }`}>
            {s}
          </button>
        ))}
      </div>

      {/* Loading */}
      {isLoading && (
        <div className="flex items-center justify-center py-16">
          <Loader2 className="animate-spin text-brand-500" size={24} />
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="card border-red-500/20 bg-red-500/5">
          <p className="text-sm text-red-400">Failed to load prep plan: {(error as Error).message}</p>
        </div>
      )}

      {/* All at par */}
      {!isLoading && !error && items.length === 0 && (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <div className="w-14 h-14 rounded-full bg-emerald-600/20 border border-emerald-600/30 flex items-center justify-center mb-4">
            <Check size={24} className="text-emerald-400" />
          </div>
          <h3 className="text-lg font-semibold text-zinc-300 mb-1">All at par ✅</h3>
          <p className="text-sm text-zinc-500">Nothing to prep for the {shift} shift.</p>
        </div>
      )}

      {/* Prep list */}
      {!isLoading && !error && items.length > 0 && (
        <div className="card">
          <div className="flex items-center justify-between mb-4">
            <h3 className="font-semibold text-zinc-100">
              {shift} Prep List
            </h3>
            <span className="badge bg-brand-600/20 text-brand-300">
              {items.length} item{items.length !== 1 ? 's' : ''}
            </span>
          </div>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-500 uppercase tracking-wider border-b border-surface-border">
                <th className="text-left pb-2">Item</th>
                <th className="text-right pb-2">Stock</th>
                <th className="text-right pb-2">Par</th>
                <th className="text-right pb-2">Prep</th>
                <th className="text-right pb-2">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {items.map((item) => (
                <tr key={item.ingredient_name} className="hover:bg-surface/50 transition-colors">
                  <td className="py-3 font-medium text-zinc-200">{item.ingredient_name}</td>
                  <td className="py-3 text-right text-zinc-500">{item.current_stock}</td>
                  <td className="py-3 text-right text-zinc-500">{item.par_amount}</td>
                  <td className="py-3 text-right font-semibold text-amber-300">
                    +{item.prep_amount}
                  </td>
                  <td className="py-3 text-right text-zinc-500">{item.unit}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
