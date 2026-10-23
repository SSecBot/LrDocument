import { t } from '@/lib/i18n';
import { initRequestLocale } from '@/lib/i18n/server';
import Link from 'next/link';
import type { Metadata } from 'next';

export const metadata: Metadata = { robots: { index: false } };

export default async function NotFound() {
  await initRequestLocale();
  return (
    <main className="flex-1 min-h-[80vh] flex items-center justify-center p-6">
      <title>{`${t('Sayfa bulunamadı')} · LrDocument`}</title>
      <div className="max-w-md text-center">
        <p className="text-5xl font-bold text-brand tabular-nums">404</p>
        <h1 className="mt-4 text-xl font-semibold text-fg">{t('Aradığınız sayfa bulunamadı')}</h1>
        <p className="mt-2 text-sm text-subtle leading-relaxed">
          {t('Bağlantı eski ya da yanlış yazılmış olabilir. Ana sayfadan devam edebilir ya da uygulamaya giriş yapabilirsiniz.')}
        </p>
        <div className="mt-6 flex flex-wrap justify-center gap-2">
          <Link href="/dashboard" className="px-4 py-2.5 rounded-lg bg-brand text-white text-sm font-medium hover:bg-brand-hover">{t('Uygulamaya git')}</Link>
          <Link href="/" className="px-4 py-2.5 rounded-lg bg-surface border border-line text-body text-sm hover:text-fg">{t('Ana sayfa')}</Link>
        </div>
      </div>
    </main>
  );
}
