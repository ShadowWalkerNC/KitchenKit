import { NavLink } from 'react-router-dom';
import { LayoutDashboard, BookOpen, ClipboardList, ChefHat } from 'lucide-react';
import { cn } from '@/lib/utils';

const nav = [
  { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
  { to: '/recipes',   icon: BookOpen,         label: 'Recipes' },
  { to: '/prep',      icon: ClipboardList,    label: 'Prep Planner' },
];

export default function Sidebar() {
  return (
    <aside className="w-56 shrink-0 bg-surface-card border-r border-surface-border flex flex-col">
      {/* Logo */}
      <div className="flex items-center gap-2.5 px-5 py-5 border-b border-surface-border">
        <ChefHat className="text-brand-400" size={22} />
        <span className="font-semibold text-zinc-100 tracking-tight">KitchenKit</span>
      </div>

      {/* Nav */}
      <nav className="flex-1 px-3 py-4 space-y-0.5">
        {nav.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors',
                isActive
                  ? 'bg-brand-600/20 text-brand-300'
                  : 'text-zinc-400 hover:bg-surface hover:text-zinc-100'
              )
            }
          >
            <Icon size={16} />
            {label}
          </NavLink>
        ))}
      </nav>

      {/* Ecosystem badge */}
      <div className="px-4 py-4 border-t border-surface-border">
        <p className="text-xs text-zinc-600">Part of</p>
        <a
          href="https://github.com/ShadowWalkerNC/CulinaryOS"
          target="_blank"
          rel="noreferrer"
          className="text-xs text-brand-500 hover:text-brand-400 transition-colors"
        >
          CulinaryOS Ecosystem →
        </a>
      </div>
    </aside>
  );
}
