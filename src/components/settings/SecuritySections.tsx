'use client';

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
    return { ok: res.ok, data: await res.json().catch(() => ({})) };
  } catch {
    return { ok: false, data: { error: 'Sunucuya ulaşılamadı.' } };
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
      <Panel title="E-posta doğrulaması">
        <p className="text-sm text-emerald-300 flex items-center gap-2">
          <BadgeCheck className="w-4 h-4" /> {currentUser.email} doğrulandı.
        </p>
      </Panel>
    );
  }

  const send = async () => {
    setBusy(true);
    setMsg(null);
    const { ok, data } = await post('/api/auth/verify-email/send', {});
    setBusy(false);
    if (!ok) return setMsg({ kind: 'error', text: String(data.error ?? 'Kod gönderilemedi.') });
    setSent(true);
    setMsg({ kind: 'ok', text: String(data.message ?? 'Kod gönderildi.') });
  };

  const confirm = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setMsg(null);
    const { ok, data } = await post('/api/auth/verify-email', { code });
    setBusy(false);
    if (!ok) return setMsg({ kind: 'error', text: String(data.error ?? 'Doğrulanamadı.') });
    await checkAuth(true);
  };

  return (
    <Panel title="E-posta doğrulaması" description="Hesabınızın güvenliği ve şifre işlemleri için e-posta adresinizi doğrulayın.">
      <div className="space-y-4 max-w-md">
        <p className="text-sm text-amber-300 flex items-center gap-2">
          <MailWarning className="w-4 h-4" /> {currentUser?.email} henüz doğrulanmadı.
        </p>
        {sent ? (
          <form onSubmit={confirm} className="flex flex-wrap items-end gap-2">
            <label className="block">
              <span className={labelCls}>Doğrulama kodu</span>
              <input className={codeCls} inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            </label>
            <button type="submit" disabled={busy || code.length !== 6} className={primaryBtn}>
              Doğrula
            </button>
            <button type="button" onClick={send} disabled={busy} className={secondaryBtn}>
              Yeniden gönder
            </button>
          </form>
        ) : (
          <button onClick={send} disabled={busy} className={primaryBtn}>
            Doğrulama kodu gönder
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
    if (email === currentUser?.email?.toLowerCase()) return setMsg({ kind: 'error', text: 'Yeni adres mevcut adresinizle aynı.' });
    setBusy(true);
    const { ok, data } = await post('/api/auth/update-email', codeSent ? { newEmail: email, code } : { newEmail: email, currentPassword: password });
    setBusy(false);
    if (!ok) return setMsg({ kind: 'error', text: String(data.error ?? 'E-posta güncellenemedi.') });
    if (data.codeSent) {
      setCodeSent(true);
      setMsg({ kind: 'ok', text: String(data.message) });
      return;
    }
    setNewEmail('');
    setPassword('');
    setCode('');
    setCodeSent(false);
    setMsg({ kind: 'ok', text: 'E-posta adresiniz doğrulandı ve güncellendi.' });
    addToast({ type: 'success', title: 'E-posta güncellendi', message: email });
    await checkAuth(true);
  };

  return (
    <Panel title="E-posta adresi" description={`Şu an: ${currentUser?.email ?? '—'}. Yeni adrese gönderilen kodla değiştirilir.`}>
      <form onSubmit={submit} className="space-y-4 max-w-md">
        <label className="block">
          <span className={labelCls}>Yeni e-posta</span>
          <input className={fieldCls} type="email" required autoComplete="email" disabled={codeSent} value={newEmail} onChange={(e) => setNewEmail(e.target.value)} />
        </label>
        {codeSent ? (
          <label className="block">
            <span className={labelCls}>Yeni adrese gelen kod</span>
            <input className={codeCls} inputMode="numeric" autoComplete="one-time-code" required maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
          </label>
        ) : (
          <label className="block">
            <span className={labelCls}>Mevcut şifre</span>
            <input className={fieldCls} type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
          </label>
        )}
        {msg && <Message {...msg} />}
        <div className="flex flex-wrap gap-2">
          <button type="submit" disabled={busy} className={primaryBtn}>
            {busy ? 'Bekleyin…' : codeSent ? 'Doğrula ve değiştir' : 'Kod gönder'}
          </button>
          {codeSent && (
            <button type="button" onClick={() => { setCodeSent(false); setCode(''); setMsg(null); }} className={secondaryBtn}>
              Vazgeç
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
    if (!res.ok) setMsg({ kind: 'error', text: String(res.data.error ?? 'İşlem yapılamadı.') });
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
      addToast({ type: 'success', title: 'İki adımlı doğrulama açıldı', message: 'Girişte uygulamadaki kod da istenecek.' });
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
      setMsg({ kind: 'ok', text: 'İki adımlı doğrulama kapatıldı.' });
      await load();
      await checkAuth(true);
    }
  };

  return (
    <Panel
      title="İki adımlı doğrulama"
      description="Girişte şifrenize ek olarak telefonunuzdaki authenticator uygulamasının (Google Authenticator, Microsoft Authenticator, Authy…) ürettiği kod istenir. SMS veya ek hizmet gerekmez."
    >
      <div className="space-y-4 max-w-xl">
        {recovery && (
          <div className="rounded-lg border border-amber-500/40 bg-amber-500/5 p-4 space-y-3">
            <p className="text-sm text-amber-200 font-medium">Kurtarma kodlarınız — şimdi kaydedin</p>
            <p className="text-xs text-subtle">Telefonunuza erişemezseniz bu kodlardan biriyle giriş yapabilirsiniz. Her kod bir kez kullanılır ve tekrar gösterilmez.</p>
            <div className="grid grid-cols-2 gap-1.5 font-mono text-sm text-fg">
              {recovery.map((c) => (
                <span key={c} className="px-2 py-1 rounded bg-app border border-line text-center select-all">
                  {c}
                </span>
              ))}
            </div>
            <div className="flex gap-2">
              <button onClick={() => navigator.clipboard?.writeText(recovery.join('\n')).catch(() => {})} className={secondaryBtn}>
                <Copy className="w-4 h-4" /> Kopyala
              </button>
              <button onClick={() => setRecovery(null)} className={primaryBtn}>
                Kaydettim
              </button>
            </div>
          </div>
        )}

        {status?.enabled ? (
          <>
            <p className="text-sm text-emerald-300 flex items-center gap-2">
              <ShieldCheck className="w-4 h-4" /> Açık · {status.recoveryLeft} kurtarma kodu kaldı
            </p>
            {disabling ? (
              <form onSubmit={disable} className="space-y-3">
                <label className="block">
                  <span className={labelCls}>Şifre</span>
                  <input className={fieldCls} type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
                </label>
                <label className="block">
                  <span className={labelCls}>Uygulamadaki kod veya kurtarma kodu</span>
                  <input className={`${fieldCls} font-mono max-w-[220px]`} required value={code} onChange={(e) => setCode(e.target.value.toUpperCase())} />
                </label>
                <div className="flex gap-2">
                  <button type="submit" disabled={busy} className="h-10 px-4 rounded-md bg-rose-600 hover:bg-rose-500 text-white text-sm font-medium disabled:opacity-50">
                    Kapat
                  </button>
                  <button type="button" onClick={() => setDisabling(false)} className={secondaryBtn}>
                    Vazgeç
                  </button>
                </div>
              </form>
            ) : (
              <button onClick={() => setDisabling(true)} className={secondaryBtn}>
                <ShieldOff className="w-4 h-4" /> Kapat
              </button>
            )}
          </>
        ) : setup ? (
          <form onSubmit={enable} className="space-y-4">
            <ol className="text-sm text-body space-y-1 list-decimal pl-5">
              <li>Authenticator uygulamasında “hesap ekle”ye dokunup bu kodu tarayın.</li>
              <li>Uygulamanın gösterdiği 6 haneli kodu aşağıya yazın.</li>
            </ol>
            <div className="flex flex-col sm:flex-row gap-4 items-start">
              <img src={setup.qr} alt="İki adımlı doğrulama QR kodu" width={168} height={168} className="rounded-md bg-white p-2" />
              <div className="space-y-2 min-w-0">
                <p className="text-xs text-muted">Tarayamıyorsanız anahtarı elle girin:</p>
                <p className="font-mono text-sm text-fg break-all select-all bg-app border border-line rounded px-2 py-1.5">{setup.secret}</p>
              </div>
            </div>
            <label className="block">
              <span className={labelCls}>Uygulamadaki kod</span>
              <input className={codeCls} inputMode="numeric" autoComplete="one-time-code" required maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ''))} />
            </label>
            <div className="flex gap-2">
              <button type="submit" disabled={busy || code.length !== 6} className={primaryBtn}>
                Etkinleştir
              </button>
              <button type="button" onClick={() => setSetup(null)} className={secondaryBtn}>
                Vazgeç
              </button>
            </div>
          </form>
        ) : (
          <form onSubmit={startSetup} className="space-y-3">
            <p className="text-sm text-subtle flex items-center gap-2">
              <KeyRound className="w-4 h-4" /> Kapalı
            </p>
            <label className="block">
              <span className={labelCls}>Kurmak için şifrenizi girin</span>
              <input className={`${fieldCls} max-w-md`} type="password" required autoComplete="current-password" value={password} onChange={(e) => setPassword(e.target.value)} />
            </label>
            <button type="submit" disabled={busy} className={primaryBtn}>
              Kurulumu başlat
            </button>
          </form>
        )}
        {msg && <Message {...msg} />}
      </div>
    </Panel>
  );
}
