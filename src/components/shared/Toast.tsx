import React, { createContext, useContext, useState, useCallback, ReactNode } from 'react';
import { X, CheckCircle2, AlertCircle, AlertTriangle, Info } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

export type ToastType = 'success' | 'error' | 'warning' | 'info';

export interface ToastMessage {
  id: string;
  type: ToastType;
  title?: string;
  message: string;
  duration?: number;
}

interface ToastContextType {
  toasts: ToastMessage[];
  showToast: (message: Omit<ToastMessage, 'id'>) => void;
  hideToast: (id: string) => void;
  clearAll: () => void;
}

const ToastContext = createContext<ToastContextType | undefined>(undefined);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

interface ToastProviderProps {
  children: ReactNode;
}

export const ToastProvider: React.FC<ToastProviderProps> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastMessage[]>([]);

  const showToast = useCallback((message: Omit<ToastMessage, 'id'>) => {
    const id = Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
    const newToast: ToastMessage = {
      ...message,
      id,
      duration: message.duration ?? 4000,
    };
    setToasts((prev) => [...prev, newToast]);

    if (newToast.duration > 0) {
      setTimeout(() => {
        setToasts((prev) => prev.filter((t) => t.id !== id));
      }, newToast.duration);
    }
  }, []);

  const hideToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const clearAll = useCallback(() => {
    setToasts([]);
  }, []);

  const getIcon = (type: ToastType) => {
    switch (type) {
      case 'success': return <CheckCircle2 className="w-5 h-5 text-emerald-600" />;
      case 'error': return <AlertCircle className="w-5 h-5 text-rose-600" />;
      case 'warning': return <AlertTriangle className="w-5 h-5 text-amber-600" />;
      case 'info': return <Info className="w-5 h-5 text-blue-600" />;
    }
  };

  const getColors = (type: ToastType) => {
    switch (type) {
      case 'success': return 'bg-emerald-50 border-emerald-200 text-emerald-900';
      case 'error': return 'bg-rose-50 border-rose-200 text-rose-900';
      case 'warning': return 'bg-amber-50 border-amber-200 text-amber-900';
      case 'info': return 'bg-blue-50 border-blue-200 text-blue-900';
    }
  };

  return (
    <ToastContext.Provider value={{ toasts, showToast, hideToast, clearAll }}>
      {children}
      <div className="fixed bottom-4 right-4 left-4 sm:left-auto sm:max-w-sm z-[9999] space-y-2 dir-rtl pointer-events-none">
        <AnimatePresence>
          {toasts.map((toast) => (
            <motion.div
              key={toast.id}
              initial={{ opacity: 0, x: 50, scale: 0.95 }}
              animate={{ opacity: 1, x: 0, scale: 1 }}
              exit={{ opacity: 0, x: 50, scale: 0.95 }}
              transition={{ duration: 0.2 }}
              className={`pointer-events-auto rounded-2xl border p-4 shadow-lg flex items-start gap-3 ${getColors(toast.type)}`}
            >
              <div className="shrink-0 mt-0.5">{getIcon(toast.type)}</div>
              <div className="flex-1 min-w-0">
                {toast.title && <p className="font-extrabold text-sm">{toast.title}</p>}
                <p className="text-xs font-medium leading-relaxed">{toast.message}</p>
              </div>
              <button
                onClick={() => hideToast(toast.id)}
                className="shrink-0 p-1 rounded-lg hover:bg-black/5 text-slate-500 transition-colors"
              >
                <X className="w-4 h-4" />
              </button>
            </motion.div>
          ))}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  );
};