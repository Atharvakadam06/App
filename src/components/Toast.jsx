import { useState, useCallback } from 'react';
import { CheckCircle, AlertCircle, Info, X } from 'lucide-react';
import ToastContext from '../context/ToastContext';

function ToastItem({ toast, onDismiss }) {
  const icons = {
    success: CheckCircle,
    error: AlertCircle,
    info: Info,
  };
  const colors = {
    success: 'bg-emerald-50/95 dark:bg-emerald-900/30 border-emerald-200/60 dark:border-emerald-800/40 text-emerald-700 dark:text-emerald-300',
    error: 'bg-rose-50/95 dark:bg-rose-900/30 border-rose-200/60 dark:border-rose-800/40 text-rose-700 dark:text-rose-300',
    info: 'bg-blue-50/95 dark:bg-blue-900/30 border-blue-200/60 dark:border-blue-800/40 text-blue-700 dark:text-blue-300',
  };
  const iconColors = {
    success: 'text-emerald-500',
    error: 'text-rose-500',
    info: 'text-blue-500',
  };
  const Icon = icons[toast.type] || icons.info;

  return (
    <div className={`flex items-center gap-3 px-4 py-3.5 rounded-xl border shadow-xl backdrop-blur-sm animate-slide-up ${colors[toast.type] || colors.info}`}>
      <Icon className={`w-5 h-5 flex-shrink-0 ${iconColors[toast.type]}`} />
      <p className="text-sm font-medium flex-1">{toast.message}</p>
      <button onClick={() => onDismiss(toast.id)} className="p-1 rounded-lg hover:bg-black/5 dark:hover:bg-white/5 transition-colors">
        <X className="w-3.5 h-3.5" />
      </button>
    </div>
  );
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'info', duration = 3000) => {
    const id = Date.now() + Math.random();
    setToasts(prev => [...prev, { id, message, type }]);
    if (duration > 0) {
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, duration);
    }
    return id;
  }, []);

  const dismissToast = useCallback((id) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ addToast, dismissToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-[100] flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map(toast => (
          <div key={toast.id} className="pointer-events-auto">
            <ToastItem toast={toast} onDismiss={dismissToast} />
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}