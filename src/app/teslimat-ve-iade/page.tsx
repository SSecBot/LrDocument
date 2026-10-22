import type { Metadata } from 'next';
import { LegalDocument } from '@/components/landing/LegalDocument';
import { getLandingContent } from '@/lib/systemSettingsServer';

// The text is edited in Yönetici Paneli › Açılış sayfası.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'Teslimat ve İade Şartları' };

export default async function DeliveryPage() {
  const { legal } = await getLandingContent();
  return <LegalDocument title="Teslimat ve İade Şartları" body={legal.delivery} legal={legal} />;
}
