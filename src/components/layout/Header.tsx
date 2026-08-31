'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import {
  Menu,
  Search,
  Plus,
  Bell,
  FileText,
  Video,
  CheckSquare,
  Calendar,
  Image as ImageIcon,
  Wallet,
  Kanban,
  ChevronDown,
  Coins,
  RefreshCw,
  User as UserIcon,
  Settings,
  LogOut,
  ShieldCheck,
  ShieldAlert,
  ArrowUpRight,
  TrendingUp,
} from 'lucide-react';

export const Header: React.FC = () => {
  const {
    activeTab,
    setIsCommandPaletteOpen,
    unreadNotificationCount,
    isNotificationPanelOpen,
    setIsNotificationPanelOpen,
    setIsMobileSidebarOpen,
    addNote,
    addScript,
    addTask,
    addKanbanCard,
    setActiveTab,
    setActiveNoteId,
    setActiveScriptId,
    exchangeRates,
    fetchExchangeRates,
    currentUser,
    logout,
    addToast,
  } = useAppStore();

  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);
  const [isCurrencyMenuOpen, setIsCurrencyMenuOpen] = useState(false);
  const [isProfileMenuOpen, setIsProfileMenuOpen] = useState(false);
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);

  useEffect(() => {
    fetchExchangeRates().catch(() => {});
  }, [fetchExchangeRates]);

  const getModuleDetails = () => {
    switch (activeTab) {
      case 'dashboard':
        return { title: 'Genel Bakış & Kontrol Paneli', desc: 'İstatistikler, geciken bildirimler ve üretim akışı' };
      case 'notes':
        return { title: 'Notlar', desc: 'Markdown notları, LaTeX formülleri ve KaTeX canlı önizleme' };
      case 'scripts':
        return { title: 'Video Senaryoları', desc: 'Süre tahminli senaryolar ve içerik üretim metinleri' };
      case 'kanban':
        return { title: 'Evrensel Kanban Panosu', desc: 'Tüm projeler için 5 aşamalı görsel iş akışı' };
      case 'media':
        return { title: 'Medya Deposu & Çizim Galerisi', desc: 'Şemalar, el çizimleri, YouTube video linkleri ve storyboard varlıkları' };
      case 'tasks':
        return { title: 'Görevler & Yapılacaklar', desc: 'Otomatik yüksek öncelik yükseltmeli görev takibi ve takvim senkronizasyonu' };
      case 'calendar':
        return { title: 'Takvim & Planlama', desc: 'Akıcı zaman çizelgesi, .ICS içe/dışa aktarımı ve günlük detaylar' };
      case 'finance':
        return { title: 'Gelir ve Gider', desc: 'İçerik gelirleri, düzenli abonelikler, kur marjı ve bütçe planlaması' };
      case 'settings':
        return { title: 'Hesap & Güvenlik Ayarları', desc: 'Kişisel profil, şifre değişikliği ve abonelik paketi yönetimi' };
      case 'admin':
        return { title: 'Yönetici Kontrol Paneli', desc: 'Kullanıcı onayları, abonelik paketleri ve Excel dışa aktarım' };
      default:
        return { title: 'LrDocument', desc: '' };
    }
  };

  const details = getModuleDetails();

  const handleRefreshRates = async () => {
    setIsRefreshingRates(true);
    await fetchExchangeRates();
    setIsRefreshingRates(false);
    addToast({
      type: 'success',
      title: 'Döviz Kurları Güncellendi',
      message: `USD: ${(exchangeRates.USD + exchangeRates.markupTRY).toFixed(2)} ₺ | EUR: ${(exchangeRates.EUR + exchangeRates.markupTRY).toFixed(2)} ₺`,
    });
  };

  return (
    <header className="h-16 border-b border-[#242424] bg-[#161616] px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 shrink-0 select-none relative z-30">
      {/* Left: Hamburger menu + Title / Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Toggle (md:hidden) */}
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="md:hidden min-w-[44px] min-h-[44px] p-2.5 rounded-xl bg-[#202020] hover:bg-[#282828] active:bg-[#303030] border border-[#2e2e2e] text-[#d1d5db] hover:text-white flex items-center justify-center transition-colors shrink-0"
          aria-label="Navigasyon Menüsünü Aç"
          title="Menü"
        >
          <Menu className="w-5 h-5 text-emerald-400" />
        </button>

        <div className="min-w-0">
          <h2 className="text-xs sm:text-sm font-bold text-white tracking-tight truncate">
            {details.title}
          </h2>
          <p className="text-[11px] text-[#71717a] hidden lg:block truncate">{details.desc}</p>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1.5 sm:gap-2.5 shrink-0">
        {/* Live Currency Rates & Multi-Currency Indicator Popover */}
        <div className="relative">
          <button
            onClick={() => {
              setIsCurrencyMenuOpen(!isCurrencyMenuOpen);
              setIsNewMenuOpen(false);
              setIsProfileMenuOpen(false);
              setIsNotificationPanelOpen(false);
            }}
            className={`min-h-[44px] px-2.5 sm:px-3 py-1.5 rounded-xl border text-xs font-semibold flex items-center gap-1.5 transition-all cursor-pointer ${
              isCurrencyMenuOpen
                ? 'bg-[#1e2e1e] border-emerald-500/80 text-emerald-300 shadow-md'
                : 'bg-[#202020] hover:bg-[#282828] border-[#2e2e2e] text-[#d1d5db] hover:text-white'
            }`}
            title="Canlı Döviz Kurları & Kur Marjı"
          >
            <Coins className="w-4 h-4 text-amber-400 shrink-0" />
            <div className="hidden sm:flex items-center gap-1.5 text-[11px] font-mono">
              <span className="text-sky-400 font-bold">${(exchangeRates.USD + exchangeRates.markupTRY).toFixed(2)}₺</span>
              <span className="text-zinc-600">|</span>
              <span className="text-purple-400 font-bold">€{(exchangeRates.EUR + exchangeRates.markupTRY).toFixed(2)}₺</span>
            </div>
            <span className="sm:hidden text-[11px] font-mono text-emerald-400 font-bold">Kurlar</span>
            <ChevronDown className="w-3 h-3 text-[#71717a] hidden sm:block" />
          </button>

          {isCurrencyMenuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIsCurrencyMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-[#1c1c1c] border border-[#2e2e2e] rounded-2xl shadow-2xl p-3.5 z-40 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between border-b border-[#282828] pb-2">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">Canlı Kur & Marj Bilgisi</span>
                  </div>
                  <button
                    onClick={handleRefreshRates}
                    disabled={isRefreshingRates}
                    className="p-1.5 rounded-lg bg-[#252525] hover:bg-[#303030] text-emerald-400 text-[10px] flex items-center gap-1 font-medium transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshingRates ? 'animate-spin' : ''}`} />
                    <span>Yenile</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-xl bg-[#141414] border border-[#2c2c2c] space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-sky-400 font-bold">
                      <span>🇺🇸 USD / TRY</span>
                      <span className="font-mono">{exchangeRates.USD.toFixed(2)} ₺</span>
                    </div>
                    <div className="text-xs font-mono font-extrabold text-white">
                      → {(exchangeRates.USD + exchangeRates.markupTRY).toFixed(2)} ₺
                    </div>
                    <span className="text-[9px] text-[#71717a] block">+{exchangeRates.markupTRY.toFixed(2)} TL Marjlı</span>
                  </div>

                  <div className="p-2.5 rounded-xl bg-[#141414] border border-[#2c2c2c] space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold">
                      <span>🇪🇺 EUR / TRY</span>
                      <span className="font-mono">{exchangeRates.EUR.toFixed(2)} ₺</span>
                    </div>
                    <div className="text-xs font-mono font-extrabold text-white">
                      → {(exchangeRates.EUR + exchangeRates.markupTRY).toFixed(2)} ₺
                    </div>
                    <span className="text-[9px] text-[#71717a] block">+{exchangeRates.markupTRY.toFixed(2)} TL Marjlı</span>
                  </div>
                </div>

                <div className="p-2 rounded-xl bg-[#182418] border border-emerald-900/60 text-[11px] text-emerald-300 flex items-center justify-between">
                  <span>Gelir / Gider Yönetimine Git</span>
                  <button
                    onClick={() => {
                      setActiveTab('finance');
                      setIsCurrencyMenuOpen(false);
                    }}
                    className="px-2 py-1 bg-emerald-700 hover:bg-emerald-600 text-white rounded-lg text-[10px] font-bold transition-colors"
                  >
                    Aç →
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Search trigger */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="min-h-[44px] px-2.5 sm:px-3.5 py-2 bg-[#202020] hover:bg-[#282828] active:bg-[#2a2a2a] border border-[#2e2e2e] rounded-xl text-xs text-[#9ca3af] hover:text-white transition-all shadow-inner flex items-center gap-2"
          title="Hızlı Arama (Ctrl+K)"
        >
          <Search className="w-4 h-4 text-emerald-400 shrink-0" />
          <span className="hidden md:inline">Ara...</span>
          <kbd className="hidden md:inline text-[10px] font-mono bg-[#2a2a2a] text-[#71717a] px-1.5 py-0.5 rounded border border-[#383838]">
            Ctrl+K
          </kbd>
        </button>

        {/* Global Notification Bell Button */}
        <div className="relative">
          <button
            onClick={() => {
              setIsNotificationPanelOpen(!isNotificationPanelOpen);
              setIsNewMenuOpen(false);
              setIsCurrencyMenuOpen(false);
              setIsProfileMenuOpen(false);
            }}
            className={`min-w-[44px] min-h-[44px] p-2.5 rounded-xl border transition-all relative flex items-center justify-center ${
              isNotificationPanelOpen
                ? 'bg-[#253225] border-emerald-500 text-white'
                : 'bg-[#202020] hover:bg-[#282828] border-[#2e2e2e] text-[#9ca3af] hover:text-white'
            }`}
            title="Bildirim & Hatırlatma Merkezi"
            aria-label="Bildirimler"
          >
            <Bell className="w-4 h-4 text-emerald-400" />

            {/* Unread badge count */}
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-md animate-pulse">
                {unreadNotificationCount}
              </span>
            )}
          </button>

          {/* Notification Dropdown Panel */}
          <NotificationPanel
            isOpen={isNotificationPanelOpen}
            onClose={() => setIsNotificationPanelOpen(false)}
          />
        </div>

        {/* Global "+ Yeni" Action Dropdown */}
        <div className="relative">
          <button
            onClick={() => {
              setIsNewMenuOpen(!isNewMenuOpen);
              setIsCurrencyMenuOpen(false);
              setIsProfileMenuOpen(false);
              setIsNotificationPanelOpen(false);
            }}
            className="min-h-[44px] flex items-center gap-1 sm:gap-1.5 px-3 sm:px-3.5 py-2 bg-[#2d5a27] hover:bg-[#387030] active:bg-[#244c1f] text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-950/60 transition-all"
            title="Yeni Ekle"
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">Yeni Ekle</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </button>

          {isNewMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsNewMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-52 sm:w-56 bg-[#1c1c1c] border border-[#2e2e2e] rounded-2xl shadow-2xl p-1.5 z-40 space-y-1 animate-fade-in max-w-[calc(100vw-24px)]">
                <button
                  onClick={() => {
                    const id = addNote();
                    setActiveNoteId(id);
                    setActiveTab('notes');
                    setIsNewMenuOpen(false);
                  }}
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#d1d5db] hover:text-white hover:bg-[#252525] rounded-xl transition-colors text-left cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>Yeni Not</span>
                </button>

                <button
                  onClick={() => {
                    const id = addScript();
                    setActiveScriptId(id);
                    setActiveTab('scripts');
                    setIsNewMenuOpen(false);
                  }}
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#d1d5db] hover:text-white hover:bg-[#252525] rounded-xl transition-colors text-left cursor-pointer"
                >
                  <Video className="w-4 h-4 text-sky-400" />
                  <span>Yeni Video Senaryosu</span>
                </button>

                <button
                  onClick={() => {
                    addKanbanCard({
                      title: 'Yeni Proje Kartı',
                      projectType: 'genel',
                      columnId: 'fikir',
                      priority: 'orta',
                      tags: ['Yeni'],
                    });
                    setActiveTab('kanban');
                    setIsNewMenuOpen(false);
                  }}
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#d1d5db] hover:text-white hover:bg-[#252525] rounded-xl transition-colors text-left cursor-pointer"
                >
                  <Kanban className="w-4 h-4 text-emerald-400" />
                  <span>Yeni Kanban Kartı</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('media');
                    setIsNewMenuOpen(false);
                  }}
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#d1d5db] hover:text-white hover:bg-[#252525] rounded-xl transition-colors text-left cursor-pointer"
                >
                  <ImageIcon className="w-4 h-4 text-purple-400" />
                  <span>Yeni Medya / Çizim</span>
                </button>

                <button
                  onClick={() => {
                    addTask({ title: 'Yeni Görev', completed: false, priority: 'orta' });
                    setActiveTab('tasks');
                    setIsNewMenuOpen(false);
                  }}
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#d1d5db] hover:text-white hover:bg-[#252525] rounded-xl transition-colors text-left cursor-pointer"
                >
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                  <span>Yeni Görev</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('calendar');
                    setIsNewMenuOpen(false);
                  }}
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#d1d5db] hover:text-white hover:bg-[#252525] rounded-xl transition-colors text-left cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span>Takvime Etkinlik Ekle</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('finance');
                    setIsNewMenuOpen(false);
                  }}
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#d1d5db] hover:text-white hover:bg-[#252525] rounded-xl transition-colors text-left cursor-pointer"
                >
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span>Yeni Gelir / Gider</span>
                </button>
              </div>
            </>
          )}
        </div>

        {/* User Profile & Quick Settings Menu */}
        {currentUser && (
          <div className="relative">
            <button
              onClick={() => {
                setIsProfileMenuOpen(!isProfileMenuOpen);
                setIsNewMenuOpen(false);
                setIsCurrencyMenuOpen(false);
                setIsNotificationPanelOpen(false);
              }}
              className={`min-h-[44px] p-1.5 sm:px-2.5 rounded-xl border flex items-center gap-2 transition-all cursor-pointer ${
                isProfileMenuOpen
                  ? 'bg-[#252525] border-emerald-500'
                  : 'bg-[#202020] hover:bg-[#282828] border-[#2e2e2e]'
              }`}
              title="Profil & Ayarlar Menüsü"
            >
              <div className="w-7 h-7 rounded-lg bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-xs shrink-0">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <span className="hidden lg:inline text-xs font-semibold text-white max-w-[100px] truncate">
                {currentUser.name}
              </span>
              <ChevronDown className="w-3.5 h-3.5 text-[#71717a] hidden sm:block" />
            </button>

            {isProfileMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsProfileMenuOpen(false)} />
                <div className="absolute right-0 mt-2 w-60 sm:w-64 bg-[#1c1c1c] border border-[#2e2e2e] rounded-2xl shadow-2xl p-2 z-40 space-y-1.5 animate-fade-in">
                  <div className="p-2.5 rounded-xl bg-[#141414] border border-[#282828]">
                    <div className="flex items-center gap-2">
                      <div className="w-8 h-8 rounded-lg bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-xs shrink-0">
                        {currentUser.name.charAt(0).toUpperCase()}
                      </div>
                      <div className="min-w-0 flex-1">
                        <p className="text-xs font-bold text-white truncate">{currentUser.name}</p>
                        <p className="text-[10px] text-[#71717a] font-mono truncate">{currentUser.email}</p>
                      </div>
                    </div>
                    <div className="mt-2 pt-2 border-t border-[#222] flex items-center justify-between text-[10px]">
                      <span className="text-[#888]">Abonelik Paketi:</span>
                      <span className="text-emerald-400 font-bold bg-emerald-950/70 px-1.5 py-0.5 rounded border border-emerald-800/60">
                        {currentUser.subscriptionPlan || 'Aylık'}
                      </span>
                    </div>
                  </div>

                  <button
                    onClick={() => {
                      setActiveTab('settings');
                      setIsProfileMenuOpen(false);
                    }}
                    className="w-full min-h-[38px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#d1d5db] hover:text-white hover:bg-[#252525] rounded-xl transition-colors text-left cursor-pointer"
                  >
                    <Settings className="w-4 h-4 text-emerald-400" />
                    <span>Hesap & Güvenlik Ayarları</span>
                  </button>

                  {currentUser.role === 'ADMIN' && (
                    <button
                      onClick={() => {
                        setActiveTab('admin');
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full min-h-[38px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-purple-300 hover:text-white hover:bg-purple-950/40 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <ShieldAlert className="w-4 h-4 text-purple-400" />
                      <span>Yönetici Kontrol Paneli</span>
                    </button>
                  )}

                  <div className="pt-1 border-t border-[#282828]">
                    <button
                      onClick={() => logout()}
                      className="w-full min-h-[38px] flex items-center gap-2.5 px-3 py-2 text-xs font-semibold text-rose-400 hover:text-rose-300 hover:bg-rose-950/40 rounded-xl transition-colors text-left cursor-pointer"
                    >
                      <LogOut className="w-4 h-4 text-rose-400" />
                      <span>Güvenli Çıkış Yap</span>
                    </button>
                  </div>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
