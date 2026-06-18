export default function Header({ title, subtitle }) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#080b14]/80 backdrop-blur-xl border-b border-[#e8e5e0] dark:border-[#151a28] safe-area-top shrink-0">
      <div className="flex items-center justify-between gap-3 px-4 sm:px-6 py-3 min-h-[56px]">
        {/* Mobile: logo + current page */}
        <div className="flex items-center gap-2.5 min-w-0 lg:hidden">
          <img src="/logo.svg" alt="StuGrow" className="w-8 h-8 rounded-lg shrink-0" />
          <div className="min-w-0">
            <h1 className="text-base font-bold text-slate-900 dark:text-white tracking-tight truncate leading-tight">{title}</h1>
            {subtitle && (
              <p className="text-[11px] text-slate-400 dark:text-slate-500 truncate -mt-0.5">{subtitle}</p>
            )}
          </div>
        </div>

        {/* Desktop title */}
        <div className="hidden lg:block min-w-0">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 -mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-1 sm:gap-2 shrink-0" />
      </div>
    </header>
  );
}
