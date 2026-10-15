'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ActiveTab } from '@/types';
import {
  LayoutDashboard,
  FileText,
  CheckSquare,
  Calendar,
  Wallet,
  Sigma,
  PanelLeftClose,
  PanelLeftOpen,
  Search,
  X,
  ShieldCheck,
  ChevronsUpDown,
  Settings,
  GraduationCap,
} from 'lucide-react';
import { hasStudentAccess } from '@/lib/access';
import { AccountSwitcher } from './AccountSwitcher';

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
    preferences,
    setPreference,
  } = useAppStore();
  const collapsed = preferences.sidebarCollapsed;
  const [accountMenuOpen, setAccountMenuOpen] = React.useState(false);
  const openWork = tasks.filter((t) => !t.completed).length + kanbanCards.filter((c) => c.columnId !== 'tamamlandi').length;

  const groups: { title: string; items: NavItem[] }[] = [
    {
      title: 'Çalışma alanı',
      items: [
        { id: 'dashboard', label: 'Genel Bakış', icon: LayoutDashboard },
        { id: 'notes', label: 'Notlar', icon: FileText, badge: notes.length },
        { id: 'tasks', label: 'Görevler ve Kanban', icon: CheckSquare, badge: openWork },
        { id: 'calendar', label: 'Takvim', icon: Calendar },
        ...(hasStudentAccess(currentUser) ? [{ id: 'academic' as ActiveTab, label: 'Ders Takibi', icon: GraduationCap }] : []),
        { id: 'finance', label: 'Gelir ve Gider', icon: Wallet },
      ],
    },
  ];

  const accountItems: NavItem[] = [{ id: 'settings', label: 'Ayarlar', icon: Settings }];
  if (currentUser?.role === 'ADMIN') {
    accountItems.push({ id: 'admin', label: 'Yönetici Paneli', icon: ShieldCheck });
  }

  const renderItem = (item: NavItem, isMobile: boolean) => {
    const isActive = activeTab === item.id;
    const Icon = item.icon;
    const mini = collapsed && !isMobile;
    return (
      <button
        key={item.id}
        onClick={() => {
          setActiveTab(item.id);
          if (isMobile) setIsMobileSidebarOpen(false);
        }}
        aria-current={isActive ? 'page' : undefined}
        title={mini ? item.label : undefined}
        aria-label={mini ? item.label : undefined}
        className={`relative w-full h-10 md:h-9 flex items-center gap-2.5 rounded-md text-[13px] transition-colors ${
          mini ? 'justify-center px-0' : 'px-2.5'
        } ${isActive ? 'bg-surface-3 text-fg font-medium' : 'text-subtle hover:text-fg hover:bg-surface-2'}`}
      >
        {isActive && <span className="absolute left-0 top-2 bottom-2 w-0.5 rounded-full bg-brand" />}
        <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-fg' : 'text-muted'}`} />
        {!mini && <span className="flex-1 text-left truncate">{item.label}</span>}
        {!mini && !!item.badge && <span className="text-[11px] tabular-nums text-muted">{item.badge}</span>}
        {mini && !!item.badge && <span className="absolute top-1.5 right-1.5 w-1.5 h-1.5 rounded-full bg-brand" />}
      </button>
    );
  };

  const renderSidebarContent = (isMobile: boolean) => {
    const mini = collapsed && !isMobile;
    return (
    <div className="flex flex-col h-full bg-surface select-none">
      {/* Brand */}
      <div className={`h-14 border-b border-line flex items-center shrink-0 ${mini ? 'justify-center px-2' : 'justify-between px-3'}`}>
        <button
          onClick={() => {
            setActiveTab('dashboard');
            if (isMobile) setIsMobileSidebarOpen(false);
          }}
          className="flex items-center gap-2.5 px-1"
          aria-label="Genel Bakış"
        >
          <div className="w-8 h-8 rounded-md bg-brand flex items-center justify-center">
            <Sigma className="w-4 h-4 text-white" />
          </div>
          {!mini && <span className="font-semibold text-[15px] text-fg">LrDocument</span>}
        </button>

        {!isMobile && !mini && (
          <button
            onClick={() => setPreference('sidebarCollapsed', true)}
            className="w-8 h-8 flex items-center justify-center rounded-md text-muted hover:text-fg hover:bg-surface-2 transition-colors"
            aria-label="Menüyü daralt"
            title="Menüyü daralt"
          >
            <PanelLeftClose className="w-4 h-4" />
          </button>
        )}

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

      {mini && (
        <div className="p-2 pb-0">
          <button
            onClick={() => setPreference('sidebarCollapsed', false)}
            className="w-full h-9 flex items-center justify-center rounded-md text-muted hover:text-fg hover:bg-surface-2 transition-colors"
            aria-label="Menüyü genişlet"
            title="Menüyü genişlet"
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
        </div>
      )}

      {/* Search */}
      <div className={mini ? 'p-2 pb-1' : 'p-3 pb-1'}>
        <button
          title={mini ? 'Ara (Ctrl K)' : undefined}
          aria-label={mini ? 'Ara' : undefined}
          onClick={() => {
            if (isMobile) setIsMobileSidebarOpen(false);
            setIsCommandPaletteOpen(true);
          }}
          className={`w-full h-9 flex items-center gap-2 bg-surface-2 hover:bg-surface-3 border border-line rounded-md text-[13px] text-muted hover:text-subtle transition-colors ${
            mini ? 'justify-center px-0' : 'px-2.5'
          }`}
        >
          <Search className="w-4 h-4" />
          {!mini && <span className="flex-1 text-left">Ara…</span>}
          {!mini && (
            <kbd className="hidden md:inline text-[10px] font-mono text-muted px-1.5 py-0.5 rounded border border-line-strong">
              Ctrl K
            </kbd>
          )}
        </button>
      </div>

      {/* Navigation */}
      <nav className={`flex-1 overflow-y-auto py-2 space-y-4 ${mini ? 'px-2' : 'px-3'}`}>
        {groups.map((group) => (
          <div key={group.title} className="space-y-0.5">
            {!mini && <div className="px-2.5 pb-1 text-[11px] font-medium text-muted">{group.title}</div>}
            {group.items.map((item) => renderItem(item, isMobile))}
          </div>
        ))}
        <div className="space-y-0.5">
          {mini ? <div className="mx-2 border-t border-line" /> : <div className="px-2.5 pb-1 text-[11px] font-medium text-muted">Hesap</div>}
          {accountItems.map((item) => renderItem(item, isMobile))}
        </div>
      </nav>

      {/* User: opens the account switcher */}
      {currentUser && (
        <div className={`relative border-t border-line safe-bottom ${mini ? 'p-2' : 'p-3'}`}>
          {accountMenuOpen && (
            <>
              <div className="fixed inset-0 z-40" onClick={() => setAccountMenuOpen(false)} aria-hidden="true" />
              <div className={`absolute z-50 ${mini ? 'left-full bottom-2 ml-2' : 'left-3 bottom-full mb-2'}`}>
                <AccountSwitcher onClose={() => setAccountMenuOpen(false)} />
              </div>
            </>
          )}
          <button
            onClick={() => setAccountMenuOpen((o) => !o)}
            aria-expanded={accountMenuOpen}
            aria-haspopup="menu"
            title={mini ? `${currentUser.name} — hesaplar` : 'Hesaplar'}
            className={`w-full flex items-center gap-2.5 rounded-md hover:bg-surface-2 transition-colors ${mini ? 'justify-center p-1' : 'px-1 py-1 text-left'}`}
          >
            <span className="w-8 h-8 rounded-full bg-surface-3 text-body flex items-center justify-center text-xs font-semibold shrink-0">
              {currentUser.name.charAt(0).toUpperCase()}
            </span>
            {!mini && (
              <span className="min-w-0 flex-1">
                <span className="block text-[13px] font-medium text-fg truncate">{currentUser.name}</span>
                <span className="block text-[11px] text-muted truncate">{currentUser.email}</span>
              </span>
            )}
            {!mini && <ChevronsUpDown className="w-4 h-4 text-muted shrink-0" />}
          </button>
        </div>
      )}
    </div>
    );
  };

  return (
    <>
      <aside
        className={`hidden md:flex border-r border-line flex-col h-full shrink-0 transition-[width] duration-200 ${collapsed ? 'w-14' : 'w-60'}`}
      >
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
