'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, BellRing, CheckCircle2, Loader2, RefreshCw, Send, Smartphone } from 'lucide-react';
import { enableDesktopNotifications, useAppStore } from '@/store/useAppStore';

interface PushInfo {
  total: number;
  accounts: number;
  byService: Record<string, number>;
  status: { lastOkAt?: string; lastErrorAt?: string; lastError?: string };
  sweep: { lastRunAt: string | null; lastSent: number };
  myDevices: { id: string; name: string; service: string; createdAt: string; lastOkAt: string | null }[];
}

const fmt = (iso?: string | null) => (iso ? new Date(iso).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '—');
const btn = 'h-8 px-3 rounded-md text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-50';

/** Bildirimler (Web Push): device counts, last result, a test to the admin's own devices. */
export function PushSettingsPanel() {
  const { addToast, preferences } = useAppStore();
  const [info, setInfo] = useState<PushInfo | null>(null);
  const [busy, setBusy] = useState<'test' | 'sweep' | 'enable' | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/push', { cache: 'no-store' }).catch(() => null);
    if (res?.ok) setInfo(await res.json());
  }, []);
  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/push', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => !cancelled && d && setInfo(d))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  const call = async (action: 'test' | 'sweep') => {
    setBusy(action);
    try {
      const res = await fetch('/api/admin/push', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ action }) });
      const data = await res.json().catch(() => ({}));
      addToast(
        res.ok
          ? { type: 'success', title: action === 'test' ? 'Test bildirimi gönderildi' : 'Hatırlatmalar çalıştırıldı', message: data.message }
          : { type: 'error', title: 'Gönderilemedi', message: data.error || 'Bilinmeyen hata.' }
      );
    } finally {
      setBusy(null);
      await load();
    }
  };

  const enableHere = async () => {
    setBusy('enable');
    const result = await enableDesktopNotifications(true);
    setBusy(null);
    if (result === 'unsupported') addToast({ type: 'error', title: 'Bu tarayıcı bildirimleri desteklemiyor', message: 'iPhone’da önce “Ana Ekrana Ekle” ile yükleyin.' });
    else if (result === 'denied') addToast({ type: 'error', title: 'Bildirim izni engelli', message: 'Adres çubuğundaki kilit simgesinden izin verin.' });
    setTimeout(load, 1500);
  };

  if (!info) return null;
  const lastOk = info.status.lastOkAt ?? '';
  const lastErr = info.status.lastErrorAt ?? '';
  const failing = !!lastErr && lastErr > lastOk;

  return (
    <section className="rounded-lg border border-line bg-surface">
      <header className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-fg flex items-center gap-2">
          <BellRing className="w-4 h-4 text-subtle" /> Bildirimler (telefon ve bilgisayar)
        </h3>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => call('sweep')} disabled={!!busy} className={`${btn} border border-line text-subtle hover:text-fg`}>
            {busy === 'sweep' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <RefreshCw className="w-3.5 h-3.5" />} Hatırlatmaları şimdi çalıştır
          </button>
          <button onClick={() => call('test')} disabled={!!busy || info.myDevices.length === 0} className={`${btn} bg-brand hover:bg-brand-hover text-white`}>
            {busy === 'test' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Bana test bildirimi gönder
          </button>
        </div>
      </header>
      <div className="p-4 space-y-4 text-xs">
        <p className="text-subtle leading-relaxed">
          Ayar gerekmez. Kullanıcılar Ayarlar › Tercihler’den açtığı her cihaza, uygulama kapalıyken de bildirim alır: görevin son günü / süresi
          geçti, ödeme günü / tarihi geçti (tekrarlayan ve kredi ödemeleri dahil), bugünkü etkinlik ve sınav (08:00–22:00), öğrencilerde dersten
          15 dakika önce; kurumsalda ekibin eklediği görev / ödeme / not. Her hatırlatma bir kez gönderilir.
        </p>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          <Stat label="Kayıtlı cihaz" value={String(info.total)} />
          <Stat label="Hesap" value={String(info.accounts)} />
          <Stat label="Son başarılı gönderim" value={fmt(info.status.lastOkAt)} />
          <Stat label="Son hatırlatma taraması" value={info.sweep.lastRunAt ? `${fmt(info.sweep.lastRunAt)} · ${info.sweep.lastSent}` : '—'} />
        </div>

        {Object.keys(info.byService).length > 0 && (
          <ul className="flex flex-wrap gap-1.5">
            {Object.entries(info.byService).map(([service, n]) => (
              <li key={service} className="px-2 py-1 rounded-full bg-surface-2 border border-line text-subtle">
                {service}: <span className="text-fg tabular-nums">{n}</span>
              </li>
            ))}
          </ul>
        )}

        {failing ? (
          <p className="text-amber-300 flex items-start gap-2">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            <span>
              Son gönderim başarısız ({fmt(lastErr)}): {info.status.lastError}. Sunucunun dışarıya HTTPS (443) ile çıkabildiğini kontrol edin.
            </span>
          </p>
        ) : lastOk ? (
          <p className="text-emerald-300 flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4" /> Bildirim gönderimi çalışıyor.
          </p>
        ) : null}

        <div className="space-y-2">
          <h4 className="text-fg font-medium">Sizin cihazlarınız</h4>
          {info.myDevices.length === 0 ? (
            <div className="flex flex-wrap items-center gap-3">
              <p className="text-muted">Bu hesapta bildirimi açık cihaz yok. Test için önce bu cihazda açın (telefonunuzda da Ayarlar › Tercihler’den açabilirsiniz).</p>
              <button onClick={enableHere} disabled={!!busy} className={`${btn} border border-line-strong text-body hover:bg-surface-2`}>
                {busy === 'enable' ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <BellRing className="w-3.5 h-3.5" />} Bu cihazda bildirimleri aç
              </button>
            </div>
          ) : (
            <ul className="divide-y divide-line rounded-md border border-line">
              {info.myDevices.map((d) => (
                <li key={d.id} className="px-3 py-2 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <Smartphone className="w-3.5 h-3.5 text-subtle" />
                  <span className="text-fg">{d.name}</span>
                  <span className="text-muted">{d.service}</span>
                  <span className="text-muted ml-auto">son teslim: {fmt(d.lastOkAt)}</span>
                </li>
              ))}
            </ul>
          )}
          {!preferences.desktopNotifications && info.myDevices.length > 0 && (
            <p className="text-muted">Bu cihazda bildirim ayarı kapalı; diğer cihazlarınıza gönderilir.</p>
          )}
        </div>
      </div>
    </section>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-surface-2 border border-line px-3 py-2">
      <p className="text-[11px] text-muted">{label}</p>
      <p className="text-sm text-fg tabular-nums mt-0.5 truncate">{value}</p>
    </div>
  );
}
