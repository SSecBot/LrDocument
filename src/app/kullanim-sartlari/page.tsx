import type { Metadata } from 'next';
import { LegalDocument } from '@/components/landing/LegalDocument';
import { getLandingContent } from '@/lib/systemSettingsServer';

// The text is edited in Yönetici Paneli › Açılış sayfası.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Kullanım Şartları' };

export default async function TermsPage() {
  const { legal } = await getLandingContent();
  return <LegalDocument title="Kullanım Şartları" body={legal.terms} legal={legal} />;
}
