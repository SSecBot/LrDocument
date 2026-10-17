'use client';

import React, { useEffect, useState } from 'react';
import { BellRing, Download, MonitorSmartphone } from 'lucide-react';
import { enableDesktopNotifications, useAppStore } from '@/store/useAppStore';
import { Message, Panel, fieldCls, labelCls, primaryBtn } from './settingsUi';

/** Ayarlar › Tercihler › Döviz: the kur marjı is off (0 TL) unless the user turns it on. */
export function CurrencyPanel() {
  const { exchangeRates, setExchangeRateMarkup } = useAppStore();
  const current = exchangeRates.markupTRY ?? 0;
  const [enabled, setEnabled] = useState(current > 0);
  const [markup, setMarkup] = useState(current > 0 ? String(current) : '');
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  return (
    <Panel
      title="Döviz"
      description="USD ve EUR işlemleri TL’ye canlı kurla çevrilir. İsterseniz her çevirmede kura eklenecek sabit bir marj (TL) tanımlayabilirsiniz."
    >
      <div className="space-y-4 max-w-sm">
        <label className="flex items-start justify-between gap-4 cursor-pointer">
          <span>
            <span className="block text-sm text-body">Kur marjı uygula</span>
            <span className="block text-xs text-muted mt-0.5">Kapalıyken marj 0 TL’dir.</span>
          </span>
          <input
            type="checkbox"
            className="mt-1 w-4 h-4 accent-[var(--color-brand)]"
            checked={enabled}
            onChange={(e) => {
              setMsg(null);
              setEnabled(e.target.checked);
              if (!e.target.checked) {
                setExchangeRateMarkup(0);
                setMarkup('');
                setMsg({ kind: 'ok', text: 'Kur marjı kapatıldı (0 TL).' });
              }
            }}
          />
        </label>
        {enabled && (
          <form
            className="flex items-end gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const n = Number(markup.replace(',', '.'));
              if (!Number.isFinite(n) || n < 0 || n > 1000) return setMsg({ kind: 'error', text: 'Marj 0 ile 1000 TL arasında olmalı.' });
              setExchangeRateMarkup(n);
              setMsg({ kind: 'ok', text: `Kur marjı ${n.toFixed(2)} TL olarak kaydedildi.` });
            }}
          >
            <label className="flex-1">
              <span className={labelCls}>Kur marjı (TL)</span>
              <input className={fieldCls} inputMode="decimal" placeholder="Ör. 2,50" value={markup} onChange={(e) => setMarkup(e.target.value)} />
            </label>
            <button type="submit" className={primaryBtn}>
              Kaydet
            </button>
          </form>
        )}
        {msg && <Message {...msg} />}
      </div>
    </Panel>
  );
}

/** Ayarlar › Tercihler › Bildirimler: system notifications on this device. */
export function NotificationsPanel() {
  const { preferences } = useAppStore();
  const [permission, setPermission] = useState<NotificationPermission | 'unsupported' | null>(null);
  const [busy, setBusy] = useState(false);
  const [ios, setIos] = useState(false);

  useEffect(() => {
    queueMicrotask(() => {
      setPermission(typeof Notification === 'undefined' ? 'unsupported' : Notification.permission);
      setIos(/iPhone|iPad|iPod/.test(navigator.userAgent) && !window.matchMedia('(display-mode: standalone)').matches);
    });
  }, []);

  const on = preferences.desktopNotifications && permission === 'granted';
  return (
    <Panel
      title="Bildirimler"
      description="Zil simgesindeki bildirimler canlı güncellenir: gecikmiş görevler, bugünkü etkinlikler ve (kurumsalda) ekibinizin eklediği görev, ödeme ve notlar anında düşer."
    >
      <div className="space-y-3 max-w-xl">
        <label className="flex items-start justify-between gap-4 cursor-pointer">
          <span>
            <span className="text-sm text-body flex items-center gap-2">
              <BellRing className="w-4 h-4 text-subtle" /> Telefon ve bilgisayar bildirimleri
            </span>
            <span className="block text-xs text-muted mt-0.5">
              Bu cihaza (telefon, tablet, bilgisayar) bildirim gelir; uygulama kapalıyken de: görevin son günü geldiğinde / geçtiğinde, ödeme
              günü geldiğinde / geçtiğinde, günün etkinlikleri, öğrencilerde dersten 15 dakika önce ve sınav günü; kurumsalda ekibin eklediği
              görev ve ödemeler. Her cihazda ayrı açılır.
            </span>
          </span>
          <input
            type="checkbox"
            className="mt-1 w-4 h-4 accent-[var(--color-brand)]"
            checked={on}
            disabled={busy || permission === 'unsupported' || permission === 'denied'}
            onChange={async (e) => {
              setBusy(true);
              setPermission(await enableDesktopNotifications(e.target.checked));
              setBusy(false);
            }}
          />
        </label>
        {permission === 'denied' && (
          <Message kind="error" text="Bu tarayıcıda bildirim izni engellenmiş. Adres çubuğundaki kilit simgesinden bildirimlere izin verip sayfayı yenileyin." />
        )}
        {permission === 'unsupported' &&
          (ios ? (
            <p className="text-xs text-amber-300">
              iPhone / iPad’de bildirimler için önce Safari’de Paylaş › “Ana Ekrana Ekle” ile LrDocument’i yükleyin, ardından ana ekrandaki
              simgeden açıp bu ayarı açın (iOS 16.4 ve üstü).
            </p>
          ) : (
            <p className="text-xs text-muted">Bu tarayıcı bildirimleri desteklemiyor.</p>
          ))}
      </div>
    </Panel>
  );
}

interface InstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/** Ayarlar › Tercihler › Uygulama: install as a Windows / Android / macOS app (PWA). */
export function InstallAppPanel() {
  const [prompt, setPrompt] = useState<InstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    const standalone = window.matchMedia('(display-mode: standalone)').matches || window.matchMedia('(display-mode: window-controls-overlay)').matches;
    queueMicrotask(() => setInstalled(standalone));
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setPrompt(e as InstallPromptEvent);
    };
    const onInstalled = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);

  return (
    <Panel title="Uygulama" description="LrDocument’i bilgisayarınıza (Windows) ya da telefonunuza uygulama olarak yükleyin: kendi penceresinde açılır, başlat menüsünde ve görev çubuğunda yer alır.">
      <div className="space-y-3 max-w-xl text-sm">
        {installed ? (
          <p className="text-emerald-300 flex items-center gap-2">
            <MonitorSmartphone className="w-4 h-4" /> Uygulama olarak açıksınız.
          </p>
        ) : prompt ? (
          <button
            type="button"
            className={primaryBtn}
            onClick={async () => {
              await prompt.prompt();
              const { outcome } = await prompt.userChoice;
              setPrompt(null);
              setMsg(outcome === 'accepted' ? 'Yükleniyor… Başlat menüsünden açabilirsiniz.' : 'Yükleme iptal edildi.');
            }}
          >
            <Download className="w-4 h-4" /> Uygulamayı yükle
          </button>
        ) : (
          <ul className="text-xs text-subtle space-y-1.5 list-disc pl-4">
            <li>
              <span className="text-body">Windows (Edge / Chrome):</span> adres çubuğunun sağındaki “Uygulamayı yükle” simgesine ya da menü › Uygulamalar ›
              “LrDocument’i yükle” seçeneğine tıklayın.
            </li>
            <li>
              <span className="text-body">Android:</span> Chrome menüsü › “Ana ekrana ekle / Uygulamayı yükle”.
            </li>
            <li>
              <span className="text-body">iPhone / iPad:</span> Safari’de Paylaş › “Ana Ekrana Ekle”.
            </li>
          </ul>
        )}
        {msg && <p className="text-xs text-muted">{msg}</p>}
      </div>
    </Panel>
  );
}
