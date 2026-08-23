'use client';

import React from 'react';
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

export default function HomePage() {
  const { activeTab } = useAppStore();

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#121212] text-[#f5f5f0]">
      {/* Global Command Palette (Ctrl+K) */}
      <CommandPalette />

      {/* Global Toasts */}
      <ToastContainer />

      {/* Left Navigation Sidebar */}
      <Sidebar />

      {/* Main App Workspace */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Top Header */}
        <Header />

        {/* Dynamic Module View */}
        <main className="flex-1 flex overflow-hidden">
          {activeTab === 'dashboard' && <DashboardOverview />}
          {activeTab === 'notes' && <NotesWorkspace />}
          {activeTab === 'scripts' && <ScriptsWorkspace />}
          {activeTab === 'kanban' && <KanbanWorkspace />}
          {activeTab === 'media' && <MediaWorkspace />}
          {activeTab === 'tasks' && <TasksWorkspace />}
          {activeTab === 'calendar' && <CalendarWorkspace />}
          {activeTab === 'finance' && <FinanceWorkspace />}
        </main>
      </div>
    </div>
  );
}
