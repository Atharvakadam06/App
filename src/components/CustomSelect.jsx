import { useState, useRef, useEffect } from 'react';
import { ChevronDown, Check, X } from 'lucide-react';

export default function CustomSelect({ value, onChange, options, placeholder, allowCustom = true, className = '' }) {
  const [isOpen, setIsOpen] = useState(false);
  const [search, setSearch] = useState('');
  const [showCustomInput, setShowCustomInput] = useState(false);
  const wrapperRef = useRef(null);
  
  const filteredOptions = options.filter(opt => 
    opt.toLowerCase().includes(search.toLowerCase())
  );
  
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (wrapperRef.current && !wrapperRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);
  
  const handleOpen = () => {
    setIsOpen(prev => !prev);
    setShowCustomInput(true);
    if (!isOpen) {
      setSearch('');
    }
  };
  
  const handleClose = () => {
    setIsOpen(false);
    setTimeout(() => setShowCustomInput(false), 200);
  };
  
  const handleSelect = (option) => {
    onChange(option);
    handleClose();
  };
  
  const handleCustomSubmit = () => {
    if (search.trim()) {
      onChange(search.trim());
      handleClose();
    }
  };
  
  return (
    <div ref={wrapperRef} className={`relative ${className}`}>
      <button
        type="button"
        onClick={handleOpen}
        className="input-field w-full flex items-center justify-between text-left"
      >
        <span className={value ? 'text-slate-900 dark:text-white' : 'text-slate-400'}>
          {value || placeholder}
        </span>
        <ChevronDown className={`w-5 h-5 text-slate-400 transition-transform duration-300 ${isOpen ? 'rotate-180' : ''}`} />
      </button>
      
      {isOpen && (
        <div className="absolute z-50 w-full mt-2 bg-white dark:bg-slate-800 rounded-xl border border-slate-200 dark:border-slate-700 shadow-xl overflow-hidden animate-fade-in">
          {allowCustom && showCustomInput && (
            <div className="p-3 border-b border-slate-100 dark:border-slate-700">
              <input
                type="text"
                placeholder="Type to search or add custom..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="input-field py-2 px-3 text-sm"
                autoFocus
              />
            </div>
          )}
          <div className="max-h-60 overflow-y-auto">
            {filteredOptions.length === 0 && !allowCustom ? (
              <div className="p-4 text-center text-slate-400 text-sm">No options found</div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => handleSelect(option)}
                  className="w-full px-4 py-3 text-left text-sm text-slate-700 dark:text-slate-200 hover:bg-slate-50 dark:hover:bg-slate-700/50 flex items-center justify-between transition-colors duration-200"
                >
                  {option}
                  {value === option && <Check className="w-4 h-4 text-blue-500" />}
                </button>
              ))
            )}
            {allowCustom && search && !filteredOptions.some(o => o.toLowerCase() === search.toLowerCase()) && (
              <button
                type="button"
                onClick={handleCustomSubmit}
                className="w-full px-4 py-3 text-left text-sm text-blue-600 dark:text-blue-400 hover:bg-blue-50 dark:hover:bg-blue-900/20 flex items-center justify-between transition-colors duration-200 border-t border-slate-100 dark:border-slate-700"
              >
                <span>Use "<span className="font-medium">{search}</span>"</span>
                <ChevronDown className="w-4 h-4 rotate-90" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}
