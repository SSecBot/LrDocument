'use client';

import React, { Suspense, useState } from 'react';
import { useSearchParams } from 'next/navigation';
import { CLASS_YEARS, isAcademicEmail } from '@/lib/studentProfile';
import { planLabel } from '@/lib/pricing';
import Link from 'next/link';
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  ShieldCheck,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
} from 'lucide-react';

const fieldCls =
  'w-full bg-app border border-line rounded-lg px-3.5 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors';

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [subscriptionPlan, setSubscriptionPlan] = useState<'Aylık' | 'Tek Seferlik'>('Aylık');
  // ?ogrenci=1 preselects the student account type (linked from the pricing section).
  const [isStudent, setIsStudent] = useState(() => searchParams.get('ogrenci') === '1');
  const [university, setUniversity] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [classYear, setClassYear] = useState(1);
  const accountType = isStudent ? 'STUDENT' : 'STANDARD';
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

    if (isStudent) {
      if (!university.trim() || !department.trim()) {
        setErrorMessage('Lütfen üniversite ve bölüm bilgilerinizi giriniz.');
        return;
      }
      if (!isAcademicEmail(studentEmail)) {
        setErrorMessage('Öğrenci e-postanız üniversite uzantılı olmalıdır (ör. 123456@ogr.ktu.edu.tr).');
        return;
      }
    }

    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          email,
          password,
          subscriptionPlan,
          accountType,
          ...(isStudent ? { student: { university, studentEmail, department, classYear } } : {}),
        }),
      });

      const data = await res.json().catch(() => ({}));

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
    <div className="min-h-dvh w-full bg-app flex items-center justify-center p-4 relative overflow-hidden font-sans">
      {/* Background Glows */}

      <div className="w-full max-w-md z-10">
        {/* Brand Header */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-emerald-600 text-white mb-4 border border-emerald-400/30">
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
        <div className="bg-surface/90 border border-line backdrop-blur-xl rounded-xl p-6 relative">
          {isSubmitted ? (
            /* Successful Registration - Message as required */
            <div className="text-center py-4 space-y-5 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">Başvurunuz Alındı</h2>
                <div className="p-4 rounded-lg bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm font-semibold">
                  Talebiniz oluşturuldu. Mail üzerinden iletişime geçilecektir.
                </div>
              </div>

              <p className="text-xs text-neutral-400">
                Hesap başvurunuz yönetici onayına sunuldu. Onay süreci tamamlandığında bilgilendirme yapılacaktır.
              </p>

              <Link
                href="/login"
                className="w-full inline-flex items-center justify-center gap-2 bg-surface-3 hover:bg-neutral-700 text-white font-medium py-3 px-4 rounded-lg border border-line-strong transition-colors"
              >
                <span>Giriş Sayfasına Dön</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          ) : (
            /* Registration Form */
            <>
              {errorMessage && (
                <div className="mb-6 p-4 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 flex items-start gap-3 text-sm animate-in fade-in">
                  <AlertCircle className="w-5 h-5 text-rose-400 mt-0.5 shrink-0" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                    Hesap Tipi
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-app rounded-lg border border-line">
                    <button
                      type="button"
                      onClick={() => setIsStudent(false)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors ${!isStudent ? 'bg-surface-3 text-white' : 'text-neutral-400 hover:text-white'}`}
                    >
                      Standart
                    </button>
                    <button
                      type="button"
                      onClick={() => setIsStudent(true)}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5 ${isStudent ? 'bg-surface-3 text-white' : 'text-neutral-400 hover:text-white'}`}
                    >
                      <GraduationCap className="w-4 h-4" />
                      Üniversite öğrencisi
                    </button>
                  </div>
                  {isStudent && (
                    <p className="mt-2 text-[11px] text-emerald-300/90">
                      Öğrencilere tüm paketler yarı fiyatına. Ders takibi, devamsızlık ve not ortalaması hesaplama araçları dahildir.
                    </p>
                  )}
                </div>

                {isStudent && (
                  <div className="space-y-3 p-3 rounded-lg border border-line bg-app/50">
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5">Üniversite</label>
                      <input className={fieldCls} required value={university} onChange={(e) => setUniversity(e.target.value)} placeholder="Ör. Karadeniz Teknik Üniversitesi" list="universities" />
                      <datalist id="universities">
                        <option value="Karadeniz Teknik Üniversitesi" />
                      </datalist>
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5">Öğrenci e-postası</label>
                      <input className={fieldCls} type="email" required value={studentEmail} onChange={(e) => setStudentEmail(e.target.value)} placeholder="ogrencino@ogr.ktu.edu.tr" />
                    </div>
                    <div className="grid grid-cols-[1fr_120px] gap-2">
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5">Bölüm</label>
                        <input className={fieldCls} required value={department} onChange={(e) => setDepartment(e.target.value)} placeholder="Ör. Bilgisayar Müh." />
                      </div>
                      <div>
                        <label className="block text-[11px] font-semibold text-neutral-400 mb-1.5">Sınıf</label>
                        <select className={fieldCls} value={classYear} onChange={(e) => setClassYear(Number(e.target.value))}>
                          {CLASS_YEARS.map((c) => (
                            <option key={c.value} value={c.value}>{c.label}</option>
                          ))}
                        </select>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                    Abonelik Tercihi
                  </label>
                  <div className="grid grid-cols-2 gap-2 p-1 bg-app rounded-lg border border-line">
                    <button
                      type="button"
                      onClick={() => setSubscriptionPlan('Aylık')}
                      className={`py-2 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${subscriptionPlan === 'Aylık'
                          ? 'bg-surface-3 text-white border border-line-strong'
                          : 'text-neutral-400 hover:text-white'
                        }`}
                    >
                      {planLabel('Aylık', accountType)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubscriptionPlan('Tek Seferlik')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${subscriptionPlan === 'Tek Seferlik'
                          ? 'bg-emerald-600 text-white border border-emerald-500/40'
                          : 'text-neutral-400 hover:text-white'
                        }`}
                    >
                      {planLabel('Tek Seferlik', accountType)}
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
                      className="w-full bg-app border border-line rounded-lg pl-11 pr-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
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
                      autoComplete="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="ornek@alanadi.com"
                      className="w-full bg-app border border-line rounded-lg pl-11 pr-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
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
                      autoComplete="new-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-app border border-line rounded-lg pl-11 pr-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
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
                      autoComplete="new-password"
                      required
                      value={passwordConfirm}
                      onChange={(e) => setPasswordConfirm(e.target.value)}
                      placeholder="••••••••"
                      className="w-full bg-app border border-line rounded-lg pl-11 pr-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500 transition-colors"
                    />
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-emerald-600 hover:bg-emerald-500 text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
