import { useLocation } from 'react-router-dom';

export default function Header({ title, subtitle }) {
  const location = useLocation();

  // On the feed page show a clean header — logo on mobile, 'Feed' title on desktop, no bell/moon
  const isFeed = location.pathname === '/';

  if (isFeed) {
    return (
      <header className="sticky top-0 z-30 shrink-0 safe-area-top">
        <div className="bg-white/95 dark:bg-[#080b14]/95 backdrop-blur-2xl border-b border-slate-200/60 dark:border-white/[0.04]">
          <div className="flex items-center px-4 sm:px-6 py-3 min-h-[56px]">
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
        </div>
      </div>
    </header>
  );
}
