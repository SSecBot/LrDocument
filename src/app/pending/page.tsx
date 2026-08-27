'use client';

import React from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Clock, ShieldCheck, ArrowLeft, LogOut, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export default function PendingPage() {
  const router = useRouter();
  const { checkAuth, logout, isLoadingAuth } = useAppStore();

  const handleRecheck = async () => {
    await checkAuth();
    router.push('/');
  };

  return (
    <div className="min-h-screen w-full bg-[#0d0e12] flex items-center justify-center p-4 relative overflow-hidden font-sans">
      <div className="absolute top-[-10%] right-[-10%] w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[120px] pointer-events-none" />

      <div className="w-full max-w-md z-10 text-center space-y-6">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-tr from-amber-500 to-amber-600 text-white shadow-xl shadow-amber-500/20 mb-2 border border-amber-400/30">
          <Clock className="w-8 h-8 animate-pulse" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">Kayıt Talebiniz Alındı</h1>
          <p className="text-sm text-neutral-400">
            Hesabınız güvenlik protokolleri gereğince yönetici onayı bekliyor.
          </p>
        </div>

        <div className="bg-[#16181f]/90 border border-neutral-800 backdrop-blur-xl rounded-2xl p-6 shadow-2xl space-y-4 text-left">
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm leading-relaxed">
            <p className="font-semibold text-amber-300 mb-1">Onay Bekleniyor</p>
            <p className="text-neutral-300">
              Kayıt talebiniz alındı. Yöneticinin (Admin) hesabınızı onaylaması bekleniyor.
            </p>
          </div>

          <p className="text-xs text-neutral-400 leading-relaxed">
            Yöneticiniz hesabınızı onayladığında, kişiselleştirilmiş izole çalışma alanınıza hemen erişebilirsiniz.
          </p>

          <div className="pt-2 flex flex-col gap-2">
            <button
              onClick={handleRecheck}
              disabled={isLoadingAuth}
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold shadow-lg shadow-emerald-600/20 transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingAuth ? 'animate-spin' : ''}`} />
              <span>Onay Durumunu Tekrar Kontrol Et</span>
            </button>

            <button
              onClick={() => logout()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-neutral-800 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-neutral-700 transition-colors cursor-pointer"
            >
              <LogOut className="w-4 h-4 text-neutral-400" />
              <span>Çıkış Yap / Başka Hesapla Giriş</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
