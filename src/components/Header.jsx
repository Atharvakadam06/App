import { useLocation, NavLink } from 'react-router-dom';
import { useEffect, useRef } from 'react';
import {
  MoreVertical, Link2, FileText, BookOpen, ShoppingBag, User, Settings,
} from 'lucide-react';
import { useLayout } from '../context/LayoutContext';

const featureItems = [
  { path: '/bind', icon: Link2, label: 'Binds', subtitle: 'Your campus connections' },
  { path: '/vault', icon: FileText, label: 'PYQ Vault', subtitle: 'Previous question papers' },
  { path: '/library', icon: BookOpen, label: 'Book Exchange', subtitle: 'Free textbooks & notes' },
  { path: '/marketplace', icon: ShoppingBag, label: 'Marketplace', subtitle: 'Buy & sell student items' },
];

export default function Header({ title, subtitle }) {
  const location = useLocation();
  const { isHeaderMenuOpen, setHeaderMenuOpen } = useLayout();
  const menuRef = useRef(null);

  const isFeed = location.pathname === '/';

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (menuRef.current && !menuRef.current.contains(event.target)) {
        setHeaderMenuOpen(false);
      }
    };
    if (isHeaderMenuOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isHeaderMenuOpen, setHeaderMenuOpen]);

  const renderMenu = () => (
    <div className="relative shrink-0" ref={menuRef}>
      <button
        type="button"
        onClick={() => setHeaderMenuOpen(!isHeaderMenuOpen)}
        className={`flex items-center justify-center w-10 h-10 rounded-xl hover:bg-slate-100 dark:hover:bg-white/[0.06] text-slate-600 dark:text-slate-300 transition-all duration-200 active:scale-95 border border-slate-200/50 dark:border-white/[0.04] bg-white/50 dark:bg-white/[0.02] shadow-xs shrink-0 ${
          isHeaderMenuOpen ? 'bg-slate-100 dark:bg-white/[0.08] ring-2 ring-slate-400/20 dark:ring-white/20' : ''
        }`}
        title="More Options"
      >
        <MoreVertical className="w-[19px] h-[19px]" />
      </button>

      {isHeaderMenuOpen && (
        <div className="absolute right-0 top-12 w-64 bg-white/96 dark:bg-[#0e121e]/96 backdrop-blur-2xl border border-slate-200/80 dark:border-white/10 rounded-2xl p-2 shadow-2xl z-50 origin-top-right animate-fade-in">
          {/* Section Title */}
          <div className="px-3 py-1.5 mb-0.5">
            <p className="text-[10px] font-black uppercase tracking-wider text-slate-400 dark:text-slate-500">
              Features
            </p>
          </div>

          {/* Feature Links */}
          <div className="space-y-1">
            {featureItems.map(({ path, icon: Icon, label, subtitle: sub }) => {
              const isActive = location.pathname === path;
              return (
                <NavLink
                  key={path}
                  to={path}
                  onClick={() => setHeaderMenuOpen(false)}
                  className={`flex items-center gap-3 px-2.5 py-2 rounded-xl transition-all duration-150 select-none cursor-pointer ${
                    isActive
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 font-semibold shadow-xs'
                      : 'text-slate-700 dark:text-slate-200 hover:bg-slate-100 dark:hover:bg-white/5'
                  }`}
                >
                  <div className={`p-1.5 rounded-lg shrink-0 ${isActive ? 'bg-white/20 dark:bg-slate-900/20' : 'bg-slate-100 dark:bg-white/5'}`}>
                    <Icon className="w-4 h-4" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="text-xs font-semibold leading-tight truncate">{label}</p>
                    <p className={`text-[10px] truncate mt-0.5 ${isActive ? 'opacity-80' : 'text-slate-400 dark:text-slate-500'}`}>{sub}</p>
                  </div>
                </NavLink>
              );
            })}
          </div>

          {/* Divider */}
          <div className="h-px bg-slate-100 dark:bg-white/5 my-1.5" />

          {/* Quick Links */}
          <div className="space-y-0.5">
            <NavLink
              to="/profile"
              onClick={() => setHeaderMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors select-none cursor-pointer"
            >
              <User className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span>Profile</span>
            </NavLink>

            <NavLink
              to="/settings"
              onClick={() => setHeaderMenuOpen(false)}
              className="flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-white/5 transition-colors select-none cursor-pointer"
            >
              <Settings className="w-4 h-4 text-slate-400 dark:text-slate-500" />
              <span>Settings</span>
            </NavLink>
          </div>
        </div>
      )}
    </div>
  );

  if (isFeed) {
    return (
      <header className="sticky top-0 z-30 shrink-0 safe-area-top">
        <div className="bg-white/95 dark:bg-[#080b14]/95 backdrop-blur-2xl border-b border-slate-200/60 dark:border-white/[0.04]">
          <div className="flex items-center justify-between px-4 sm:px-6 py-3 min-h-[56px] w-full">
            <div className="flex items-center gap-3">
              {/* Mobile: StuGrow logo only */}
              <div className="flex items-center gap-2.5 lg:hidden">
                <div className="w-8 h-8 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center shrink-0 shadow-md shadow-slate-900/15 dark:shadow-white/10">
                  <img src="/logo.svg" alt="StuGrow" className="w-4 h-4" onError={(e) => { e.target.style.display = 'none'; }} />
                </div>
                <span className="text-[20px] font-black text-slate-900 dark:text-white tracking-tight leading-none">StuGrow</span>
              </div>

              {/* Desktop: 'Feed' title */}
              <div className="hidden lg:block">
                <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">Feed</h1>
                <p className="text-xs text-slate-400 dark:text-slate-500 font-medium -mt-0.5">What's happening on campus</p>
              </div>
            </div>

            {/* Right side: Options Menu */}
            {renderMenu()}
          </div>
        </div>
      </header>
    );
  }

  return (
    <header className="sticky top-0 z-30 shrink-0 safe-area-top">
      <div className="bg-white/90 dark:bg-[#080b14]/90 backdrop-blur-2xl border-b border-slate-200/60 dark:border-white/[0.04]">
        <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 min-h-[60px]">
          {/* Mobile: logo + current page */}
          <div className="flex items-center gap-3 min-w-0 lg:hidden">
            <div className="w-9 h-9 rounded-xl bg-slate-900 dark:bg-white flex items-center justify-center shrink-0 shadow-md shadow-slate-900/15 dark:shadow-white/10">
              <img
                src="/logo.svg"
                alt="StuGrow"
                className="w-5 h-5"
                onError={(e) => { e.target.style.display = 'none'; }}
              />
            </div>
            <div className="min-w-0">
              <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight truncate leading-tight">
                {title}
              </h1>
              {subtitle && (
                <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate -mt-0.5 font-medium">
                  {subtitle}
                </p>
              )}
            </div>
          </div>

          {/* Desktop title */}
          <div className="hidden lg:block min-w-0">
            <h1 className="text-xl font-bold text-slate-900 dark:text-white tracking-tight">
              {title}
            </h1>
            {subtitle && (
              <p className="text-xs text-slate-400 dark:text-slate-500 -mt-0.5 font-medium">
                {subtitle}
              </p>
            )}
          </div>

          {/* Right side: Options Menu */}
          {renderMenu()}
        </div>
      </div>
    </header>
  );
}
