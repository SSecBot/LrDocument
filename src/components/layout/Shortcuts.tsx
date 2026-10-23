'use client';

import { t as tl, tx } from '@/lib/i18n';
import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/ui/Modal';
import { canEdit, canView, isCorporate } from '@/lib/corporate';
import { hasStudentAccess } from '@/lib/access';
import { isTyping, requestNewItem, type NewItemKind } from '@/lib/shortcuts';
import type { ActiveTab } from '@/types';

const HELP_EVENT = 'lr:shortcuts-help';
/** Opens the shortcut list (e.g. from Ayarlar). */
export function openShortcutsHelp() {
  window.dispatchEvent(new Event(HELP_EVENT));
}

const GO: Record<string, { tab: ActiveTab; label: string }> = {
  d: { tab: 'dashboard', label: 'Genel Bakış' },
  n: { tab: 'notes', label: 'Notlar' },
  g: { tab: 'tasks', label: 'Görevler' },
  t: { tab: 'calendar', label: 'Takvim' },
  f: { tab: 'finance', label: 'Finans' },
  m: { tab: 'customers', label: 'Müşteriler' },
  a: { tab: 'academic', label: 'Ders Takibi' },
  s: { tab: 'settings', label: 'Ayarlar' },
  p: { tab: 'personalNotes', label: 'Şahsi Notlar' },
  h: { tab: 'personalFinance', label: 'Şahsi Finans' },
};

export const KEYBOARD_SHORTCUTS: [string, string][] = [
  ['Ctrl / ⌘ + K  veya  /', 'Arama ve komutlar'],
  ['?', 'Bu kısayol listesi'],
  ['N', 'Yeni not'],
  ['T', 'Yeni görev'],
  ['E', 'Yeni takvim etkinliği'],
  ['I', 'Yeni gelir / gider işlemi'],
  ['G, sonra D', 'Genel Bakış’a git'],
  ['G, sonra N / G / T / F', 'Notlar / Görevler / Takvim / Finans'],
  ['G, sonra M / A / S', 'Müşteriler / Ders Takibi / Ayarlar'],
  ['G, sonra P / H', 'Şahsi Notlar / Şahsi Finans (kurumsal)'],
  ['[', 'Kenar çubuğunu daralt / genişlet'],
  ['Esc', 'Açık pencereyi kapat'],
  ['Not yazarken Ctrl / ⌘ + B', 'Kalın'],
  ['Not yazarken Ctrl / ⌘ + I', 'İtalik'],
  ['Not yazarken Ctrl / ⌘ + S', 'Hemen kaydet'],
  ['Not yazarken Ctrl / ⌘ + Shift + E', 'Düzenle / önizleme arasında geç'],
  ['Not yazarken Ctrl / ⌘ + Shift + B', 'Yeni bölüm (roman)'],
  ['Not yazarken Ctrl / ⌘ + Shift + D', 'Diyalog çizgisi (—)'],
  ['Not yazarken Ctrl / ⌘ + Shift + H', 'Sahne ayracı (* * *)'],
  ['Not yazarken Ctrl / ⌘ + Shift + F', 'Dipnot (tez)'],
  ['Not yazarken Ctrl / ⌘ + Shift + Q', 'Kaynaklı alıntı (tez)'],
  ['Kitap görünümünde ← / →', 'Sayfa çevir'],
];

export const TOUCH_GESTURES: [string, string][] = [
  ['Ekranın sol kenarından sağa kaydır', 'Menüyü aç'],
  ['Açık menüde sola kaydır', 'Menüyü kapat'],
  ['Not açıkken sol kenardan sağa kaydır', 'Not listesine dön'],
  ['Takvimde sağa / sola kaydır', 'Önceki / sonraki ay'],
  ['Aylık takvim bölümünde sağa / sola kaydır', 'Önceki / sonraki ay'],
];

/** Global keyboard shortcuts, the left-edge swipe that opens the menu, and the shortcut list. */
export function Shortcuts() {
  const { preferences, currentUser, setActiveTab, setIsCommandPaletteOpen, setIsMobileSidebarOpen, setPreference, addNote, setActiveNoteId } = useAppStore();
  const [helpOpen, setHelpOpen] = useState(false);
  const state = useRef({ preferences, currentUser, chordAt: 0 });
  useEffect(() => {
    state.current = { ...state.current, preferences, currentUser };
  });

  useEffect(() => {
    const open = () => setHelpOpen(true);
    window.addEventListener(HELP_EVENT, open);
    return () => window.removeEventListener(HELP_EVENT, open);
  }, []);

  // Keyboard
  useEffect(() => {
    const allowed = (tab: ActiveTab) => {
      const user = state.current.currentUser;
      switch (tab) {
        case 'notes':
          return canView(user, 'notes');
        case 'tasks':
          return canView(user, 'work');
        case 'calendar':
          return canView(user, 'calendar');
        case 'finance':
          return canView(user, 'finance');
        case 'customers':
          return canView(user, 'customers');
        case 'academic':
          return hasStudentAccess(user);
        case 'personalNotes':
        case 'personalFinance':
          return isCorporate(user);
        default:
          return true;
      }
    };
    const NEW: Record<string, { kind: NewItemKind; tab: ActiveTab; module: 'work' | 'finance' | 'calendar' }> = {
      t: { kind: 'task', tab: 'tasks', module: 'work' },
      i: { kind: 'transaction', tab: 'finance', module: 'finance' },
      e: { kind: 'event', tab: 'calendar', module: 'calendar' },
    };
    const onKey = (e: KeyboardEvent) => {
      if (!state.current.preferences.keyboardShortcuts) return;
      if (e.ctrlKey || e.metaKey || e.altKey || e.defaultPrevented || isTyping(e.target)) return;
      const key = e.key.toLocaleLowerCase('tr') === 'ı' ? 'i' : e.key.toLowerCase();
      const now = Date.now();
      if (now - state.current.chordAt < 1500) {
        state.current.chordAt = 0;
        const go = GO[key];
        if (go && allowed(go.tab)) {
          e.preventDefault();
          setActiveTab(go.tab);
        }
        return;
      }
      if (key === 'g' && !e.shiftKey) {
        state.current.chordAt = now;
        return;
      }
      if (e.key === '?') {
        e.preventDefault();
        setHelpOpen(true);
      } else if (e.key === '/') {
        e.preventDefault();
        setIsCommandPaletteOpen(true);
      } else if (e.key === '[') {
        e.preventDefault();
        setPreference('sidebarCollapsed', !state.current.preferences.sidebarCollapsed);
      } else if (key === 'n' && canEdit(state.current.currentUser, 'notes')) {
        e.preventDefault();
        const id = addNote();
        setActiveNoteId(id);
        setActiveTab('notes');
      } else if (NEW[key] && canEdit(state.current.currentUser, NEW[key].module)) {
        e.preventDefault();
        if (NEW[key].kind === 'task') setPreference('tasksView', 'liste');
        setActiveTab(NEW[key].tab);
        requestNewItem(NEW[key].kind);
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [setActiveTab, setIsCommandPaletteOpen, setPreference, addNote, setActiveNoteId]);

  // Touch: swipe right from the left edge opens the menu (phones). Places with their own edge
  // gesture (a note open on a phone goes back to the list) mark themselves with data-edge-back.
  useEffect(() => {
    let start: { x: number; y: number; t: number } | null = null;
    const onStart = (e: TouchEvent) => {
      start = null;
      if (!state.current.preferences.touchGestures || e.touches.length !== 1 || (window.innerWidth >= 768 && window.innerHeight > 500)) return;
      const t = e.touches[0];
      if (t.clientX > 24 || (e.target as HTMLElement)?.closest?.('[data-edge-back], [role="dialog"]')) return;
      start = { x: t.clientX, y: t.clientY, t: Date.now() };
    };
    const onEnd = (e: TouchEvent) => {
      if (!start) return;
      const t = e.changedTouches[0];
      const dx = t.clientX - start.x;
      const dy = Math.abs(t.clientY - start.y);
      const ok = dx > 60 && dx > dy * 1.8 && Date.now() - start.t < 700;
      start = null;
      if (ok) setIsMobileSidebarOpen(true);
    };
    document.addEventListener('touchstart', onStart, { passive: true });
    document.addEventListener('touchend', onEnd, { passive: true });
    return () => {
      document.removeEventListener('touchstart', onStart);
      document.removeEventListener('touchend', onEnd);
    };
  }, [setIsMobileSidebarOpen]);

  return (
    <Modal isOpen={helpOpen} onClose={() => setHelpOpen(false)} title={tl('Kısayollar')} subtitle={tl('Klavye ve dokunmatik kısayollar')} maxWidth="max-w-2xl">
      <div className="grid gap-5 sm:grid-cols-2">
        <section>
          <h3 className="text-xs font-semibold text-fg mb-2">{tl('Klavye')}</h3>
          <dl className="space-y-1.5">
            {KEYBOARD_SHORTCUTS.map(([k, v]) => (
              <div key={k} className="flex items-start justify-between gap-3 text-xs">
                <dt>
                  <kbd className="px-1.5 py-0.5 rounded border border-line-strong bg-surface-2 text-body font-mono text-[11px] whitespace-nowrap">{tx(k)}</kbd>
                </dt>
                <dd className="text-subtle text-right">{tx(v)}</dd>
              </div>
            ))}
          </dl>
          {!preferences.keyboardShortcuts && <p className="mt-2 text-[11px] text-amber-300">{tl('Klavye kısayolları Ayarlar › Tercihler’den kapatılmış.')}</p>}
        </section>
        <section>
          <h3 className="text-xs font-semibold text-fg mb-2">{tl('Dokunmatik (telefon ve tablet)')}</h3>
          <dl className="space-y-2">
            {TOUCH_GESTURES.map(([k, v]) => (
              <div key={k} className="text-xs">
                <dt className="text-body">{tx(k)}</dt>
                <dd className="text-subtle">{tx(v)}</dd>
              </div>
            ))}
          </dl>
          {!preferences.touchGestures && <p className="mt-2 text-[11px] text-amber-300">{tl('Dokunmatik hareketler Ayarlar › Tercihler’den kapatılmış.')}</p>}
        </section>
      </div>
      <div className="modal-actions flex justify-end">
        <button onClick={() => setHelpOpen(false)} className="h-10 px-4 rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-semibold">
          {tl('Tamam')}
        </button>
      </div>
    </Modal>
  );
}
