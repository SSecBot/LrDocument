'use client';

import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useAppStore } from '@/store/useAppStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { ToastContainer } from '@/components/ui/Toast';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { NotesWorkspace } from '@/components/notes/NotesWorkspace';
import { WorkWorkspace } from '@/components/tasks/WorkWorkspace';
import { CalendarWorkspace } from '@/components/calendar/CalendarWorkspace';
import { FinanceWorkspace } from '@/components/finance/FinanceWorkspace';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { SettingsView } from '@/components/settings/SettingsView';
import { AcademicWorkspace } from '@/components/academic/AcademicWorkspace';
import { CustomersWorkspace } from '@/components/customers/CustomersWorkspace';
import { TeamWorkspace } from '@/components/team/TeamWorkspace';
import { hasStudentAccess } from '@/lib/access';
import { accessOf, CORP_MODULE_LABEL, type CorpModule } from '@/lib/corporate';
import { Eye, ShieldCheck } from 'lucide-react';
import type { ActiveTab } from '@/types';

const OPENABLE_TABS = new Set(['dashboard', 'notes', 'tasks', 'calendar', 'finance', 'customers', 'academic', 'settings', 'admin']);

const TAB_MODULE: Partial<Record<string, CorpModule>> = {
  notes: 'notes',
  customers: 'customers',
  tasks: 'work',
  calendar: 'calendar',
  finance: 'finance',
};

export default function DashboardPage() {
  const router = useRouter();
  const { activeTab, isAuthenticated, isLoadingAuth, currentUser, setActiveTab } = useAppStore();

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoadingAuth, isAuthenticated, router]);

  // Shortcuts of the installed app and notification clicks open a section: /dashboard?sekme=tasks
  useEffect(() => {
    if (!isAuthenticated) return;
    const params = new URLSearchParams(window.location.search);
    const tab = params.get('sekme');
    if (tab && OPENABLE_TABS.has(tab)) {
      setActiveTab(tab as ActiveTab);
      params.delete('sekme');
      window.history.replaceState(null, '', `/dashboard${params.size ? `?${params}` : ''}`);
    }
  }, [isAuthenticated, setActiveTab]);

  if (isLoadingAuth) {
    return (
      <div className="h-dvh w-full bg-app flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-10 h-10 rounded-md bg-brand text-white flex items-center justify-center">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-5 h-5 border-2 border-line-strong border-t-fg rounded-full animate-spin" />
          <p className="text-xs text-muted">Yükleniyor…</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Kurumsal: modules hidden from this member fall back to the overview; read-only ones get a notice.
  const tabModule = TAB_MODULE[activeTab];
  const access = tabModule ? accessOf(currentUser, tabModule) : 'edit';

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-app text-fg safe-top">
      <CommandPalette />
      <ToastContainer />
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />

        {access === 'view' && tabModule && (
          <div className="shrink-0 border-b border-line bg-surface-2 px-4 py-2 text-xs text-subtle flex items-center gap-2" role="status">
            <Eye className="w-3.5 h-3.5" />
            {CORP_MODULE_LABEL[tabModule]} bölümünü görüntüleyebilirsiniz; değişiklik yetkisini kurum sahibi veya yöneticiler verir.
          </div>
        )}

        <main className="flex-1 flex overflow-hidden">
          {(activeTab === 'dashboard' || access === 'none') && <DashboardOverview />}
          {activeTab === 'notes' && access !== 'none' && <NotesWorkspace />}
          {activeTab === 'customers' && access !== 'none' && <CustomersWorkspace />}
          {activeTab === 'tasks' && access !== 'none' && <WorkWorkspace />}
          {activeTab === 'calendar' && access !== 'none' && <CalendarWorkspace />}
          {activeTab === 'finance' && access !== 'none' && <FinanceWorkspace />}
          {activeTab === 'team' && (currentUser?.orgRole === 'OWNER' || currentUser?.orgRole === 'MANAGER') && <TeamWorkspace />}
          {activeTab === 'academic' && hasStudentAccess(currentUser) && <AcademicWorkspace />}
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'admin' && currentUser?.role === 'ADMIN' && <AdminDashboard />}
        </main>
      </div>
    </div>
  );
}
