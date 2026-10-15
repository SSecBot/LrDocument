import type { Metadata } from 'next';
import { LegalDocument } from '@/components/landing/LegalDocument';
import { getLandingContent } from '@/lib/systemSettingsServer';

// The text is edited in Yönetici Paneli › Açılış sayfası.
export const dynamic = 'force-dynamic';

export const metadata: Metadata = { title: 'KVKK Aydınlatma Metni' };

export default async function KvkkPage() {
  const { legal } = await getLandingContent();
  return <LegalDocument title="KVKK Aydınlatma Metni" body={legal.kvkk} legal={legal} />;
}
