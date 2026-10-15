import { headers } from 'next/headers';

/**
 * Public origin of the site (https://alanadi.com) for canonical URLs, sitemaps and link previews:
 * SITE_URL when set, otherwise the host the request came in on (nginx passes it through).
 */
export async function siteOrigin(): Promise<string> {
  const fromEnv = process.env.SITE_URL?.trim().replace(/\/+$/, '');
  if (fromEnv && /^https?:\/\/[^/]+$/.test(fromEnv)) return fromEnv;
  const h = await headers();
  const host = (h.get('x-forwarded-host') || h.get('host') || 'localhost:3000').split(',')[0].trim();
  const safeHost = /^[a-z0-9.-]+(:\d+)?$/i.test(host) ? host : 'localhost:3000';
  const proto = h.get('x-forwarded-proto')?.split(',')[0].trim() || (/^(localhost|127\.)/.test(safeHost) ? 'http' : 'https');
  return `${proto === 'http' ? 'http' : 'https'}://${safeHost}`;
}
