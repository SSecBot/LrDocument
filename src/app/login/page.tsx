'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Lock,
  Mail,
  ArrowRight,
  ShieldCheck,
  Clock,
  AlertCircle,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export default function LoginPage() {
  const router = useRouter();
  const { checkAuth, isAuthenticated, currentUser } = useAppStore();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isPendingApproval, setIsPendingApproval] = useState(false);

  useEffect(() => {
    if (isAuthenticated && currentUser) {
      router.push('/dashboard');
    }
  }, [isAuthenticated, currentUser, router]);

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

      const data = await res.json();

      if (!res.ok) {
        if (data.status === 'PENDING') {
          setIsPendingApproval(true);
        } else {
          setErrorMessage(data.error || 'Giriş başarısız. Lütfen bilgilerinizi kontrol ediniz.');
        }
        setLoading(false);
        return;
      }

      await checkAuth(true);
      router.push('/dashboard');
    } catch {
      setErrorMessage('Bağlantı hatası oluştu. Lütfen tekrar deneyiniz.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0d0e12] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xl shadow-emerald-500/20 mb-4 border border-emerald-400/30">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
            LrDocument <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">PRO</span>
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Matematik & İçerik Üretim Alanı
          </p>
        </div>

        {/* Login Box */}
        <div className="bg-[#16181f]/90 border border-neutral-800 backdrop-blur-xl rounded-2xl p-8 shadow-2xl relative">
          {/* Pending Approval Notification */}
          {isPendingApproval && (
            <div className="mb-6 p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-200 animate-in fade-in slide-in-from-top-2">
              <div className="flex items-start gap-3">
                <Clock className="w-5 h-5 text-amber-400 mt-0.5 shrink-0 animate-pulse" />
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
            <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 text-sm animate-in fade-in">
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
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="ornek@alanadi.com"
                  className="w-full bg-[#0d0e12] border border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
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
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#0d0e12] border border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full mt-2 bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-medium py-3 px-4 rounded-xl flex items-center justify-center gap-2 shadow-lg shadow-emerald-600/20 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
        <div className="text-center mt-6">
          <p className="text-sm text-neutral-400">
            Hesabınız yok mu?{' '}
            <Link
              href="/register"
              className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
            >
              Kayıt Talebi Oluştur
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
