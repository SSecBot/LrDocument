'use client';

import React, { useState } from 'react';
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
  } = useAppStore();

  const [isNewMenuOpen, setIsNewMenuOpen] = useState(false);

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
        return { title: 'Takvim', desc: 'Sürükle-bırak destekli yayınlar, görev teslimleri ve finans senkronizasyonu' };
      case 'finance':
        return { title: 'Gelir ve Gider', desc: 'İçerik gelirleri, sponsorluklar, öncelik takibi ve bütçe planlaması' };
      case 'settings':
        return { title: 'Hesap & Güvenlik Ayarları', desc: 'Kişisel profil, şifre değişikliği ve abonelik paketi yönetimi' };
      case 'admin':
        return { title: 'Yönetici Kontrol Paneli', desc: 'Kullanıcı onayları, abonelik paketleri ve Excel dışa aktarım' };
      default:
        return { title: 'LrDocument', desc: '' };
    }
  };

  const details = getModuleDetails();

  return (
    <header className="h-16 border-b border-[#242424] bg-[#161616] px-3 sm:px-6 flex items-center justify-between gap-2 sm:gap-4 shrink-0 select-none relative z-30 overflow-x-hidden">
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
      <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
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
            onClick={() => setIsNotificationPanelOpen(!isNotificationPanelOpen)}
            className={`min-w-[44px] min-h-[44px] p-2.5 rounded-xl border transition-all relative flex items-center justify-center ${isNotificationPanelOpen
                ? 'bg-[#253225] border-emerald-500 text-white'
                : 'bg-[#202020] hover:bg-[#282828] border-[#2e2e2e] text-[#9ca3af] hover:text-white'
              }`}
            title="Bildirim & Hatırlatma Merkezi"
            aria-label="Bildirimler"
          >
            <Bell className="w-4 h-4 text-emerald-400" />

            {/* Unread badge count */}
            {unreadNotificationCount > 0 && (
              <span className="absolute 1 top-1.5 right-1.5 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-md animate-pulse">
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
            onClick={() => setIsNewMenuOpen(!isNewMenuOpen)}
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
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#d1d5db] hover:text-white hover:bg-[#252525] rounded-xl transition-colors text-left"
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
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#d1d5db] hover:text-white hover:bg-[#252525] rounded-xl transition-colors text-left"
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
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#d1d5db] hover:text-white hover:bg-[#252525] rounded-xl transition-colors text-left"
                >
                  <Kanban className="w-4 h-4 text-emerald-400" />
                  <span>Yeni Kanban Kartı</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('media');
                    setIsNewMenuOpen(false);
                  }}
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#d1d5db] hover:text-white hover:bg-[#252525] rounded-xl transition-colors text-left"
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
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#d1d5db] hover:text-white hover:bg-[#252525] rounded-xl transition-colors text-left"
                >
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                  <span>Yeni Görev</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('calendar');
                    setIsNewMenuOpen(false);
                  }}
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#d1d5db] hover:text-white hover:bg-[#252525] rounded-xl transition-colors text-left"
                >
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span>Takvime Etkinlik Ekle</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('finance');
                    setIsNewMenuOpen(false);
                  }}
                  className="w-full min-h-[40px] flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#d1d5db] hover:text-white hover:bg-[#252525] rounded-xl transition-colors text-left"
                >
                  <Wallet className="w-4 h-4 text-emerald-400" />
                  <span>Yeni Gelir / Gider</span>
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
};
