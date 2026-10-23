'use client';

import { t, tx } from '@/lib/i18n';
import { ERR, responseError } from '@/lib/errors';
import React, { useState } from 'react';
import { AlertCircle, CheckCircle2, KeyRound } from 'lucide-react';
import { SpamHint } from './SpamHint';

const inputCls =
  'w-full bg-app border border-line rounded-lg px-4 py-3 text-sm text-fg placeholder-muted focus:outline-none focus:border-line-strong focus:ring-1 focus:ring-brand/40';

/** Şifremi unuttum: e-mail → code → new password. */
export function PasswordResetStep({ initialEmail, onDone }: { initialEmail: string; onDone: (email: string) => void }) {
  const [email, setEmail] = useState(initialEmail);
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirm, setConfirm] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [info, setInfo] = useState<string | null>(null);

  const call = async (body: Record<string, unknown>) => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch('/api/auth/password-reset', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(responseError(res, data, t('Şifre sıfırlanamadı.')));
        return null;
      }
      return data;
    } catch {
      setError(ERR.network);
      return null;
    } finally {
      setBusy(false);
    }
  };

  const send = async (e?: React.FormEvent) => {
    e?.preventDefault();
    const data = await call({ action: 'send', email: email.trim().toLowerCase() });
    if (data) {
      setSent(true);
      setInfo(data.message);
    }
  };

  const reset = async (e: React.FormEvent) => {
    e.preventDefault();
    if (password !== confirm) return setError(t('Şifreler eşleşmiyor.'));
    const data = await call({ action: 'reset', email: email.trim().toLowerCase(), code, newPassword: password });
    if (data) onDone(email.trim().toLowerCase());
  };

  return (
    <div className="space-y-4">
      <h2 className="text-base font-semibold text-fg flex items-center gap-2">
        <KeyRound className="w-4 h-4 text-brand-light" />{' '}{t('Şifremi unuttum')}
      </h2>
      {error && (
        <p role="alert" className="flex items-start gap-2 text-sm text-rose-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {tx(error)}
        </p>
      )}
      {info && !error && (
        <p role="status" className="flex items-start gap-2 text-sm text-emerald-300">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" /> {tx(info)}
        </p>
      )}
      {!sent ? (
        <form onSubmit={send} className="space-y-3">
          <label className="block">
            <span className="block text-xs font-medium text-subtle mb-2">{t('Hesabınızın e-posta adresi')}</span>
            <input className={inputCls} type="email" required autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} />
          </label>
          <button type="submit" disabled={busy} className="w-full bg-brand hover:bg-brand-hover text-white font-medium py-3 rounded-lg disabled:opacity-50">
            {t('Sıfırlama kodu gönder')}
          </button>
        </form>
      ) : (
        <form onSubmit={reset} className="space-y-3">
          <SpamHint />
          <label className="block">
            <span className="block text-xs font-medium text-subtle mb-2">{t('E-postanıza gelen 6 haneli kod')}</span>
            <input
              className={`${inputCls} text-center font-mono tracking-[0.4em] text-lg`}
              inputMode="numeric"
              autoComplete="one-time-code"
              required
              maxLength={6}
              value={code}
              onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))}
            />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-subtle mb-2">{t('Yeni şifre')}</span>
            <input className={inputCls} type="password" required autoComplete="new-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
          <label className="block">
            <span className="block text-xs font-medium text-subtle mb-2">{t('Yeni şifre (tekrar)')}</span>
            <input className={inputCls} type="password" required autoComplete="new-password" value={confirm} onChange={(e) => setConfirm(e.target.value)} />
          </label>
          <button type="submit" disabled={busy || code.length !== 6} className="w-full bg-brand hover:bg-brand-hover text-white font-medium py-3 rounded-lg disabled:opacity-50">
            {t('Şifreyi güncelle')}
          </button>
          <button type="button" onClick={() => send()} disabled={busy} className="w-full text-xs text-subtle hover:text-fg min-h-[36px]">
            {t('Kodu yeniden gönder')}
          </button>
        </form>
      )}
    </div>
  );
}
