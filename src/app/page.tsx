'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { SigmaLogo } from '@/components/ui/SigmaLogo';
import {
  FileText,
  Video,
  Kanban,
  ImageIcon,
  Calendar,
  Wallet,
  CheckCircle2,
  ArrowRight,
  Sparkles,
  Lock,
  Mail,
  User,
  X,
  Check,
  ChevronRight,
} from 'lucide-react';
import { SubscriptionPlan } from '@/types';

export default function LandingPage() {
  const { isAuthenticated } = useAppStore();

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [selectedPlan, setSelectedPlan] = useState<SubscriptionPlan>('Tek Seferlik');
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const handleOpenModal = (plan: SubscriptionPlan = 'Tek Seferlik') => {
    setSelectedPlan(plan);
    setErrorMessage(null);
    setIsSuccess(false);
    setIsModalOpen(true);
  };

  const handleRegisterSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (password.length < 6) {
      setErrorMessage('Şifreniz en az 6 karakter olmalıdır.');
      return;
    }

    setIsSubmitting(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: name.trim(),
          email: email.toLowerCase().trim(),
          password,
          subscriptionPlan: selectedPlan,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        setErrorMessage(data.error || 'Kayıt sırasında bir hata oluştu.');
        setIsSubmitting(false);
        return;
      }

      setIsSuccess(true);
      setIsSubmitting(false);
    } catch {
      setErrorMessage('Bağlantı hatası oluştu. Lütfen tekrar deneyiniz.');
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-dvh bg-app text-fg font-sans selection:bg-emerald-500/30 selection:text-emerald-200 relative overflow-x-hidden">
      {/* Background Decorative Lighting */}

      {/* Navigation Bar */}
      <header className="sticky top-0 z-40 w-full border-b border-line/80 bg-app/80 backdrop-blur-xl">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-6 h-16 sm:h-20 flex items-center justify-between gap-3">
          <Link href="/" className="flex items-center gap-2.5 sm:gap-3 min-w-0">
            <SigmaLogo size="sm" />
            <div>
              <span className="font-bold text-lg tracking-tight text-white flex items-center gap-2">
                LrDocument <span className="hidden min-[400px]:inline text-[10px] px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-400 border border-emerald-500/30 font-mono">PRO</span>
              </span>
              <p className="hidden sm:block text-[11px] text-brand-light font-medium">Matematik & İçerik Üretim Alanı</p>
            </div>
          </Link>

          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-neutral-300">
            <a href="#moduller" className="hover:text-white transition-colors">Modüller</a>
            <a href="#ucretlendirme" className="hover:text-white transition-colors">Ücretlendirme</a>
            <a href="#hakkinda" className="hover:text-white transition-colors">Neden LrDocument?</a>
          </nav>

          <div className="flex items-center gap-2 sm:gap-3 shrink-0">
            {isAuthenticated ? (
              <Link
                href="/dashboard"
                className="px-4 sm:px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all flex items-center gap-2 whitespace-nowrap"
              >
                <span className="hidden min-[400px]:inline">Çalışma Alanına Git</span>
                <span className="min-[400px]:hidden">Panele Git</span>
                <ArrowRight className="w-4 h-4" />
              </Link>
            ) : (
              <>
                <Link
                  href="/login"
                  className="px-3 sm:px-4 py-2.5 rounded-lg text-xs font-semibold text-neutral-300 hover:text-white bg-surface-2/80 hover:bg-surface-3 border border-line transition-all whitespace-nowrap"
                >
                  Giriş Yap
                </Link>
                <button
                  onClick={() => handleOpenModal('Tek Seferlik')}
                  className="px-3 sm:px-5 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-all cursor-pointer flex items-center gap-1.5 whitespace-nowrap"
                >
                  <Sparkles className="w-3.5 h-3.5 shrink-0" />
                  <span className="hidden sm:inline">Kayıt Talebi Oluştur</span>
                  <span className="sm:hidden">Kayıt Ol</span>
                </button>
              </>
            )}
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="relative pt-12 sm:pt-16 pb-14 px-4 sm:px-6 lg:px-6 max-w-7xl mx-auto text-center space-y-6">
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 text-xs font-semibold">
          <SigmaLogo size="xs" withContainer={false} />
          <span>Matematik & İçerik Üretim Alanı</span>
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" />
        </div>

        <h1 className="text-3xl sm:text-5xl font-bold tracking-tight text-white max-w-3xl mx-auto leading-tight">
          Eğitimciler ve İçerik Üreticileri İçin{' '}
          <span className="bg-emerald-400 bg-clip-text text-transparent">
            Merkezi Stüdyo & Çalışma Alanı
          </span>
        </h1>

        <p className="text-base sm:text-lg text-neutral-400 max-w-3xl mx-auto font-normal leading-relaxed">
          KaTeX formüllü notlar, video senaryoları, görsel storyboard & çizim galerisi, bağımsız Kanban iş akışları, takvim ve gelir-gider takibi tek bir güvenli çatı altında.
        </p>

        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <button
            onClick={() => handleOpenModal('Tek Seferlik')}
            className="w-full sm:w-auto px-6 py-4 rounded-xl bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-sm transition-all transform hover:-translate-y-0.5 cursor-pointer flex items-center justify-center gap-2"
          >
            <span>Kayıt Talebi Oluştur (1999 TL Ömür Boyu)</span>
            <ArrowRight className="w-4 h-4" />
          </button>

          <a
            href="#ucretlendirme"
            className="w-full sm:w-auto px-6 py-4 rounded-xl bg-surface-2/90 hover:bg-surface-3 text-white font-semibold text-sm border border-line transition-all flex items-center justify-center gap-2"
          >
            <span>Paketleri İncele</span>
            <ChevronRight className="w-4 h-4 text-neutral-400" />
          </a>
        </div>

        {/* Feature Highlights */}
        <div className="pt-6 flex flex-wrap items-center justify-center gap-3 sm:gap-6 text-xs text-neutral-400 font-medium">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>KaTeX & Canlı LaTeX Desteği</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Süre Tahminli Senaryo Editörü</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>Evrensel Kanban Panosu</span>
          </div>
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
            <span>İzole Çok Kiracılı Veritabanı</span>
          </div>
        </div>
      </section>

      {/* 6 Core Modules Showcase Section */}
      <section id="moduller" className="py-14 px-4 sm:px-6 lg:px-6 max-w-7xl mx-auto border-t border-line/80">
        <div className="text-center space-y-4 mb-16">
          <h2 className="text-xs font-bold uppercase tracking-widest text-emerald-400">
            Kapsamlı İçerik Mimarisi
          </h2>
          <h3 className="text-2xl sm:text-3xl font-semibold text-white">
            Üretim Sürecinizi Uçtan Uca Yöneten 6 Güçlü Modül
          </h3>
          <p className="text-sm text-neutral-400 max-w-2xl mx-auto">
            Her modül birbiriyle tam entegre çalışır; notlarınızı senaryolara, senaryolarınızı görev ve takvim kayıtlarına anında bağlayabilirsiniz.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {/* Card 1 */}
          <div className="p-5 rounded-xl bg-surface border border-line hover:border-emerald-500/40 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <FileText className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Notlar & Matematik / LaTeX</h4>
              <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                Ders içerikleri, soru çözümleri ve formüller için tam Markdown + KaTeX desteği. Canlı matematik renderlama ve tek tıkla kopyalama.
              </p>
            </div>
            <div className="pt-4 border-t border-line/80 flex items-center justify-between text-[11px] text-emerald-400 font-mono">
              <span>Markdown • KaTeX Live</span>
              <span>Canlı Önizleme</span>
            </div>
          </div>

          {/* Card 2 */}
          <div className="p-5 rounded-xl bg-surface border border-line hover:border-emerald-500/40 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-sky-500/10 text-sky-400 border border-sky-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Video className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Video Senaryoları & Süre Tahmini</h4>
              <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                YouTube ve sosyal medya videoları için hook, ana gövde ve CTA bölümleri. Kelime sayısına göre dinamik süre hesaplama ve teleprompter modu.
              </p>
            </div>
            <div className="pt-4 border-t border-line/80 flex items-center justify-between text-[11px] text-sky-400 font-mono">
              <span>WPM Sayacı • Prompter</span>
              <span>Bölümleme</span>
            </div>
          </div>

          {/* Card 3 */}
          <div className="p-5 rounded-xl bg-surface border border-line hover:border-emerald-500/40 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-purple-500/10 text-purple-400 border border-purple-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Kanban className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Evrensel Kanban Panosu</h4>
              <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                Tüm genel projeleriniz için 5 aşamalı görsel iş akışı: Fikir, Taslak, Üretimde, İncelemede ve Tamamlandı. Sürükle-bırak kolaylığı.
              </p>
            </div>
            <div className="pt-4 border-t border-line/80 flex items-center justify-between text-[11px] text-purple-400 font-mono">
              <span>5 Kolon • Bağımsız Kartlar</span>
              <span>Görsel Akış</span>
            </div>
          </div>

          {/* Card 4 */}
          <div className="p-5 rounded-xl bg-surface border border-line hover:border-emerald-500/40 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-amber-500/10 text-amber-400 border border-amber-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <ImageIcon className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Medya Deposu & Çizim Galerisi</h4>
              <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                El çizimleri, geometrik şemalar, YouTube referans videoları ve storyboard varlıkları. Görselleri doğrudan not ve senaryolarla eşleştirin.
              </p>
            </div>
            <div className="pt-4 border-t border-line/80 flex items-center justify-between text-[11px] text-amber-400 font-mono">
              <span>Görsel & Video Galeri</span>
              <span>Storyboard</span>
            </div>
          </div>

          {/* Card 5 */}
          <div className="p-5 rounded-xl bg-surface border border-line hover:border-emerald-500/40 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-teal-500/10 text-teal-400 border border-teal-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Calendar className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Takvim & Görev Yönetimi</h4>
              <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                İçerik yayın takvimi, teslim tarihleri ve otomatik öncelik yükseltmeli görev takibi. Tarihi yaklaşan işler için akıllı uyarılar.
              </p>
            </div>
            <div className="pt-4 border-t border-line/80 flex items-center justify-between text-[11px] text-teal-400 font-mono">
              <span>Sürükle-Bırak • Akıllı Uyarı</span>
              <span>Yayın Takvimi</span>
            </div>
          </div>

          {/* Card 6 */}
          <div className="p-5 rounded-xl bg-surface border border-line hover:border-emerald-500/40 transition-all group flex flex-col justify-between">
            <div>
              <div className="w-12 h-12 rounded-xl bg-rose-500/10 text-rose-400 border border-rose-500/20 flex items-center justify-center mb-6 group-hover:scale-110 transition-transform">
                <Wallet className="w-6 h-6" />
              </div>
              <h4 className="text-lg font-bold text-white mb-2">Gelir ve Gider / Finans</h4>
              <p className="text-xs text-neutral-400 leading-relaxed mb-4">
                Sponsorluk gelirleri, eğitim satışları ve stüdyo giderleri. Döviz kuru entegrasyonu, nakit akışı grafikleri ve bütçe planlaması.
              </p>
            </div>
            <div className="pt-4 border-t border-line/80 flex items-center justify-between text-[11px] text-rose-400 font-mono">
              <span>Nakit Akışı • Kur Çevirici</span>
              <span>Finansal Rapor</span>
            </div>
          </div>
        </div>
      </section>

      {/* Pricing Section */}
      <section id="ucretlendirme" className="py-14 px-4 sm:px-6 lg:px-6 max-w-5xl mx-auto border-t border-line/80">
        <div className="text-center space-y-4 mb-16">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-emerald-950/60 border border-emerald-800/50 text-emerald-300 text-xs font-semibold">
            <Sparkles className="w-3.5 h-3.5 text-emerald-400" />
            <span>Şeffaf & Net Ücretlendirme</span>
          </div>
          <h3 className="text-2xl sm:text-3xl font-semibold text-white">
            İhtiyacınıza Uygun Planı Seçin
          </h3>
          <p className="text-sm text-neutral-400 max-w-xl mx-auto">
            Hemen kayıt talebinde bulunun, ekibimiz sizinle iletişime geçerek hesabınızı onaylasın.
          </p>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Plan 1: Aylık */}
          <div className="p-6 rounded-xl bg-surface border border-line hover:border-line-strong transition-all flex flex-col justify-between relative">
            <div className="space-y-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-neutral-400">Esnek Başlangıç</span>
                <h4 className="text-2xl font-bold text-white mt-1">Aylık Plan</h4>
                <p className="text-xs text-neutral-400 mt-2">
                  Dilediğiniz zaman iptal edebileceğiniz, tüm modülleri içeren aylık abonelik modeli.
                </p>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-bold text-white">100 TL</span>
                <span className="text-xs text-neutral-400 font-medium">/ ay</span>
              </div>

              <ul className="space-y-3 text-xs text-neutral-300">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Tüm 6 Temel Modüle Tam Erişim</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>KaTeX & Markdown Formül Desteği</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>İzole Çok Kiracılı Veritabanı</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Öncelikli E-Posta İletişimi</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleOpenModal('Aylık')}
              className="mt-6 w-full py-4 px-4 rounded-lg bg-surface-3 hover:bg-neutral-700 text-white font-bold text-xs transition-all cursor-pointer flex items-center justify-center gap-2"
            >
              <span>Aylık Plan Talebi Oluştur (100 TL)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          {/* Plan 2: Tek Seferlik Ömür Boyu */}
          <div className="p-6 rounded-xl bg-surface-2 border-2 border-emerald-500/80 transition-all flex flex-col justify-between relative ring-1 ring-emerald-500/40">
            <div className="absolute -top-3.5 right-6 bg-emerald-500 text-neutral-950 font-black text-[10px] uppercase tracking-wider px-3 py-1 rounded-full shadow-xl">
              En Popüler & Avantajlı
            </div>

            <div className="space-y-5">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-emerald-400">Tek Seferlik Ödeme</span>
                <h4 className="text-2xl font-bold text-white mt-1">Ömür Boyu Erişim</h4>
                <p className="text-xs text-neutral-300 mt-2">
                  Bir kez ödeyin, LrDocument stüdyosuna ve gelecek tüm güncellemelere sonsuza dek sahip olun.
                </p>
              </div>

              <div className="flex items-baseline gap-2">
                <span className="text-3xl sm:text-4xl font-bold text-white">1999 TL</span>
                <span className="text-xs text-emerald-300 font-semibold bg-emerald-950/80 px-2 py-0.5 rounded-full border border-emerald-800/60">
                  Tek Seferlik
                </span>
              </div>

              <ul className="space-y-3 text-xs text-neutral-200">
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span className="font-semibold text-white">Sonsuz ve Sınırsız Kullanım Hakkı</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Aylık Yenileme veya Gizli Ücret Yok</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Gelecek Tüm Güncellemeler Dahil</span>
                </li>
                <li className="flex items-center gap-2.5">
                  <Check className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Öncelikli Destek & Veri İzolasyonu</span>
                </li>
              </ul>
            </div>

            <button
              onClick={() => handleOpenModal('Tek Seferlik')}
              className="mt-6 w-full py-4 px-4 rounded-lg bg-emerald-500 hover:bg-emerald-400 text-neutral-950 font-bold text-xs transition-all cursor-pointer transform hover:-translate-y-0.5 flex items-center justify-center gap-2"
            >
              <span>Ömür Boyu Erişim Talebi Oluştur (1999 TL)</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>
        </div>
      </section>

      {/* Registration Request Modal */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-black/80 backdrop-blur-md animate-fadeIn">
          <div className="bg-surface border border-line w-full max-w-md max-h-[85vh] overflow-y-auto rounded-xl p-5 sm:p-5 relative">
            <button
              onClick={() => setIsModalOpen(false)}
              className="absolute top-5 right-5 p-2 rounded-lg text-neutral-400 hover:text-white hover:bg-surface-3 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            {isSuccess ? (
              <div className="text-center py-6 space-y-5 animate-fadeIn">
                <div className="w-16 h-16 rounded-full bg-emerald-500/20 border border-emerald-500/40 text-emerald-400 mx-auto flex items-center justify-center">
                  <CheckCircle2 className="w-8 h-8" />
                </div>
                <div className="space-y-2">
                  <h3 className="text-xl font-bold text-white">Başvurunuz Alındı</h3>
                  <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-200 text-sm font-semibold">
                    Talebiniz oluşturuldu. Mail üzerinden iletişime geçilecektir.
                  </div>
                </div>
                <p className="text-xs text-neutral-400 leading-relaxed">
                  Hesap talebiniz yönetici onayına sunuldu. Onaylandığında <span className="font-mono text-neutral-200">{email}</span> adresinize bilgilendirme iletilecektir.
                </p>
                <button
                  onClick={() => setIsModalOpen(false)}
                  className="w-full py-3 rounded-lg bg-surface-3 hover:bg-neutral-700 text-white font-semibold text-xs transition-colors cursor-pointer"
                >
                  Tamam
                </button>
              </div>
            ) : (
              <>
                <div className="mb-6">
                  <div className="flex items-center gap-2 mb-3">
                    <SigmaLogo size="xs" />
                    <span className="text-xs font-bold text-brand-light">LrDocument Studio</span>
                  </div>
                  <h3 className="text-xl font-bold text-white">Kayıt Talebi Oluştur</h3>
                  <p className="text-xs text-neutral-400 mt-1">
                    Bilgilerinizi doldurarak LrDocument stüdyo erişim talebinde bulunun.
                  </p>

                  {/* Plan Switcher Pills */}
                  <div className="mt-4 grid grid-cols-2 gap-2 p-1 bg-app rounded-xl border border-line">
                    <button
                      type="button"
                      onClick={() => setSelectedPlan('Aylık')}
                      className={`py-2.5 px-3 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                        selectedPlan === 'Aylık'
                          ? 'bg-surface-3 text-white border border-line-strong'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Aylık (100 TL)
                    </button>
                    <button
                      type="button"
                      onClick={() => setSelectedPlan('Tek Seferlik')}
                      className={`py-2.5 px-3 rounded-lg text-xs font-bold transition-all cursor-pointer ${
                        selectedPlan === 'Tek Seferlik'
                          ? 'bg-emerald-600 text-white border border-emerald-500/40'
                          : 'text-neutral-400 hover:text-white'
                      }`}
                    >
                      Ömür Boyu (1999 TL)
                    </button>
                  </div>
                </div>

                {errorMessage && (
                  <div className="mb-4 p-3 rounded-lg bg-rose-500/10 border border-rose-500/30 text-rose-300 text-xs">
                    {errorMessage}
                  </div>
                )}

                <form onSubmit={handleRegisterSubmit} className="space-y-4">
                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Ad Soyad
                    </label>
                    <div className="relative">
                      <User className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="text"
                        required
                        value={name}
                        onChange={(e) => setName(e.target.value)}
                        placeholder="Örn: Ali Yılmaz"
                        className="w-full bg-app border border-line rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                      E-Posta Adresi
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="email"
                        autoComplete="email"
                        required
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="ornek@alanadi.com"
                        className="w-full bg-app border border-line rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-1.5">
                      Şifre (En az 6 karakter)
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 absolute left-3.5 top-1/2 -translate-y-1/2 text-neutral-500" />
                      <input
                        type="password"
                        autoComplete="new-password"
                        required
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full bg-app border border-line rounded-lg pl-10 pr-4 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500"
                      />
                    </div>
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full mt-2 py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-all cursor-pointer disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {isSubmitting ? (
                      <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <>
                        <span>Talebi İlet</span>
                        <ArrowRight className="w-4 h-4" />
                      </>
                    )}
                  </button>
                </form>
              </>
            )}
          </div>
        </div>
      )}

      {/* Signature Custom Footer */}
      <footer id="hakkinda" className="border-t border-line/80 bg-app py-12 px-4 sm:px-6 lg:px-6">
        <div className="max-w-7xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-neutral-500">
          <div className="flex items-center gap-3">
            <SigmaLogo size="xs" />
            <span className="font-semibold text-neutral-300">LrDocument Studio</span>
            <span>• Matematik & İçerik Üretim Alanı</span>
          </div>

          <div className="text-center sm:text-right">
            <p className="text-neutral-400 font-medium">
              Made by{' '}
              <a
                href="https://digivideas.com"
                target="_blank"
                rel="noopener noreferrer"
                className="text-emerald-400 hover:text-emerald-300 font-semibold underline underline-offset-4 transition-colors"
              >
                Digivideas
              </a>{' '}
              and lrion&apos;s
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}
