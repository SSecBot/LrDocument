'use client';

import { t, tx } from '@/lib/i18n';
import React, { useSyncExternalStore } from 'react';
import { AlertTriangle } from 'lucide-react';
import { Modal } from './Modal';

// ---------------------------------------------------------------------------
// Onay penceresi: every delete (and other irreversible) button asks first. `askConfirm` resolves to
// true only when the person presses the confirm button; closing the dialog means "no".
// ---------------------------------------------------------------------------

export interface ConfirmOptions {
  title: string;
  message?: string;
  /** Text of the confirm button (default "Sil"). */
  confirmText?: string;
  /** Red confirm button (default true: most confirmations are deletions). */
  danger?: boolean;
}

type Pending = ConfirmOptions & { resolve: (ok: boolean) => void };

let pending: Pending | null = null;
const listeners = new Set<() => void>();
const emit = () => listeners.forEach((l) => l());

export function askConfirm(options: ConfirmOptions): Promise<boolean> {
  if (typeof window === 'undefined') return Promise.resolve(false);
  // A second request replaces an unanswered one (that one counts as cancelled).
  pending?.resolve(false);
  return new Promise((resolve) => {
    pending = { ...options, resolve };
    emit();
  });
}

/** Default text: deletions can be undone from the toast for a few seconds (see offerUndo). */
export const UNDO_HINT = 'Silindikten sonra birkaç saniye içinde “Geri al” ile geri getirebilirsiniz.';
export const PERMANENT = 'Bu işlem geri alınamaz.';

/** Shorthand for "<name> silinsin mi?" */
export function confirmDelete(what: string, message?: string): Promise<boolean> {
  return askConfirm({ title: `${what} silinsin mi?`, message: message ?? UNDO_HINT });
}

function answer(ok: boolean) {
  const p = pending;
  pending = null;
  emit();
  p?.resolve(ok);
}

const subscribe = (l: () => void) => {
  listeners.add(l);
  return () => listeners.delete(l);
};

/** Mounted once per page (next to the toasts). */
export const ConfirmHost: React.FC = () => {
  const current = useSyncExternalStore(subscribe, () => pending, () => null);
  const danger = current?.danger ?? true;
  return (
    <Modal
      isOpen={Boolean(current)}
      onClose={() => answer(false)}
      title={current?.title ?? ''}
      maxWidth="max-w-sm"
      footer={
        <>
          <button
            type="button"
            onClick={() => answer(false)}
            className="min-h-[44px] px-4 rounded-lg bg-surface-2 hover:bg-surface-3 text-body text-sm font-medium transition-colors"
          >
            {t('Vazgeç')}
          </button>
          <button
            type="button"
            data-confirm="yes"
            onClick={() => answer(true)}
            className={`min-h-[44px] px-4 rounded-lg text-white text-sm font-semibold transition-colors ${
              danger ? 'bg-rose-600 hover:bg-rose-500' : 'bg-brand hover:bg-brand-hover'
            }`}
          >
            {current?.confirmText ?? t('Sil')}
          </button>
        </>
      }
    >
      <div className="flex items-start gap-3 pb-1">
        <span className={`w-9 h-9 shrink-0 rounded-full flex items-center justify-center ${danger ? 'bg-rose-950/60 text-rose-400' : 'bg-amber-950/60 text-amber-400'}`}>
          <AlertTriangle className="w-[18px] h-[18px]" />
        </span>
        <p className="text-sm text-body leading-relaxed whitespace-pre-line pt-1.5">{tx(current?.message)}</p>
      </div>
    </Modal>
  );
};
