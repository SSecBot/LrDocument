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
} from 'lucide-react';

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    notes,
    scripts,
    tasks,
    kanbanCards,
    events,
    mediaItems,
    transactions,
    setIsCommandPaletteOpen,
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
        badge: kanbanCards.filter(c => c.columnId !== 'tamamlandi').length,
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
        badge: tasks.filter(t => !t.completed).length,
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
    ];

  return (
    <aside className="w-64 bg-[#141414] border-r border-[#242424] flex flex-col h-full shrink-0 select-none">
      {/* Brand Header */}
      <div className="p-5 border-b border-[#242424] flex items-center justify-between">
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
      </div>

      {/* Quick Search Shortcut Trigger */}
      <div className="p-3">
        <button
          onClick={() => setIsCommandPaletteOpen(true)}
          className="w-full flex items-center justify-between px-3 py-2 bg-[#1c1c1c] hover:bg-[#242424] border border-[#2a2a2a] rounded-xl text-xs text-[#9ca3af] hover:text-white transition-all group"
        >
          <div className="flex items-center gap-2">
            <Command className="w-3.5 h-3.5 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span>Hızlı Arama...</span>
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
              onClick={() => setActiveTab(item.id)}
              className={`w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all ${isActive
                  ? 'bg-[#2d5a27] text-white shadow-md shadow-emerald-950/60 font-bold'
                  : 'text-[#9ca3af] hover:text-white hover:bg-[#1f1f1f]'
                }`}
            >
              <div className="flex items-center gap-3">
                <span className={isActive ? 'text-white' : 'text-[#71717a]'}>
                  {item.icon}
                </span>
                <span>{item.label}</span>
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

      {/* Footer Info */}
      <div className="p-3 border-t border-[#242424] bg-[#121212]">
        <div className="text-[10px] text-center text-[#555] tracking-tight">
          LrDocument Studio • v1.0.0 (Production)
        </div>
      </div>
    </aside>
  );
};
