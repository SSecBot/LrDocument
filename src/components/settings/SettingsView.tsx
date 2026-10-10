'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { formatPlanPrice } from '@/lib/pricing';
import { StudentProfileCard } from './StudentProfileCard';
import { AcademicSettingsCard } from './AcademicSettingsCard';
import { hasStudentAccess } from '@/lib/access';
import {
  ShieldCheck,
  Lock,
  Key,
  Eye,
  EyeOff,
  User,
  Mail,
  CreditCard,
  CheckCircle2,
  AlertCircle,
  Save,
  AtSign,
} from 'lucide-react';

export function SettingsView() {
  const { currentUser, checkAuth, addToast } = useAppStore();

  // Email update state
  const [newEmail, setNewEmail] = useState('');
  const [emailPassword, setEmailPassword] = useState('');
  const [isUpdatingEmail, setIsUpdatingEmail] = useState(false);
  const [emailError, setEmailError] = useState<string | null>(null);
  const [emailSuccess, setEmailSuccess] = useState<string | null>(null);

  // Password change state
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmittingPassword, setIsSubmittingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState<string | null>(null);
  const [passwordSuccess, setPasswordSuccess] = useState<string | null>(null);

  const handleEmailUpdate = async (e: React.FormEvent) => {
    e.preventDefault();
    setEmailError(null);
    setEmailSuccess(null);

    const trimmedEmail = newEmail.trim().toLowerCase();
    if (!trimmedEmail) {
      setEmailError('Lütfen yeni bir e-posta adresi giriniz.');
      return;
    }

    if (trimmedEmail === currentUser?.email?.toLowerCase()) {
      setEmailError('Girdiğiniz e-posta adresi mevcut adresinizle aynı.');
      return;
    }

    if (!emailPassword) {
      setEmailError('Güvenlik için mevcut şifrenizi giriniz.');
      return;
    }

    setIsUpdatingEmail(true);

    try {
      const res = await fetch('/api/auth/update-email', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ newEmail: trimmedEmail, currentPassword: emailPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setEmailError(data.error || 'E-posta adresi güncellenirken bir hata oluştu.');
        setIsUpdatingEmail(false);
        return;
      }

      setEmailSuccess('E-posta adresiniz başarıyla güncellendi.');
      setNewEmail('');
      setEmailPassword('');
      addToast({
        type: 'success',
        title: 'E-Posta Güncellendi',
        message: `Yeni e-posta adresiniz (${trimmedEmail}) kaydedildi.`,
      });

      // Refresh store state
      await checkAuth(true);
      setIsUpdatingEmail(false);
    } catch {
      setEmailError('Sunucu bağlantı hatası oluştu. Lütfen tekrar deneyiniz.');
      setIsUpdatingEmail(false);
    }
  };

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setPasswordError(null);
    setPasswordSuccess(null);

    if (newPassword !== confirmPassword) {
      setPasswordError('Yeni şifreler birbiriyle eşleşmiyor.');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    setIsSubmittingPassword(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setPasswordError(data.error || 'Şifre güncellenirken bir hata oluştu.');
        setIsSubmittingPassword(false);
        return;
      }

      setPasswordSuccess(data.message || 'Şifreniz başarıyla güncellendi.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      addToast({
        type: 'success',
        title: 'Güvenlik Güncellendi',
        message: 'Hesap şifreniz başarıyla değiştirildi.',
      });
      setIsSubmittingPassword(false);
    } catch {
      setPasswordError('Bağlantı hatası oluştu. Lütfen tekrar deneyiniz.');
      setIsSubmittingPassword(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-app text-fg overflow-y-auto font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Header */}
      <div className="border-b border-line/80 bg-surface/80 backdrop-blur-md px-4 sm:px-6 py-4 sm:py-4 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3 min-w-0">
          <div className="w-10 h-10 rounded-xl bg-emerald-700 text-white flex items-center justify-center border border-emerald-500/30">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Hesap & Güvenlik Ayarları
            </h1>
            <p className="text-xs text-neutral-400">
              Kişisel profilinizi, kayıtlı e-posta adresinizi ve hesap şifrenizi yönetin
            </p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="p-4 sm:p-6 max-w-4xl w-full space-y-5 sm:space-y-6">
        {/* Profile & Subscription Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Card 1: User Profile */}
          <div className="p-5 sm:p-5 rounded-xl bg-surface border border-line/80 space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-12 h-12 shrink-0 rounded-xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-bold text-base flex items-center justify-center">
                  {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div className="min-w-0">
                  <h3 className="text-base font-bold text-white truncate">{currentUser?.name || 'Kullanıcı'}</h3>
                  <p className="text-xs text-neutral-400 font-mono truncate">{currentUser?.email}</p>
                </div>
              </div>
              <span className="shrink-0 text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                {currentUser?.role === 'ADMIN' ? 'YÖNETİCİ' : 'STANDART ÜYE'}
              </span>
            </div>

            <div className="pt-4 border-t border-line/80 space-y-2.5 text-xs text-neutral-300">
              <div className="flex items-center justify-between gap-3 py-1">
                <span className="text-neutral-400 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  Hesap Durumu
                </span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Aktif & Onaylı
                </span>
              </div>
              <div className="flex items-center justify-between gap-3 py-1">
                <span className="text-neutral-400 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-teal-400" />
                  Doğrulanmış E-Posta
                </span>
                <span className="font-mono text-neutral-200 truncate min-w-0">{currentUser?.email}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Subscription Plan */}
          <div className="p-5 sm:p-5 rounded-xl bg-surface-2 border border-emerald-500/30 space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between gap-3 mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Abonelik Paketi</h3>
              </div>
              <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                {currentUser?.subscriptionPlan === 'Tek Seferlik' ? 'ÖMÜR BOYU' : 'AYLIK PLAN'}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-bold text-white">
                {formatPlanPrice(currentUser?.subscriptionPlan === 'Tek Seferlik' ? 'Tek Seferlik' : 'Aylık', currentUser?.accountType ?? 'STANDARD')}
              </span>
              <span className="text-xs text-neutral-400">
                {currentUser?.subscriptionPlan === 'Tek Seferlik' ? '(Tek Seferlik Erişim)' : '/ aylık'}
                {currentUser?.accountType === 'STUDENT' && ' • öğrenci indirimi (%50)'}
              </span>
            </div>

            <p className="text-xs text-emerald-200/80 leading-relaxed pt-2 border-t border-emerald-500/20">
              {currentUser?.subscriptionPlan === 'Tek Seferlik'
                ? 'Ömür boyu sınırsız erişim paketiniz aktiftir. Tüm gelecek güncellemelere ücretsiz dahilsiniz.'
                : 'Aylık yenilenen standart içerik stüdyosu paketiniz aktiftir.'}
            </p>
          </div>
        </div>

        {hasStudentAccess(currentUser) && <StudentProfileCard isAdmin={currentUser?.role === 'ADMIN'} />}
        {hasStudentAccess(currentUser) && <AcademicSettingsCard />}

        {/* Section 1: Email Address Self-Service Modification */}
        <div className="p-5 sm:p-6 rounded-xl bg-surface border border-line/80 space-y-5">
          <div className="flex items-start justify-between border-b border-line/80 pb-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
                <AtSign className="w-5 h-5 text-emerald-400" />
                E-Posta Adresi Güncelleme
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Giriş yaptığınız ve bildirimleri aldığınız e-posta adresinizi güvenle değiştirebilirsiniz.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
              <Mail className="w-3.5 h-3.5" />
              <span>Benzersizlik Korumalı</span>
            </div>
          </div>

          {/* Email Success Banner */}
          {emailSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{emailSuccess}</span>
            </div>
          )}

          {/* Email Error Banner */}
          {emailError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{emailError}</span>
            </div>
          )}

          <form onSubmit={handleEmailUpdate} className="space-y-4 max-w-lg">
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                Mevcut E-Posta Adresiniz
              </label>
              <div className="p-3 bg-app border border-line rounded-lg text-xs text-neutral-400 font-mono flex items-center gap-2">
                <Mail className="w-4 h-4 shrink-0 text-emerald-400/70" />
                <span className="truncate">{currentUser?.email || 'Bilinmiyor'}</span>
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                Yeni E-Posta Adresi *
              </label>
              <div className="relative">
                <AtSign className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={newEmail}
                  onChange={(e) => setNewEmail(e.target.value)}
                  placeholder="yeni.eposta@ornek.com"
                  className="w-full bg-app border border-line rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors min-h-[44px]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                Mevcut Şifreniz (Doğrulama) *
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type="password"
                  required
                  autoComplete="current-password"
                  value={emailPassword}
                  onChange={(e) => setEmailPassword(e.target.value)}
                  placeholder="Değişikliği onaylamak için şifreniz"
                  className="w-full bg-app border border-line rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors min-h-[44px]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={isUpdatingEmail}
              className="mt-2 px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
            >
              {isUpdatingEmail ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <Save className="w-4 h-4" />
                  <span>E-Posta Adresini Güncelle</span>
                </>
              )}
            </button>
          </form>
        </div>

        {/* Section 2: Security & Password Change Box */}
        <div className="p-5 sm:p-6 rounded-xl bg-surface border border-line/80 space-y-5">
          <div className="flex items-start justify-between border-b border-line/80 pb-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
                <Key className="w-5 h-5 text-emerald-400" />
                Şifre Güncelleme
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Hesap güvenliğiniz için şifrenizi düzenli olarak güncelleyin. Şifreniz sıfır erişim mimarisi ile hashlenir.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sıfır Erişim Şifreleme</span>
            </div>
          </div>

          {/* Password Success Banner */}
          {passwordSuccess && (
            <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{passwordSuccess}</span>
            </div>
          )}

          {/* Password Error Banner */}
          {passwordError && (
            <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{passwordError}</span>
            </div>
          )}

          <form onSubmit={handlePasswordChange} className="space-y-5 max-w-lg">
            {/* Current Password */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                Mevcut Şifreniz
              </label>
              <div className="relative">
                <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type={showCurrent ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Mevcut şifrenizi giriniz"
                  className="w-full bg-app border border-line rounded-lg pl-10 pr-11 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  aria-label="Şifreyi göster veya gizle"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 text-neutral-500 hover:text-neutral-300"
                >
                  {showCurrent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* New Password */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                Yeni Şifre (En az 6 karakter)
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type={showNew ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Yeni şifrenizi belirleyin"
                  className="w-full bg-app border border-line rounded-lg pl-10 pr-11 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  aria-label="Şifreyi göster veya gizle"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 text-neutral-500 hover:text-neutral-300"
                >
                  {showNew ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            {/* Confirm New Password */}
            <div>
              <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2">
                Yeni Şifre Tekrarı
              </label>
              <div className="relative">
                <Key className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                <input
                  type={showConfirm ? 'text' : 'password'}
                  required
                  autoComplete="new-password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Yeni şifrenizi tekrar giriniz"
                  className="w-full bg-app border border-line rounded-lg pl-10 pr-11 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors min-h-[44px]"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  aria-label="Şifreyi göster veya gizle"
                  className="absolute right-1.5 top-1/2 -translate-y-1/2 p-2 text-neutral-500 hover:text-neutral-300"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmittingPassword}
              className="mt-4 px-6 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2 min-h-[44px]"
            >
              {isSubmittingPassword ? (
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <>
                  <ShieldCheck className="w-4 h-4" />
                  <span>Şifremi Değiştir</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
