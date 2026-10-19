'use client';

import { useEffect, useRef, useState } from 'react';

// ---------------------------------------------------------------------------
// Klavye ve dokunmatik kısayollar: a tiny bus between the global shortcut handler
// (src/components/layout/Shortcuts.tsx) and the pages that open their own "new …" forms.
// ---------------------------------------------------------------------------

export type NewItemKind = 'task' | 'transaction' | 'event';
const EVENT = 'lr:new-item';
let pending: NewItemKind | null = null;

/** Asks the page for `kind` to open its "new" form (now if it is shown, otherwise once it mounts). */
export function requestNewItem(kind: NewItemKind) {
  pending = kind;
  window.dispatchEvent(new CustomEvent(EVENT, { detail: kind }));
}

/** A page opens its "new" form when the shortcut asks for it. */
export function useNewItemRequest(kind: NewItemKind, open: () => void) {
  const openRef = useRef(open);
  useEffect(() => {
    openRef.current = open;
  });
  useEffect(() => {
    const run = () => {
      if (pending !== kind) return;
      pending = null;
      openRef.current();
    };
    // Mounted because of the shortcut (the tab just changed): run on the next frame.
    const raf = requestAnimationFrame(run);
    window.addEventListener(EVENT, run);
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener(EVENT, run);
    };
  }, [kind]);
}

/** True while the user types somewhere (shortcut letters must not fire then). */
export function isTyping(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  return el.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || !!el.closest?.('[role="dialog"]');
}

interface SwipeOptions {
  onLeft?: () => void;
  onRight?: () => void;
  /** Only swipes that start within this many pixels of the left edge (like the system back gesture). */
  fromLeftEdge?: number;
  enabled?: boolean;
}

/**
 * Horizontal swipe on an element (touch only). A swipe must be mostly horizontal, at least 70 px long
 * and quick, so scrolling and text selection are not mistaken for it.
 */
export function useSwipe<T extends HTMLElement>(options: SwipeOptions): (node: T | null) => void {
  // A callback ref: the element may mount later (e.g. a drawer that opens).
  const [el, setEl] = useState<T | null>(null);
  const opts = useRef(options);
  useEffect(() => {
    opts.current = options;
  });
  useEffect(() => {
    if (!el) return;
    let start: { x: number; y: number; t: number } | null = null;
    const onStart = (e: TouchEvent) => {
      start = null;
      if (e.touches.length !== 1 || opts.current.enabled === false) return;
      const t = e.touches[0];
      const edge = opts.current.fromLeftEdge;
      if (edge !== undefined && t.clientX - el.getBoundingClientRect().left > edge) return;
      start = { x: t.clientX, y: t.clientY, t: Date.now() };
    };
    const onEnd = (e: TouchEvent) => {
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = t.clientY - start.y;
      const quick = Date.now() - start.t < 700;
      start = null;
      if (!quick || Math.abs(dx) < 70 || Math.abs(dx) < Math.abs(dy) * 1.8) return;
      if (window.getSelection()?.toString()) return;
      if (dx > 0) opts.current.onRight?.();
      else opts.current.onLeft?.();
    };
    el.addEventListener('touchstart', onStart, { passive: true });
    el.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      el.removeEventListener('touchstart', onStart);
      el.removeEventListener('touchend', onEnd);
    };
  }, [el]);
  return setEl;
}
