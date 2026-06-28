import { useLocation } from 'react-router-dom';

const titles: Record<string, string> = {
  '/dashboard': 'Dashboard',
  '/recipes':   'Recipes',
  '/prep':      'Prep Planner',
};

export default function Topbar() {
  const { pathname } = useLocation();
  const base = '/' + pathname.split('/')[1];
  const title = titles[base] ?? 'KitchenKit';

  return (
    <header className="h-14 shrink-0 flex items-center px-6 border-b border-surface-border bg-surface-card">
      <h1 className="text-base font-semibold text-zinc-100">{title}</h1>
    </header>
  );
}
