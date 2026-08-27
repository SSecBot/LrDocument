'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { SettingsView } from '@/components/settings/SettingsView';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ToastContainer } from '@/components/ui/Toast';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { ShieldCheck } from 'lucide-react';

export default function SettingsPage() {
  const { isAuthenticated, isLoadingAuth } = useAppStore();

  if (isLoadingAuth) {
    return (
      <div className="h-screen w-screen bg-[#0d0e12] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-neutral-400">Yükleniyor...</p>
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
          <SettingsView />
        </main>
      </div>
    </div>
  );
}
