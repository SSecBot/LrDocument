'use client';

import React, { Suspense, useEffect, useState } from 'react';
import { DEFAULT_SYSTEM_SETTINGS, resolveSystemSettings, type SystemSettings } from '@/lib/systemSettings';
import { useSearchParams } from 'next/navigation';
import { EmailCodeStep } from '@/components/auth/EmailCodeStep';
import { CLASS_YEARS, isAcademicEmail } from '@/lib/studentProfile';
import { ACCOUNT_TYPE_LABEL, ACCOUNT_TYPES, clampSeats, formatTL, planLabel, seatPrice, type AccountType } from '@/lib/pricing';
import Link from 'next/link';
import { SigmaLogo } from '@/components/ui/SigmaLogo';
import {
  User,
  Mail,
  Lock,
  ArrowRight,
  CheckCircle2,
  AlertCircle,
  GraduationCap,
  Building2,
} from 'lucide-react';

const fieldCls =
  'w-full bg-app border border-line rounded-lg px-3.5 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-line-strong focus:ring-1 focus:ring-brand/40 transition-colors';

export default function RegisterPage() {
  return (
    <Suspense>
      <RegisterForm />
    </Suspense>
  );
}

function RegisterForm() {
  const searchParams = useSearchParams();
  const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SYSTEM_SETTINGS);
  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/settings', { signal: ctrl.signal })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => d?.settings && setSettings(resolveSystemSettings(d.settings)))
      .catch(() => {});
    return () => ctrl.abort();
  }, []);
  const minPassword = settings.security.passwordMinLength;
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [passwordConfirm, setPasswordConfirm] = useState('');
  const [subscriptionPlan, setSubscriptionPlan] = useState<'Aylık' | 'Tek Seferlik'>(() =>
    searchParams.get('plan') === 'omur' ? 'Tek Seferlik' : 'Aylık'
  );
  // ?ogrenci=1 / ?tur=kurumsal preselect the account type (linked from the pricing section).
  const [accountType, setAccountType] = useState<AccountType>(() =>
    searchParams.get('ogrenci') === '1' ? 'STUDENT' : searchParams.get('tur') === 'kurumsal' ? 'CORPORATE' : 'STANDARD'
  );
  const isStudent = accountType === 'STUDENT';
  const isCorporate = accountType === 'CORPORATE';
  const [organization, setOrganization] = useState('');
  const [seatsInput, setSeatsInput] = useState(() => searchParams.get('kisi') ?? '5');
  const seats = clampSeats(seatsInput, settings.pricing);
  const [university, setUniversity] = useState('');
  const [studentEmail, setStudentEmail] = useState('');
  const [department, setDepartment] = useState('');
  const [classYear, setClassYear] = useState(1);
  const [loading, setLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [isSubmitted, setIsSubmitted] = useState(false);
  // After sign-up the e-mail is confirmed with the code sent to it.
  const [emailVerified, setEmailVerified] = useState(false);
  const [mailError, setMailError] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password !== passwordConfirm) {
      setErrorMessage('Şifreler birbiriyle eşleşmiyor.');
      return;
    }

    if (password.length < minPassword) {
      setErrorMessage(`Şifreniz en az ${minPassword} karakter olmalıdır.`);
      return;
    }

    if (isCorporate && organization.trim().length < 2) {
      setErrorMessage('Lütfen kurum adını giriniz.');
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
          ...(isCorporate ? { organization: organization.trim(), seats } : {}),
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(data.error || 'Kayıt sırasında bir hata oluştu.');
        setLoading(false);
        return;
      }

      setMailError(data.verification && !data.verification.sent ? data.verification.error || 'Doğrulama e-postası gönderilemedi.' : null);
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
          <SigmaLogo size="lg" className="mb-4" />
          <h1 className="text-2xl font-semibold text-fg tracking-tight">
            LrDocument
          </h1>
          <p className="text-sm text-neutral-400 mt-1">
            Kayıt talebi oluşturun
          </p>
        </div>

        {/* Card */}
        <div className="bg-surface/90 border border-line backdrop-blur-xl rounded-xl p-6 relative">
          {isSubmitted && !emailVerified ? (
            <div className="space-y-4">
              <h2 className="text-lg font-semibold text-fg">E-postanızı doğrulayın</h2>
              <EmailCodeStep email={email.trim().toLowerCase()} initialError={mailError} onVerified={() => setEmailVerified(true)} />
            </div>
          ) : isSubmitted ? (
            /* Successful Registration - Message as required */
            <div className="text-center py-4 space-y-5 animate-in zoom-in-95 duration-300">
              <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
                <CheckCircle2 className="w-8 h-8" />
              </div>

              <div className="space-y-2">
                <h2 className="text-xl font-bold text-white">E-postanız doğrulandı</h2>
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
                  <div className="grid grid-cols-3 gap-1 p-1 bg-app rounded-lg border border-line" role="group" aria-label="Hesap tipi">
                    {ACCOUNT_TYPES.map((t) => (
                      <button
                        key={t}
                        type="button"
                        aria-pressed={accountType === t}
                        onClick={() => setAccountType(t)}
                        className={`py-2 px-2 rounded-md text-xs font-semibold transition-colors inline-flex items-center justify-center gap-1.5 ${
                          accountType === t ? 'bg-surface-3 text-fg' : 'text-subtle hover:text-fg'
                        }`}
                      >
                        {t === 'STUDENT' && <GraduationCap className="w-4 h-4" />}
                        {t === 'CORPORATE' && <Building2 className="w-4 h-4" />}
                        {ACCOUNT_TYPE_LABEL[t]}
                      </button>
                    ))}
                  </div>
                  {isStudent && (
                    <p className="mt-2 text-[11px] text-subtle">
                      Öğrencilere tüm paketlerde %{settings.pricing.studentDiscountPercent} indirim. Ders takibi, devamsızlık ve not ortalaması hesaplama araçları dahildir.
                    </p>
                  )}
                  {isCorporate && (
                    <p className="mt-2 text-[11px] text-subtle">
                      Kurumsal hesabı yönetici inceleyip açar. Açıldıktan sonra ekibinizi siz eklersiniz; her kişiye özel bir kurumsal kod verilir.
                      Ücret, kişi başı normal fiyatın %{settings.pricing.corporatePercent}’i üzerinden eklediğiniz kişi sayısına göre güncellenir.
                    </p>
                  )}
                </div>

                {isCorporate && (
                  <div className="space-y-3 p-3 rounded-lg border border-line bg-app/50">
                    <div>
                      <label className="block text-[11px] font-semibold text-subtle mb-1.5">Kurum adı</label>
                      <input className={fieldCls} required minLength={2} maxLength={120} value={organization} onChange={(e) => setOrganization(e.target.value)} placeholder="Ör. Örnek Eğitim A.Ş." autoComplete="organization" />
                    </div>
                    <div>
                      <label className="block text-[11px] font-semibold text-subtle mb-1.5">
                        Tahmini kişi sayısı ({settings.pricing.corporateMinSeats}–{settings.pricing.corporateMaxSeats}, siz dahil)
                      </label>
                      <input
                        className={fieldCls}
                        type="number"
                        inputMode="numeric"
                        min={settings.pricing.corporateMinSeats}
                        max={settings.pricing.corporateMaxSeats}
                        required
                        value={seatsInput}
                        onChange={(e) => setSeatsInput(e.target.value)}
                        onBlur={() => setSeatsInput(String(seats))}
                      />
                    </div>
                    <dl className="grid grid-cols-[1fr_auto] gap-x-3 gap-y-1 text-xs">
                      <dt className="text-muted">Aylık</dt>
                      <dd className="text-body tabular-nums text-right">
                        {seats} × {formatTL(seatPrice('Aylık', 'CORPORATE', settings.pricing))} = {formatTL(seats * seatPrice('Aylık', 'CORPORATE', settings.pricing))} / ay
                      </dd>
                      <dt className="text-muted">Ömür boyu</dt>
                      <dd className="text-body tabular-nums text-right">
                        {seats} × {formatTL(seatPrice('Tek Seferlik', 'CORPORATE', settings.pricing))} = {formatTL(seats * seatPrice('Tek Seferlik', 'CORPORATE', settings.pricing))}
                      </dd>
                    </dl>
                  </div>
                )}

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
                      {planLabel('Aylık', accountType, settings.pricing, seats)}
                    </button>
                    <button
                      type="button"
                      onClick={() => setSubscriptionPlan('Tek Seferlik')}
                      className={`py-2 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${subscriptionPlan === 'Tek Seferlik'
                          ? 'bg-surface-4 text-fg border border-line-strong'
                          : 'text-neutral-400 hover:text-white'
                        }`}
                    >
                      {planLabel('Tek Seferlik', accountType, settings.pricing, seats)}
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
                      className="w-full bg-app border border-line rounded-lg pl-11 pr-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-line-strong focus:ring-1 focus:ring-brand/40 transition-colors"
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
                      className="w-full bg-app border border-line rounded-lg pl-11 pr-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-line-strong focus:ring-1 focus:ring-brand/40 transition-colors"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                    Şifre (En az {minPassword} karakter)
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
                      className="w-full bg-app border border-line rounded-lg pl-11 pr-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-line-strong focus:ring-1 focus:ring-brand/40 transition-colors"
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
                      className="w-full bg-app border border-line rounded-lg pl-11 pr-4 py-3 text-sm text-white placeholder-neutral-600 focus:outline-none focus:border-line-strong focus:ring-1 focus:ring-brand/40 transition-colors"
                    />
                  </div>
                </div>

                <p className="text-[11px] text-muted leading-relaxed">
                  Kayıt talebi göndererek{' '}
                  <Link href="/kullanim-sartlari" target="_blank" className="text-brand-light hover:text-fg underline underline-offset-2">
                    Kullanım Şartları
                  </Link>{' '}
                  ile{' '}
                  <Link href="/mesafeli-satis" target="_blank" className="text-brand-light hover:text-fg underline underline-offset-2">
                    Mesafeli Satış Sözleşmesi ve İade Koşulları
                  </Link>
                  ’nı kabul etmiş olursunuz; kişisel verilerinizin{' '}
                  <Link href="/kvkk" target="_blank" className="text-brand-light hover:text-fg underline underline-offset-2">
                    KVKK Aydınlatma Metni
                  </Link>{' '}
                  ve{' '}
                  <Link href="/gizlilik" target="_blank" className="text-brand-light hover:text-fg underline underline-offset-2">
                    Gizlilik Politikası
                  </Link>{' '}
                  kapsamında işleneceğini bildiğinizi onaylarsınız.
                </p>

                <button
                  type="submit"
                  disabled={loading}
                  className="w-full mt-2 bg-brand hover:bg-brand-hover text-white font-medium py-3 px-4 rounded-lg flex items-center justify-center gap-2 transition-all cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
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
                className="text-brand-light hover:text-fg font-medium transition-colors"
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
