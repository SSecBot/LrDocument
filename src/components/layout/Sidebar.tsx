'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ActiveTab } from '@/types';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Calendar,
  Image as ImageIcon,
  Wallet,
  Kanban,
  Sigma,
  Search,
  X,
  ShieldCheck,
  LogOut,
  Settings,
  GraduationCap,
} from 'lucide-react';
import { hasStudentAccess } from '@/lib/access';

interface NavItem {
  id: ActiveTab;
  label: string;
  icon: React.ElementType;
  badge?: number;
}

export const Sidebar: React.FC = () => {
  const {
    activeTab,
    setActiveTab,
    isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    notes,
    tasks,
    kanbanCards,
    setIsCommandPaletteOpen,
    currentUser,
    logout,
  } = useAppStore();

  const groups: { title: string; items: NavItem[] }[] = [
    {
      title: 'Çalışma alanı',
      items: [
        { id: 'dashboard', label: 'Genel Bakış', icon: LayoutDashboard },
        { id: 'notes', label: 'Notlar', icon: FileText, badge: notes.length },
        { id: 'tasks', label: 'Görevler', icon: CheckSquare, badge: tasks.filter((t) => !t.completed).length },
        { id: 'kanban', label: 'Kanban', icon: Kanban, badge: kanbanCards.filter((c) => c.columnId !== 'tamamlandi').length },
        { id: 'calendar', label: 'Takvim', icon: Calendar },
        ...(hasStudentAccess(currentUser) ? [{ id: 'academic' as ActiveTab, label: 'Ders Takibi', icon: GraduationCap }] : []),
      ],
    },
    {
      title: 'Kaynaklar',
      items: [
        { id: 'media', label: 'Medya Deposu', icon: ImageIcon },
        { id: 'finance', label: 'Gelir ve Gider', icon: Wallet },
      ],
    },
  ];

  const accountItems: NavItem[] = [{ id: 'settings', label: 'Hesap & Güvenlik', icon: Settings }];
  if (currentUser?.role === 'ADMIN') {
    accountItems.push({ id: 'admin', label: 'Yönetici Paneli', icon: ShieldCheck });
  }

  const renderItem = (item: NavItem, isMobile: boolean) => {
    const isActive = activeTab === item.id;
    const Icon = item.icon;
    return (
      <button
        key={item.id}
        onClick={() => {
          setActiveTab(item.id);
          if (isMobile) setIsMobileSidebarOpen(false);
        }}
        aria-current={isActive ? 'page' : undefined}
        className={`relative w-full h-10 md:h-9 flex items-center gap-2.5 px-2.5 rounded-lg text-[13px] transition-colors ${
          isActive ? 'bg-surface-3 text-fg font-medium' : 'text-subtle hover:text-fg hover:bg-surface-2'
        }`}
      >
        {isActive && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-emerald-400" />}
        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-emerald-400' : 'text-muted'}`} />
        <span className="flex-1 text-left truncate">{item.label}</span>
        {!!item.badge && <span className="text-[11px] tabular-nums text-muted">{item.badge}</span>}
      </button>
    );
  };

  const renderSidebarContent = (isMobile: boolean) => (
    <div className="flex flex-col h-full bg-surface select-none">
      {/* Brand */}
      <div className="h-14 px-3 border-b border-line flex items-center justify-between shrink-0">
        <button
          onClick={() => {
            setActiveTab('dashboard');
            if (isMobile) setIsMobileSidebarOpen(false);
          }}
          className="flex items-center gap-2.5 px-1"
        >
          <div className="w-8 h-8 rounded-lg bg-brand flex items-center justify-center">
            <Sigma className="w-4 h-4 text-white" />
          </div>
          <span className="font-semibold text-[15px] text-fg">LrDocument</span>
        </button>

        {isMobile && (
          <button
            onClick={() => setIsMobileSidebarOpen(false)}
            className="w-10 h-10 flex items-center justify-center rounded-lg text-subtle hover:text-fg hover:bg-surface-2 transition-colors"
            aria-label="Menüyü Kapat"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Search */}
      <div className="p-3 pb-1">
        <button
          onClick={() => {
            if (isMobile) setIsMobileSidebarOpen(false);
            setIsCommandPaletteOpen(true);
          }}
          className="w-full h-9 flex items-center gap-2 px-2.5 bg-surface-2 hover:bg-surface-3 border border-line rounded-lg text-[13px] text-muted hover:text-subtle transition-colors"
        >
          <Search className="w-4 h-4" />
          <span className="flex-1 text-left">Ara…</span>
          <kbd className="hidden md:inline text-[10px] font-mono text-muted px-1.5 py-0.5 rounded border border-line-strong">
            Ctrl K
          </kbd>
        </button>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto px-3 py-2 space-y-4">
        {groups.map((group) => (
          <div key={group.title} className="space-y-0.5">
            <div className="px-2.5 pb-1 text-[11px] font-medium text-muted">{group.title}</div>
            {group.items.map((item) => renderItem(item, isMobile))}
          </div>
        ))}
        <div className="space-y-0.5">
          <div className="px-2.5 pb-1 text-[11px] font-medium text-muted">Hesap</div>
          {accountItems.map((item) => renderItem(item, isMobile))}
        </div>
      </nav>

      {/* User */}
      {currentUser && (
        <div className="p-3 border-t border-line safe-bottom">
          <div className="flex items-center gap-2.5 px-1">
            <div className="w-8 h-8 rounded-full bg-surface-3 text-body flex items-center justify-center text-xs font-semibold shrink-0">
              {currentUser.name.charAt(0).toUpperCase()}
            </div>
            <div className="min-w-0 flex-1">
              <p className="text-[13px] font-medium text-fg truncate">{currentUser.name}</p>
              <p className="text-[11px] text-muted truncate">{currentUser.email}</p>
            </div>
            <button
              onClick={() => logout()}
              title="Çıkış Yap"
              aria-label="Çıkış Yap"
              className="w-9 h-9 flex items-center justify-center rounded-lg text-muted hover:text-rose-400 hover:bg-rose-500/10 transition-colors shrink-0"
            >
              <LogOut className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );

  return (
    <>
      <aside className="hidden md:flex w-60 border-r border-line flex-col h-full shrink-0">
        {renderSidebarContent(false)}
      </aside>

      {isMobileSidebarOpen && (
        <div className="fixed inset-0 z-50 md:hidden flex animate-fade-in">
          <div className="fixed inset-0 bg-black/60" onClick={() => setIsMobileSidebarOpen(false)} />
          <div className="relative w-4/5 max-w-[288px] h-full z-10 border-r border-line">
            {renderSidebarContent(true)}
          </div>
        </div>
      )}
    </>
  );
};
