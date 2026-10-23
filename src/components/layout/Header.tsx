'use client';

import { t, tx } from '@/lib/i18n';
import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import { canEdit, isCorporate } from '@/lib/corporate';
import { AccountSwitcher } from './AccountSwitcher';
import {
  Menu,
  Search,
  Plus,
  Bell,
  FileText,
  CheckSquare,
  Calendar,
  Wallet,
  Kanban,
  ChevronDown,
  Coins,
  RefreshCw,
  Settings,
  ShieldAlert,
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
    addTask,
    addKanbanCard,
    setActiveTab,
    setPreference,
    systemSettings,
    setActiveNoteId,
    exchangeRates,
    fetchExchangeRates,
    currentUser,
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
        return { title: t('Genel Bakış') };
      case 'notes':
        return { title: isCorporate(currentUser) ? t('Ortak Notlar') : t('Notlar') };
      case 'customers':
        return { title: t('Müşteriler') };
      case 'team':
        return { title: t('Kurum ve Ekip') };
      case 'tasks':
        return { title: t('Görevler') };
      case 'calendar':
        return { title: t('Takvim') };
      case 'finance':
        return { title: t('Finans') };
      case 'personalNotes':
        return { title: t('Şahsi Notlar') };
      case 'personalFinance':
        return { title: t('Şahsi Finans') };
      case 'academic':
        return { title: t('Ders Takibi') };
      case 'settings':
        return { title: t('Ayarlar') };
      case 'admin':
        return { title: t('Yönetici Paneli') };
      default:
        return { title: 'LrDocument' };
    }
  };

  const details = getModuleDetails();

  const handleRefreshRates = async () => {
    setIsRefreshingRates(true);
    await fetchExchangeRates();
    setIsRefreshingRates(false);
    addToast({
      type: 'success',
      title: t('Döviz Kurları Güncellendi'),
      message: t('USD: {v0} ₺ | EUR: {v1} ₺', { v0: (exchangeRates.USD + exchangeRates.markupTRY).toFixed(2), v1: (exchangeRates.EUR + exchangeRates.markupTRY).toFixed(2) }),
    });
  };

  return (
    <header className="h-14 border-b border-line bg-surface px-2 sm:px-4 flex items-center justify-between gap-2 sm:gap-3 shrink-0 select-none relative z-30">
      {/* Left: Hamburger menu + Title / Breadcrumb */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        {/* Mobile Hamburger Toggle (md:hidden) */}
        <button
          onClick={() => setIsMobileSidebarOpen(true)}
          className="[@media(min-width:768px)_and_(min-height:501px)]:hidden w-10 h-10 rounded-lg text-subtle hover:text-fg hover:bg-surface-2 flex items-center justify-center transition-colors shrink-0"
          aria-label={t('Navigasyon Menüsünü Aç')}
          title={t('Menü')}
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h2 className="text-sm font-semibold text-fg truncate">{tx(details.title)}</h2>
        </div>
      </div>

      {/* Right controls */}
      <div className="flex items-center gap-1 sm:gap-1.5 shrink-0">
        {/* Live Currency Rates & Multi-Currency Indicator Popover (phones see rates on the Finance page) */}
        <div className="relative hidden sm:block">
          <button
            onClick={() => {
              setIsCurrencyMenuOpen(!isCurrencyMenuOpen);
              setIsNewMenuOpen(false);
              setIsProfileMenuOpen(false);
              setIsNotificationPanelOpen(false);
            }}
            className={`h-10 md:h-9 min-w-10 md:min-w-9 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors text-xs ${
              isCurrencyMenuOpen ? 'bg-surface-3 text-fg' : 'text-subtle hover:text-fg hover:bg-surface-2'
            }`}
            title={t('Canlı Döviz Kurları & Kur Marjı')}
          >
            <Coins className="w-4 h-4 shrink-0" />
            <span className="hidden lg:inline text-[11px] font-mono tabular-nums">
              ${tx((exchangeRates.USD + exchangeRates.markupTRY).toFixed(2))} · €{tx((exchangeRates.EUR + exchangeRates.markupTRY).toFixed(2))}
            </span>
          </button>

          {isCurrencyMenuOpen && (
            <>
              <div className="fixed inset-0 z-30" onClick={() => setIsCurrencyMenuOpen(false)} />
              <div className="absolute right-0 mt-2 w-72 sm:w-80 bg-surface border border-line rounded-lg shadow-xl p-3.5 z-40 space-y-3 animate-fade-in">
                <div className="flex items-center justify-between border-b border-line pb-2">
                  <div className="flex items-center gap-2">
                    <Coins className="w-4 h-4 text-emerald-400" />
                    <span className="text-xs font-bold text-white">{exchangeRates.markupTRY > 0 ? t('Canlı Kur & Marj Bilgisi') : t('Canlı Kur Bilgisi')}</span>
                  </div>
                  <button
                    onClick={handleRefreshRates}
                    disabled={isRefreshingRates}
                    className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface-4 text-emerald-400 text-[10px] flex items-center gap-1 font-medium transition-colors"
                  >
                    <RefreshCw className={`w-3 h-3 ${isRefreshingRates ? 'animate-spin' : ''}`} />
                    <span>{t('Yenile')}</span>
                  </button>
                </div>

                <div className="grid grid-cols-2 gap-2 text-xs">
                  <div className="p-2.5 rounded-lg bg-app border border-line space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-sky-400 font-bold">
                      <span>{t('🇺🇸 USD / TRY')}</span>
                      <span className="font-mono">{tx(exchangeRates.USD.toFixed(2))} ₺</span>
                    </div>
                    {exchangeRates.markupTRY > 0 && (
                      <>
                        <div className="text-xs font-mono font-bold text-white">
                          → {tx((exchangeRates.USD + exchangeRates.markupTRY).toFixed(2))} ₺
                        </div>
                        <span className="text-[9px] text-muted block">+{tx(exchangeRates.markupTRY.toFixed(2))}{' '}{t('TL Marjlı')}</span>
                      </>
                    )}
                  </div>

                  <div className="p-2.5 rounded-lg bg-app border border-line space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-purple-400 font-bold">
                      <span>{t('🇪🇺 EUR / TRY')}</span>
                      <span className="font-mono">{tx(exchangeRates.EUR.toFixed(2))} ₺</span>
                    </div>
                    {exchangeRates.markupTRY > 0 && (
                      <>
                        <div className="text-xs font-mono font-bold text-white">
                          → {tx((exchangeRates.EUR + exchangeRates.markupTRY).toFixed(2))} ₺
                        </div>
                        <span className="text-[9px] text-muted block">+{tx(exchangeRates.markupTRY.toFixed(2))}{' '}{t('TL Marjlı')}</span>
                      </>
                    )}
                  </div>
                </div>

                <div className="p-2 rounded-lg bg-surface border border-emerald-900/60 text-[11px] text-emerald-300 flex items-center justify-between">
                  <span>{t('Gelir / Gider Yönetimine Git')}</span>
                  <button
                    onClick={() => {
                      setActiveTab('finance');
                      setIsCurrencyMenuOpen(false);
                    }}
                    className="px-2 py-1 bg-brand hover:bg-brand-hover text-white rounded-lg text-[10px] font-bold transition-colors"
                  >
                    {t('Aç →')}
                  </button>
                </div>
              </div>
            </>
          )}
        </div>

        {/* Search trigger */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="h-10 md:h-9 min-w-10 md:min-w-9 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors text-subtle hover:text-fg hover:bg-surface-2"
          title={t('Hızlı Arama (Ctrl+K)')}
          aria-label={t('Ara')}
        >
          <Search className="w-4 h-4 shrink-0" />
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
            className={`relative h-10 md:h-9 min-w-10 md:min-w-9 px-2 rounded-lg flex items-center justify-center gap-1.5 transition-colors ${
              isNotificationPanelOpen ? 'bg-surface-3 text-fg' : 'text-subtle hover:text-fg hover:bg-surface-2'
            }`}
            title={t('Bildirim & Hatırlatma Merkezi')}
            aria-label={t('Bildirimler')}
          >
            <Bell className="w-4 h-4" />

            {/* Unread badge count */}
            {unreadNotificationCount > 0 && (
              <span className="absolute top-1 right-1 min-w-[16px] h-4 px-1 bg-rose-600 text-white text-[10px] font-semibold rounded-full flex items-center justify-center">
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
            className="h-10 md:h-9 min-w-10 md:min-w-9 justify-center flex items-center gap-1.5 px-2.5 sm:px-3 bg-brand hover:bg-brand-hover active:bg-brand-active text-white text-xs font-semibold rounded-lg transition-colors"
            title={t('Yeni Ekle')}
            aria-label={t('Yeni Ekle')}
            aria-expanded={isNewMenuOpen}
          >
            <Plus className="w-4 h-4" />
            <span className="hidden sm:inline">{t('Yeni')}</span>
          </button>

          {isNewMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsNewMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-52 sm:w-56 bg-surface border border-line rounded-lg shadow-xl p-1.5 z-40 space-y-1 animate-fade-in max-w-[calc(100vw-24px)]">
                {canEdit(currentUser, 'notes') && (
                <button
                  onClick={() => {
                    const id = addNote();
                    setActiveNoteId(id);
                    setActiveTab('notes');
                    setIsNewMenuOpen(false);
                  }}
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-body hover:text-white hover:bg-surface-2 rounded-lg transition-colors text-left cursor-pointer"
                >
                  <FileText className="w-4 h-4 text-emerald-400" />
                  <span>{t('Yeni Not')}</span>
                </button>
                )}

                {canEdit(currentUser, 'work') && (
                <button
                  onClick={() => {
                    addKanbanCard({
                      title: t('Yeni Proje Kartı'),
                      projectType: 'genel',
                      columnId: 'fikir',
                      priority: 'orta',
                      tags: [t('Yeni')],
                    });
                    setPreference('tasksView', 'pano');
                    setActiveTab('tasks');
                    setIsNewMenuOpen(false);
                  }}
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-body hover:text-white hover:bg-surface-2 rounded-lg transition-colors text-left cursor-pointer"
                >
                  <Kanban className="w-4 h-4 text-emerald-400" />
                  <span>{t('Yeni Kanban Kartı')}</span>
                </button>
                )}

                {canEdit(currentUser, 'work') && (
                <button
                  onClick={() => {
                    addTask({ title: t('Yeni Görev'), completed: false, priority: systemSettings.tasks.defaultPriority });
                    setPreference('tasksView', 'liste');
                    setActiveTab('tasks');
                    setIsNewMenuOpen(false);
                  }}
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-body hover:text-white hover:bg-surface-2 rounded-lg transition-colors text-left cursor-pointer"
                >
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                  <span>{t('Yeni Görev')}</span>
                </button>
                )}

                {canEdit(currentUser, 'calendar') && (
                <button
                  onClick={() => {
                    setActiveTab('calendar');
                    setIsNewMenuOpen(false);
                  }}
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-body hover:text-white hover:bg-surface-2 rounded-lg transition-colors text-left cursor-pointer"
                >
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span>{t('Takvime Etkinlik Ekle')}</span>
                </button>
                )}

                {canEdit(currentUser, 'finance') && (
                <button
                  onClick={() => {
                    setActiveTab('finance');
                    setIsNewMenuOpen(false);
                  }}
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-body hover:text-white hover:bg-surface-2 rounded-lg transition-colors text-left cursor-pointer"
                >
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span>{t('Yeni Gelir / Gider')}</span>
                </button>
                )}
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
              className={`h-10 md:h-9 pl-1 pr-1 sm:pr-2 rounded-lg flex items-center gap-1.5 transition-colors ${
                isProfileMenuOpen ? 'bg-surface-3' : 'hover:bg-surface-2'
              }`}
              title={t('Profil & Ayarlar Menüsü')}
              aria-label={t('Profil menüsü')}
            >
              <div className="w-7 h-7 rounded-full bg-surface-3 text-body flex items-center justify-center font-semibold text-xs shrink-0">
                {tx(currentUser.name.charAt(0).toUpperCase())}
              </div>
              <ChevronDown className="w-3.5 h-3.5 text-muted hidden sm:block" />
            </button>

            {isProfileMenuOpen && (
              <>
                <div className="fixed inset-0 z-30" onClick={() => setIsProfileMenuOpen(false)} />
                <div className="absolute right-0 mt-2 z-40 animate-fade-in">
                  <AccountSwitcher onClose={() => setIsProfileMenuOpen(false)}>
                    <button
                      onClick={() => {
                        setActiveTab('settings');
                        setIsProfileMenuOpen(false);
                      }}
                      className="w-full min-h-[40px] flex items-center gap-2.5 px-2.5 text-[13px] text-body hover:bg-surface-2 rounded-md text-left"
                    >
                      <Settings className="w-4 h-4 text-muted" />
                      {t('Ayarlar')}
                    </button>
                    {currentUser.role === 'ADMIN' && (
                      <button
                        onClick={() => {
                          setActiveTab('admin');
                          setIsProfileMenuOpen(false);
                        }}
                        className="w-full min-h-[40px] flex items-center gap-2.5 px-2.5 text-[13px] text-body hover:bg-surface-2 rounded-md text-left"
                      >
                        <ShieldAlert className="w-4 h-4 text-muted" />
                        {t('Yönetici Paneli')}
                      </button>
                    )}
                  </AccountSwitcher>
                </div>
              </>
            )}
          </div>
        )}
      </div>
    </header>
  );
};
