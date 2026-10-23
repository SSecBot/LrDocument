'use client';

import { t, tx } from '@/lib/i18n';
import React, { useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { SpaceContext, useAppStore } from '@/store/useAppStore';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { Shortcuts } from '@/components/layout/Shortcuts';
import { WelcomeGuide } from '@/components/layout/WelcomeGuide';
import { InstallReminder } from '@/components/layout/InstallReminder';
import { ToastContainer } from '@/components/ui/Toast';
import dynamic from 'next/dynamic';
import { DashboardOverview } from '@/components/dashboard/DashboardOverview';
import { hasStudentAccess } from '@/lib/access';
import { accessOf, CORP_MODULE_LABEL, type CorpModule } from '@/lib/corporate';
import { Eye, ShieldCheck } from 'lucide-react';
import type { ActiveTab } from '@/types';

// Cold start: only the open section is downloaded; the others load on first use (and are fetched
// in the background once the app is idle, so switching sections stays instant).
const SECTIONS = {
  notes: () => import('@/components/notes/NotesWorkspace').then((m) => m.NotesWorkspace),
  tasks: () => import('@/components/tasks/WorkWorkspace').then((m) => m.WorkWorkspace),
  calendar: () => import('@/components/calendar/CalendarWorkspace').then((m) => m.CalendarWorkspace),
  finance: () => import('@/components/finance/FinanceWorkspace').then((m) => m.FinanceWorkspace),
  customers: () => import('@/components/customers/CustomersWorkspace').then((m) => m.CustomersWorkspace),
  team: () => import('@/components/team/TeamWorkspace').then((m) => m.TeamWorkspace),
  academic: () => import('@/components/academic/AcademicWorkspace').then((m) => m.AcademicWorkspace),
  settings: () => import('@/components/settings/SettingsView').then((m) => m.SettingsView),
  admin: () => import('@/components/admin/AdminDashboard').then((m) => m.AdminDashboard),
};
function SectionLoading() {
  return (
    <div className="flex-1 flex items-center justify-center" role="status" aria-label={t('Yükleniyor…')}>
      <div className="w-5 h-5 border-2 border-line-strong border-t-fg rounded-full animate-spin" />
    </div>
  );
}
const NotesWorkspace = dynamic(SECTIONS.notes, { ssr: false, loading: SectionLoading });
const WorkWorkspace = dynamic(SECTIONS.tasks, { ssr: false, loading: SectionLoading });
const CalendarWorkspace = dynamic(SECTIONS.calendar, { ssr: false, loading: SectionLoading });
const FinanceWorkspace = dynamic(SECTIONS.finance, { ssr: false, loading: SectionLoading });
const CustomersWorkspace = dynamic(SECTIONS.customers, { ssr: false, loading: SectionLoading });
const TeamWorkspace = dynamic(SECTIONS.team, { ssr: false, loading: SectionLoading });
const AcademicWorkspace = dynamic(SECTIONS.academic, { ssr: false, loading: SectionLoading });
const SettingsView = dynamic(SECTIONS.settings, { ssr: false, loading: SectionLoading });
const AdminDashboard = dynamic(SECTIONS.admin, { ssr: false, loading: SectionLoading });

const OPENABLE_TABS = new Set(['dashboard', 'notes', 'personalNotes', 'tasks', 'calendar', 'finance', 'personalFinance', 'customers', 'team', 'academic', 'settings', 'admin']);

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

  // Once the first screen is up and the browser is idle, fetch the other sections' code.
  useEffect(() => {
    if (!isAuthenticated) return;
    const sections = [SECTIONS.notes, SECTIONS.tasks, SECTIONS.calendar, SECTIONS.finance, SECTIONS.settings];
    if (currentUser?.accountType === 'STUDENT') sections.unshift(SECTIONS.academic);
    if (currentUser?.accountType === 'CORPORATE') sections.push(SECTIONS.customers, SECTIONS.team);
    const idle = window.requestIdleCallback ?? ((fn: () => void) => window.setTimeout(fn, 2500));
    const cancel = window.cancelIdleCallback ?? window.clearTimeout;
    const id = idle(() => sections.forEach((load) => void load().catch(() => {})));
    return () => cancel(id as number);
  }, [isAuthenticated, currentUser?.accountType]);

  if (isLoadingAuth) {
    return (
      <div className="h-dvh w-full bg-app flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-10 h-10 rounded-md bg-brand text-white flex items-center justify-center">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-5 h-5 border-2 border-line-strong border-t-fg rounded-full animate-spin" />
          <p className="text-xs text-muted">{t('Yükleniyor…')}</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  // Kurumsal: modules hidden from this member fall back to the overview; read-only ones get a notice.
  const tabModule = TAB_MODULE[activeTab];
  const corporate = currentUser?.accountType === 'CORPORATE';
  const access = tabModule ? accessOf(currentUser, tabModule) : 'edit';

  return (
    <div className="app-shell flex h-dvh w-full overflow-hidden bg-app text-fg safe-top">
      <CommandPalette />
      <Shortcuts />
      <WelcomeGuide />
      <InstallReminder />
      <ToastContainer />
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />

        {access === 'view' && tabModule && (
          <div className="shrink-0 border-b border-line bg-surface-2 px-4 py-2 text-xs text-subtle flex items-center gap-2" role="status">
            <Eye className="w-3.5 h-3.5" />
            {tx(CORP_MODULE_LABEL[tabModule])}{' '}{t('bölümünü görüntüleyebilirsiniz; değişiklik yetkisini kurum sahibi veya yöneticiler verir.')}
          </div>
        )}

        <main className="flex-1 flex overflow-hidden">
          {(activeTab === 'dashboard' || access === 'none') && <DashboardOverview />}
          {activeTab === 'notes' && access !== 'none' && <NotesWorkspace />}
          {activeTab === 'customers' && access !== 'none' && <CustomersWorkspace />}
          {activeTab === 'tasks' && access !== 'none' && <WorkWorkspace />}
          {activeTab === 'calendar' && access !== 'none' && <CalendarWorkspace />}
          {activeTab === 'finance' && access !== 'none' && <FinanceWorkspace />}
          {/* Kurumsal "Şahsi" spaces: the same pages with the person's private records. */}
          {activeTab === 'personalNotes' && corporate && (
            <SpaceContext.Provider value="personal">
              <NotesWorkspace />
            </SpaceContext.Provider>
          )}
          {activeTab === 'personalFinance' && corporate && (
            <SpaceContext.Provider value="personal">
              <FinanceWorkspace />
            </SpaceContext.Provider>
          )}
          {activeTab === 'team' && (currentUser?.orgRole === 'OWNER' || currentUser?.orgRole === 'MANAGER') && <TeamWorkspace />}
          {activeTab === 'academic' && hasStudentAccess(currentUser) && <AcademicWorkspace />}
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'admin' && currentUser?.role === 'ADMIN' && <AdminDashboard />}
        </main>
      </div>
    </div>
  );
}
