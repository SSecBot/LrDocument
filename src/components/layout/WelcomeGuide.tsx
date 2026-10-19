'use client';

import React from 'react';
import { BookOpen, Keyboard, Sparkles } from 'lucide-react';
import { flushPreferences, useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/ui/Modal';
import { openShortcutsHelp } from './Shortcuts';

export const GUIDE_URL = '/kullanim-kilavuzu.pdf';

/** First sign-in: a short welcome with the user guide (PDF). Shown once per person. */
export function WelcomeGuide() {
  const { preferences, setPreference, isLoadingData, isAuthenticated, currentUser } = useAppStore();
  const open = isAuthenticated && !isLoadingData && !!currentUser && !preferences.guideSeen;
  const close = () => {
    setPreference('guideSeen', true);
    flushPreferences();
  };
  const first = currentUser?.name?.split(' ')[0];

  return (
    <Modal isOpen={open} onClose={close} title={`Hoş geldiniz${first ? `, ${first}` : ''}!`} subtitle="LrDocument’i birkaç dakikada tanıyın." maxWidth="max-w-md">
      <div className="space-y-4">
        <div className="flex items-start gap-3">
          <div className="w-10 h-10 rounded-lg bg-brand/15 text-brand-light flex items-center justify-center shrink-0">
            <Sparkles className="w-5 h-5" />
          </div>
          <p className="text-sm text-body leading-relaxed">
            Notlar, görevler, takvim ve finans tek yerde. Her sekmenin ve her ayarın ne işe yaradığını adım adım, resimlerle anlatan bir kullanım
            kılavuzu hazırladık.
          </p>
        </div>
        <a
          href={GUIDE_URL}
          target="_blank"
          rel="noopener"
          onClick={close}
          className="flex items-center gap-3 p-3 rounded-xl border border-line hover:border-brand hover:bg-surface-2 transition-colors"
        >
          <BookOpen className="w-5 h-5 text-emerald-400 shrink-0" />
          <span>
            <span className="block text-sm font-semibold text-fg">Kullanım kılavuzunu aç (PDF)</span>
            <span className="block text-xs text-muted">İstediğiniz zaman Ayarlar › Destek’ten de açabilirsiniz.</span>
          </span>
        </a>
        <button
          onClick={() => {
            close();
            openShortcutsHelp();
          }}
          className="w-full flex items-center gap-3 p-3 rounded-xl border border-line hover:border-brand hover:bg-surface-2 transition-colors text-left"
        >
          <Keyboard className="w-5 h-5 text-subtle shrink-0" />
          <span>
            <span className="block text-sm font-semibold text-fg">Kısayolları göster</span>
            <span className="block text-xs text-muted">Klavyede “?” tuşu da bu listeyi açar.</span>
          </span>
        </button>
      </div>
      <div className="modal-actions flex justify-end">
        <button onClick={close} className="h-10 px-4 rounded-lg border border-line text-sm text-body hover:bg-surface-2">
          Daha sonra
        </button>
      </div>
    </Modal>
  );
}
