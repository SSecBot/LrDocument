'use client';

import React from 'react';
import { useRouter } from 'next/navigation';
import { Clock, LogOut, RefreshCw } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

export default function PendingPage() {
  const router = useRouter();
  const { checkAuth, logout, isLoadingAuth } = useAppStore();

  const handleRecheck = async () => {
    await checkAuth(true);
    router.push('/');
  };

  return (
    <div className="min-h-dvh w-full bg-app flex items-center justify-center p-4 relative overflow-hidden font-sans">

      <div className="w-full max-w-md z-10 text-center space-y-5">
        <div className="inline-flex items-center justify-center w-16 h-16 rounded-xl bg-amber-500 text-white mb-2 border border-amber-400/30">
          <Clock className="w-8 h-8" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold text-white tracking-tight">Kayıt Talebiniz Alındı</h1>
          <p className="text-sm text-neutral-400">
            Hesabınız güvenlik protokolleri gereğince yönetici onayı bekliyor.
          </p>
        </div>

        <div className="bg-surface/90 border border-line backdrop-blur-xl rounded-xl p-5 space-y-4 text-left">
          <div className="p-4 rounded-lg bg-amber-500/10 border border-amber-500/20 text-amber-200 text-sm leading-relaxed">
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
              className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold transition-colors cursor-pointer disabled:opacity-50"
            >
              <RefreshCw className={`w-4 h-4 ${isLoadingAuth ? 'animate-spin' : ''}`} />
              <span>Onay Durumunu Tekrar Kontrol Et</span>
            </button>

            <button
              onClick={() => logout()}
              className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-lg bg-surface-3 hover:bg-neutral-700 text-neutral-300 text-xs font-medium border border-line-strong transition-colors cursor-pointer"
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
