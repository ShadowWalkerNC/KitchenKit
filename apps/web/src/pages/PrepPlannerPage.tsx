import { ClipboardList, Plus } from 'lucide-react';
import { useState } from 'react';
import { buildShiftPrep } from '@kitchenkit/prep-engine';
import type { PrepItem } from '@kitchenkit/prep-engine';

const SHIFTS = ['AM', 'PM', 'Brunch', 'Dinner'];

// Demo par data — replace with Supabase
const DEMO_PAR: PrepItem[] = [
  { ingredient: 'Brioche Dough',    currentStock: 200, parLevel: 1000, unit: 'g' },
  { ingredient: 'Hollandaise',      currentStock: 0,   parLevel: 500,  unit: 'g' },
  { ingredient: 'Béarnaise',        currentStock: 150, parLevel: 400,  unit: 'g' },
  { ingredient: 'Chicken Stock',    currentStock: 500, parLevel: 2000, unit: 'ml' },
  { ingredient: 'Pasta Dough',      currentStock: 0,   parLevel: 800,  unit: 'g' },
];

export default function PrepPlannerPage() {
  const [shift, setShift] = useState('AM');
  const today = new Date().toISOString().slice(0, 10);
  const plan = buildShiftPrep(DEMO_PAR, shift, today);

  return (
    <div className="space-y-6 max-w-3xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-bold text-zinc-100">Shift Prep Planner</h2>
          <p className="text-sm text-zinc-500 mt-0.5">{today}</p>
        </div>
        <button className="btn-primary flex items-center gap-2 text-sm">
          <Plus size={15} />
          Add Item
        </button>
      </div>

      {/* Shift selector */}
      <div className="flex gap-2">
        {SHIFTS.map((s) => (
          <button
            key={s}
            onClick={() => setShift(s)}
            className={`px-4 py-1.5 rounded-full text-sm font-medium transition-colors ${
              shift === s
                ? 'bg-brand-600 text-white'
                : 'bg-surface-card text-zinc-400 hover:text-zinc-100 border border-surface-border'
            }`}
          >
            {s}
          </button>
        ))}
      </div>

      {/* Prep list */}
      {plan.items.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center">
          <ClipboardList size={40} className="text-zinc-700 mb-4" />
          <h3 className="text-lg font-semibold text-zinc-300 mb-1">All at par ✅</h3>
          <p className="text-sm text-zinc-500">Nothing to prep for the {shift} shift.</p>
        </div>
      ) : (
        <div className="card">
          <h3 className="font-semibold text-zinc-100 mb-4">
            {shift} Prep List
            <span className="ml-2 badge bg-brand-600/20 text-brand-300">{plan.items.length} items</span>
          </h3>
          <table className="w-full text-sm">
            <thead>
              <tr className="text-xs text-zinc-500 uppercase tracking-wider border-b border-surface-border">
                <th className="text-left pb-2">Item</th>
                <th className="text-right pb-2">Prep Amount</th>
                <th className="text-right pb-2">Unit</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {plan.items.map((item) => (
                <tr key={item.ingredient} className="hover:bg-surface/50 transition-colors">
                  <td className="py-3 font-medium text-zinc-200">{item.ingredient}</td>
                  <td className="py-3 text-right font-semibold text-zinc-100">{item.prepAmount}</td>
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
