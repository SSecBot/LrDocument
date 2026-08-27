'use client';

import React from 'react';
import Link from 'next/link';
import { useAppStore } from '@/store/useAppStore';
import { AdminDashboard } from '@/components/admin/AdminDashboard';
import { Sidebar } from '@/components/layout/Sidebar';
import { Header } from '@/components/layout/Header';
import { ToastContainer } from '@/components/ui/Toast';
import { CommandPalette } from '@/components/layout/CommandPalette';
import { ShieldAlert, ArrowLeft } from 'lucide-react';

export default function AdminPage() {
  const { isAuthenticated, currentUser, isLoadingAuth } = useAppStore();

  if (isLoadingAuth) {
    return (
      <div className="h-screen w-screen bg-[#0d0e12] flex items-center justify-center text-white">
        <div className="flex flex-col items-center gap-3">
          <div className="w-8 h-8 border-2 border-emerald-500 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-neutral-400">Yönetici yetkileri kontrol ediliyor...</p>
        </div>
      </div>
    );
  }

  if (!isAuthenticated || currentUser?.role !== 'ADMIN') {
    return (
      <div className="h-screen w-screen bg-[#0d0e12] flex items-center justify-center p-4 text-white">
        <div className="max-w-md w-full p-8 rounded-2xl bg-[#161820] border border-rose-500/30 text-center space-y-4 shadow-2xl">
          <div className="w-16 h-16 rounded-full bg-rose-500/10 border border-rose-500/30 text-rose-400 mx-auto flex items-center justify-center">
            <ShieldAlert className="w-8 h-8" />
          </div>
          <h2 className="text-xl font-bold text-white">Yetkisiz Erişim</h2>
          <p className="text-xs text-neutral-400">
            Bu yönetim paneline yalnızca <span className="font-mono text-purple-400 font-bold">ADMIN</span> rolündeki kullanıcılar erişebilir.
          </p>
          <div className="pt-2">
            <Link
              href="/"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-xs text-neutral-200 border border-neutral-700 transition-colors"
            >
              <ArrowLeft className="w-4 h-4" />
              <span>Ana Sayfaya Dön</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen w-screen overflow-hidden bg-[#121212] text-[#f5f5f0]">
      <CommandPalette />
      <ToastContainer />
      <Sidebar />
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        <Header />
        <main className="flex-1 flex overflow-hidden">
          <AdminDashboard />
        </main>
      </div>
    </div>
  );
}
