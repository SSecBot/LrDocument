'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { NotificationPanel } from '@/components/notifications/NotificationPanel';
import {
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
      default:
        return { title: 'LrDocument', desc: '' };
    }
  };

  const details = getModuleDetails();

  return (
    <header className="h-16 border-b border-[#242424] bg-[#161616] px-6 flex items-center justify-between gap-4 shrink-0 select-none relative z-30">
      {/* Title / Breadcrumb */}
      <div>
        <h2 className="text-sm font-bold text-white tracking-tight">{details.title}</h2>
        <p className="text-[11px] text-[#71717a] hidden sm:block">{details.desc}</p>
      </div>

      {/* Center / Right controls */}
      <div className="flex items-center gap-3">
        {/* Search trigger */}
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="flex items-center gap-3 px-3.5 py-1.5 bg-[#202020] hover:bg-[#282828] border border-[#2e2e2e] rounded-xl text-xs text-[#9ca3af] hover:text-white transition-all shadow-inner"
        >
          <Search className="w-3.5 h-3.5 text-emerald-400" />
          <span className="hidden md:inline">Tüm Çalışma Alanında Ara...</span>
          <kbd className="text-[10px] font-mono bg-[#2a2a2a] text-[#71717a] px-1.5 py-0.5 rounded border border-[#383838]">
            Ctrl+K
          </kbd>
        </button>

        {/* Global Notification Bell Button */}
        <div className="relative">
          <button
            onClick={() => setIsNotificationPanelOpen(!isNotificationPanelOpen)}
            className={`p-2 rounded-xl border transition-all relative ${isNotificationPanelOpen
                ? 'bg-[#253225] border-emerald-500 text-white'
                : 'bg-[#202020] hover:bg-[#282828] border-[#2e2e2e] text-[#9ca3af] hover:text-white'
              }`}
            title="Bildirim & Hatırlatma Merkezi"
          >
            <Bell className="w-4 h-4 text-emerald-400" />

            {/* Unread badge count */}
            {unreadNotificationCount > 0 && (
              <span className="absolute -top-1 -right-1 min-w-[18px] h-[18px] px-1 bg-rose-600 text-white text-[10px] font-extrabold rounded-full flex items-center justify-center shadow-md animate-pulse">
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
            className="flex items-center gap-1.5 px-3.5 py-2 bg-[#2d5a27] hover:bg-[#387030] text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-950/60 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Ekle</span>
            <ChevronDown className="w-3.5 h-3.5 opacity-80" />
          </button>

          {isNewMenuOpen && (
            <>
              <div
                className="fixed inset-0 z-30"
                onClick={() => setIsNewMenuOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-52 bg-[#1c1c1c] border border-[#2e2e2e] rounded-2xl shadow-2xl p-1.5 z-40 space-y-1 animate-fade-in">
                <button
                  onClick={() => {
                    const id = addNote();
                    setActiveNoteId(id);
                    setActiveTab('notes');
                    setIsNewMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#d1d5db] hover:text-white hover:bg-[#252525] rounded-xl transition-colors text-left"
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#d1d5db] hover:text-white hover:bg-[#252525] rounded-xl transition-colors text-left"
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#d1d5db] hover:text-white hover:bg-[#252525] rounded-xl transition-colors text-left"
                >
                  <Kanban className="w-4 h-4 text-emerald-400" />
                  <span>Yeni Kanban Kartı</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('media');
                    setIsNewMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#d1d5db] hover:text-white hover:bg-[#252525] rounded-xl transition-colors text-left"
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
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#d1d5db] hover:text-white hover:bg-[#252525] rounded-xl transition-colors text-left"
                >
                  <CheckSquare className="w-4 h-4 text-amber-400" />
                  <span>Yeni Görev</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('calendar');
                    setIsNewMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#d1d5db] hover:text-white hover:bg-[#252525] rounded-xl transition-colors text-left"
                >
                  <Calendar className="w-4 h-4 text-purple-400" />
                  <span>Takvime Etkinlik Ekle</span>
                </button>

                <button
                  onClick={() => {
                    setActiveTab('finance');
                    setIsNewMenuOpen(false);
                  }}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-xs font-medium text-[#d1d5db] hover:text-white hover:bg-[#252525] rounded-xl transition-colors text-left"
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
