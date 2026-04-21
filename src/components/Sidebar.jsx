import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  MessageCircle,
  Compass,
  Settings,
  GraduationCap,
  LogOut,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

const mainNavItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/connect', icon: Compass, label: 'Explore' },
  { path: '/inbox', icon: MessageCircle, label: 'Messages' },
];

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();

  return (
    <>
      {/* Desktop Sidebar - Left icon rail */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-[72px] xl:w-[240px] bg-white dark:bg-[#080b14] flex-col z-50 border-r border-[#e8e5e0] dark:border-[#151a28] transition-all duration-300">
        {/* Logo */}
        <div className="p-4 xl:px-5 pt-6 pb-4">
          <div className="flex items-center gap-3">
            <img src="/logo.svg" alt="StuGrow" className="w-10 h-10 rounded-xl shrink-0" />
            <span className="hidden xl:block text-xl font-extrabold text-slate-900 dark:text-white tracking-tight">StuGrow</span>
          </div>
        </div>

        {/* Main nav */}
        <nav className="flex-1 px-2 xl:px-3 py-2 space-y-1">
          {mainNavItems.map(({ path, label }, index) => {
            const Icon = mainNavItems[index].icon;
            const isActive = location.pathname === path;
            return (
              <NavLink
                key={path}
                to={path}
                className={`flex items-center gap-4 px-3 py-3 rounded-xl transition-all duration-200 group relative ${
                  isActive
                    ? 'bg-[#f3f1ed] dark:bg-[#0e1322] text-slate-900 dark:text-white font-semibold'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-[#f8f6f3] dark:hover:bg-[#0e1322]/60 hover:text-slate-900 dark:hover:text-slate-200'
                }`}
              >
                <Icon className={`w-[22px] h-[22px] transition-transform duration-200 ${isActive ? 'scale-105' : 'group-hover:scale-110'}`} />
                <span className="hidden xl:block text-[15px]">{label}</span>
                {isActive && <div className="hidden xl:block absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-slate-800 dark:bg-slate-200 rounded-r-full" />}
              </NavLink>
            );
          })}
        </nav>

        {/* Bottom section */}
        <div className="p-3 xl:p-4 border-t border-[#e8e5e0] dark:border-[#151a28] space-y-1">
          <NavLink
            to="/profile"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-xl transition-all duration-200 ${
              location.pathname === '/profile'
                ? 'bg-[#f3f1ed] dark:bg-[#0e1322]'
                : 'hover:bg-[#f8f6f3] dark:hover:bg-[#0e1322]/60'
            }`}
          >
            <img
              src={user?.avatar}
              alt={user?.name}
              className="w-7 h-7 rounded-full object-cover border-2 border-[#e8e5e0] dark:border-[#1e2540] shadow-sm shrink-0"
            />
            <div className="hidden xl:block flex-1 min-w-0">
              <p className="text-sm font-semibold text-slate-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">@{user?.username}</p>
            </div>
          </NavLink>

          <NavLink
            to="/settings"
            className={`flex items-center gap-4 px-3 py-2.5 rounded-xl transition-all duration-200 ${
              location.pathname === '/settings'
                ? 'bg-[#f3f1ed] dark:bg-[#0e1322] text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:bg-[#f8f6f3] dark:hover:bg-[#0e1322]/60 hover:text-slate-900 dark:hover:text-slate-200'
            }`}
          >
            <Settings className="w-5 h-5 shrink-0" />
            <span className="hidden xl:block text-sm">Settings</span>
          </NavLink>

          <button
            onClick={logout}
            className="flex items-center gap-4 px-3 py-2.5 rounded-xl text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/20 hover:text-rose-500 transition-all duration-200 w-full group"
          >
            <LogOut className="w-5 h-5 shrink-0" />
            <span className="hidden xl:block text-sm">Log out</span>
          </button>
        </div>
      </aside>

      {/* Mobile Bottom Navigation */}
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 bg-white dark:bg-[#080b14] border-t border-[#e8e5e0] dark:border-[#151a28] z-[100] safe-area-bottom">
          <div className="flex items-center justify-around py-2 px-1">
            {[
              { path: '/', icon: Home },
              { path: '/connect', icon: Compass },
              { path: '/inbox', icon: MessageCircle },
            ].map(({ path }, index) => {
              const Icon = [Home, Compass, MessageCircle][index];
              const isActive = location.pathname === path;
              return (
                <NavLink
                  key={path}
                  to={path}
                  className={`relative flex items-center justify-center w-12 h-12 rounded-xl transition-all duration-200 ${
                    isActive ? 'text-slate-900 dark:text-white scale-110' : 'text-slate-400 dark:text-slate-500'
                  }`}
                >
                  <Icon className={`w-[24px] h-[24px] transition-transform duration-200 ${isActive ? '' : 'hover:scale-110'}`} />
                  {isActive && <div className="absolute -bottom-0.5 left-1/2 -translate-x-1/2 w-5 h-0.5 bg-slate-800 dark:bg-slate-200 rounded-full" />}
                </NavLink>
              );
            })}
          {/* Profile avatar */}
          <NavLink
            to="/profile"
            className="relative flex items-center justify-center w-12 h-12"
          >
            <img
              src={user?.avatar}
              alt={user?.name}
              className={`w-7 h-7 rounded-full object-cover border-2 transition-all duration-200 ${
                location.pathname === '/profile'
                  ? 'border-slate-800 dark:border-slate-200 scale-110 shadow-md'
                  : 'border-transparent'
              }`}
            />
          </NavLink>
        </div>
      </nav>
    </>
  );
}
