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
} from 'lucide-react';
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
  const adding = useSearchParams().get('ekle') === '1';
  const { isAuthenticated, currentUser } = useAppStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  useEffect(() => {
    if (isAuthenticated && currentUser && !adding) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, currentUser, router, adding]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setIsPendingApproval(false);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        if (data.status === 'PENDING') {
          setIsPendingApproval(true);
        } else {
          setErrorMessage(data.error || 'Giriş başarısız. Lütfen bilgilerinizi kontrol ediniz.');
        }
        setLoading(false);
        return;
      }

      // Full reload: no data of a previously active account may stay in memory.
      // eslint-disable-next-line @next/next/no-location-assign-relative-destination
      window.location.href = '/dashboard';
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
            {adding ? 'Başka bir hesap ekleyin; mevcut hesabınız açık kalır.' : 'Hesabınıza giriş yapın'}
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

          {/* Error Message */}
          {errorMessage && (
            <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 text-sm animate-in fade-in">
              <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
              <span>{errorMessage}</span>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
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
