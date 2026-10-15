'use client';

import React, { useEffect, useId, useRef } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface ModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  maxWidth?: string;
  /** Action buttons; stays visible at the bottom while the content scrolls. */
  footer?: React.ReactNode;
  /** Clicking the dimmed background closes the dialog (default true). */
  closeOnBackdrop?: boolean;
}

// Open dialogs, innermost last: Escape and focus belong to the top one only.
const stack: symbol[] = [];

/**
 * Dialog: a centred card on larger screens, a sheet that slides up from the bottom on phones.
 * Rows marked `modal-actions` (or the `footer` prop) stick to the bottom edge, so Kaydet / İptal are
 * always reachable without scrolling through a long form.
 */
export const Modal: React.FC<ModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  maxWidth = 'max-w-lg',
  footer,
  closeOnBackdrop = true,
}) => {
  const dialogRef = useRef<HTMLDivElement>(null);
  const onCloseRef = useRef(onClose);
  const titleId = useId();
  const subtitleId = useId();

  useEffect(() => {
    onCloseRef.current = onClose;
  }, [onClose]);

  useEffect(() => {
    if (!isOpen) return;
    const me = Symbol('modal');
    stack.push(me);
    const previouslyFocused = document.activeElement as HTMLElement | null;
    const previousOverflow = document.body.style.overflow;
    // Keep the page behind the dialog from scrolling (notably on iOS).
    document.body.style.overflow = 'hidden';

    // Focus the dialog itself (not the first field, which would pop up the phone keyboard).
    const raf = requestAnimationFrame(() => {
      if (!dialogRef.current?.contains(document.activeElement)) dialogRef.current?.focus({ preventScroll: true });
    });

    const onKeyDown = (e: KeyboardEvent) => {
      if (stack[stack.length - 1] !== me) return;
      if (e.key === 'Escape') {
        e.stopPropagation();
        onCloseRef.current();
        return;
      }
      // Keep Tab inside the dialog.
      if (e.key === 'Tab' && dialogRef.current) {
        const focusable = dialogRef.current.querySelectorAll<HTMLElement>(
          'a[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])'
        );
        const visible = [...focusable].filter((el) => el.offsetParent !== null);
        if (!visible.length) return;
        const first = visible[0];
        const last = visible[visible.length - 1];
        if (e.shiftKey && (document.activeElement === first || document.activeElement === dialogRef.current)) {
          e.preventDefault();
          last.focus();
        } else if (!e.shiftKey && document.activeElement === last) {
          e.preventDefault();
          first.focus();
        }
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('keydown', onKeyDown);
      stack.splice(stack.indexOf(me), 1);
      if (stack.length === 0) document.body.style.overflow = previousOverflow;
      previouslyFocused?.focus?.({ preventScroll: true });
    };
  }, [isOpen]);

  if (!isOpen || typeof document === 'undefined') return null;

  // Rendered at the end of <body>, so a dialog opened from inside another one (or inside a scrolling
  // panel) is never clipped or positioned against its parent.
  return createPortal(
    <div
      className="fixed inset-0 z-50 flex items-end sm:items-center justify-center sm:p-4 md:p-6 bg-black/70 backdrop-blur-[2px] animate-backdrop"
      onMouseDown={(e) => {
        if (closeOnBackdrop && e.target === e.currentTarget) onClose();
      }}
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        aria-describedby={subtitle ? subtitleId : undefined}
        tabIndex={-1}
        className={`modal-panel w-full ${maxWidth} bg-surface border border-line sm:rounded-xl rounded-t-2xl shadow-2xl shadow-black/40 flex flex-col max-h-[92dvh] sm:max-h-[88dvh] outline-none animate-sheet-up sm:animate-pop-in`}
      >
        {/* Grab handle (phones) */}
        <div className="sm:hidden flex justify-center pt-2 pb-0.5 shrink-0" aria-hidden="true">
          <span className="w-10 h-1 rounded-full bg-surface-4" />
        </div>

        <header className="flex items-start gap-3 px-4 sm:px-5 pt-2 pb-3 sm:pt-4 sm:pb-3.5 border-b border-line shrink-0">
          <div className="min-w-0 flex-1">
            <h2 id={titleId} className="text-[15px] sm:text-base font-semibold text-fg leading-snug">
              {title}
            </h2>
            {subtitle && (
              <p id={subtitleId} className="text-xs text-subtle mt-0.5 leading-relaxed line-clamp-2">
                {subtitle}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="-mr-1.5 -mt-0.5 w-10 h-10 shrink-0 flex items-center justify-center rounded-lg text-subtle hover:text-fg hover:bg-surface-2 active:bg-surface-3 transition-colors"
            aria-label="Kapat"
          >
            <X className="w-[18px] h-[18px]" />
          </button>
        </header>

        <div className="modal-body px-4 sm:px-5 pt-4 overflow-y-auto overscroll-contain min-h-0 flex-1 pb-[max(1rem,env(safe-area-inset-bottom))] sm:pb-5">
          {children}
        </div>

        {footer && (
          <footer className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2 px-4 sm:px-5 pt-3 pb-[max(0.75rem,env(safe-area-inset-bottom))] sm:pb-4 border-t border-line bg-surface shrink-0 sm:rounded-b-xl">
            {footer}
          </footer>
        )}
      </div>
    </div>,
    document.body
  );
};
