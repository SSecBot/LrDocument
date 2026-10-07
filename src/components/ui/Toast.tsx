'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X } from 'lucide-react';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAppStore();

  if (toasts.length === 0) return null;

  return (
    <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
          info: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
        };

        const borders = {
          success: 'border-emerald-500/30 bg-surface',
          error: 'border-rose-500/30 bg-[#241416]',
          warning: 'border-amber-500/30 bg-[#242013]',
          info: 'border-blue-500/30 bg-[#141d28]',
        };

        return (
          <div
            key={toast.id}
            className={`pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border backdrop-blur-md transition-all animate-fade-in ${borders[toast.type]}`}
          >
            {icons[toast.type]}
            <div className="flex-1 text-sm min-w-0">
              <div className="font-medium text-white">{toast.title}</div>
              {toast.message && (
                <div className="text-xs text-subtle mt-0.5 break-words">{toast.message}</div>
              )}
            </div>
            <button
              onClick={() => removeToast(toast.id)}
              className="text-muted hover:text-white p-1 rounded-md transition-colors"
              aria-label="Kapat"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        );
      })}
    </div>
  );
};
