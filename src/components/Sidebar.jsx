import { NavLink, useLocation } from 'react-router-dom';
import { Home, MessageCircle, Compass, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import { useMessages } from '../context/MessageContext';
import { handleAvatarError } from '../utils/avatarUtils';

const mainNavItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/inbox', icon: MessageCircle, label: 'Messages' },
  { path: '/connect', icon: Compass, label: 'Explore' },
];

function NavItem({ path, icon: Icon, label, isActive, badge }) {
  return (
    <NavLink
      to={path}
      title={label}
      className={`relative flex items-center gap-3.5 px-3 py-2.5 rounded-2xl transition-all duration-300 ease-in-out group border border-transparent ${
        isActive
          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg shadow-slate-900/15 dark:shadow-white/10'
          : 'bg-transparent shadow-none text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-100'
      }`}
    >
      <div className="relative shrink-0">
        <Icon
          className={`w-[21px] h-[21px] transition-transform duration-300 ease-in-out ${
            isActive ? 'scale-105' : 'group-hover:scale-110'
          }`}
        />
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {badge}
          </span>
        )}
      </div>
      <span className="hidden xl:block text-[13.5px] font-semibold truncate">{label}</span>
    </NavLink>
  );
}

export default function Sidebar() {
  const location = useLocation();
  const { user, logout } = useAuth();
  const { hideMobileNav } = useLayout();
  const { unreadMessageCount } = useMessages();

  return (
    <>
      {/* ── Desktop Sidebar ─────────────────────────────────────────────── */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-[72px] xl:w-[244px] bg-white dark:bg-[#080b14] flex-col z-50 border-r border-slate-100 dark:border-[#0e1322]">
        {/* Logo */}
        <div className="px-3 xl:px-4 pt-6 pb-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 dark:bg-white flex items-center justify-center shrink-0 shadow-lg shadow-slate-900/20 dark:shadow-white/10">
              <img src="/logo.svg" alt="StuGrow" className="w-6 h-6" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
            <span className="hidden xl:block text-[20px] font-black text-slate-900 dark:text-white tracking-tight">StuGrow</span>
          </div>
        </div>

        {/* Main Nav */}
        <nav className="flex-1 px-2 xl:px-3 py-1 space-y-0.5 overflow-y-auto no-scrollbar">
          {mainNavItems.map(({ path, icon, label }) => (
            <NavItem
              key={path}
              path={path}
              icon={icon}
              label={label}
              isActive={location.pathname === path}
              badge={path === '/inbox' ? unreadMessageCount : 0}
            />
          ))}
        </nav>

        {/* Bottom: Profile + Settings + Logout */}
        <div className="p-2 xl:p-3 border-t border-slate-100 dark:border-[#0e1322] space-y-0.5 shrink-0">
          <NavLink
            to="/profile"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-300 ease-in-out border border-transparent ${
              location.pathname.startsWith('/profile')
                ? 'bg-slate-100 dark:bg-white/5'
                : 'bg-transparent hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <div className={`relative shrink-0 w-8 h-8 rounded-full overflow-hidden border-2 transition-all duration-300 ease-in-out ${
              location.pathname.startsWith('/profile')
                ? 'border-slate-800 dark:border-slate-200 shadow-md scale-105'
                : 'border-slate-200 dark:border-slate-700'
            }`}>
              {user?.avatar ? (
                <img src={user.avatar} alt={user?.name} className="w-full h-full object-cover" onError={(e) => handleAvatarError(e, user?.name)} />
              ) : (
                <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                  <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{user?.name?.charAt(0)}</span>
                </div>
              )}
            </div>
            <div className="hidden xl:block flex-1 min-w-0">
              <p className="text-[13px] font-semibold text-slate-900 dark:text-white truncate">{user?.name}</p>
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate">@{user?.username}</p>
            </div>
          </NavLink>

          <NavLink
            to="/settings"
            className={`flex items-center gap-3.5 px-3 py-2.5 rounded-2xl transition-all duration-300 ease-in-out border border-transparent ${
              location.pathname === '/settings'
                ? 'bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white'
                : 'bg-transparent text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Settings className="w-[20px] h-[20px] shrink-0" />
            <span className="hidden xl:block text-[13.5px] font-semibold">Settings</span>
          </NavLink>

          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-3.5 px-3 py-2.5 rounded-2xl text-slate-400 bg-transparent hover:bg-rose-50 dark:hover:bg-rose-900/10 hover:text-rose-500 transition-all duration-300 ease-in-out w-full group min-h-[44px] border border-transparent"
          >
            <LogOut className="w-[20px] h-[20px] shrink-0 transition-transform duration-300 ease-in-out group-hover:translate-x-0.5" />
            <span className="hidden xl:block text-[13.5px] font-semibold">Log out</span>
          </button>
        </div>
      </aside>

      {/* ── Mobile Bottom Navigation (Floating Pill with Circle Edges) ─────── */}
      <nav
        className={`lg:hidden fixed bottom-0 left-0 right-0 z-[9999] flex justify-center pointer-events-none transition-all duration-[400ms] ease-[cubic-bezier(0.16,1,0.3,1)] ${
          hideMobileNav
            ? 'opacity-0 translate-y-16'
            : 'opacity-100 translate-y-0'
        }`}
        style={{ paddingBottom: 'max(0.75rem, env(safe-area-inset-bottom))' }}
      >
        <div className="pointer-events-auto flex items-center gap-1 bg-white/96 dark:bg-[#0a0d14]/97 backdrop-blur-2xl border border-slate-200/70 dark:border-white/[0.08] rounded-full px-2.5 py-1.5 shadow-[0_8px_32px_rgba(0,0,0,0.12)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.65)]">

          {/* Nav Items (Home, Messages, Explore) */}
          {mainNavItems.map(({ path, icon: Icon, label }) => {
            const isActive = location.pathname === path;
            const badge = path === '/inbox' ? unreadMessageCount : 0;
            return (
              <NavLink
                key={path}
                to={path}
                title={label}
                className={`relative flex items-center justify-center w-12 h-12 rounded-full select-none cursor-pointer active:scale-90 transition-all duration-200 ${
                  isActive
                    ? 'text-slate-900 dark:text-white font-bold'
                    : 'text-slate-400 dark:text-slate-500 hover:text-slate-700 dark:hover:text-slate-300'
                }`}
              >
                {/* Active circle indicator */}
                {isActive && (
                  <span className="absolute inset-0 rounded-full bg-slate-100 dark:bg-white/10 shadow-xs" />
                )}
                <Icon className="relative w-[21px] h-[21px]" />
                {badge > 0 && (
                  <span className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-rose-500 rounded-full border-2 border-white dark:border-[#0a0d14]" />
                )}
              </NavLink>
            );
          })}

          {/* Thin divider */}
          <div className="w-px h-5 bg-slate-200/80 dark:bg-white/[0.08] mx-0.5 shrink-0" />

          {/* Profile Avatar */}
          <NavLink
            to="/profile"
            title="Profile"
            className="relative flex items-center justify-center w-12 h-12 rounded-full active:scale-90 transition-all duration-200 select-none cursor-pointer"
          >
            {location.pathname.startsWith('/profile') && (
              <span className="absolute inset-0 rounded-full bg-slate-100 dark:bg-white/10 shadow-xs" />
            )}
            <div
              className={`relative w-[27px] h-[27px] rounded-full overflow-hidden border-2 transition-all duration-200 ${
                location.pathname.startsWith('/profile')
                  ? 'border-slate-800 dark:border-white shadow-sm scale-105'
                  : 'border-slate-300 dark:border-slate-600'
              }`}
            >
              {user?.avatar ? (
                <img
                  src={user.avatar}
                  alt={user?.name}
                  className="w-full h-full object-cover"
                  onError={(e) => handleAvatarError(e, user?.name)}
                />
              ) : (
                <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                  <span className="text-[11px] font-bold text-slate-600 dark:text-slate-300">
                    {user?.name?.charAt(0)}
                  </span>
                </div>
              )}
            </div>
          </NavLink>
        </div>
      </nav>
    </>
  );
}
