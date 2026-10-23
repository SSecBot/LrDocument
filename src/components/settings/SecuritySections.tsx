'use client';

import { t, tx } from '@/lib/i18n';
import { ERR, responseError } from '@/lib/errors';
import React, { useEffect, useState } from 'react';
import { BadgeCheck, Copy, KeyRound, MailWarning, ShieldCheck, ShieldOff } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Message, Panel, fieldCls, labelCls, primaryBtn } from './settingsUi';

type Msg = { kind: 'ok' | 'error'; text: string } | null;

const secondaryBtn =
  'h-10 px-4 rounded-md border border-line-strong text-body hover:bg-surface-2 text-sm inline-flex items-center justify-center gap-2 disabled:opacity-50';
const codeCls = `${fieldCls} font-mono tracking-[0.3em] text-center max-w-[180px]`;

async function post(url: string, body: unknown): Promise<{ ok: boolean; data: Record<string, unknown> }> {
  try {
    const res = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    const data = await res.json().catch(() => ({}));
    return { ok: res.ok, data: res.ok ? data : { ...data, error: responseError(res, data) } };
  } catch {
    return { ok: false, data: { error: ERR.network } };
  }
}

/** Shows whether the login e-mail is confirmed; sends and checks the code. */
export function EmailVerificationPanel() {
  const { currentUser, checkAuth } = useAppStore();
  const [sent, setSent] = useState(false);
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  if (currentUser?.emailVerified) {
    return (
      <Panel title={t('E-posta doğrulaması')}>
        <p className="text-sm text-emerald-300 flex items-center gap-2">
          <BadgeCheck className="w-4 h-4" /> {tx(currentUser.email)}{' '}{t('doğrulandı.')}
        </p>
      </Panel>
    );
  }

  const send = async () => {
    setBusy(true);
    setMsg(null);
    const { ok, data } = await post('/api/auth/verify-email/send', {});
    setBusy(false);
    if (!ok) return setMsg({ kind: 'error', text: String(data.error ?? t('Kod gönderilemedi.')) });
    setSent(true);
    setMsg({ kind: 'ok', text: String(data.message ?? t('Kod gönderildi.')) });
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { ok, data } = await post('/api/auth/verify-email', { code });
    setBusy(false);
    if (!ok) return setMsg({ kind: 'error', text: String(data.error ?? t('Doğrulanamadı.')) });
    await checkAuth(true);
  };

  return (
    <Panel title={t('E-posta doğrulaması')} description={t('Hesabınızın güvenliği ve şifre işlemleri için e-posta adresinizi doğrulayın.')}>
      <div className="space-y-4 max-w-md">
        <p className="text-sm text-amber-300 flex items-center gap-2">
          <MailWarning className="w-4 h-4" /> {tx(currentUser?.email)}{' '}{t('henüz doğrulanmadı.')}
        </p>
        {sent ? (
          <form onSubmit={confirm} className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className={labelCls}>{t('Doğrulama kodu')}</span>
              <input className={codeCls} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            </label>
            <button type="submit" disabled={busy || code.length !== 6} className={primaryBtn}>
              {t('Doğrula')}
            </button>
            <button type="button" onClick={send} disabled={busy} className={secondaryBtn}>
              {t('Yeniden gönder')}
            </button>
          </form>
        ) : (
          <button onClick={send} disabled={busy} className={primaryBtn}>
            {t('Doğrulama kodu gönder')}
          </button>
        )}
        {msg && <Message {...msg} />}
      </div>
    </Panel>
  );
}

/** Changing the login e-mail: password, then the code sent to the new address. */
export function EmailSection() {
  const { currentUser, checkAuth, addToast } = useAppStore();
  const [newEmail, setNewEmail] = useState('');
  const [password, setPassword] = useState('');
  const [code, setCode] = useState('');
  const [codeSent, setCodeSent] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const submit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMsg(null);
    const email = newEmail.trim().toLowerCase();
    if (email === currentUser?.email?.toLowerCase()) return setMsg({ kind: 'error', text: t('Yeni adres mevcut adresinizle aynı.') });
    setBusy(true);
    const { ok, data } = await post('/api/auth/update-email', codeSent ? { newEmail: email, code } : { newEmail: email, currentPassword: password });
    setBusy(false);
    if (!ok) return setMsg({ kind: 'error', text: String(data.error ?? t('E-posta güncellenemedi.')) });
    if (data.codeSent) {
      setCodeSent(true);
      setMsg({ kind: 'ok', text: String(data.message) });
      return;
    }
    setNewEmail('');
    setPassword('');
    setCode('');
    setCodeSent(false);
    setMsg({ kind: 'ok', text: t('E-posta adresiniz doğrulandı ve güncellendi.') });
    addToast({ type: 'success', title: t('E-posta güncellendi'), message: email });
    await checkAuth(true);
  };

  return (
    <Panel title={t('E-posta adresi')} description={t('Şu an: {v0}. Yeni adrese gönderilen kodla değiştirilir.', { v0: currentUser?.email ?? '—' })}>
      <form onSubmit={submit} className="space-y-4 max-w-md">
        <label className="block">
          <span className={labelCls}>{t('Yeni e-posta')}</span>
          <input className={fieldCls} type="email" required autoComplete="email" disabled={codeSent} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
        </label>
        {codeSent ? (
          <label className="block">
            <span className={labelCls}>{t('Yeni adrese gelen kod')}</span>
            <input className={codeCls} inputMode="numeric" autoComplete="one-time-code" required maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </label>
        ) : (
          <label className="block">
            <span className={labelCls}>{t('Mevcut şifre')}</span>
            <input className={fieldCls} type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
        )}
        {msg && <Message {...msg} />}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? t('Bekleyin…') : codeSent ? t('Doğrula ve değiştir') : t('Kod gönder')}
          </button>
          {codeSent && (
            <button type="button" onClick={() => { setCodeSent(false); setCode(''); setMsg(null); }} className={secondaryBtn}>
              {t('Vazgeç')}
            </button>
          )}
        </div>
      </form>
    </Panel>
  );
}

/** İki adımlı doğrulama with an authenticator app (no SMS or external service). */
export function TwoFactorSection() {
  const { checkAuth, addToast } = useAppStore();
  const [status, setStatus] = useState<{ enabled: boolean; recoveryLeft: number } | null>(null);
  const [password, setPassword] = useState('');
  const [setup, setSetup] = useState<{ secret: string; qr: string } | null>(null);
  const [code, setCode] = useState('');
  const [recovery, setRecovery] = useState<string[] | null>(null);
  const [disabling, setDisabling] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<Msg>(null);

  const load = () =>
    fetch('/api/auth/2fa', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d && setStatus({ enabled: d.enabled, recoveryLeft: d.recoveryLeft }))
      .catch(() => {});
  useEffect(() => {
    load();
  }, []);

  const run = async (body: Record<string, unknown>) => {
    setBusy(true);
    setMsg(null);
    const res = await post('/api/auth/2fa', body);
    setBusy(false);
    if (!res.ok) setMsg({ kind: 'error', text: String(res.data.error ?? t('İki adımlı doğrulama ayarı değiştirilemedi.')) });
    return res;
  };

  const startSetup = async (e: React.FormEvent) => {
    e.preventDefault();
    const { ok, data } = await run({ action: 'setup', password });
    if (ok) {
      setSetup({ secret: String(data.secret), qr: String(data.qr) });
      setPassword('');
      setCode('');
    }
  };
  const enable = async (e: React.FormEvent) => {
    e.preventDefault();
    const { ok, data } = await run({ action: 'enable', code });
    if (ok) {
      setRecovery(data.recoveryCodes as string[]);
      setSetup(null);
      setCode('');
      addToast({ type: 'success', title: t('İki adımlı doğrulama açıldı'), message: t('Girişte uygulamadaki kod da istenecek.') });
      await load();
      await checkAuth(true);
    }
  };
  const disable = async (e: React.FormEvent) => {
    e.preventDefault();
    const { ok } = await run({ action: 'disable', password, code });
    if (ok) {
      setDisabling(false);
      setPassword('');
      setCode('');
      setMsg({ kind: 'ok', text: t('İki adımlı doğrulama kapatıldı.') });
      await load();
      await checkAuth(true);
    }
  };

  return (
    <Panel
      title={t('İki adımlı doğrulama')}
      description={t('Girişte şifrenize ek olarak telefonunuzdaki authenticator uygulamasının (Google Authenticator, Microsoft Authenticator, Authy…) ürettiği kod istenir. SMS veya ek hizmet gerekmez.')}
    >
      <div className="space-y-4 max-w-xl">
        {recovery && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
            <p className="text-sm text-amber-200 font-medium">{t('Kurtarma kodlarınız — şimdi kaydedin')}</p>
            <p className="text-xs text-subtle">{t('Telefonunuza erişemezseniz bu kodlardan biriyle giriş yapabilirsiniz. Her kod bir kez kullanılır ve tekrar gösterilmez.')}</p>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-sm text-fg">
              {recovery.map((c) => (
                <span key={c} className="px-2 py-1 rounded bg-app border border-line text-center select-all">
                  {tx(c)}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigator.clipboard?.writeText(recovery.join('\n')).catch(() => {})} className={secondaryBtn}>
                <Copy className="w-4 h-4" />{' '}{t('Kopyala')}
              </button>
              <button onClick={() => setRecovery(null)} className={primaryBtn}>
                {t('Kaydettim')}
              </button>
            </div>
          </div>
        )}

        {status?.enabled ? (
          <>
            <p className="text-sm text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" />{' '}{t('Açık ·')}{' '}{status.recoveryLeft}{' '}{t('kurtarma kodu kaldı')}
            </p>
            {disabling ? (
              <form onSubmit={disable} className="space-y-3">
                <label className="block">
                  <span className={labelCls}>{t('Şifre')}</span>
                  <input className={fieldCls} type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </label>
                <label className="block">
                  <span className={labelCls}>{t('Uygulamadaki kod veya kurtarma kodu')}</span>
                  <input className={`${fieldCls} font-mono max-w-[220px]`} required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
                </label>
                <div className="flex gap-2">
                  <button type="submit" disabled={busy} className="h-10 px-4 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium disabled:opacity-50">
                    {t('Kapat')}
                  </button>
                  <button type="button" onClick={() => setDisabling(false)} className={secondaryBtn}>
                    {t('Vazgeç')}
                  </button>
                </div>
              </form>
            ) : (
              <button onClick={() => setDisabling(true)} className={secondaryBtn}>
                <ShieldOff className="w-4 h-4" />{' '}{t('Kapat')}
              </button>
            )}
          </>
        ) : setup ? (
          <form onSubmit={enable} className="space-y-4">
            <ol className="text-sm text-body space-y-1 list-decimal pl-5">
              <li>{t('Authenticator uygulamasında “hesap ekle”ye dokunup bu kodu tarayın.')}</li>
              <li>{t('Uygulamanın gösterdiği 6 haneli kodu aşağıya yazın.')}</li>
            </ol>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <img src={setup.qr} alt={t('İki adımlı doğrulama QR kodu')} width={168} height={168} className="rounded-md bg-white p-2" />
              <div className="space-y-2 min-w-0">
                <p className="text-xs text-muted">{t('Tarayamıyorsanız anahtarı elle girin:')}</p>
                <p className="font-mono text-sm text-fg break-all select-all bg-app border border-line rounded px-2 py-1.5">{tx(setup.secret)}</p>
              </div>
            </div>
            <label className="block">
              <span className={labelCls}>{t('Uygulamadaki kod')}</span>
              <input className={codeCls} inputMode="numeric" autoComplete="one-time-code" required maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={busy || code.length !== 6} className={primaryBtn}>
                {t('Etkinleştir')}
              </button>
              <button type="button" onClick={() => setSetup(null)} className={secondaryBtn}>
                {t('Vazgeç')}
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={startSetup} className="space-y-3">
            <p className="text-sm text-subtle flex items-center gap-2">
              <KeyRound className="w-4 h-4" />{' '}{t('Kapalı')}
            </p>
            <label className="block">
              <span className={labelCls}>{t('Kurmak için şifrenizi girin')}</span>
              <input className={`${fieldCls} max-w-md`} type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <button type="submit" disabled={busy} className={primaryBtn}>
              {t('Kurulumu başlat')}
            </button>
          </form>
        )}
        {msg && <Message {...msg} />}
      </div>
    </Panel>
  );
}
