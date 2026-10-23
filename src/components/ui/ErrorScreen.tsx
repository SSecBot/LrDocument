'use client';

import { t, tx } from '@/lib/i18n';
import { useEffect } from 'react';
import { RefreshCw, Home, WifiOff, Sparkles, AlertTriangle } from 'lucide-react';

/** What happened, in words a person can act on. */
function describe(error: unknown): { icon: React.ReactNode; title: string; text: string; reload: boolean } {
  const name = error instanceof Error ? error.name : '';
  const message = error instanceof Error ? error.message : '';
  // After an update the open tab may ask for code files that no longer exist.
  if (name === 'ChunkLoadError' || /Loading (CSS )?chunk|dynamically imported module|Importing a module script failed/i.test(message)) {
    return {
      icon: <Sparkles className="w-7 h-7 text-brand" />,
      title: t('Uygulama güncellendi'),
      text: t('Bu sekme eski sürümle açık kalmış. Sayfayı yenileyince yeni sürümle kaldığınız yerden devam edersiniz; kaydedilmiş verileriniz yerinde.'),
      reload: true,
    };
  }
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      icon: <WifiOff className="w-7 h-7 text-amber-400" />,
      title: t('İnternet bağlantısı yok'),
      text: t('Sayfa yüklenirken bağlantı kesildi. Bağlantınız gelince “Tekrar dene”ye basın; kaydedilmiş verileriniz sunucuda güvende.'),
      reload: false,
    };
  }
  return {
    icon: <AlertTriangle className="w-7 h-7 text-amber-400" />,
    title: t('Bu sayfa açılırken takıldı'),
    text: t('Beklenmedik bir durum oluştu ve sayfa görüntülenemedi. Kaydedilmiş verileriniz güvende. Önce “Tekrar dene”ye basın; olmazsa sayfayı yenileyin. Sorun sürerse Ayarlar › Destek’ten bize yazın.'),
    reload: false,
  };
}

const RELOAD_KEY = 'lr-chunk-reload';

/** Full-page fallback for a crashed page (error.tsx). */
export function ErrorScreen({ error, retry }: { error: unknown; retry: () => void }) {
  const info = describe(error);
  const digest = error instanceof Error ? (error as Error & { digest?: string }).digest : undefined;

  useEffect(() => {
    console.error(error);
    // A stale tab after a deploy: reload once by itself (not in a loop).
    if (!info.reload) return;
    try {
      if (sessionStorage.getItem(RELOAD_KEY)) return;
      sessionStorage.setItem(RELOAD_KEY, '1');
      window.location.reload();
    } catch {}
  }, [error, info.reload]);

  return (
    <main className="flex-1 min-h-[70vh] flex items-center justify-center p-6">
      <div className="max-w-md w-full text-center">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-surface border border-line flex items-center justify-center">{info.icon}</div>
        <h1 className="mt-5 text-xl font-semibold text-fg">{tx(info.title)}</h1>
        <p className="mt-2 text-sm text-subtle leading-relaxed">{tx(info.text)}</p>
        <div className="mt-6 flex flex-wrap items-center justify-center gap-2">
          {info.reload ? (
            <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover">
              <RefreshCw className="w-4 h-4" />{' '}{t('Sayfayı yenile')}
            </button>
          ) : (
            <>
              <button onClick={() => retry()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover">
                <RefreshCw className="w-4 h-4" />{' '}{t('Tekrar dene')}
              </button>
              <button onClick={() => window.location.reload()} className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg bg-surface border border-line text-body text-sm hover:text-fg">
                {t('Sayfayı yenile')}
              </button>
            </>
          )}
          <a href="/dashboard" className="inline-flex items-center gap-2 px-4 py-2.5 rounded-lg text-sm text-subtle hover:text-fg">
            <Home className="w-4 h-4" />{' '}{t('Ana sayfa')}
          </a>
        </div>
        {digest && <p className="mt-6 text-[11px] text-muted">{t('Destek için hata kodu:')}{' '}{tx(digest)}</p>}
      </div>
    </main>
  );
}
