import { NavLink } from 'react-router-dom';
import {
  X,
  Link2,
  FileText,
  BookOpen,
  ShoppingBag,
  Settings,
  LogOut,
  GraduationCap,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const moreItems = [
  { path: '/bind', icon: Link2, label: 'Binds', desc: 'Your connections', color: 'bg-violet-50 dark:bg-violet-900/20 text-violet-600 dark:text-violet-400' },
  { path: '/vault', icon: FileText, label: 'PYQ Vault', desc: 'Question papers', color: 'bg-amber-50 dark:bg-amber-900/20 text-amber-600 dark:text-amber-400' },
  { path: '/library', icon: BookOpen, label: 'Book Exchange', desc: 'Free textbooks', color: 'bg-emerald-50 dark:bg-emerald-900/20 text-emerald-600 dark:text-emerald-400' },
  { path: '/marketplace', icon: ShoppingBag, label: 'Marketplace', desc: 'Buy & sell items', color: 'bg-rose-50 dark:bg-rose-900/20 text-rose-600 dark:text-rose-400' },
  { path: '/settings', icon: Settings, label: 'Settings', desc: 'Preferences & account', color: 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400' },
];

export default function MobileMoreMenu({ open, onClose }) {
  const { logout } = useAuth();

  if (!open) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-[10000]" role="dialog" aria-modal="true" aria-label="More options">
      {/* Backdrop */}
      <button
        type="button"
        className="absolute inset-0 bg-black/50 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close menu"
      />

      {/* Sheet */}
      <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#080b14] rounded-t-3xl shadow-2xl animate-slide-up safe-area-bottom overflow-hidden">
        {/* Handle */}
        <div className="flex justify-center pt-3 pb-1">
          <div className="w-10 h-1 rounded-full bg-slate-200 dark:bg-slate-700" />
        </div>

        {/* Header */}
        <div className="px-5 pt-3 pb-4 flex items-center justify-between">
          <div>
            <h2 className="text-lg font-bold text-slate-900 dark:text-white">Explore StuGrow</h2>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">All features at a glance</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="w-10 h-10 flex items-center justify-center rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 active:scale-95 transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-500 dark:text-slate-400" />
          </button>
        </div>

        {/* Grid of features */}
        <div className="px-4 pb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {moreItems.map(({ path, icon: Icon, label, desc, color }) => (
            <NavLink
              key={path}
              to={path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex flex-col gap-3 p-4 rounded-2xl border transition-all duration-200 active:scale-95 min-h-[96px] ${
                  isActive
                    ? 'bg-slate-100 dark:bg-white/5 border-slate-300 dark:border-slate-600 shadow-sm'
                    : 'bg-slate-50 dark:bg-white/[0.02] border-slate-200 dark:border-white/[0.06] hover:border-slate-300 dark:hover:border-white/10 hover:shadow-sm'
                }`
              }
            >
              <div className={`w-10 h-10 rounded-xl flex items-center justify-center ${color}`}>
                <Icon className="w-5 h-5" />
              </div>
              <div className="min-w-0">
                <p className="text-sm font-bold text-slate-900 dark:text-white truncate">{label}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate mt-0.5">{desc}</p>
              </div>
            </NavLink>
          ))}
        </div>

        {/* Divider */}
        <div className="mx-4 h-px bg-slate-100 dark:bg-white/[0.05]" />

        {/* Logout */}
        <div className="px-4 py-3">
          <button
            type="button"
            onClick={() => { onClose(); logout(); }}
            className="w-full flex items-center justify-center gap-2.5 py-4 rounded-2xl text-rose-500 bg-rose-50 dark:bg-rose-900/10 hover:bg-rose-100 dark:hover:bg-rose-900/20 font-semibold text-sm active:scale-[0.97] transition-all min-h-[52px] border border-rose-200/50 dark:border-rose-900/30"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </div>
      </div>
    </div>
  );
}
