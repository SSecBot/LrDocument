'use client';

import { t, tx } from '@/lib/i18n';
import { ERR, responseError } from '@/lib/errors';
import React, { useState } from 'react';
import { AlertCircle, ArrowRight, MailCheck, RotateCw } from 'lucide-react';
import { SpamHint } from './SpamHint';

const inputCls =
  'w-full bg-app border border-line rounded-lg px-4 py-3 text-center text-2xl font-mono tracking-[0.5em] text-fg placeholder-muted focus:outline-none focus:border-line-strong focus:ring-1 focus:ring-brand/40';

interface Props {
  /** Account e-mail (full, as typed by the user) — identifies the account while signed out. */
  email: string;
  /** Shown to the user (may be masked). */
  displayEmail?: string;
  /** Delivery problem reported by the server when the code was sent. */
  initialError?: string | null;
  onVerified: () => void | Promise<void>;
}

/** "Enter the 6-digit code we e-mailed you" with resend; used after sign-up and at sign-in. */
export function EmailCodeStep({ email, displayEmail, initialError, onVerified }: Props) {
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(initialError ?? null);
  const [info, setInfo] = useState<string | null>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setBusy(true);
    try {
      const res = await fetch('/api/auth/verify-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, code }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(responseError(res, data, t('Doğrulama başarısız.')));
        setBusy(false);
        return;
      }
      await onVerified();
    } catch {
      setError(ERR.network);
    }
    setBusy(false);
  };

  const resend = async () => {
    setError(null);
    setInfo(null);
    try {
      const res = await fetch('/api/auth/verify-email/send', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) setError(responseError(res, data, t('Kod gönderilemedi.')));
      else setInfo(t('Yeni kod gönderildi. Gelen kutunuzu ve spam klasörünü kontrol edin.'));
    } catch {
      setError(ERR.network);
    }
  };

  return (
    <form onSubmit={submit} className="space-y-4" aria-label={t('E-posta doğrulama')}>
      <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-2 border border-line">
        <MailCheck className="w-5 h-5 text-brand-light shrink-0 mt-0.5" />
        <p className="text-sm text-body leading-relaxed">
          <span className="font-medium text-fg">{tx(displayEmail || email)}</span>{' '}{t('adresine 6 haneli bir doğrulama kodu gönderdik. Kod 15 dakika geçerlidir.')}
        </p>
      </div>
      <SpamHint />
      {error && (
        <p role="alert" className="flex items-start gap-2 text-sm text-rose-300">
          <AlertCircle className="w-4 h-4 mt-0.5 shrink-0" /> {tx(error)}
        </p>
      )}
      {info && (
        <p role="status" className="text-sm text-emerald-300">
          {tx(info)}
        </p>
      )}
      <label className="block">
        <span className="block text-xs font-medium text-subtle mb-2">{t('Doğrulama kodu')}</span>
        <input
          className={inputCls}
          inputMode="numeric"
          autoComplete="one-time-code"
          pattern="[0-9]*"
          maxLength={6}
          required
          autoFocus
          value={code}
          onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))}
          placeholder="••••••"
          aria-label={t('6 haneli doğrulama kodu')}
        />
      </label>
      <button
        type="submit"
        disabled={busy || code.length !== 6}
        className="w-full bg-brand hover:bg-brand-hover text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
      >
        {busy ? <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>{t('Doğrula')}{' '}<ArrowRight className="w-4 h-4" /></>}
      </button>
      <button type="button" onClick={resend} className="w-full text-xs text-subtle hover:text-fg inline-flex items-center justify-center gap-1.5 min-h-[36px]">
        <RotateCw className="w-3.5 h-3.5" />{' '}{t('Kod gelmedi mi? Yeniden gönder')}
      </button>
    </form>
  );
}
