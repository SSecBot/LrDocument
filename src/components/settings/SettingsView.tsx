'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
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
  Clock,
  Sparkles,
  Zap,
} from 'lucide-react';

export function SettingsView() {
  const { currentUser, addToast } = useAppStore();

  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrent, setShowCurrent] = useState(false);
  const [showNew, setShowNew] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const handlePasswordChange = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    setSuccessMessage(null);

    if (newPassword !== confirmPassword) {
      setErrorMessage('Yeni şifreler birbiriyle eşleşmiyor.');
      return;
    }

    if (newPassword.length < 6) {
      setErrorMessage('Yeni şifre en az 6 karakter olmalıdır.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/change-password', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ currentPassword, newPassword, confirmPassword }),
      });

      const data = await res.json();

      if (!res.ok) {
        setErrorMessage(data.error || 'Şifre güncellenirken bir hata oluştu.');
        setIsSubmitting(false);
        return;
      }

      setSuccessMessage('Şifreniz başarıyla güncellendi.');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
      addToast({
        type: 'success',
        title: 'Güvenlik Güncellendi',
        message: 'Hesap şifreniz başarıyla değiştirildi.',
      });
      setIsSubmitting(false);
    } catch {
      setErrorMessage('Bağlantı hatası oluştu. Lütfen tekrar deneyiniz.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#101116] text-[#f5f5f0] overflow-y-auto font-sans selection:bg-emerald-500/20 selection:text-emerald-300">
      {/* Header */}
      <div className="border-b border-neutral-800/80 bg-[#14161f]/80 backdrop-blur-md px-6 sm:px-8 py-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-emerald-700 via-teal-700 to-emerald-600 text-white flex items-center justify-center shadow-lg shadow-emerald-900/30 border border-emerald-500/30">
            <Lock className="w-5 h-5" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              Hesap & Güvenlik Ayarları
            </h1>
            <p className="text-xs text-neutral-400">
              Kişisel profilinizi, abonelik paketinizi ve hesap şifrenizi yönetin
            </p>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="p-6 sm:p-8 max-w-4xl space-y-8">
        {/* Profile & Subscription Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Card 1: User Profile */}
          <div className="p-6 rounded-3xl bg-[#151720] border border-neutral-800/80 shadow-xl space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-3">
                <div className="w-12 h-12 rounded-2xl bg-emerald-600/20 border border-emerald-500/30 text-emerald-400 font-bold text-base flex items-center justify-center">
                  {currentUser?.name?.charAt(0).toUpperCase() || 'U'}
                </div>
                <div>
                  <h3 className="text-base font-bold text-white">{currentUser?.name || 'Kullanıcı'}</h3>
                  <p className="text-xs text-neutral-400 font-mono">{currentUser?.email}</p>
                </div>
              </div>
              <span className="text-[10px] font-mono px-2.5 py-1 rounded-full bg-emerald-500/10 text-emerald-400 border border-emerald-500/30 font-bold">
                {currentUser?.role === 'ADMIN' ? 'YÖNETİCİ' : 'STANDART ÜYE'}
              </span>
            </div>

            <div className="pt-4 border-t border-neutral-800/80 space-y-2.5 text-xs text-neutral-300">
              <div className="flex items-center justify-between py-1">
                <span className="text-neutral-400 flex items-center gap-2">
                  <User className="w-3.5 h-3.5 text-emerald-400" />
                  Hesap Durumu
                </span>
                <span className="font-semibold text-emerald-400 flex items-center gap-1">
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  Aktif & Onaylı
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-neutral-400 flex items-center gap-2">
                  <Mail className="w-3.5 h-3.5 text-teal-400" />
                  Doğrulanmış E-Posta
                </span>
                <span className="font-mono text-neutral-200">{currentUser?.email}</span>
              </div>
            </div>
          </div>

          {/* Card 2: Subscription Plan */}
          <div className="p-6 rounded-3xl bg-gradient-to-br from-[#18231a] via-[#141b16] to-[#121614] border border-emerald-500/30 shadow-xl space-y-4 relative overflow-hidden">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-emerald-500/20 text-emerald-400 flex items-center justify-center">
                  <CreditCard className="w-4 h-4" />
                </div>
                <h3 className="text-base font-bold text-white">Abonelik Paketi</h3>
              </div>
              <span className="text-[11px] font-mono px-3 py-1 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-bold">
                {currentUser?.subscriptionPlan === 'Tek Seferlik' ? 'ÖMÜR BOYU' : 'AYLIK PLAN'}
              </span>
            </div>

            <div className="flex items-baseline gap-2">
              <span className="text-3xl font-extrabold text-white">
                {currentUser?.subscriptionPlan === 'Tek Seferlik' ? '1999 TL' : '100 TL'}
              </span>
              <span className="text-xs text-neutral-400">
                {currentUser?.subscriptionPlan === 'Tek Seferlik' ? '(Tek Seferlik Erişim)' : '/ aylık'}
              </span>
            </div>

            <p className="text-xs text-emerald-200/80 leading-relaxed pt-2 border-t border-emerald-500/20">
              {currentUser?.subscriptionPlan === 'Tek Seferlik'
                ? 'Ömür boyu sınırsız erişim paketiniz aktiftir. Tüm gelecek güncellemelere ücretsiz dahilsiniz.'
                : 'Aylık yenilenen standart içerik stüdyosu paketiniz aktiftir.'}
            </p>
          </div>
        </div>

        {/* Security & Password Change Box */}
        <div className="p-7 sm:p-8 rounded-3xl bg-[#151720] border border-neutral-800/80 shadow-2xl space-y-6">
          <div className="flex items-start justify-between border-b border-neutral-800/80 pb-5">
            <div>
              <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
                <Key className="w-5 h-5 text-emerald-400" />
                Şifre Güncelleme
              </h2>
              <p className="text-xs text-neutral-400 mt-1">
                Hesap güvenliğiniz için şifrenizi düzenli olarak güncelleyin. Şifreniz hiçbir yönetici veya üçüncü şahıs tarafından görülemez.
              </p>
            </div>
            <div className="hidden sm:flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-[11px] font-mono">
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Sıfır Erişim Şifreleme</span>
            </div>
          </div>

          {/* Success Banner */}
          {successMessage && (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-xs flex items-center gap-3">
              <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
              <span>{successMessage}</span>
            </div>
          )}

          {/* Error Banner */}
          {errorMessage && (
            <div className="p-4 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs flex items-center gap-3">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0" />
              <span>{errorMessage}</span>
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
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="Mevcut şifrenizi giriniz"
                  className="w-full bg-[#0d0e13] border border-neutral-800 rounded-xl pl-10 pr-11 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowCurrent(!showCurrent)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
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
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Yeni şifrenizi belirleyin"
                  className="w-full bg-[#0d0e13] border border-neutral-800 rounded-xl pl-10 pr-11 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowNew(!showNew)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
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
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  placeholder="Yeni şifrenizi tekrar giriniz"
                  className="w-full bg-[#0d0e13] border border-neutral-800 rounded-xl pl-10 pr-11 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors"
                />
                <button
                  type="button"
                  onClick={() => setShowConfirm(!showConfirm)}
                  className="absolute right-3.5 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300"
                >
                  {showConfirm ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="mt-4 px-6 py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-teal-600 hover:from-emerald-500 hover:to-teal-500 text-white font-bold text-xs shadow-lg shadow-emerald-700/20 transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
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
