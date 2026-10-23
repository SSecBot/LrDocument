'use client';

import { t, tx } from '@/lib/i18n';
import React, { useEffect, useState } from 'react';
import { BellRing, Download, Maximize2, MoreVertical, Share, SquarePlus, Zap } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/ui/Modal';
import { canPromptInstall, installPlatform, isStandalone, promptInstall, subscribeInstall, type InstallPlatform } from '@/lib/pwaInstall';

// Once per opening of the app (page load), not on every tab change.
let shownThisLoad = false;

/**
 * "Ana ekrana ekle" reminder: every time the app is opened in the browser instead of from the home
 * screen (or as an installed app), until the person installs it or chooses "Bir daha gösterme".
 * On computers it only appears when the browser can install the app with one click.
 */
export function InstallReminder() {
  const { isAuthenticated, isLoadingData, currentUser, preferences, setPreference } = useAppStore();
  const [open, setOpen] = useState(false);
  const [platform, setPlatform] = useState<InstallPlatform>('desktop');
  const [canPrompt, setCanPrompt] = useState(false);
  const [never, setNever] = useState(false);

  const ready = isAuthenticated && !isLoadingData && !!currentUser && preferences.guideSeen && !preferences.installPromptOff;

  useEffect(() => {
    const sync = () => setCanPrompt(canPromptInstall());
    queueMicrotask(sync);
    return subscribeInstall(sync);
  }, []);

  useEffect(() => {
    if (!ready || shownThisLoad || isStandalone()) return;
    const p = installPlatform();
    // Computers: wait a moment for the browser's install offer; without it there is nothing to do.
    const timer = setTimeout(() => {
      if (shownThisLoad || isStandalone() || (p === 'desktop' && !canPromptInstall())) return;
      shownThisLoad = true;
      setPlatform(p);
      setOpen(true);
    }, p === 'desktop' ? 3000 : 1500);
    return () => clearTimeout(timer);
  }, [ready]);

  const close = () => {
    setOpen(false);
    if (never) setPreference('installPromptOff', true);
  };

  const install = async () => {
    const accepted = await promptInstall();
    if (accepted) setOpen(false);
  };

  const title = platform === 'desktop' ? t('LrDocument’i uygulama olarak yükleyin') : t('LrDocument’i ana ekranınıza ekleyin');

  return (
    <Modal isOpen={open} onClose={close} title={tx(title)} maxWidth="max-w-md">
      <div className="space-y-4">
        <ul className="space-y-2 text-sm text-body">
          <li className="flex items-start gap-2.5">
            <Zap className="w-4 h-4 text-amber-400 shrink-0 mt-0.5" />{' '}{t('Tek dokunuşla açılır, tarayıcı çubukları olmadan tam ekran çalışır.')}
          </li>
          <li className="flex items-start gap-2.5">
            <BellRing className="w-4 h-4 text-brand-light shrink-0 mt-0.5" />
            {platform === 'ios'
              ? t('iPhone ve iPad’de bildirimler yalnızca ana ekrana eklenmiş uygulamada gelir.')
              : t('Bildirimler uygulama kapalıyken de gelir.')}
          </li>
          <li className="flex items-start gap-2.5">
            <Maximize2 className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" />{' '}{t('Ek bir şey indirmenize gerek yok; birkaç saniye sürer.')}
          </li>
        </ul>

        {canPrompt ? (
          <button
            type="button"
            onClick={install}
            className="w-full min-h-11 px-4 rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
          >
            <Download className="w-4 h-4" /> {platform === 'desktop' ? t('Uygulamayı yükle') : t('Ana ekrana ekle')}
          </button>
        ) : platform === 'ios' ? (
          <ol className="space-y-2 text-sm text-body rounded-xl border border-line bg-surface-2/60 p-3.5">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-surface-4 text-xs flex items-center justify-center shrink-0">1</span>
              {t('Alttaki (iPad’de üstteki)')}{' '}<Share className="w-4 h-4 text-blue-400 shrink-0" aria-label={t('Paylaş')} />{' '}{t('Paylaş simgesine dokunun.')}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-surface-4 text-xs flex items-center justify-center shrink-0">2</span>
              <span>
                {t('Listeden')}{' '}<SquarePlus className="inline w-4 h-4 -mt-0.5" aria-hidden /> <b>{t('Ana Ekrana Ekle')}</b>{t('’yi seçin.')}
              </span>
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-surface-4 text-xs flex items-center justify-center shrink-0">3</span>
              {t('Sağ üstteki')}{' '}<b>{t('Ekle')}</b>’ye dokunun.
            </li>
          </ol>
        ) : (
          <ol className="space-y-2 text-sm text-body rounded-xl border border-line bg-surface-2/60 p-3.5">
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-surface-4 text-xs flex items-center justify-center shrink-0">1</span>
              {t('Tarayıcının')}{' '}<MoreVertical className="w-4 h-4 shrink-0" aria-label={t('menü')} />{' '}{t('menüsünü açın.')}
            </li>
            <li className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-surface-4 text-xs flex items-center justify-center shrink-0">2</span>
              <span>
                <b>{t('Ana ekrana ekle')}</b> ya da <b>{t('Uygulamayı yükle')}</b>{t('’yi seçip onaylayın.')}
              </span>
            </li>
          </ol>
        )}

        <label className="flex items-center gap-2.5 text-sm text-subtle cursor-pointer select-none">
          <input type="checkbox" className="w-4 h-4 accent-[var(--color-brand)]" checked={never} onChange={(e) => setNever(e.target.checked)} />
          {t('Bir daha gösterme')}
        </label>
      </div>
      <div className="modal-actions flex justify-end">
        <button type="button" onClick={close} className="h-10 px-4 rounded-lg border border-line text-sm text-body hover:bg-surface-2">
          {never ? t('Kapat') : t('Şimdi değil')}
        </button>
      </div>
    </Modal>
  );
}
