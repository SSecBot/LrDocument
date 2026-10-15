'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { AlertTriangle, CheckCircle2, Loader2, Mail, Send } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface MailInfo {
  host: string;
  mode: 'direct' | 'smtp';
  from: string;
  status: { lastOkAt?: string; lastOkTo?: string; lastErrorAt?: string; lastError?: string };
  dns: { type: string; name: string; value: string; purpose: string }[];
}

const fmt = (iso?: string) => (iso ? new Date(iso).toLocaleString('tr-TR', { dateStyle: 'short', timeStyle: 'short' }) : '');

/** E-posta gönderimi: works without any setup; shows the last result, a test button and optional DNS records. */
export function MailSettingsPanel() {
  const { addToast } = useAppStore();
  const [info, setInfo] = useState<MailInfo | null>(null);
  const [busy, setBusy] = useState(false);

  const load = useCallback(() => {
    fetch('/api/admin/mail', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setInfo(d))
      .catch(() => {});
  }, []);
  useEffect(() => {
    load();
  }, [load]);

  const test = async () => {
    setBusy(true);
    try {
      const res = await fetch('/api/admin/mail', { method: 'POST' });
      const data = await res.json().catch(() => ({}));
      addToast(res.ok ? { type: 'success', title: 'Test e-postası gönderildi', message: data.message } : { type: 'error', title: 'Gönderilemedi', message: data.error || 'Bilinmeyen hata.' });
    } finally {
      setBusy(false);
      load();
    }
  };

  if (!info) return null;
  const lastOk = info.status.lastOkAt ?? '';
  const lastErr = info.status.lastErrorAt ?? '';
  const failing = !!lastErr && lastErr > lastOk;

  return (
    <section className="rounded-lg border border-line bg-surface">
      <header className="px-4 py-3 border-b border-line flex flex-wrap items-center justify-between gap-2">
        <h3 className="text-sm font-semibold text-fg flex items-center gap-2">
          <Mail className="w-4 h-4 text-subtle" /> E-posta gönderimi
        </h3>
        <button onClick={test} disabled={busy} className="h-8 px-3 rounded-md bg-brand hover:bg-brand-hover text-white text-xs font-medium inline-flex items-center gap-1.5 disabled:opacity-50">
          {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Send className="w-3.5 h-3.5" />} Bana test e-postası gönder
        </button>
      </header>
      <div className="p-4 space-y-4 text-xs">
        <p className="text-subtle leading-relaxed">
          Doğrulama kodları {info.mode === 'smtp' ? 'SMTP_URL ile tanımlı sunucu üzerinden' : 'hiçbir dış hizmete ihtiyaç duymadan, doğrudan alıcının posta sunucusuna'} gönderilir. Gönderen:{' '}
          <span className="text-body font-mono">{info.from}</span>
        </p>
        {failing ? (
          <p className="flex items-start gap-2 text-rose-300">
            <AlertTriangle className="w-4 h-4 shrink-0" />
            Son gönderim başarısız ({fmt(lastErr)}): {info.status.lastError}. Kod ulaşmayan kullanıcıları listede “Doğrulanmış say” ile onaylayabilir veya Varsayılanlar › Güvenlik’ten girişte e-posta doğrulamasını kapatabilirsiniz.
          </p>
        ) : lastOk ? (
          <p className="flex items-center gap-2 text-emerald-300">
            <CheckCircle2 className="w-4 h-4" /> Son başarılı gönderim: {fmt(lastOk)} ({info.status.lastOkTo})
          </p>
        ) : (
          <p className="text-muted">Henüz e-posta gönderilmedi. Test e-postasıyla deneyebilirsiniz.</p>
        )}
        <details className="rounded-md border border-line bg-app">
          <summary className="px-3 py-2 cursor-pointer text-body">İsteğe bağlı: spam klasörüne düşmeyi azaltan DNS kayıtları</summary>
          <div className="px-3 pb-3 space-y-3">
            <p className="text-muted leading-relaxed">
              Alan adınızın DNS paneline (ör. Cloudflare, alan adı firması) aşağıdaki TXT kayıtlarını eklerseniz Gmail ve Outlook e-postalarınıza daha çok güvenir. Eklemeseniz de gönderim çalışır.
            </p>
            {info.dns.map((r) => (
              <div key={r.name} className="space-y-1">
                <p className="text-subtle">{r.purpose}</p>
                <p className="font-mono text-body break-all">
                  <span className="text-muted">{r.type}</span> {r.name}
                </p>
                <p className="font-mono text-body break-all bg-surface-2 rounded px-2 py-1 select-all">{r.value}</p>
              </div>
            ))}
          </div>
        </details>
      </div>
    </section>
  );
}
