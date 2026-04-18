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
  const inputRef = useRef(null);

  useEffect(() => {
    setInputValue(value || '');
  }, [value]);

  useEffect(() => {
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
    <div className={`relative w-full ${className}`}>
      <div 
        className={`
          relative flex items-center h-11 px-4 rounded-xl
          bg-white dark:bg-[#151a28]
          border transition-all duration-200
          ${isFocused 
            ? 'border-slate-400 dark:border-slate-600' 
            : 'border-slate-200 dark:border-[#1e2540]'
          }
        `}
      >
        <Search 
          className={`
            w-4 h-4 mr-3 shrink-0 transition-colors duration-200
            ${isFocused 
              ? 'text-slate-600 dark:text-slate-400' 
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
            flex-1 h-full bg-transparent text-slate-800 dark:text-slate-100
            placeholder:text-slate-400 dark:placeholder:text-slate-500
            text-[14px] font-normal
            focus:outline-none
            caret-slate-600 dark:caret-slate-400
          "
        />

        {inputValue ? (
          <button
            onClick={handleClear}
            className="
              p-1 rounded-md 
              text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 
              hover:bg-slate-100 dark:hover:bg-slate-800
              transition-all duration-150
            "
            type="button"
            aria-label="Clear search"
          >
            <X className="w-3.5 h-3.5" />
          </button>
        ) : null}
      </div>
    </div>
  );
}