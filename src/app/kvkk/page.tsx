import type { Metadata } from 'next';
import { LegalDocument } from '@/components/landing/LegalDocument';
import { getLandingContent } from '@/lib/systemSettingsServer';
import { initRequestLocale, translatorFor } from '@/lib/i18n/server';

// The text is edited in Yönetici Paneli › Açılış sayfası.
export const dynamic = 'force-dynamic';

export async function generateMetadata(): Promise<Metadata> {
  return { title: translatorFor(await initRequestLocale())('KVKK Aydınlatma Metni') };
}

export default async function KvkkPage() {
  await initRequestLocale();
  const { legal } = await getLandingContent();
  return <LegalDocument title="KVKK Aydınlatma Metni" body={legal.kvkk} legal={legal} />;
}
