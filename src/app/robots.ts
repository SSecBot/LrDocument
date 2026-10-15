import type { MetadataRoute } from 'next';
import { siteOrigin } from '@/lib/siteUrl';

export const dynamic = 'force-dynamic';

/** Public pages are indexed; the app itself (behind sign-in) and the API are not. */
export default async function robots(): Promise<MetadataRoute.Robots> {
  const origin = await siteOrigin();
  return {
    rules: { userAgent: '*', allow: '/', disallow: ['/dashboard', '/admin', '/settings', '/pending', '/api/'] },
    sitemap: `${origin}/sitemap.xml`,
    host: origin,
  };
}
