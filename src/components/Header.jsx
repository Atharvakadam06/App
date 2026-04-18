export default function Header({ title, subtitle }) {
  return (
    <header className="sticky top-0 z-30 bg-white/80 dark:bg-[#080b14]/80 backdrop-blur-xl border-b border-[#e8e5e0] dark:border-[#151a28]">
      <div className="flex items-center justify-between px-4 sm:px-6 py-3">
        {/* Mobile logo */}
        <div className="flex items-center gap-3 lg:hidden">
          <img src="/logo.svg" alt="StuGrow" className="w-8 h-8 rounded-lg" />
          <span className="text-lg font-extrabold text-slate-900 dark:text-white tracking-tight">StuGrow</span>
        </div>

        {/* Desktop title */}
        <div className="hidden lg:block">
          <h1 className="text-lg font-bold text-slate-900 dark:text-white tracking-tight">{title}</h1>
          {subtitle && <p className="text-xs text-slate-400 dark:text-slate-500 -mt-0.5">{subtitle}</p>}
        </div>

        <div className="flex items-center gap-1 sm:gap-2">
        </div>
      </div>
    </header>
  );
}