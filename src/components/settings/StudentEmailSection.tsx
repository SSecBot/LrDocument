'use client';

import React, { useEffect, useState } from 'react';
import { BadgeCheck, GraduationCap, LogIn } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Message, Panel, fieldCls, labelCls, primaryBtn } from './settingsUi';

interface Status {
  verified: boolean;
  method: 'email' | 'document' | null;
  studentEmail: string | null;
  academic: boolean;
  emailConfirmed: boolean;
  sameAsAccount: boolean;
}

const secondaryBtn =
  'h-10 px-4 rounded-md border border-line-strong text-body hover:bg-surface-2 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50';

/**
 * Ayarlar › Güvenlik for student accounts: confirm the student e-mail with a code. It verifies the
 * studentship and lets the student sign in with that address as well as the account e-mail.
 */
export function StudentEmailSection() {
  const { setSettingsSection } = useAppStore();
  const [status, setStatus] = useState<Status | null>(null);
  const [codeSent, setCodeSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/student/verify', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStatus(d))
      .catch(() => {});
  }, []);

  const call = async (body: Record<string, unknown>) => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await fetch('/api/student/verify', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMsg({ kind: 'error', text: data.error || 'İşlem yapılamadı.' });
        return null;
      }
      if (data.emailConfirmed !== undefined) setStatus(data);
      return data;
    } catch {
      setMsg({ kind: 'error', text: 'Sunucuya ulaşılamadı.' });
      return null;
    } finally {
      setBusy(false);
    }
  };

  if (!status) return null;

  if (!status.studentEmail) {
    return (
      <Panel title="Öğrenci e-postası">
        <p className="text-sm text-subtle">Önce Öğrenci bilgileri sekmesinden öğrenci e-postanızı kaydedin.</p>
      </Panel>
    );
  }

  if (status.emailConfirmed) {
    return (
      <Panel title="Öğrenci e-postası">
        <div className="space-y-2 text-sm">
          <p className="text-emerald-300 flex items-center gap-2">
            <BadgeCheck className="w-4 h-4 shrink-0" /> {status.studentEmail} doğrulandı.
          </p>
          <p className="text-xs text-subtle flex items-start gap-2">
            <LogIn className="w-3.5 h-3.5 mt-0.5 shrink-0" />
            {status.sameAsAccount
              ? 'Bu adres aynı zamanda hesap e-postanız.'
              : 'Giriş yaparken hesap e-postanızı ya da bu öğrenci e-postasını kullanabilirsiniz; şifreniz aynıdır. Şifremi unuttum kodu da hangi adresi yazarsanız oraya gider.'}
          </p>
        </div>
      </Panel>
    );
  }

  return (
    <Panel
      title="Öğrenci e-postası"
      description="Öğrenci e-postanıza gelen kodla adresinizi doğrulayın: öğrenciliğiniz onaylanır ve bu adresle de giriş yapabilirsiniz."
    >
      <div className="space-y-4 max-w-xl">
        {!status.academic ? (
          <p className="text-xs text-muted">
            Kayıtlı öğrenci e-postanız üniversite uzantılı değil.{' '}
            <button type="button" className="text-sky-300 hover:underline" onClick={() => setSettingsSection('ogrenci')}>
              Öğrenci bilgilerinden düzeltin
            </button>{' '}
            ya da öğrenci belgesi yükleyin.
          </p>
        ) : codeSent ? (
          <form
            onSubmit={async (e) => {
              e.preventDefault();
              const r = await call({ action: 'confirm', code });
              if (r) setMsg({ kind: 'ok', text: 'Öğrenci e-postanız doğrulandı.' });
            }}
            className="flex flex-wrap items-end gap-2"
          >
            <label className="block">
              <span className={labelCls}>{status.studentEmail} adresine gelen kod</span>
              <input
                className={`${fieldCls} font-mono tracking-[0.3em] text-center w-[180px]`}
                inputMode="numeric"
                autoComplete="one-time-code"
                aria-label="Öğrenci e-postası doğrulama kodu"
                maxLength={6}
                value={code}
                onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
              />
            </label>
            <button type="submit" disabled={busy || code.length !== 6} className={primaryBtn}>
              Doğrula
            </button>
            <button type="button" disabled={busy} onClick={() => call({ action: 'send' }).then((r) => r && setMsg({ kind: 'ok', text: r.message }))} className={secondaryBtn}>
              Yeniden gönder
            </button>
          </form>
        ) : (
          <button
            disabled={busy}
            onClick={async () => {
              const r = await call({ action: 'send' });
              if (r) {
                setCodeSent(true);
                setMsg({ kind: 'ok', text: r.message });
              }
            }}
            className={primaryBtn}
          >
            <GraduationCap className="w-4 h-4" /> {status.studentEmail} adresine kod gönder
          </button>
        )}
        {msg && <Message {...msg} />}
      </div>
    </Panel>
  );
}
