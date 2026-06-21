import { useLocation, useNavigate } from 'react-router-dom';
import { Bell, Sun, Moon } from 'lucide-react';
import { useTheme } from '../context/ThemeContext';
import { useNotifications } from '../context/NotificationContext';

export default function Header({ title, subtitle }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { darkMode, toggleTheme } = useTheme();
  const { notifications } = useNotifications();
  const unreadNotifCount = notifications.filter(n => !n.read).length;

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

          {/* Right side actions */}
          <div className="flex items-center gap-1.5 shrink-0">
            {/* Dark mode toggle */}
            <button
              type="button"
              onClick={toggleTheme}
              className="header-action-btn"
              title={darkMode ? 'Switch to light mode' : 'Switch to dark mode'}
              aria-label="Toggle theme"
            >
              {darkMode ? (
                <Sun className="w-[18px] h-[18px]" />
              ) : (
                <Moon className="w-[18px] h-[18px]" />
              )}
            </button>

            {/* Notifications bell */}
            <button
              type="button"
              onClick={() => navigate('/profile')}
              className="header-action-btn relative"
              title="Notifications"
              aria-label="Notifications"
            >
              <Bell className="w-[18px] h-[18px]" />
              {unreadNotifCount > 0 && (
                <span className="absolute -top-0.5 -right-0.5 min-w-[16px] h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none animate-scale-in">
                  {unreadNotifCount}
                </span>
              )}
            </button>
          </div>
        </div>
      </div>
    </header>
  );
}
