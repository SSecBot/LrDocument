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
import { hasStudentAccess } from '@/lib/access';
import { ShieldCheck } from 'lucide-react';

export default function DashboardPage() {
  const router = useRouter();
  const { activeTab, isAuthenticated, isLoadingAuth, currentUser } = useAppStore();

  useEffect(() => {
    if (!isLoadingAuth && !isAuthenticated) {
      router.push('/login');
    }
  }, [isLoadingAuth, isAuthenticated, router]);

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

  return (
    <div className="flex h-dvh w-full overflow-hidden bg-app text-fg">
      <CommandPalette />
      <ToastContainer />
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />

        <main className="flex-1 flex overflow-hidden">
          {activeTab === 'dashboard' && <DashboardOverview />}
          {activeTab === 'notes' && <NotesWorkspace />}
          {activeTab === 'tasks' && <WorkWorkspace />}
          {activeTab === 'calendar' && <CalendarWorkspace />}
          {activeTab === 'finance' && <FinanceWorkspace />}
          {activeTab === 'academic' && hasStudentAccess(currentUser) && <AcademicWorkspace />}
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'admin' && currentUser?.role === 'ADMIN' && <AdminDashboard />}
        </main>
      </div>
    </div>
  );
}
