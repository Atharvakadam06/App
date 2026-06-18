import { NavLink } from 'react-router-dom';
import {
  X,
  Link2,
  FileText,
  BookOpen,
  Lightbulb,
  Settings,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const moreItems = [
  { path: '/bind', icon: Link2, label: 'Binds', desc: 'Your connections' },
  { path: '/vault', icon: FileText, label: 'PYQ Vault', desc: 'Question papers' },
  { path: '/library', icon: BookOpen, label: 'Book Exchange', desc: 'Free textbooks' },
  { path: '/mentor', icon: Lightbulb, label: 'Mentor Hub', desc: 'Tips from seniors' },
  { path: '/settings', icon: Settings, label: 'Settings', desc: 'Preferences & account' },
];

export default function MobileMoreMenu({ open, onClose }) {
  const { logout } = useAuth();

  if (!open) return null;

  return (
    <div className="lg:hidden fixed inset-0 z-[10000]" role="dialog" aria-modal="true" aria-label="More options">
      <button
        type="button"
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
        aria-label="Close menu"
      />
      <div className="absolute bottom-0 left-0 right-0 bg-white dark:bg-[#080b14] rounded-t-2xl border-t border-[#e8e5e0] dark:border-[#151a28] shadow-2xl animate-slide-up safe-area-bottom pb-2 max-h-[85dvh] overflow-y-auto">
        <div className="sticky top-0 bg-white/95 dark:bg-[#080b14]/95 backdrop-blur-sm px-4 pt-4 pb-3 border-b border-[#e8e5e0] dark:border-[#151a28] flex items-center justify-between">
          <h2 className="text-base font-bold text-slate-900 dark:text-white">Explore StuGrow</h2>
          <button
            type="button"
            onClick={onClose}
            className="w-9 h-9 flex items-center justify-center rounded-xl hover:bg-[#f3f1ed] dark:hover:bg-[#0e1322] active:scale-95 transition-all"
            aria-label="Close"
          >
            <X className="w-5 h-5 text-slate-500" />
          </button>
        </div>
        <div className="p-3 grid grid-cols-2 gap-2 sm:grid-cols-3">
          {moreItems.map(({ path, icon: Icon, label, desc }) => (
            <NavLink
              key={path}
              to={path}
              onClick={onClose}
              className={({ isActive }) =>
                `flex flex-col gap-2 p-3.5 rounded-xl border transition-all active:scale-[0.98] min-h-[88px] ${
                  isActive
                    ? 'bg-[#f3f1ed] dark:bg-[#0e1322] border-slate-300 dark:border-slate-600'
                    : 'bg-[#faf8f5] dark:bg-[#0c1018] border-[#e8e5e0] dark:border-[#151a28] hover:border-slate-300 dark:hover:border-slate-600'
                }`
              }
            >
              <Icon className="w-5 h-5 text-slate-600 dark:text-slate-300 shrink-0" />
              <div className="min-w-0">
                <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{label}</p>
                <p className="text-[11px] text-slate-500 dark:text-slate-400 truncate">{desc}</p>
              </div>
            </NavLink>
          ))}
        </div>
        <div className="px-3 pb-3">
          <button
            type="button"
            onClick={() => { onClose(); logout(); }}
            className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl text-rose-500 hover:bg-rose-50 dark:hover:bg-rose-900/20 font-medium text-sm active:scale-[0.98] transition-all min-h-[48px]"
          >
            <LogOut className="w-4 h-4" />
            Log out
          </button>
        </div>
      </div>
    </div>
  );
}
