import type { Metadata } from 'next';
import { LegalDocument } from '@/components/landing/LegalDocument';
import { getLandingContent } from '@/lib/systemSettingsServer';

// The text is edited in Yönetici Paneli › Açılış sayfası.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Gizlilik Politikası' };

export default async function PrivacyPage() {
  const { legal } = await getLandingContent();
  return <LegalDocument title="Gizlilik Politikası" body={legal.privacy} legal={legal} />;
}
