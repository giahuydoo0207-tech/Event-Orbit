import React from 'react';
import useToastStore from '../store/useToastStore';

const STYLES = {
  info: 'border-slate-200 bg-white text-navy',
  success: 'border-green-200 bg-green-50 text-green-800',
  error: 'border-red-200 bg-red-50 text-red-800',
};

export function ToastContainer() {
  const { toasts, dismissToast } = useToastStore();

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col gap-2 max-w-sm w-full px-4 sm:px-0">
      {toasts.map((toast) => (
        <div
          key={toast.id}
          className={`border rounded-lg p-3.5 text-xs font-semibold shadow-sm transition-all duration-300 transform translate-y-0 ${STYLES[toast.type] || STYLES.info}`}
        >
          <div className="flex items-start justify-between gap-3">
            <span className="leading-relaxed">{toast.message}</span>
            <button
              onClick={() => dismissToast(toast.id)}
              className="text-[10px] uppercase tracking-wider opacity-60 hover:opacity-100 font-bold shrink-0"
            >
              Dismiss
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}

export default ToastContainer;
