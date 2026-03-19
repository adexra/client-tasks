import { createContext, useContext, useState, useCallback, useMemo } from 'react';
import { CheckCircle2, XCircle, X } from 'lucide-react';
import { cn } from '../lib/utils';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const addToast = useCallback((message, type = 'success') => {
    const id = Date.now();
    setToasts(prev => [...prev, { id, message, type }]);
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 3000);
  }, []);

  const dismiss = (id) => setToasts(prev => prev.filter(t => t.id !== id));

  const toast = useMemo(() => ({
    success: (msg) => addToast(msg, 'success'),
    error: (msg) => addToast(msg, 'error'),
  }), [addToast]);

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {/* Toast stack */}
      <div className="fixed bottom-6 right-6 z-50 flex flex-col gap-2 pointer-events-none" aria-live="assertive">
        {toasts.map(t => (
          <div
            key={t.id}
            className={cn(
              'flex items-center gap-3 px-4 py-3 rounded-xl border shadow-2xl backdrop-blur-sm pointer-events-auto',
              'animate-in slide-in-from-bottom-2 fade-in duration-200',
              t.type === 'success'
                ? 'bg-zinc-900/95 border-green-500/30 text-zinc-100'
                : 'bg-zinc-900/95 border-rose-500/30 text-zinc-100'
            )}
          >
            {t.type === 'success'
              ? <CheckCircle2 className="h-4 w-4 text-green-400 shrink-0" />
              : <XCircle className="h-4 w-4 text-rose-400 shrink-0" />
            }
            <span className="text-sm font-medium">{t.message}</span>
            <button
              onClick={() => dismiss(t.id)}
              className="ml-2 text-zinc-500 hover:text-zinc-300 transition-colors shrink-0"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) throw new Error('useToast must be used within ToastProvider');
  return ctx;
}
