'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
} from 'lucide-react';

export default function RegisterPage() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [subscriptionPlan, setSubscriptionPlan] = useState<'Aylık' | 'Tek Seferlik'>('Aylık');
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== passwordConfirm) {
      setErrorMessage('Şifreler birbiriyle eşleşmiyor.');
      return;
    }

    if (password.length < 6) {
      setErrorMessage('Şifreniz en az 6 karakter olmalıdır.');
      return;
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, subscriptionPlan }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Kayıt sırasında bir hata oluştu.');
        setLoading(false);
        return;
      }

      setIsSubmitted(true);
      setLoading(false);
    } catch {
      setErrorMessage('Bağlantı hatası oluştu. Lütfen tekrar deneyiniz.');
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-[#0d0e12] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Glows */}
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-emerald-500/10 rounded-full blur-[120px] pointer-events-none" />
      <div className="absolute bottom-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white shadow-xl shadow-emerald-500/20 mb-4 border border-emerald-400/30">
            <ShieldCheck className="w-7 h-7" />
          </div>
          <h1 className="text-3xl font-bold text-white tracking-tight flex items-center justify-center gap-2">
            LrDocument <span className="text-xs px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">Kayıt</span>
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Matematik & İçerik Üretim Alanı
          </p>
        </div>

        {/* Card */}
        <div className="bg-[#16181f]/90 border border-neutral-800 backdrop-blur-xl rounded-2xl p-8 shadow-2xl relative">
          {isSubmitted ? (
            /* Successful Registration - Message as required */
            <div className="text-center py-4 space-y-6 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center shadow-lg shadow-emerald-500/10">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">Başvurunuz Alındı</h2>
                <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm font-semibold">
                  Talebiniz oluşturuldu. Mail üzerinden iletişime geçilecektir.
                </div>
              </div>

              <p className="text-xs text-neutral-400">
                Hesap başvurunuz yönetici onayına sunuldu. Onay süreci tamamlandığında bilgilendirme yapılacaktır.
              </p>

              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 bg-neutral-800 hover:bg-neutral-700 text-white font-medium py-3 px-4 rounded-xl border border-neutral-700 transition-colors"
              >
                <span>Giriş Sayfasına Dön</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            /* Registration Form */
            <>
              {errorMessage && (
                <div className="mb-6 p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 text-sm animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                    Abonelik Tercihi
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-[#0d0e12] rounded-xl border border-neutral-800">
                    <button
                      type="button"
                      onClick={() => setSubscriptionPlan('Aylık')}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${subscriptionPlan === 'Aylık'
                          ? 'bg-neutral-800 text-white border border-neutral-700 shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                        }`}
                    >
                      Aylık (100 TL)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubscriptionPlan('Tek Seferlik')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${subscriptionPlan === 'Tek Seferlik'
                          ? 'bg-gradient-to-r from-emerald-600 to-teal-600 text-white border border-emerald-500/40 shadow-sm'
                          : 'text-neutral-400 hover:text-white'
                        }`}
                    >
                      Ömür Boyu (1999 TL)
                    </button>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                    Ad Soyad
                  </label>
                  <div className="relative">
                    <User className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="text"
                      required
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Örn: Ali Yılmaz"
                      className="w-full bg-[#0d0e12] border border-neutral-800 rounded-xl pl-11 pr-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                  </div>
                </div>

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
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                    Şifre (En az 6 karakter)
                  </label>
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

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                    Şifre Tekrarı
                  </label>
                  <div className="relative">
                    <Lock className="w-5 h-5 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                    <input
                      type="password"
                      required
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
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
                      <span>Kayıt Talebini Gönder</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </form>
            </>
          )}
        </div>

        {/* Footer Link */}
        {!isSubmitted && (
          <div className="text-center mt-6">
            <p className="text-sm text-neutral-400">
              Zaten bir hesabınız var mı?{' '}
              <Link
                href="/login"
                className="text-emerald-400 hover:text-emerald-300 font-medium transition-colors"
              >
                Giriş Yap
              </Link>
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
