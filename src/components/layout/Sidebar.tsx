'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ActiveTab } from '@/types';
import {
  LayoutDashboard,
  FileText,
  Video,
  CheckSquare,
  Calendar,
  Image as ImageIcon,
  Wallet,
  Kanban,
  Sigma,
  Command,
  X,
  ShieldAlert,
  LogOut,
  User as UserIcon,
} from 'lucide-react';
import Link from 'next/link';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    notes,
    scripts,
    tasks,
    kanbanCards,
    events,
    mediaItems,
    transactions,
    setIsCommandPaletteOpen,
    currentUser,
    logout,
  } = useAppStore();

  const navItems: {
    id: ActiveTab;
    label: string;
    icon: React.ReactNode;
    badge?: number;
    badgeColor?: string;
  }[] = [
      {
        id: 'dashboard',
        label: 'Genel Bakış',
        icon: <LayoutDashboard className="w-4 h-4" />,
      },
      {
        id: 'notes',
        label: 'Notlar',
        icon: <FileText className="w-4 h-4" />,
        badge: notes.length,
        badgeColor: 'bg-[#242424] text-[#d1d5db]',
      },
      {
        id: 'scripts',
        label: 'Video Senaryoları',
        icon: <Video className="w-4 h-4" />,
        badge: scripts.length,
        badgeColor: 'bg-[#242424] text-[#d1d5db]',
      },
      {
        id: 'kanban',
        label: 'Kanban',
        icon: <Kanban className="w-4 h-4" />,
        badge: kanbanCards.filter((c) => c.columnId !== 'tamamlandi').length,
        badgeColor: 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40',
      },
      {
        id: 'media',
        label: 'Medya Deposu',
        icon: <ImageIcon className="w-4 h-4" />,
        badge: mediaItems.length,
        badgeColor: 'bg-purple-950/60 text-purple-300 border border-purple-800/40',
      },
      {
        id: 'tasks',
        label: 'Görevler & Plan',
        icon: <CheckSquare className="w-4 h-4" />,
        badge: tasks.filter((t) => !t.completed).length,
        badgeColor: 'bg-amber-950/60 text-amber-300 border border-amber-800/40',
      },
      {
        id: 'calendar',
        label: 'Takvim',
        icon: <Calendar className="w-4 h-4" />,
        badge: events.length,
        badgeColor: 'bg-[#2d5a27]/30 text-emerald-300 border border-[#2d5a27]/50',
      },
      {
        id: 'finance',
        label: 'Gelir ve Gider',
        icon: <Wallet className="w-4 h-4" />,
        badge: transactions.length,
        badgeColor: 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40',
      },
      {
        id: 'settings',
        label: 'Hesap & Güvenlik',
        icon: <UserIcon className="w-4 h-4" />,
      },
    ];

  if (currentUser?.role === 'ADMIN') {
    navItems.push({
      id: 'admin',
      label: 'Yönetici Paneli',
      icon: <ShieldAlert className="w-4 h-4 text-purple-400" />,
      badgeColor: 'bg-purple-950/60 text-purple-300 border border-purple-800/40',
    });
  }

  const renderSidebarContent = (isMobile: boolean = false) => (
    <div className="flex flex-col h-full bg-[#141414] select-none">
      {/* Brand Header */}
      <div className="p-4 sm:p-5 border-b border-[#242424] flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2d5a27] to-[#163013] border border-[#387030] flex items-center justify-center shadow-lg shadow-emerald-950/50">
            <Sigma className="w-5 h-5 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="font-extrabold text-base text-white tracking-tight">LrDocument</span>
              <span className="text-[10px] uppercase font-bold text-emerald-400 bg-[#2d5a27]/30 px-1.5 py-0.2 rounded border border-[#2d5a27]/50">
                PRO
              </span>
            </div>
            <p className="text-[11px] text-[#71717a] tracking-tight">Matematik & İçerik Stüdyosu</p>
          </div>
        </div>

        {isMobile && (
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="p-2.5 min-w-[44px] min-h-[44px] flex items-center justify-center rounded-xl bg-[#202020] hover:bg-[#282828] text-[#9ca3af] hover:text-white transition-colors"
            aria-label="Menüyü Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Quick Search Shortcut Trigger */}
      <div className="p-3">
        <button
          onClick={() => {
            if (isMobile) setIsMobileSidebarOpen(false);
            setIsCommandPaletteOpen(true);
          }}
          className="w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 bg-[#1c1c1c] hover:bg-[#242424] active:bg-[#282828] border border-[#2a2a2a] rounded-xl text-xs text-[#9ca3af] hover:text-white transition-all group cursor-pointer"
        >
          <div className="flex items-center gap-2.5">
            <Command className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="font-medium">Hızlı Arama...</span>
          </div>
          <kbd className="text-[10px] font-mono bg-[#282828] text-[#71717a] px-1.5 py-0.5 rounded border border-[#333]">
            Ctrl+K
          </kbd>
        </button>
      </div>

      {/* Navigation Links */}
      <div className="flex-1 px-3 py-2 space-y-1 overflow-y-auto">
        <div className="px-3 py-1.5 text-[10px] font-bold uppercase tracking-wider text-[#666]">
          Ana Modüller
        </div>

        {navItems.map((item) => {
          const isActive = activeTab === item.id;

          return (
            <button
              key={item.id}
              onClick={() => {
                setActiveTab(item.id);
                if (isMobile) setIsMobileSidebarOpen(false);
              }}
              className={`w-full min-h-[44px] flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${isActive
                  ? item.id === 'admin'
                    ? 'bg-purple-900/60 text-purple-200 border border-purple-500/40 font-bold'
                    : 'bg-[#2d5a27] text-white shadow-md shadow-emerald-950/60 font-bold'
                  : 'text-[#9ca3af] hover:text-white hover:bg-[#1f1f1f] active:bg-[#252525]'
                }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-white' : 'text-[#71717a]'}>
                  {item.icon}
                </span>
                <span className="text-xs font-medium">{item.label}</span>
              </div>

              {item.badge !== undefined && (
                <span className={`text-[10px] px-2 py-0.5 rounded-full font-mono font-medium ${item.badgeColor || 'bg-[#222] text-[#9ca3af]'}`}>
                  {item.badge}
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* User Profile & Logout Box */}
      <div className="p-3 border-t border-[#242424] bg-[#121212]">
        {currentUser ? (
          <div className="p-2.5 rounded-xl bg-[#1a1a1a] border border-[#282828] flex items-center justify-between gap-2">
            <div
              onClick={() => {
                setActiveTab('settings');
                if (isMobile) setIsMobileSidebarOpen(false);
              }}
              className="flex items-center gap-2.5 min-w-0 cursor-pointer flex-1 group"
              title="Hesap & Güvenlik Ayarları"
            >
              <div className="w-8 h-8 rounded-lg bg-emerald-600/30 text-emerald-400 border border-emerald-500/40 flex items-center justify-center font-bold text-xs shrink-0 group-hover:scale-105 transition-transform">
                {currentUser.name.charAt(0).toUpperCase()}
              </div>
              <div className="min-w-0">
                <div className="flex items-center gap-1.5">
                  <p className="text-xs font-semibold text-white truncate group-hover:text-emerald-300 transition-colors">{currentUser.name}</p>
                  {currentUser.role === 'ADMIN' && (
                    <span className="text-[9px] px-1.5 py-0.2 rounded bg-purple-500/20 text-purple-300 font-mono font-bold">
                      ADMIN
                    </span>
                  )}
                </div>
                <p className="text-[10px] text-[#71717a] font-mono truncate">{currentUser.email}</p>
              </div>
            </div>

            <button
              onClick={() => logout()}
              title="Çıkış Yap"
              className="p-1.5 rounded-lg text-neutral-400 hover:text-rose-400 hover:bg-rose-500/10 transition-colors cursor-pointer shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <Link
            href="/login"
            className="w-full flex items-center justify-center gap-2 py-2 px-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors"
          >
            <UserIcon className="w-4 h-4" />
            <span>Giriş Yap</span>
          </Link>
        )}
      </div>
    </div>
  );

  return (
    <>
      <aside className="hidden md:flex w-64 border-r border-[#242424] flex-col h-full shrink-0 select-none">
        {renderSidebarContent(false)}
      </aside>

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-fade-in">
          <div
            className="fixed inset-0 bg-black/70 backdrop-blur-sm transition-opacity"
            onClick={() => setIsMobileSidebarOpen(false)}
          />
          <div className="relative w-4/5 max-w-xs h-full bg-[#141414] shadow-2xl z-10 animate-slide-in">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
