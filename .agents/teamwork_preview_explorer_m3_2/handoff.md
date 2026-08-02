# Handoff Report — Explorer 2 (Milestone 3: Station Prep Sheet & Print/Export Spec)

## 1. Observation

### 1.1 Existing Files & Components Examined
- `apps/web/src/pages/PrepPlannerPage.tsx` (333 lines)
  - Lines 10–11: Shift constants defined (`SHIFTS = ['AM', 'PM', 'Brunch', 'Dinner']`).
  - Lines 58–78: Page Header currently renders page title, date (`today`), a "Refresh" button (`RefreshCw`), and an "Add Item" button (`Plus`).
  - Lines 114–235: **Saved Plan View**: Renders completion alert (`CheckCheck`), progress bar (`doneCount / totalCount`), "Rebuild" button, "Complete Shift" button, and item list with small `w-4 h-4` checkboxes (`line 207`) and amber prep amounts (`line 215`).
  - Lines 236–313: **Unsaved / Live View**: Renders warning banner ("Plan not saved yet"), "Save Plan" button (`Save`), and item table showing Item, Stock, Par, Prep, Unit.
- `apps/web/src/hooks/usePrepPlans.ts` (163 lines)
  - Lines 5–27: Defines `DBPrepPlan`, `DBPrepPlanItem`, `DBPrepPlanWithItems` interfaces.
  - Lines 29–47: `usePrepPlan(shift, date)` returns `DBPrepPlanWithItems | null`.
- `apps/web/src/hooks/useParLevels.ts` (123 lines)
  - Lines 16–23: Defines `ShiftPrepItem` (`ingredient_name`, `current_stock`, `par_amount`, `prep_amount`, `unit`, `recipe_id`).
  - Lines 47–73: `useShiftPrep(shift, date)` calculates live unsaved prep items below par level.
- `apps/web/src/components/layout/Layout.tsx` (18 lines)
  - Lines 7–15: Renders `<Sidebar />`, `<Topbar />`, and `<main className="flex-1 overflow-y-auto p-6">`.
- `apps/web/src/components/layout/Sidebar.tsx` (121 lines)
  - Lines 81–83: `<aside className="hidden md:flex flex-col w-56 ...">` sticky desktop sidebar.
  - Lines 86–98: `<header className="md:hidden flex ...">` mobile top header bar.
- `apps/web/src/components/layout/Topbar.tsx` (41 lines)
  - Lines 19–38: `<header className="h-14 shrink-0 flex ...">` desktop top header bar.
- `apps/web/src/index.css` (42 lines)
  - `@layer utilities` defines `.card`, `.btn-primary`, `.btn-ghost`, `.input`, `.badge`. No `@media print` rules currently exist in `index.css`.
- `packages/prep-engine/src/index.ts` (63 lines)
  - Pure TS shift prep & mise en place calculator types (`PrepItem`, `ShiftPrepPlan`).

---

## 2. Logic Chain

1. **Observation**: `PrepPlannerPage.tsx` currently displays shift prep plans optimized solely for web browser UI interaction (dark theme `bg-surface`, small `w-4 h-4` checkboxes, compact text, edit buttons).
2. **Observation**: Line staff in commercial and home kitchen prep environments require a clean, printable/exportable layout with large, clear checkboxes, high contrast, date & shift header, prep quantities, and notes sections that can be pinned to clipboards or station display tablets.
3. **Observation**: `Layout.tsx`, `Sidebar.tsx`, and `Topbar.tsx` present sidebars and top navigation bars that would clutter printed sheets and waste printer ink if standard web printing (`window.print()`) is invoked without print isolation styles.
4. **Deduction**: Adding a dedicated `@media print` stylesheet rule set in `index.css` will hide navigation bars (`aside`, `header`, `.no-print`) and enforce clean white backgrounds (`#ffffff`), dark typography (`#111827`), explicit table borders (`1px solid #e5e7eb`), and high-contrast checkbox squares when printing.
5. **Deduction**: Creating a modular `StationPrepSheet` component and a `StationExportModal` modal in `apps/web/src/components/prep/` allows kitchen staff to both preview the station prep sheet on-screen (with a "Print Sheet" and "Copy List to Clipboard" action) and trigger clean print output via a dedicated `Printer` button in `PrepPlannerPage.tsx`.

---

## 3. Caveats

- **No source code edits made during this turn**: In accordance with the Explorer role instructions, no source files outside `.agents/` were modified.
- **Printed Layout Dependencies**: Paper printing depends on browser print driver settings; setting `@page { size: letter portrait; margin: 12mm 15mm; }` in CSS guarantees consistent defaults across Chrome/Edge/Firefox/Safari.
- **Station Notes**: Currently, `prep_plan_items` table in Supabase has a `note text` column (V005 migration, line 41). The station prep sheet design incorporates a column for these notes as well as extra writing space for physical clipboards.

---

## 4. Conclusion & Technical Design Specification

### 4.1 Specification Overview
The Station Prep Sheet solution consists of three main elements:
1. **`StationPrepSheet.tsx`**: High-contrast, clean kitchen line layout component designed for physical display and print rendering.
2. **`StationExportModal.tsx`**: On-screen preview modal with "Print Prep Sheet", "Copy Text List", and "Station Mode" triggers.
3. **`@media print` CSS Specification**: Print media query isolated styles in `index.css` hiding navigation chrome and optimizing document typography.
4. **Header Integration in `PrepPlannerPage.tsx`**: Dedicated `Print` / `Station View` button in the page header.

---

### 4.2 Detailed Component Specifications

#### Specification 1: `apps/web/src/components/prep/StationPrepSheet.tsx`
```tsx
import { ReactNode } from 'react';
import { DBPrepPlanItem } from '@/hooks/usePrepPlans';
import { ShiftPrepItem } from '@/hooks/useParLevels';

export interface StationPrepSheetItem {
  id?: string;
  ingredient_name: string;
  prep_amount: number;
  unit: string;
  is_done?: boolean;
  note?: string | null;
}

interface StationPrepSheetProps {
  shift: string;
  date: string;
  items: StationPrepSheetItem[];
  isSavedPlan?: boolean;
  planCompleted?: boolean;
  completedAt?: string | null;
  className?: string;
}

export default function StationPrepSheet({
  shift,
  date,
  items,
  isSavedPlan = false,
  planCompleted = false,
  completedAt,
  className = '',
}: StationPrepSheetProps) {
  const completedCount = items.filter((i) => i.is_done).length;
  const totalCount = items.length;

  return (
    <div className={`station-prep-sheet bg-white text-zinc-900 p-6 rounded-xl border border-zinc-200 shadow-sm print:p-0 print:border-none print:shadow-none ${className}`}>
      {/* Header */}
      <div className="flex items-start justify-between border-b-2 border-zinc-900 pb-4 mb-4">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="font-bold tracking-wider uppercase text-xs text-zinc-500">KitchenKit</span>
            <span className="text-zinc-300">•</span>
            <span className="font-semibold text-xs text-brand-700 print:text-zinc-700">Culinary Prep Planner</span>
          </div>
          <h1 className="text-2xl font-extrabold text-zinc-900 tracking-tight">STATION PREP SHEET</h1>
          <p className="text-xs text-zinc-500 mt-1">Line Prep & Mise en Place Checklist</p>
        </div>
        <div className="text-right">
          <div className="inline-block px-3 py-1 bg-zinc-900 text-white font-bold text-sm rounded-md print:border print:border-zinc-900 print:bg-zinc-100 print:text-zinc-900">
            {shift} SHIFT
          </div>
          <div className="text-sm font-semibold text-zinc-800 mt-1.5">{date}</div>
          <div className="text-xs text-zinc-500 mt-0.5">
            {completedCount} of {totalCount} Completed
          </div>
        </div>
      </div>

      {/* Verification / Shift Note Banner */}
      <div className="mb-4 p-3 bg-zinc-50 border border-zinc-200 rounded-lg flex items-center justify-between text-xs text-zinc-700 print:bg-zinc-50">
        <div>
          <span className="font-bold">Station Instructions:</span> Check off items as completed. Label, date, and initial all prep containers.
        </div>
        {planCompleted && (
          <div className="font-bold text-emerald-700 print:text-zinc-900">
            SHIFT COMPLETED {completedAt ? `(${new Date(completedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})` : ''}
          </div>
        )}
      </div>

      {/* Prep Table */}
      {items.length === 0 ? (
        <div className="py-8 text-center text-zinc-500 italic border border-dashed border-zinc-300 rounded-lg">
          No prep required for the {shift} shift. All items at par level.
        </div>
      ) : (
        <table className="station-prep-table w-full border-collapse">
          <thead>
            <tr className="bg-zinc-100 text-zinc-800 text-xs font-bold uppercase tracking-wider border-b-2 border-zinc-300">
              <th className="py-2.5 px-3 text-center w-12">Done</th>
              <th className="py-2.5 px-3 text-left">Item / Prep Name</th>
              <th className="py-2.5 px-3 text-right w-32">Prep Qty</th>
              <th className="py-2.5 px-3 text-left w-48">Notes / Batch Spec</th>
              <th className="py-2.5 px-3 text-center w-24">Verified</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-zinc-200 text-sm">
            {items.map((item, idx) => (
              <tr key={item.id ?? `${item.ingredient_name}-${idx}`} className={item.is_done ? 'bg-zinc-50 print:bg-white' : ''}>
                {/* Large Checkbox Square */}
                <td className="py-3 px-3 text-center vertical-align-middle">
                  <div className={`w-6 h-6 mx-auto rounded border-2 flex items-center justify-center font-bold transition-colors ${
                    item.is_done 
                      ? 'border-zinc-900 bg-zinc-900 text-white print:bg-zinc-200 print:text-zinc-900' 
                      : 'border-zinc-400 bg-white'
                  }`}>
                    {item.is_done ? '✓' : ''}
                  </div>
                </td>
                {/* Item Name */}
                <td className="py-3 px-3">
                  <div className={`font-bold text-base ${item.is_done ? 'line-through text-zinc-400 print:text-zinc-600' : 'text-zinc-900'}`}>
                    {item.ingredient_name}
                  </div>
                </td>
                {/* Prep Amount & Unit */}
                <td className="py-3 px-3 text-right tabular-nums">
                  <span className={`inline-block font-extrabold text-base px-2 py-0.5 rounded bg-amber-50 text-amber-900 border border-amber-200 print:bg-zinc-100 print:text-zinc-900 print:border-zinc-300 ${
                    item.is_done ? 'opacity-50 print:opacity-100' : ''
                  }`}>
                    +{item.prep_amount} {item.unit}
                  </span>
                </td>
                {/* Notes */}
                <td className="py-3 px-3 text-xs text-zinc-600">
                  {item.note ? item.note : <span className="text-zinc-300 print:text-zinc-200">______________________</span>}
                </td>
                {/* Line Verification / Time Signature */}
                <td className="py-3 px-3 text-center text-xs text-zinc-400">
                  {item.is_done ? 'DONE' : <span className="text-zinc-300 print:text-zinc-200">___:___</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}

      {/* Footer Sign-off Block */}
      <div className="mt-8 pt-4 border-t border-zinc-300 flex justify-between text-xs text-zinc-600">
        <div>
          <span>Prepared By: ___________________________</span>
        </div>
        <div>
          <span>Sous / Head Chef Sign-off: ___________________________</span>
        </div>
        <div>
          <span>Printed: {new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
        </div>
      </div>
    </div>
  );
}
```

---

#### Specification 2: `apps/web/src/components/prep/StationExportModal.tsx`
```tsx
import { X, Printer, Copy, Check, Eye } from 'lucide-react';
import { useState } from 'react';
import toast from 'react-hot-toast';
import StationPrepSheet, { StationPrepSheetItem } from './StationPrepSheet';

interface StationExportModalProps {
  shift: string;
  date: string;
  items: StationPrepSheetItem[];
  isSavedPlan?: boolean;
  planCompleted?: boolean;
  completedAt?: string | null;
  onClose: () => void;
}

export default function StationExportModal({
  shift,
  date,
  items,
  isSavedPlan = false,
  planCompleted = false,
  completedAt,
  onClose,
}: StationExportModalProps) {
  const [copied, setCopied] = useState(false);

  function handlePrint() {
    window.print();
  }

  function handleCopyText() {
    const textList = [
      `=== KITCHENKIT PREP LIST ===`,
      `Shift: ${shift} | Date: ${date}`,
      `Items count: ${items.length}`,
      `----------------------------`,
      ...items.map((i) => `[${i.is_done ? 'X' : ' '}] ${i.ingredient_name} — +${i.prep_amount} ${i.unit}${i.note ? ` (${i.note})` : ''}`),
      `============================`,
    ].join('\n');

    navigator.clipboard.writeText(textList);
    setCopied(true);
    toast.success('Prep list copied to clipboard!');
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/80 backdrop-blur-sm overflow-y-auto no-print">
      <div className="w-full max-w-4xl bg-surface-card border border-surface-border rounded-2xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Header */}
        <div className="flex items-center justify-between px-6 py-4 border-b border-surface-border bg-surface-card shrink-0">
          <div className="flex items-center gap-2">
            <Printer className="w-5 h-5 text-brand-400" />
            <h2 className="font-bold text-zinc-100 text-lg">Station Prep Sheet Preview</h2>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={handleCopyText}
              className="btn-ghost text-sm flex items-center gap-1.5"
              title="Copy plain text to clipboard"
            >
              {copied ? <Check size={15} className="text-emerald-400" /> : <Copy size={15} />}
              {copied ? 'Copied' : 'Copy Text'}
            </button>
            <button
              onClick={handlePrint}
              className="btn-primary text-sm flex items-center gap-2"
            >
              <Printer size={15} />
              Print Sheet
            </button>
            <button onClick={onClose} className="btn-ghost p-1.5 ml-2" aria-label="Close">
              <X size={18} />
            </button>
          </div>
        </div>

        {/* Scrollable Preview Area */}
        <div className="flex-1 overflow-y-auto p-6 bg-zinc-900">
          <StationPrepSheet
            shift={shift}
            date={date}
            items={items}
            isSavedPlan={isSavedPlan}
            planCompleted={planCompleted}
            completedAt={completedAt}
          />
        </div>
      </div>
    </div>
  );
}
```

---

#### Specification 3: CSS `@media print` Rules in `apps/web/src/index.css`
Append the following CSS to `apps/web/src/index.css`:

```css
/* Print styles for Station Prep Sheet and document isolation */
@media print {
  @page {
    size: letter portrait;
    margin: 10mm 12mm 10mm 12mm;
  }

  body {
    background-color: #ffffff !important;
    color: #111827 !important;
    font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif !important;
    -webkit-print-color-adjust: exact !important;
    print-color-adjust: exact !important;
  }

  /* Hide layout chrome, sidebars, topbars, buttons, modals overlays */
  aside,
  header,
  nav,
  .no-print,
  button,
  .btn-primary,
  .btn-ghost {
    display: none !important;
  }

  /* Ensure the printed container spans full width */
  main {
    padding: 0 !important;
    margin: 0 !important;
    overflow: visible !important;
  }

  /* Force print view to display cleanly */
  .station-prep-sheet {
    display: block !important;
    box-shadow: none !important;
    border: none !important;
    width: 100% !important;
    max-width: 100% !important;
    padding: 0 !important;
  }

  /* Prevent page breaks inside table rows */
  .station-prep-table tr {
    page-break-inside: avoid !important;
    break-inside: avoid !important;
  }
}
```

---

#### Specification 4: Page Integration in `PrepPlannerPage.tsx`
Add `Printer` icon import from `lucide-react` and state for `showStationModal`:

```tsx
import { Printer } from 'lucide-react';
import StationExportModal from '@/components/prep/StationExportModal';
import StationPrepSheet from '@/components/prep/StationPrepSheet';

// Inside component:
const [showStationModal, setShowStationModal] = useState(false);

// In Header action buttons (line 63+):
<button
  onClick={() => setShowStationModal(true)}
  className="btn-ghost flex items-center gap-1.5 text-sm border border-surface-border"
  title="Print or view station prep sheet"
>
  <Printer size={15} /> Station Sheet
</button>

// At bottom of return statement:
{showStationModal && (
  <StationExportModal
    shift={shift}
    date={today}
    items={
      hasSavedPlan
        ? savedItems.map((item) => ({
            id: item.id,
            ingredient_name: item.ingredient_name,
            prep_amount: item.prep_amount,
            unit: item.unit,
            is_done: item.is_done,
            note: item.note,
          }))
        : parItems.map((item) => ({
            ingredient_name: item.ingredient_name,
            prep_amount: item.prep_amount,
            unit: item.unit,
            is_done: false,
          }))
    }
    isSavedPlan={hasSavedPlan}
    planCompleted={planCompleted}
    completedAt={savedPlan?.completed_at}
    onClose={() => setShowStationModal(false)}
  />
)}
```

---

## 5. Verification Method

To verify the implementation of this specification once built:

1. **Build & Lint Verification**:
   ```bash
   pnpm --filter web build
   ```
   Ensure typescript compilation succeeds with zero errors (`tsc -b`).

2. **UI & Component Inspection**:
   - Open `http://localhost:5173/prep` (or current dev server port).
   - Verify the "Station Sheet" button appears in the top right actions area next to "Refresh" and "Add Item".
   - Click "Station Sheet" button: verify `StationExportModal` opens showing high-contrast sheet preview.
   - Test "Copy Text" button: paste into a text editor and verify clean formatted output.

3. **Print Layout Verification**:
   - Click "Print Sheet" inside modal or invoke `Ctrl+P` / `Cmd+P`.
   - In browser print preview:
     - Verify Sidebar navigation and Topbar header are hidden completely.
     - Verify background is white `#ffffff` with black `#111827` high-contrast typography.
     - Verify checkboxes are bold `24px x 24px` squares.
     - Verify item names, prep amounts (+500 g), shift header (AM/PM), date, and sign-off signature block render cleanly.
