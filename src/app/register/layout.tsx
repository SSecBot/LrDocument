import type { Metadata } from 'next';
import { pageLocale, translatorFor } from '@/lib/i18n/server';

export async function generateMetadata(): Promise<Metadata> {
  const t = translatorFor(await pageLocale());
  return {
    title: t('Kayıt ol'),
    description: t('LrDocument için bireysel, öğrenci veya kurumsal kayıt talebi oluşturun; öğrencilere indirim.'),
  };
}

export default function Layout({ children }: { children: React.ReactNode }) {
  return children;
}
