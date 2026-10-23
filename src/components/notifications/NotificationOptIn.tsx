'use client';

import { t, tx } from '@/lib/i18n';
import React, { useEffect, useState } from 'react';
import { BellRing, CalendarClock, CheckCircle2, GraduationCap, Loader2, ShieldCheck, Users, Wallet } from 'lucide-react';
import { enableDesktopNotifications, useAppStore } from '@/store/useAppStore';
import { installPlatform, isStandalone } from '@/lib/pwaInstall';

export type PermissionState = NotificationPermission | 'unsupported' | 'ios-install';

/** Current permission on this device; 'ios-install' = iPhone/iPad Safari, which needs Ana Ekrana Ekle first. */
export function readPermission(): PermissionState {
  if (typeof window === 'undefined') return 'default';
  if (typeof Notification === 'undefined' || !('serviceWorker' in navigator)) {
    return installPlatform() === 'ios' && !isStandalone() ? 'ios-install' : 'unsupported';
  }
  return Notification.permission;
}

/** Why LrDocument asks for notifications, tailored to the account type. */
export function NotificationReasons() {
  const { currentUser } = useAppStore();
  const student = currentUser?.accountType === 'STUDENT';
  const corporate = currentUser?.accountType === 'CORPORATE';
  const rows: { icon: React.ReactNode; text: string }[] = [
    { icon: <CalendarClock className="w-4 h-4 text-blue-400" />, text: t('Görevinizin saati ya da son günü geldiğinde, bugünkü etkinlikleriniz yaklaştığında') },
    { icon: <Wallet className="w-4 h-4 text-emerald-400" />, text: t('Ödeme günü gelen ya da geciken gelir / giderlerde') },
    ...(student
      ? [{ icon: <GraduationCap className="w-4 h-4 text-amber-400" />, text: t('Ders saatiniz, sınav gününüz ve ders çalışma vaktiniz geldiğinde') }]
      : []),
    ...(corporate ? [{ icon: <Users className="w-4 h-4 text-violet-400" />, text: t('Ekibiniz yeni görev, not ya da ödeme eklediğinde') }] : []),
  ];
  return (
    <div className="space-y-2.5">
      <p className="text-sm text-body leading-relaxed">
        {t('Uygulama kapalıyken bile önemli bir şeyi kaçırmamanız için bu cihaza bildirim gönderebilmemiz gerekiyor. Yalnızca şu durumlarda bildirim gelir:')}
      </p>
      <ul className="space-y-2">
        {rows.map((r) => (
          <li key={r.text} className="flex items-start gap-2.5 text-sm text-body">
            <span className="mt-0.5 shrink-0">{r.icon}</span>
            <span>{tx(r.text)}</span>
          </li>
        ))}
      </ul>
      <p className="flex items-start gap-2 text-xs text-muted leading-relaxed">
        <ShieldCheck className="w-4 h-4 text-emerald-400 shrink-0 mt-px" />
        {t('Reklam ya da kampanya bildirimi göndermeyiz. Bildirimleri istediğiniz zaman Ayarlar › Tercihler › Bildirimler’den kapatabilirsiniz.')}
      </p>
    </div>
  );
}

/** What to do when this device cannot show the browser's permission question. */
export function PermissionHelp({ state }: { state: PermissionState }) {
  if (state === 'denied') {
    return (
      <p className="text-xs text-amber-300 leading-relaxed">
        {t('Bu tarayıcıda bildirimler daha önce engellenmiş. Adres çubuğundaki kilit (ya da ayarlar) simgesine dokunup “Bildirimler”i “İzin ver” yapın, sonra sayfayı yenileyin.')}
      </p>
    );
  }
  if (state === 'ios-install') {
    return (
      <p className="text-xs text-amber-300 leading-relaxed">
        {t('iPhone ve iPad’de bildirimler yalnızca ana ekrana eklenmiş uygulamada çalışır: Safari’de Paylaş simgesine ve “Ana Ekrana Ekle”ye dokunun, LrDocument’i ana ekrandaki simgesinden açıp bildirimleri oradan açın (iOS 16.4 ve üstü).')}
      </p>
    );
  }
  if (state === 'unsupported') {
    return <p className="text-xs text-muted">{t('Bu tarayıcı bildirimleri desteklemiyor. Chrome, Edge, Firefox ya da Safari’nin güncel sürümünü deneyin.')}</p>;
  }
  return null;
}

/**
 * The reasons and an "Bildirimlere izin ver" button (the browser's question appears only after this
 * click). Used in the welcome screen so a first-time user can turn notifications on without Ayarlar.
 */
export function NotificationOptIn({ compact = false }: { compact?: boolean }) {
  const { preferences } = useAppStore();
  const [state, setState] = useState<PermissionState>('default');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    queueMicrotask(() => setState(readPermission()));
  }, []);

  const on = state === 'granted' && preferences.desktopNotifications;

  return (
    <div className="rounded-xl border border-line bg-surface-2/60 p-3.5 space-y-3">
      <div className="flex items-center gap-2 text-sm font-semibold text-fg">
        <BellRing className="w-4 h-4 text-brand-light" />{' '}{t('Bildirimleri aç')}
      </div>
      {!compact && !on && <NotificationReasons />}
      {on ? (
        <p className="flex items-center gap-2 text-sm text-emerald-300">
          <CheckCircle2 className="w-4 h-4" />{' '}{t('Bildirimler bu cihazda açık.')}
        </p>
      ) : state === 'default' || state === 'granted' ? (
        <button
          type="button"
          disabled={busy}
          onClick={async () => {
            setBusy(true);
            const result = await enableDesktopNotifications(true);
            setState(result === 'unsupported' ? readPermission() : result);
            setBusy(false);
          }}
          className="w-full min-h-11 px-4 rounded-lg bg-brand hover:bg-brand-hover disabled:opacity-60 text-white text-sm font-semibold inline-flex items-center justify-center gap-2"
        >
          {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <BellRing className="w-4 h-4" />}{' '}{t('Bildirimlere izin ver')}
        </button>
      ) : (
        <PermissionHelp state={state} />
      )}
    </div>
  );
}
