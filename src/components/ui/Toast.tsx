'use client';

import { t, tx } from '@/lib/i18n';
import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { CheckCircle2, AlertCircle, Info, AlertTriangle, X, Undo2 } from 'lucide-react';
import { ConfirmHost } from './ConfirmDialog';

export const ToastContainer: React.FC = () => {
  const { toasts, removeToast } = useAppStore();

  return (
    <>
    <ConfirmHost />
    {toasts.length > 0 && (
    <div
      className="fixed bottom-[calc(1.25rem+env(safe-area-inset-bottom))] right-3 left-3 sm:left-auto sm:right-5 z-50 flex flex-col gap-2.5 sm:max-w-sm sm:w-full pointer-events-none"
      role="status"
      aria-live="polite"
    >
      {toasts.map((toast) => {
        const icons = {
          success: <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />,
          error: <AlertCircle className="w-5 h-5 text-rose-400 shrink-0" />,
          warning: <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0" />,
          info: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
        };

        const borders = {
          success: 'border-emerald-500/30 bg-surface',
          error: 'border-rose-500/30 bg-rose-950/60',
          warning: 'border-amber-500/30 bg-amber-950/60',
          info: 'border-blue-500/30 bg-slate-900',
        };

        return (
          <div
            key={toast.id}
            className={`relative overflow-hidden pointer-events-auto flex items-start gap-3 p-3.5 rounded-lg border backdrop-blur-md transition-all animate-fade-in ${borders[toast.type]}`}
          >
            {toast.action ? <Undo2 className="w-5 h-5 text-blue-400 shrink-0" /> : icons[toast.type]}
            <div className="flex-1 text-sm min-w-0">
              <div className="font-medium text-white">{tx(toast.title)}</div>
              {toast.message && (
                <div className="text-xs text-subtle mt-0.5 break-words line-clamp-3">{tx(toast.message)}</div>
              )}
            </div>
            {toast.action && (
              <button
                onClick={toast.action.run}
                className="shrink-0 self-center px-3 py-1.5 min-h-9 rounded-md bg-white/10 hover:bg-white/20 text-white text-xs font-semibold transition-colors"
              >
                {tx(toast.action.label)}
              </button>
            )}
            <button
              onClick={() => removeToast(toast.id)}
              className="text-muted hover:text-white p-1 rounded-md transition-colors"
              aria-label={t('Kapat')}
            >
              <X className="w-4 h-4" />
            </button>
            {toast.action && toast.duration && (
              // Time left to undo.
              <span
                aria-hidden
                className="absolute left-0 bottom-0 h-0.5 bg-blue-400/70 origin-left toast-timer"
                style={{ width: '100%', animationDuration: `${toast.duration}ms` }}
              />
            )}
          </div>
        );
      })}
    </div>
    )}
    </>
  );
};
