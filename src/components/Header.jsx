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
    if (isClosing) return;
    setIsClosing(true);
    setTimeout(() => {
      setHeaderMenuOpen(false);
      setIsClosing(false);
    }, 200);
  };

  const renderMenu = () => (
    <div className="relative shrink-0" ref={menuRef}>
      {/* Three-dot Trigger Button with morphing rotation */}
      <button
        type="button"
        onClick={() => (isHeaderMenuOpen ? closeMenu() : setHeaderMenuOpen(true))}
        className={`relative flex items-center justify-center w-10 h-10 rounded-2xl transition-all duration-300 ease-[cubic-bezier(0.16,1,0.3,1)] active:scale-90 border shrink-0 z-50 select-none ${
          isHeaderMenuOpen
            ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 border-slate-900 dark:border-white shadow-lg shadow-slate-900/20 dark:shadow-white/10 rotate-90'
            : 'bg-white/70 dark:bg-white/[0.06] text-slate-700 dark:text-slate-200 border-slate-200/70 dark:border-white/[0.08] hover:bg-slate-100 dark:hover:bg-white/10 shadow-xs backdrop-blur-md rotate-0'
        }`}
        title="More Options"
      >
        <MoreVertical className="w-[19px] h-[19px] transition-transform duration-300" />
      </button>

      {/* Glassmorphic Dropdown Overlay */}
      {isHeaderMenuOpen && (
        <>
          {/* Subtle Ambient Dimming Backdrop (Smart Animate feel) */}
          <div
            className={`fixed inset-0 z-40 bg-black/15 dark:bg-black/40 backdrop-blur-[2px] transition-all duration-200 ${
              isClosing ? 'animate-backdrop-out pointer-events-none' : 'animate-backdrop-in'
            }`}
            onClick={closeMenu}
          />

          <div
            className={`sg-glass-menu absolute right-0 top-[calc(100%+10px)] w-[284px] z-50 p-2 rounded-[24px] ${
              isClosing ? 'animate-menu-out pointer-events-none' : 'animate-menu-in'
            }`}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Header / Section Title */}
            <div className="flex items-center justify-between px-3 pt-2 pb-1.5">
              <p className="text-[10px] font-black uppercase tracking-[0.14em] text-slate-400 dark:text-slate-500">
                Features
              </p>
              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
            </div>

            {/* Features Navigation List */}
            <div className="space-y-1">
              {featureItems.map(({ path, icon: Icon, label, subtitle: sub }, i) => {
                const isActive = location.pathname === path;
                return (
                  <NavLink
                    key={path}
                    to={path}
                    onClick={closeMenu}
                    className={`sg-menu-item flex items-center gap-3 px-2.5 py-2.5 rounded-[16px] select-none cursor-pointer transition-all duration-200 group active:scale-[0.98] ${
                      isActive
                        ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-md shadow-slate-900/10'
                        : 'hover:bg-slate-100/80 dark:hover:bg-white/[0.08]'
                    }`}
                    style={{ animationDelay: `${i * 40}ms` }}
                  >
                    {/* Squircle Icon Holder */}
                    <div
                      className={`w-10 h-10 rounded-[13px] flex items-center justify-center shrink-0 transition-transform duration-200 group-hover:scale-105 ${
                        isActive
                          ? 'bg-white/15 dark:bg-slate-900/10 text-white dark:text-slate-900'
                          : 'bg-black/[0.05] dark:bg-white/[0.08] text-slate-600 dark:text-slate-300'
                      }`}
                    >
                      <Icon className="w-[18px] h-[18px]" strokeWidth={2.2} />
                    </div>

                    <div className="flex-1 min-w-0">
                      <p
                        className={`text-[13px] font-bold leading-tight truncate ${
                          isActive ? 'text-white dark:text-slate-900' : 'text-slate-900 dark:text-white'
                        }`}
                      >
                        {label}
                      </p>
                      <p
                        className={`text-[11px] mt-0.5 truncate font-medium ${
                          isActive
                            ? 'text-white/70 dark:text-slate-900/70'
                            : 'text-slate-400 dark:text-slate-400'
                        }`}
                      >
                        {sub}
                      </p>
                    </div>
                  </NavLink>
                );
              })}
            </div>

            {/* Refined Hairline Divider */}
            <div className="h-px bg-slate-200/60 dark:bg-white/[0.08] mx-2 my-2" />

            {/* Secondary Actions (Profile & Settings) */}
            <div className="space-y-0.5 px-0.5 pb-1">
              {[
                { to: '/profile', Icon: User, label: 'Profile' },
                { to: '/settings', Icon: Settings, label: 'Settings' },
              ].map(({ to, Icon, label }, i) => {
                const isActive = location.pathname.startsWith(to);
                return (
                  <NavLink
                    key={to}
                    to={to}
                    onClick={closeMenu}
                    className={`sg-menu-item flex items-center gap-3 px-3 py-2.5 rounded-[14px] select-none cursor-pointer transition-all duration-200 active:scale-[0.98] ${
                      isActive
                        ? 'bg-slate-900/5 dark:bg-white/10 font-bold'
                        : 'hover:bg-slate-100/70 dark:hover:bg-white/[0.06]'
                    }`}
                    style={{ animationDelay: `${(featureItems.length + i) * 40}ms` }}
                  >
                    <Icon className="w-[17px] h-[17px] shrink-0 text-slate-500 dark:text-slate-400" />
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
