import type { Metadata } from 'next';
import { pageLocale, translatorFor } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = translatorFor(await pageLocale());
  return {
    title: t('Çalışma alanı'),
    robots: { index: false, follow: false },
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
