import React, { createContext, useContext, useState, useCallback, ReactNode, useRef } from 'react';
import { X, AlertTriangle } from 'lucide-react';
import { motion, AnimatePresence } from 'motion/react';

interface ConfirmDialogOptions {
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  variant?: 'danger' | 'warning' | 'info';
  onConfirm: () => void;
  onCancel?: () => void;
}

interface ConfirmDialogContextType {
  showConfirm: (options: ConfirmDialogOptions) => void;
  hideConfirm: () => void;
}

const ConfirmDialogContext = createContext<ConfirmDialogContextType | undefined>(undefined);

export const useConfirm = () => {
  const context = useContext(ConfirmDialogContext);
  if (!context) {
    throw new Error('useConfirm must be used within a ConfirmDialogProvider');
  }
  return context;
};

interface ConfirmDialogProviderProps {
  children: ReactNode;
}

export const ConfirmDialogProvider: React.FC<ConfirmDialogProviderProps> = ({ children }) => {
  const [dialog, setDialog] = useState<ConfirmDialogOptions & { isOpen: boolean }>({
    isOpen: false,
    title: '',
    message: '',
    confirmLabel: 'تأكيد',
    cancelLabel: 'إلغاء',
    variant: 'warning',
    onConfirm: () => {},
    onCancel: () => {},
  });
  const confirmRef = useRef<HTMLButtonElement>(null);

  const showConfirm = useCallback((options: ConfirmDialogOptions) => {
    setDialog({
      ...options,
      isOpen: true,
      confirmLabel: options.confirmLabel || 'تأكيد',
      cancelLabel: options.cancelLabel || 'إلغاء',
      variant: options.variant || 'warning',
    });
  }, []);

  const hideConfirm = useCallback(() => {
    setDialog((prev) => ({ ...prev, isOpen: false }));
  }, []);

  const handleConfirm = () => {
    dialog.onConfirm();
    hideConfirm();
  };

  const handleCancel = () => {
    if (dialog.onCancel) dialog.onCancel();
    hideConfirm();
  };

  const getVariantColors = () => {
    switch (dialog.variant) {
      case 'danger':
        return {
          button: 'bg-rose-600 hover:bg-rose-700 text-white',
          icon: 'text-rose-600 bg-rose-100',
        };
      case 'warning':
        return {
          button: 'bg-amber-600 hover:bg-amber-700 text-white',
          icon: 'text-amber-600 bg-amber-100',
        };
      default:
        return {
          button: 'bg-blue-600 hover:bg-blue-700 text-white',
          icon: 'text-blue-600 bg-blue-100',
        };
    }
  };

  const colors = getVariantColors();

  return (
    <ConfirmDialogContext.Provider value={{ showConfirm, hideConfirm }}>
      {children}
      <AnimatePresence>
        {dialog.isOpen && (
          <div className="fixed inset-0 z-[9999] flex items-center justify-center p-4 dir-rtl">
            <div
              className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs"
              onClick={handleCancel}
            />
            <motion.div
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.95 }}
              className="relative bg-white rounded-3xl p-6 max-w-md w-full shadow-2xl border border-slate-200"
            >
              <div className="flex items-start gap-4">
                <div className={`w-12 h-12 rounded-full flex items-center justify-center shrink-0 ${colors.icon}`}>
                  <AlertTriangle className="w-6 h-6" />
                </div>
                <div className="flex-1 space-y-2">
                  <h3 className="text-lg font-black text-slate-900">{dialog.title}</h3>
                  <p className="text-sm text-slate-600 leading-relaxed">{dialog.message}</p>
                </div>
                <button
                  onClick={handleCancel}
                  className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-400 transition-colors shrink-0"
                >
                  <X className="w-5 h-5" />
                </button>
              </div>

              <div className="flex gap-2 mt-6 pt-4 border-t border-slate-100">
                <button
                  ref={confirmRef}
                  onClick={handleConfirm}
                  className={`flex-1 py-3 rounded-xl font-black text-sm shadow-md transition-all ${colors.button}`}
                >
                  {dialog.confirmLabel}
                </button>
                <button
                  onClick={handleCancel}
                  className="px-6 py-3 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl text-sm transition-colors"
                >
                  {dialog.cancelLabel}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </ConfirmDialogContext.Provider>
  );
};