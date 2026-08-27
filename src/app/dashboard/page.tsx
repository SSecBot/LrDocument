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
import { ScriptsWorkspace } from '@/components/scripts/ScriptsWorkspace';
import { TasksWorkspace } from '@/components/tasks/TasksWorkspace';
import { KanbanWorkspace } from '@/components/kanban/KanbanWorkspace';
import { CalendarWorkspace } from '@/components/calendar/CalendarWorkspace';
import { MediaWorkspace } from '@/components/media/MediaWorkspace';
import { FinanceWorkspace } from '@/components/finance/FinanceWorkspace';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { SettingsView } from '@/components/settings/SettingsView';
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
      <div className="h-screen w-screen bg-[#0d0e12] flex flex-col items-center justify-center text-white space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white flex items-center justify-center shadow-lg shadow-emerald-500/20 animate-pulse">
          <ShieldCheck className="w-6 h-6" />
        </div>
        <div className="flex flex-col items-center gap-2">
          <div className="w-6 h-6 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-neutral-400 font-medium">LrDocument Yükleniyor...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#121212] text-[#f5f5f0]">
      <CommandPalette />
      <ToastContainer />
      <Sidebar />

      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />

        <main className="flex-1 flex overflow-hidden">
          {activeTab === 'dashboard' && <DashboardOverview />}
          {activeTab === 'notes' && <NotesWorkspace />}
          {activeTab === 'scripts' && <ScriptsWorkspace />}
          {activeTab === 'kanban' && <KanbanWorkspace />}
          {activeTab === 'media' && <MediaWorkspace />}
          {activeTab === 'tasks' && <TasksWorkspace />}
          {activeTab === 'calendar' && <CalendarWorkspace />}
          {activeTab === 'finance' && <FinanceWorkspace />}
          {activeTab === 'settings' && <SettingsView />}
          {activeTab === 'admin' && currentUser?.role === 'ADMIN' && <AdminDashboard />}
        </main>
      </div>
    </div>
  );
}
