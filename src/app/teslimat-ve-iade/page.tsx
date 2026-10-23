import type { Metadata } from 'next';
import { LegalDocument } from '@/components/landing/LegalDocument';
import { getLandingContent } from '@/lib/systemSettingsServer';
import { initRequestLocale, translatorFor } from '@/lib/i18n/server';

// The text is edited in Yönetici Paneli › Açılış sayfası.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return { title: translatorFor(await initRequestLocale())('Teslimat ve İade Şartları') };
}

export default async function DeliveryPage() {
  await initRequestLocale();
  const { legal } = await getLandingContent();
  return <LegalDocument title="Teslimat ve İade Şartları" body={legal.delivery} legal={legal} />;
}
