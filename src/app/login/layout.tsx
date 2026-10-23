import type { Metadata } from 'next';
import { pageLocale, translatorFor } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = translatorFor(await pageLocale());
  return {
    title: t('Giriş yap'),
    description: t('LrDocument hesabınıza e-posta ve şifreyle ya da kurumsal kodunuzla giriş yapın.'),
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
