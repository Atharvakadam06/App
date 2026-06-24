import { useState, useRef, useEffect, useCallback } from 'react';
import { Search, X } from 'lucide-react';

export default function ProfessionalSearch({
  placeholder = 'Search...',
  value = '',
  onChange,
  onSubmit,
  className = '',
  showKbdHint = false, // kept for API compat, no longer rendered
}) {
  const [isFocused, setIsFocused] = useState(false);
  const [inputValue, setInputValue] = useState(value || '');
  const inputRef = useRef(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  const handleChange = useCallback((e) => {
    const newValue = e.target.value;
    setInputValue(newValue);
    onChange?.(newValue);
  }, [onChange]);

  const handleClear = useCallback(() => {
    setInputValue('');
    onChange?.('');
    inputRef.current?.focus();
  }, [onChange]);

  const handleKeyDown = useCallback((e) => {
    if (e.key === 'Enter' && inputValue.trim()) {
      onSubmit?.(inputValue);
    } else if (e.key === 'Escape') {
      handleClear();
      inputRef.current?.blur();
    }
  }, [inputValue, onSubmit, handleClear]);

  return (
    <div className={`relative w-full ${className}`}>
      <div
        className={`flex items-center gap-2.5 px-3.5 rounded-xl transition-all duration-200 border ${
          isFocused
            ? 'border-slate-400 dark:border-slate-600 bg-white dark:bg-[#0c0f17] shadow-sm'
            : 'border-slate-200/80 dark:border-slate-800/50 bg-slate-50/50 dark:bg-[#0c0f17]/40 hover:border-slate-300 dark:hover:border-slate-700/60'
        }`}
        style={{ height: '42px' }}
      >
        <Search
          className={`w-[14px] h-[14px] shrink-0 transition-colors duration-200 ${
            isFocused ? 'text-slate-600 dark:text-slate-300' : 'text-slate-400 dark:text-slate-500'
          }`}
        />

        <input
          ref={inputRef}
          type="text"
          value={inputValue}
          onChange={handleChange}
          onFocus={() => setIsFocused(true)}
          onBlur={() => setIsFocused(false)}
          onKeyDown={handleKeyDown}
          placeholder={placeholder}
          autoComplete="off"
          className="sb-input flex-1 h-full bg-transparent border-none outline-none text-[13px] font-medium text-slate-800 dark:text-slate-200"
          style={{ caretColor: '#64748b', outline: 'none' }}
        />
        {inputValue ? (
          <button
            onClick={handleClear}
            type="button"
            aria-label="Clear"
            className="flex items-center justify-center w-5 h-5 rounded-full bg-slate-200/50 dark:bg-slate-800/50 text-slate-500 hover:text-red-600 dark:hover:text-red-400 hover:bg-red-50 dark:hover:bg-red-950/30 transition-all duration-200 shrink-0"
          >
            <X className="w-[11px] h-[11px]" strokeWidth={2.5} />
          </button>
        ) : null}
      </div>

      <style>{`
        .sb-input::placeholder {
          color: rgb(148, 163, 184);
        }
        .dark .sb-input::placeholder {
          color: rgb(71, 85, 105);
        }
      `}</style>
    </div>
  );
}