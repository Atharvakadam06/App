import { useState, useRef, useEffect } from 'react';
import { Search, X } from 'lucide-react';

export default function ProfessionalSearch({
  placeholder = 'Search...',
  value = '',
  onChange,
  onSubmit,
  className = '',
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const [isMac, setIsMac] = useState(false);
  const inputRef = useRef(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
    // Detect OS for shortcut badge
    if (typeof window !== 'undefined') {
      const platform = window.navigator.platform?.toUpperCase() || '';
      setIsMac(platform.indexOf('MAC') >= 0);
    }

    const handleKeyDown = (e) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, []);

  const handleChange = (e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(newValue);
  };

  const handleClear = () => {
    setInputValue('');
    setIsFocused(false);
    onChange?.('');
    inputRef.current?.blur();
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      onSubmit?.(inputValue);
    } else if (e.key === 'Escape') {
      handleClear();
    }
  };

  return (
    <div className={`relative w-full transition-all duration-300 ${className}`}>
      <div 
        className={`
          relative flex items-center h-11 px-3.5 rounded-2xl
          bg-slate-50/50 dark:bg-[#0c101b]/20 hover:bg-slate-100/50 dark:hover:bg-[#0c101b]/40
          backdrop-blur-md border transition-all duration-300 ease-out
          ${isFocused 
            ? 'border-indigo-500/50 dark:border-indigo-400/50 bg-white dark:bg-[#0f1425] shadow-lg shadow-indigo-500/5 dark:shadow-indigo-400/5 ring-4 ring-indigo-500/10 dark:ring-indigo-400/10' 
            : 'border-slate-200/80 dark:border-slate-800/80'
          }
        `}
      >
        <Search 
          className={`
            w-4 h-4 mr-2.5 shrink-0 transition-all duration-300 ease-out
            ${isFocused 
              ? 'scale-110 -rotate-6 text-indigo-500 dark:text-indigo-400' 
              : 'text-slate-400 dark:text-slate-500'
            }
          `} 
        />

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => !inputValue && setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          className="
            flex-1 h-full bg-transparent text-[13.5px] font-medium
            text-slate-800 dark:text-slate-150
            placeholder:text-slate-400/90 dark:placeholder:text-slate-500/90
            focus:outline-none
            caret-indigo-500 dark:caret-indigo-450
          "
        />

        {/* Action / State area */}
        <div className="relative flex items-center justify-end min-w-[36px] h-6 shrink-0 ml-1">
          {/* Keyboard shortcut badge */}
          <div
            className={`
              hidden sm:flex items-center gap-0.5 px-1.5 py-0.5 rounded-md
              border border-slate-200/80 dark:border-slate-800/80
              bg-slate-100/80 dark:bg-slate-900/80
              text-[9px] text-slate-400 dark:text-slate-500 font-sans font-bold
              transition-all duration-300 ease-out select-none
              ${(isFocused || inputValue) ? 'opacity-0 scale-75 translate-x-2 pointer-events-none' : 'opacity-100 scale-100'}
            `}
          >
            <span>{isMac ? '⌘' : 'Ctrl'}</span>
            <span>K</span>
          </div>

          {/* Clear search button */}
          <button
            onClick={handleClear}
            className={`
              absolute right-0 p-1 rounded-lg 
              text-slate-400 hover:text-slate-650 dark:hover:text-slate-350 
              hover:bg-slate-100 dark:hover:bg-slate-800/60
              transition-all duration-300 hover:rotate-90 active:scale-75
              ${inputValue ? 'opacity-100 scale-100 pointer-events-auto' : 'opacity-0 scale-75 pointer-events-none'}
            `}
            type="button"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>
    </div>
  );
}