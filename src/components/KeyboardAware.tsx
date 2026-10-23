'use client';

import { useEffect } from 'react';

const FIELD = 'input:not([type=checkbox]):not([type=radio]):not([type=range]):not([type=color]):not([type=file]), textarea, select, [contenteditable="true"]';

/**
 * On-screen keyboard on phones and tablets.
 *
 * Android (Chrome, Firefox) resizes the page itself (viewport `interactive-widget=resizes-content`,
 * see the root layout). iPhone / iPad do not: the keyboard covers the bottom of the page. There the
 * visible height is published as --vv-height with <html data-keyboard="true">, so the app shell
 * (.app-shell) shrinks to the area above the keyboard, and the focused field is scrolled into view
 * once the keyboard has opened. Dialogs do the same for themselves (Modal.tsx).
 */
export function KeyboardAware() {
  useEffect(() => {
    const vv = window.visualViewport;
    if (!vv) return;
    const root = document.documentElement;
    let timer: ReturnType<typeof setTimeout> | null = null;

    const reveal = () => {
      const el = document.activeElement;
      if (!(el instanceof HTMLElement) || !el.matches(FIELD)) return;
      const r = el.getBoundingClientRect();
      const top = vv.offsetTop + 8;
      const bottom = vv.offsetTop + vv.height - 8;
      // A tall field (the note editor) only needs its caret area visible, not the whole box.
      const covered = r.top < top || Math.min(r.bottom, r.top + 120) > bottom;
      if (covered) el.scrollIntoView({ block: r.height > vv.height / 2 ? 'start' : 'center', behavior: 'smooth' });
    };

    const update = () => {
      const keyboard = window.innerHeight - vv.height > 120;
      root.dataset.keyboard = String(keyboard);
      root.style.setProperty('--vv-height', `${Math.round(vv.height)}px`);
      if (keyboard) {
        if (timer) clearTimeout(timer);
        timer = setTimeout(reveal, 120);
      }
    };
    const onFocus = (e: FocusEvent) => {
      if (!(e.target instanceof HTMLElement) || !e.target.matches(FIELD)) return;
      // The keyboard animates in for ~300 ms; check again once it is up.
      if (timer) clearTimeout(timer);
      timer = setTimeout(reveal, 350);
    };

    vv.addEventListener('resize', update);
    vv.addEventListener('scroll', update);
    document.addEventListener('focusin', onFocus);
    update();
    return () => {
      if (timer) clearTimeout(timer);
      vv.removeEventListener('resize', update);
      vv.removeEventListener('scroll', update);
      document.removeEventListener('focusin', onFocus);
      delete root.dataset.keyboard;
    };
  }, []);
  return null;
}
