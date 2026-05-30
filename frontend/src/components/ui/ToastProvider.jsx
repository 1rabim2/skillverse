import React from 'react';
import { AlertCircle, CheckCircle2, Info, X } from 'lucide-react';
import { cn } from '../../lib/cn';

const ToastContext = React.createContext(null);

const TOAST_STYLES = {
  success: {
    icon: CheckCircle2,
    className:
      'border-emerald-200 bg-emerald-50 text-emerald-900 dark:border-emerald-900/60 dark:bg-emerald-950 dark:text-emerald-100'
  },
  error: {
    icon: AlertCircle,
    className:
      'border-red-200 bg-red-50 text-red-900 dark:border-red-900/60 dark:bg-red-950 dark:text-red-100'
  },
  info: {
    icon: Info,
    className:
      'border-slate-200 bg-white text-slate-900 dark:border-slate-800 dark:bg-slate-900 dark:text-slate-100'
  }
};

function makeToast(message, type = 'info', options = {}) {
  return {
    id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
    message,
    type,
    title: options.title || '',
    duration: Number(options.duration || 4500)
  };
}

export function ToastProvider({ children }) {
  const [toasts, setToasts] = React.useState([]);

  const remove = React.useCallback((id) => {
    setToasts((prev) => prev.filter((toast) => toast.id !== id));
  }, []);

  const push = React.useCallback((message, type = 'info', options = {}) => {
    const toast = makeToast(message, type, options);
    setToasts((prev) => [...prev.slice(-3), toast]);
    if (toast.duration > 0) {
      window.setTimeout(() => remove(toast.id), toast.duration);
    }
    return toast.id;
  }, [remove]);

  const value = React.useMemo(
    () => ({
      show: push,
      success: (message, options) => push(message, 'success', options),
      error: (message, options) => push(message, 'error', options),
      info: (message, options) => push(message, 'info', options),
      remove
    }),
    [push, remove]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div
        aria-live="polite"
        aria-relevant="additions"
        className="pointer-events-none fixed right-4 top-4 z-[80] flex w-[calc(100vw-2rem)] max-w-sm flex-col gap-3"
      >
        {toasts.map((toast) => {
          const style = TOAST_STYLES[toast.type] || TOAST_STYLES.info;
          const Icon = style.icon;
          return (
            <div
              key={toast.id}
              className={cn(
                'pointer-events-auto flex gap-3 rounded-xl border p-4 shadow-lg shadow-slate-900/10',
                style.className
              )}
            >
              <Icon className="mt-0.5 h-5 w-5 flex-none" aria-hidden="true" />
              <div className="min-w-0 flex-1">
                {toast.title ? <div className="text-sm font-bold">{toast.title}</div> : null}
                <div className="break-words text-sm">{toast.message}</div>
              </div>
              <button
                type="button"
                onClick={() => remove(toast.id)}
                className="rounded-lg p-1 opacity-70 transition hover:bg-black/5 hover:opacity-100 dark:hover:bg-white/10"
                aria-label="Dismiss notification"
              >
                <X className="h-4 w-4" aria-hidden="true" />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = React.useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used inside ToastProvider');
  return ctx;
}
