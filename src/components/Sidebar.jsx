import { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import {
  Home,
  MessageCircle,
  Compass,
  Settings,
  LogOut,
  Link2,
  FileText,
  BookOpen,
  Lightbulb,
  LayoutGrid,
  Bell,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { useLayout } from '../context/LayoutContext';
import { useMessages } from '../context/MessageContext';
import MobileMoreMenu from './MobileMoreMenu';

const mainNavItems = [
  { path: '/', icon: Home, label: 'Home' },
  { path: '/connect', icon: Compass, label: 'Explore' },
  { path: '/inbox', icon: MessageCircle, label: 'Messages' },
];

const featureNavItems = [
  { path: '/bind', icon: Link2, label: 'Binds' },
  { path: '/vault', icon: FileText, label: 'PYQ Vault' },
  { path: '/library', icon: BookOpen, label: 'Book Exchange' },
  { path: '/mentor', icon: Lightbulb, label: 'Mentor Hub' },
];

const morePaths = ['/bind', '/vault', '/library', '/mentor', '/settings'];

function NavItem({ path, icon: Icon, label, isActive, badge }) {
  return (
    <NavLink
      to={path}
      title={label}
      className={`relative flex items-center gap-3.5 px-3 py-2.5 rounded-2xl transition-all duration-200 group ${
        isActive
          ? 'bg-slate-900 dark:bg-white text-white dark:text-slate-900 shadow-lg shadow-slate-900/15 dark:shadow-white/10'
          : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-100'
      }`}
    >
      <div className="relative shrink-0">
        <Icon
          className={`w-[21px] h-[21px] transition-transform duration-200 ${
            isActive ? '' : 'group-hover:scale-110'
          }`}
        />
        {badge > 0 && (
          <span className="absolute -top-1.5 -right-1.5 min-w-[16px] h-4 bg-rose-500 text-white text-[9px] font-bold rounded-full flex items-center justify-center px-1 leading-none">
            {badge > 9 ? '9+' : badge}
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
  const [moreOpen, setMoreOpen] = useState(false);
  const isMoreActive = morePaths.some((p) => location.pathname === p);

  return (
    <>
      {/* Desktop Sidebar */}
      <aside className="hidden lg:flex fixed left-0 top-0 h-full w-[72px] xl:w-[244px] bg-white dark:bg-[#080b14] flex-col z-50 border-r border-slate-100 dark:border-[#0e1322] transition-all duration-300 safe-area-top">
        {/* Logo */}
        <div className="px-3 xl:px-4 pt-6 pb-5 shrink-0">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-slate-900 dark:bg-white flex items-center justify-center shrink-0 shadow-lg shadow-slate-900/20 dark:shadow-white/10">
              <img src="/logo.svg" alt="StuGrow" className="w-6 h-6" onError={(e) => { e.target.style.display = 'none'; }} />
            </div>
            <span className="hidden xl:block text-[20px] font-black text-slate-900 dark:text-white tracking-tight">StuGrow</span>
          </div>
        </div>

        {/* Nav */}
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

          <div className="hidden xl:flex pt-4 pb-1.5 px-3 items-center gap-2">
            <div className="flex-1 h-px bg-slate-100 dark:bg-[#0e1322]" />
            <p className="text-[9px] font-black uppercase tracking-widest text-slate-400 dark:text-slate-600 shrink-0">Features</p>
            <div className="flex-1 h-px bg-slate-100 dark:bg-[#0e1322]" />
          </div>

          <div className="lg:block xl:hidden pt-3 pb-1">
            <div className="h-px bg-slate-100 dark:bg-[#0e1322] mx-2" />
          </div>

          {featureNavItems.map(({ path, icon, label }) => (
            <NavItem
              key={path}
              path={path}
              icon={icon}
              label={label}
              isActive={location.pathname === path}
            />
          ))}
        </nav>

        {/* Bottom */}
        <div className="p-2 xl:p-3 border-t border-slate-100 dark:border-[#0e1322] space-y-0.5 shrink-0 safe-area-bottom">
          <NavLink
            to="/profile"
            className={`flex items-center gap-3 px-3 py-2.5 rounded-2xl transition-all duration-200 ${
              location.pathname.startsWith('/profile')
                ? 'bg-slate-100 dark:bg-white/5'
                : 'hover:bg-slate-100 dark:hover:bg-white/5'
            }`}
          >
            <div className={`relative shrink-0 w-8 h-8 rounded-full overflow-hidden border-2 transition-all duration-200 ${
              location.pathname.startsWith('/profile')
                ? 'border-slate-800 dark:border-slate-200 shadow-md'
                : 'border-slate-200 dark:border-slate-700'
            }`}>
              {user?.avatar ? (
                <img src={user.avatar} alt={user?.name} className="w-full h-full object-cover" />
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
            className={`flex items-center gap-3.5 px-3 py-2.5 rounded-2xl transition-all duration-200 ${
              location.pathname === '/settings'
                ? 'bg-slate-100 dark:bg-white/5 text-slate-900 dark:text-white'
                : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-white/5 hover:text-slate-900 dark:hover:text-slate-100'
            }`}
          >
            <Settings className="w-[20px] h-[20px] shrink-0" />
            <span className="hidden xl:block text-[13.5px] font-semibold">Settings</span>
          </NavLink>

          <button
            type="button"
            onClick={logout}
            className="flex items-center gap-3.5 px-3 py-2.5 rounded-2xl text-slate-400 hover:bg-rose-50 dark:hover:bg-rose-900/10 hover:text-rose-500 transition-all duration-200 w-full group min-h-[44px]"
          >
            <LogOut className="w-[20px] h-[20px] shrink-0 transition-transform duration-200 group-hover:translate-x-0.5" />
            <span className="hidden xl:block text-[13.5px] font-semibold">Log out</span>
          </button>
        </div>
      </aside>

      <MobileMoreMenu open={moreOpen} onClose={() => setMoreOpen(false)} />

      {/* Mobile Bottom Navigation */}
      {!hideMobileNav && (
        <nav className="lg:hidden fixed bottom-0 left-0 right-0 z-[9999] safe-area-bottom">
          <div className="mx-3 mb-2.5 rounded-2xl bg-white/95 dark:bg-[#080b14]/95 backdrop-blur-2xl border border-slate-200/60 dark:border-white/[0.06] shadow-xl shadow-slate-900/10 dark:shadow-black/40">
            <div className="flex items-center justify-around py-1 px-1">
              {mainNavItems.map(({ path, icon: Icon }) => {
                const isActive = location.pathname === path;
                const badge = path === '/inbox' ? unreadMessageCount : 0;
                return (
                  <NavLink
                    key={path}
                    to={path}
                    className={`relative flex flex-col items-center justify-center min-w-[52px] min-h-[52px] rounded-2xl transition-all duration-200 active:scale-90 ${
                      isActive
                        ? 'text-slate-900 dark:text-white'
                        : 'text-slate-400 dark:text-slate-500'
                    }`}
                  >
                    <div className={`relative p-2.5 rounded-xl transition-all duration-200 ${
                      isActive ? 'bg-slate-100 dark:bg-white/10' : ''
                    }`}>
                      <Icon className={`w-[22px] h-[22px] transition-transform duration-200 ${isActive ? 'scale-105' : ''}`} />
                      {badge > 0 && (
                        <span className="notification-badge">{badge > 9 ? '9+' : badge}</span>
                      )}
                    </div>
                  </NavLink>
                );
              })}

              <button
                type="button"
                onClick={() => setMoreOpen(true)}
                className={`relative flex flex-col items-center justify-center min-w-[52px] min-h-[52px] rounded-2xl transition-all duration-200 active:scale-90 ${
                  isMoreActive ? 'text-slate-900 dark:text-white' : 'text-slate-400 dark:text-slate-500'
                }`}
                aria-label="More options"
              >
                <div className={`p-2.5 rounded-xl transition-all duration-200 ${
                  isMoreActive ? 'bg-slate-100 dark:bg-white/10' : ''
                }`}>
                  <LayoutGrid className={`w-[22px] h-[22px] transition-transform duration-200 ${isMoreActive ? 'scale-105' : ''}`} />
                </div>
              </button>

              <NavLink
                to="/profile"
                className={`relative flex items-center justify-center min-w-[52px] min-h-[52px] active:scale-90 transition-all duration-200`}
              >
                <div className={`relative p-2 rounded-xl transition-all duration-200 ${
                  location.pathname.startsWith('/profile') ? 'bg-slate-100 dark:bg-white/10' : ''
                }`}>
                  <div className={`w-7 h-7 rounded-full overflow-hidden border-2 transition-all duration-200 ${
                    location.pathname.startsWith('/profile')
                      ? 'border-slate-800 dark:border-white shadow-md scale-105'
                      : 'border-transparent'
                  }`}>
                    {user?.avatar ? (
                      <img src={user.avatar} alt={user?.name} className="w-full h-full object-cover" />
                    ) : (
                      <div className="w-full h-full bg-slate-200 dark:bg-slate-700 flex items-center justify-center">
                        <span className="text-xs font-bold text-slate-600 dark:text-slate-300">{user?.name?.charAt(0)}</span>
                      </div>
                    )}
                  </div>
                </div>
              </NavLink>
            </div>
          </div>
        </nav>
      )}
    </>
  );
}
