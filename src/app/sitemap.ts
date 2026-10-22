import type { MetadataRoute } from 'next';
import { siteOrigin } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const origin = await siteOrigin();
  const page = (path: string, priority: number, changeFrequency: 'weekly' | 'monthly' | 'yearly') => ({
    url: `${origin}${path}`,
    lastModified: new Date(),
    changeFrequency,
    priority,
  });
  return [
    page('/', 1, 'weekly'),
    page('/register', 0.8, 'monthly'),
    page('/login', 0.5, 'yearly'),
    page('/kvkk', 0.3, 'yearly'),
    page('/gizlilik', 0.3, 'yearly'),
    page('/mesafeli-satis', 0.3, 'yearly'),
    page('/teslimat-ve-iade', 0.3, 'yearly'),
    page('/kullanim-sartlari', 0.3, 'yearly'),
  ];
}
