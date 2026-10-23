import type { Metadata } from 'next';
import { LegalDocument } from '@/components/landing/LegalDocument';
import { getLandingContent } from '@/lib/systemSettingsServer';
import { initRequestLocale, translatorFor } from '@/lib/i18n/server';

// The text is edited in Yönetici Paneli › Açılış sayfası.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return { title: translatorFor(await initRequestLocale())('Gizlilik Politikası') };
}

export default async function PrivacyPage() {
  await initRequestLocale();
  const { legal } = await getLandingContent();
  return <LegalDocument title="Gizlilik Politikası" body={legal.privacy} legal={legal} />;
}
