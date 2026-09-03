import { useLocation, NavLink } from 'react-router-dom';
import { useEffect, useRef, useState } from 'react';
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

  const [isClosing, setIsClosing] = useState(false);

  const closeMenu = () => {
    setIsClosing(true);
    setTimeout(() => {
      setHeaderMenuOpen(false);
      setIsClosing(false);
    }, 180);
  };

  const renderMenu = () => (
    <div className="relative shrink-0" ref={menuRef}>
      {/* Three-dot button */}
      <button
        type="button"
        onClick={() => isHeaderMenuOpen ? closeMenu() : setHeaderMenuOpen(true)}
        className={`flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-200 active:scale-90 border shrink-0 ${
          isHeaderMenuOpen
            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-lg shadow-slate-900/25'
            : 'bg-white/60 dark:bg-white/[0.06] text-slate-600 dark:text-slate-300 border-slate-200/60 dark:border-white/[0.07] hover:bg-slate-100 dark:hover:bg-white/10 shadow-sm backdrop-blur-sm'
        }`}
        title="More Options"
      >
        <MoreVertical
          className="w-[18px] h-[18px] transition-transform duration-300"
          style={{ transform: isHeaderMenuOpen ? 'rotate(90deg)' : 'rotate(0deg)' }}
        />
      </button>

      {/* Glassmorphic dropdown */}
      {isHeaderMenuOpen && (
        <>
          {/* Invisible backdrop to catch outside taps */}
          <div
            className="fixed inset-0 z-40"
            onClick={closeMenu}
          />

          <div
            className={`sg-glass-menu absolute right-0 top-[calc(100%+8px)] w-[272px] z-50 origin-top-right p-[10px] rounded-[20px] ${
              isClosing ? 'animate-menu-out' : 'animate-menu-in'
            }`}
            onClick={e => e.stopPropagation()}
          >

            {/* FEATURES section */}
            <div className="px-2 pt-1 pb-2">
              <p className="text-[10px] font-black uppercase tracking-[0.1em] text-slate-400 dark:text-slate-500 mb-2 ml-0.5">
                Features
              </p>
              <div className="space-y-0.5">
                {featureItems.map(({ path, icon: Icon, label, subtitle: sub }, i) => {
                  const isActive = location.pathname === path;
                  return (
                    <NavLink
                      key={path}
                      to={path}
                      onClick={closeMenu}
                      className={`sg-menu-item flex items-center gap-3 px-2.5 py-2.5 rounded-[14px] select-none cursor-pointer group ${
                        isActive
                          ? 'bg-slate-900 dark:bg-white/10'
                          : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.07]'
                      }`}
                      style={{ animationDelay: `${i * 35}ms` }}
                    >
                      {/* Floating icon square */}
                      <div
                        className={`w-9 h-9 rounded-[11px] flex items-center justify-center shrink-0 shadow-sm ${
                          isActive
                            ? 'bg-white/15'
                            : 'bg-black/[0.06] dark:bg-white/[0.07]'
                        }`}
                      >
                        <Icon
                          className={`w-[17px] h-[17px] ${
                            isActive ? 'text-white' : 'text-slate-500 dark:text-slate-400'
                          }`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className={`text-[13px] font-semibold leading-tight ${
                          isActive ? 'text-white' : 'text-slate-800 dark:text-slate-100'
                        }`}>
                          {label}
                        </p>
                        <p className={`text-[11px] mt-0.5 truncate ${
                          isActive ? 'text-white/60' : 'text-slate-400 dark:text-slate-500'
                        }`}>
                          {sub}
                        </p>
                      </div>
                    </NavLink>
                  );
                })}
              </div>
            </div>

            {/* Hairline divider */}
            <div className="h-px bg-black/[0.07] dark:bg-white/[0.07] mx-1.5 my-1.5" />

            {/* Profile & Settings */}
            <div className="space-y-0.5 px-0.5">
              {[
                { to: '/profile',  Icon: User,     label: 'Profile'  },
                { to: '/settings', Icon: Settings, label: 'Settings' },
              ].map(({ to, Icon, label }, i) => {
                const isActive = location.pathname.startsWith(to);
                return (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={closeMenu}
                    className={`sg-menu-item flex items-center gap-3 px-3 py-2.5 rounded-[14px] select-none cursor-pointer ${
                      isActive
                        ? 'bg-black/[0.05] dark:bg-white/[0.07]'
                        : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                    }`}
                    style={{ animationDelay: `${(featureItems.length + i) * 35}ms` }}
                  >
                    <Icon className="w-[16px] h-[16px] shrink-0 text-slate-400 dark:text-slate-500" />
                    <span className="text-[13px] font-semibold text-slate-700 dark:text-slate-200">
                      {label}
                    </span>
                  </NavLink>
                );
              })}
            </div>
          </div>
        </>
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
