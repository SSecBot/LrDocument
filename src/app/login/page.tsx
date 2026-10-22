'use client';

import React, { Suspense, useState, useEffect } from 'react';
import Link from 'next/link';
import { SigmaLogo } from '@/components/ui/SigmaLogo';
import { useRouter, useSearchParams } from 'next/navigation';
import {
  Lock,
  Mail,
  ArrowRight,
  Clock,
  AlertCircle,
  Building2,
  KeyRound,
  User,
  ShieldCheck,
} from 'lucide-react';
import { EmailCodeStep } from '@/components/auth/EmailCodeStep';
import { PasswordResetStep } from '@/components/auth/PasswordResetStep';
import { useAppStore } from '@/store/useAppStore';

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  );
}

function LoginForm() {
  const router = useRouter();
  // ?ekle=1: a signed-in user adds another account; the current one stays signed in.
  const params = useSearchParams();
  const adding = params.get('ekle') === '1';
  // Kurumsal giriş: members of a corporate workspace sign in with their personal code.
  const [mode, setMode] = useState<'personal' | 'corporate'>(params.get('kurumsal') === '1' ? 'corporate' : 'personal');
  const [code, setCode] = useState('');
  const { isAuthenticated, currentUser } = useAppStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPendingApproval, setIsPendingApproval] = useState(false);
  // After the password: confirm the e-mail (code sent to it) or enter the authenticator code.
  const [stage, setStage] = useState<'form' | 'verify-email' | 'two-factor' | 'reset'>('form');
  const [resetDone, setResetDone] = useState(false);
  const [maskedEmail, setMaskedEmail] = useState('');
  const [mailError, setMailError] = useState<string | null>(null);
  const [challenge, setChallenge] = useState('');
  const [otp, setOtp] = useState('');

  useEffect(() => {
    if (isAuthenticated && currentUser && !adding) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, currentUser, router, adding]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    attemptLogin();
  };

  const finish = () => {
    // Full reload: no data of a previously active account may stay in memory.
    // eslint-disable-next-line @next/next/no-location-assign-relative-destination
    window.location.href = '/dashboard';
  };

  const submitTwoFactor = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setLoading(true);
    try {
      const res = await fetch('/api/auth/login/2fa', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ challenge, code: otp }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setErrorMessage(data.error || 'Kod hatalı.');
        if (data.expired) {
          setStage('form');
          setOtp('');
        }
        setLoading(false);
        return;
      }
      finish();
    } catch {
      setErrorMessage('Bağlantı hatası oluştu. Lütfen tekrar deneyiniz.');
      setLoading(false);
    }
  };

  const attemptLogin = async () => {
    setErrorMessage(null);
    setIsPendingApproval(false);
    setLoading(true);

    try {
      const res = await fetch(mode === 'corporate' ? '/api/auth/corporate' : '/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(mode === 'corporate' ? { code } : { email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.status === 'EMAIL_UNVERIFIED') {
          setMaskedEmail(data.email || email);
          setMailError(data.mailError ?? null);
          setStage('verify-email');
        } else if (data.status === 'PENDING') {
          setStage('form');
          setIsPendingApproval(true);
        } else {
          setErrorMessage(data.error || 'Giriş başarısız. Lütfen bilgilerinizi kontrol ediniz.');
        }
        setLoading(false);
        return;
      }

      if (data.twoFactorRequired) {
        setChallenge(data.challenge);
        setOtp('');
        setStage('two-factor');
        setLoading(false);
        return;
      }
      finish();
    } catch {
      setErrorMessage('Bağlantı hatası oluştu. Lütfen tekrar deneyiniz.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-dvh w-full bg-app flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Glows */}

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <SigmaLogo size="lg" className="mb-4" />
          <h1 className="text-2xl font-semibold text-fg tracking-tight">
            LrDocument
          </h1>
          <p className="text-sm text-subtle mt-1">
            {adding
              ? 'Başka bir hesap ekleyin; mevcut hesabınız açık kalır.'
              : mode === 'corporate'
                ? 'Kurumsal kodunuzla giriş yapın'
                : 'Hesabınıza giriş yapın'}
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-surface border border-line rounded-xl p-6 relative">
          {/* Pending Approval Notification */}
          {isPendingApproval && (
            <div className="mb-6 p-4 rounded-lg bg-amber-500/10 border border-amber-500/30 text-amber-200 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-400 mt-0.5 shrink-0" />
                <div className="text-sm">
                  <p className="font-semibold text-amber-300 mb-1">Onay Bekleniyor</p>
                  <p className="text-neutral-300 leading-relaxed">
                    Kayıt talebiniz alındı. Yöneticinin (Admin) hesabınızı onaylaması bekleniyor.
                  </p>
                </div>
              </div>
            </div>
          )}

          {params.get('silindi') === '1' && stage === 'form' && (
            <div className="mb-6 p-4 rounded-lg bg-surface-2 border border-line text-body text-sm" role="status">
              Hesabınız ve tüm verileriniz silindi.
            </div>
          )}

          {resetDone && stage === 'form' && (
            <div className="mb-6 p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm" role="status">
              Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.
            </div>
          )}

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 text-sm animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          {stage === 'verify-email' && (
            <div className="space-y-4">
              <h2 className="text-base font-semibold text-fg">E-postanızı doğrulayın</h2>
              <EmailCodeStep
                email={email.trim().toLowerCase()}
                displayEmail={maskedEmail}
                initialError={mailError}
                onVerified={() => attemptLogin()}
              />
              <button type="button" onClick={() => setStage('form')} className="w-full text-xs text-muted hover:text-fg min-h-[36px]">
                Geri dön
              </button>
            </div>
          )}

          {stage === 'reset' && (
            <div className="space-y-3">
              <PasswordResetStep
                initialEmail={email}
                onDone={(addr) => {
                  setEmail(addr);
                  setPassword('');
                  setResetDone(true);
                  setStage('form');
                }}
              />
              <button type="button" onClick={() => setStage('form')} className="w-full text-xs text-muted hover:text-fg min-h-[36px]">
                Girişe dön
              </button>
            </div>
          )}

          {stage === 'two-factor' && (
            <form onSubmit={submitTwoFactor} className="space-y-4" aria-label="İki adımlı doğrulama">
              <div className="flex items-start gap-3 p-3 rounded-lg bg-surface-2 border border-line">
                <ShieldCheck className="w-5 h-5 text-brand-light shrink-0 mt-0.5" />
                <p className="text-sm text-body leading-relaxed">
                  Authenticator uygulamanızdaki 6 haneli kodu girin. Telefonunuz yanınızda değilse kurtarma kodlarınızdan birini kullanabilirsiniz.
                </p>
              </div>
              <input
                className="w-full bg-app border border-line rounded-lg px-4 py-3 text-center text-xl font-mono tracking-[0.3em] text-fg placeholder-muted focus:outline-none focus:border-line-strong focus:ring-1 focus:ring-brand/40"
                inputMode="text"
                autoComplete="one-time-code"
                autoFocus
                required
                maxLength={9}
                value={otp}
                onChange={(e) => setOtp(e.target.value.toUpperCase().replace(/[^0-9A-Z-]/g, ''))}
                placeholder="123456"
                aria-label="Doğrulama kodu veya kurtarma kodu"
              />
              <button
                type="submit"
                disabled={loading || otp.length < 6}
                className="w-full bg-brand hover:bg-brand-hover text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {loading ? <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> : <>Doğrula ve giriş yap <ArrowRight className="w-4 h-4" /></>}
              </button>
              <button type="button" onClick={() => setStage('form')} className="w-full text-xs text-muted hover:text-fg min-h-[36px]">
                Geri dön
              </button>
            </form>
          )}

          {stage === 'form' && (
          <>
          <form onSubmit={handleSubmit} className="space-y-4">
            {mode === 'corporate' ? (
              <div>
                <label htmlFor="corp-code" className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                  Kurumsal Kod
                </label>
                <div className="relative">
                  <KeyRound className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                  <input
                    id="corp-code"
                    type="text"
                    autoComplete="one-time-code"
                    autoCapitalize="characters"
                    spellCheck={false}
                    required
                    value={code}
                    onChange={(e) => setCode(e.target.value.toUpperCase())}
                    placeholder="LR-XXXX-XXXX-XXXX"
                    maxLength={24}
                    className="w-full bg-app border border-line rounded-lg pl-11 pr-4 py-3 text-sm font-mono tracking-wider text-white placeholder-neutral-600 focus:outline-none focus:border-line-strong focus:ring-1 focus:ring-brand/40 transition-colors"
                  />
                </div>
                <p className="text-xs text-muted mt-2 leading-relaxed">
                  Kodu kurumunuzun sahibi verir; kod sizi doğrudan ait olduğunuz kurumun çalışma alanına alır.
                </p>
              </div>
            ) : (
              <>
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                    E-Posta Adresi
                  </label>
                  <div className="relative">
                    <Mail className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="email"
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ornek@alanadi.com"
                      className="w-full bg-app border border-line rounded-lg pl-11 pr-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-line-strong focus:ring-1 focus:ring-brand/40 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-2">
                    <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400">
                      Şifre
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setErrorMessage(null);
                        setStage('reset');
                      }}
                      className="text-xs text-brand-light hover:text-fg"
                    >
                      Şifremi unuttum
                    </button>
                  </div>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="password"
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-app border border-line rounded-lg pl-11 pr-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-line-strong focus:ring-1 focus:ring-brand/40 transition-colors"
                    />
                  </div>
                </div>
              </>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-brand hover:bg-brand-hover text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <span>Giriş Yap</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          <div className="mt-5 pt-4 border-t border-line">
            <p className="text-[11px] text-muted text-center mb-2">Giriş türü</p>
            <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-app border border-line" role="tablist" aria-label="Giriş türü">
              {(
                [
                  ['personal', 'E-posta ile', User],
                  ['corporate', 'Kurumsal giriş', Building2],
                ] as const
              ).map(([id, label, Icon]) => (
                <button
                  key={id}
                  type="button"
                  role="tab"
                  aria-selected={mode === id}
                  onClick={() => {
                    setMode(id);
                    setErrorMessage(null);
                    setIsPendingApproval(false);
                  }}
                  className={`h-9 rounded-md text-xs font-medium inline-flex items-center justify-center gap-1.5 transition-colors ${
                    mode === id ? 'bg-surface-3 text-fg' : 'text-subtle hover:text-fg'
                  }`}
                >
                  <Icon className="w-3.5 h-3.5" /> {label}
                </button>
              ))}
            </div>
            {mode === 'corporate' && (
              <p className="text-[11px] text-muted text-center mt-2">Kurum sahibi misiniz? “E-posta ile” girişi kullanın.</p>
            )}
          </div>
          </>
          )}
        </div>

        {/* Footer Link */}
        <div className="text-center mt-6 space-y-2">
          {adding && (
            <p className="text-sm">
              <Link href="/dashboard" className="text-subtle hover:text-fg">
                Vazgeç, panele dön
              </Link>
            </p>
          )}
          <p className="text-sm text-neutral-400">
            Hesabınız yok mu?{' '}
            <Link
              href="/register"
              className="text-brand-light hover:text-fg font-medium transition-colors"
            >
              Kayıt Talebi Oluştur
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
