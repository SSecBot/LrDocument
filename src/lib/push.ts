import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';
import webpush from 'web-push';
import { prisma } from './prisma';
import { databaseDir } from './dataCrypto';
import { canView, parsePermissions, type CorpModule } from './corporate';

// ---------------------------------------------------------------------------
// Web Push: notifications on phones and computers even while LrDocument is closed.
//
// No account with any push provider is needed. The server signs its messages with its own VAPID key
// (created next to the database on first use, like the DKIM key) and hands them to the push service
// the browser chose (Google for Android / Chrome, Apple for iPhone, Microsoft for Windows / Edge,
// Mozilla for Firefox). The message content is end-to-end encrypted for the device.
// ---------------------------------------------------------------------------

const KEY_FILE = 'vapid-keys.json';
let vapid: { publicKey: string; privateKey: string } | null = null;

function keys() {
  if (vapid) return vapid;
  const file = path.join(databaseDir(), KEY_FILE);
  if (!existsSync(file)) {
    mkdirSync(path.dirname(file), { recursive: true });
    try {
      writeFileSync(file, JSON.stringify(webpush.generateVAPIDKeys()), { mode: 0o600, flag: 'wx' });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    }
  }
  vapid = JSON.parse(readFileSync(file, 'utf8'));
  return vapid!;
}

export function vapidPublicKey(): string {
  return keys().publicKey;
}

// ---------------------------------------------------------------------------
// VAPID "sub" (contact of the sender). Apple (iPhone / iPad / Mac Safari) refuses messages whose
// contact is not a real https address or e-mail (HTTP 403 BadJwtToken), while Google and Microsoft
// accept anything — so it must be the site's own https address: SITE_URL, otherwise the domain the
// site was opened on (remembered from requests), otherwise the admin's e-mail.
// ---------------------------------------------------------------------------

const SITE_KEY = 'pushSite';
let siteCache: string | null = null;

/** A public domain name (not localhost, not an IP address). */
function publicHost(host: string): string | null {
  const h = host.split(',')[0].trim().toLowerCase().replace(/:\d+$/, '');
  if (!/^[a-z0-9-]+(\.[a-z0-9-]+)+$/.test(h) || /^[\d.]+$/.test(h) || h.endsWith('.local') || h.endsWith('.localhost') || h.endsWith('.test')) return null;
  return h;
}

/** Remembers the domain the site is used on (called by the subscribe and admin routes). */
export async function rememberPushSite(req: Request): Promise<void> {
  const host = publicHost(req.headers.get('x-forwarded-host') || req.headers.get('host') || '');
  if (!host) return;
  const value = `https://${host}`;
  if (siteCache === value) return;
  siteCache = value;
  await prisma.systemSetting.upsert({ where: { key: SITE_KEY }, update: { value }, create: { key: SITE_KEY, value } }).catch(() => {});
}

export async function pushSubject(): Promise<string> {
  const site = process.env.SITE_URL?.trim().replace(/\/+$/, '');
  if (site && /^https:\/\/[^/]+$/.test(site)) {
    try {
      if (publicHost(new URL(site).host)) return site;
    } catch {}
  }
  if (!siteCache) {
    const row = await prisma.systemSetting.findUnique({ where: { key: SITE_KEY } }).catch(() => null);
    siteCache = row?.value ?? null;
  }
  if (siteCache) return siteCache;
  const admin = await prisma.user.findFirst({ where: { role: 'ADMIN' }, orderBy: { createdAt: 'asc' }, select: { email: true } }).catch(() => null);
  if (admin?.email && publicHost(admin.email.split('@')[1] ?? '')) return `mailto:${admin.email}`;
  return 'mailto:no-reply@lrdocument.com.tr';
}

/**
 * Push services browsers use. Subscriptions pointing anywhere else are refused, so the server can
 * never be made to send requests to an arbitrary (e.g. internal) address.
 */
const PUSH_HOSTS = [/^fcm\.googleapis\.com$/, /^android\.googleapis\.com$/, /\.notify\.windows\.com$/, /^web\.push\.apple\.com$/, /\.push\.apple\.com$/, /\.push\.services\.mozilla\.com$/, /^push\.services\.mozilla\.com$/];

export function isAllowedEndpoint(endpoint: string): boolean {
  let url: URL;
  try {
    url = new URL(endpoint);
  } catch {
    return false;
  }
  // Test hook (like MAIL_DIRECT_HOST): a local push receiver for automated tests.
  if (process.env.PUSH_TEST_ENDPOINTS === '1' && url.hostname === '127.0.0.1') return true;
  return url.protocol === 'https:' && PUSH_HOSTS.some((re) => re.test(url.hostname));
}

export interface PushPayload {
  title: string;
  body: string;
  /** Dashboard section the click opens */
  tab?: string;
  /** Same tag = the newer notification replaces the older one on the device */
  tag?: string;
}

type Sub = { id: string; endpoint: string; p256dh: string; auth: string };

/** Which push service (and so which kind of device) a subscription belongs to. */
export function pushServiceOf(endpoint: string): string {
  let host = '';
  try {
    host = new URL(endpoint).hostname;
  } catch {}
  if (/googleapis\.com$/.test(host)) return 'Google (Android, Chrome)';
  if (/push\.apple\.com$/.test(host)) return 'Apple (iPhone, iPad, Mac Safari)';
  if (/notify\.windows\.com$/.test(host)) return 'Microsoft (Windows, Edge)';
  if (/mozilla\.com$/.test(host)) return 'Mozilla (Firefox)';
  return 'Diğer';
}

const STATUS_KEY = 'pushStatus';
export interface PushStatus {
  lastOkAt?: string;
  lastErrorAt?: string;
  lastError?: string;
}

async function recordStatus(patch: PushStatus) {
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: STATUS_KEY } });
    const value = JSON.stringify({ ...(row ? (JSON.parse(row.value) as PushStatus) : {}), ...patch });
    await prisma.systemSetting.upsert({ where: { key: STATUS_KEY }, update: { value }, create: { key: STATUS_KEY, value } });
  } catch {}
}

export async function getPushStatus(): Promise<PushStatus> {
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: STATUS_KEY } });
    return row ? (JSON.parse(row.value) as PushStatus) : {};
  } catch {
    return {};
  }
}

/** Sends to the given devices; subscriptions the push service no longer knows are deleted. */
export async function sendPush(subs: Sub[], payload: PushPayload): Promise<number> {
  if (!subs.length) return 0;
  const { publicKey, privateKey } = keys();
  const sub = await pushSubject();
  const body = JSON.stringify({ ...payload, title: payload.title.slice(0, 120), body: payload.body.slice(0, 240) });
  let sent = 0;
  let lastError: string | null = null;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification({ endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } }, body, {
          vapidDetails: { subject: sub, publicKey, privateKey },
          TTL: 12 * 60 * 60,
          urgency: 'normal',
          timeout: 10_000,
        });
        sent++;
        await prisma.pushSubscription.update({ where: { id: s.id }, data: { lastOkAt: new Date() } }).catch(() => {});
      } catch (err) {
        const status = (err as { statusCode?: number }).statusCode;
        if (status === 404 || status === 410) await prisma.pushSubscription.delete({ where: { id: s.id } }).catch(() => {});
        else {
          const detail = String((err as { body?: string }).body ?? (err as Error).message ?? '').slice(0, 120);
          lastError = `${pushServiceOf(s.endpoint)}: ${status ? `HTTP ${status}` : 'bağlantı kurulamadı'} — ${detail}`;
          if (status === 403 && /apple/.test(s.endpoint)) lastError += ` (gönderici adresi: ${sub}; sunucuda SITE_URL=https://alanadiniz olarak ayarlayın)`;
          console.warn(`[push] gönderilemedi: ${lastError}`);
        }
      }
    })
  );
  if (sent) await recordStatus({ lastOkAt: new Date().toISOString() });
  if (lastError) await recordStatus({ lastErrorAt: new Date().toISOString(), lastError });
  return sent;
}

/** Devices of one person of an account ("owner" or a member id), for their private ("Şahsi") records. */
export async function personDevices(ownerId: string, who: string): Promise<Sub[]> {
  return prisma.pushSubscription.findMany({
    where: { userId: ownerId, memberId: who === 'owner' ? null : who },
    select: { id: true, endpoint: true, p256dh: true, auth: true },
  });
}

/**
 * Devices of an account that may see a module: the owner's devices, plus (kurumsal) the devices of
 * members whose permissions allow it. `exclude` skips the person who made the change.
 */
export async function workspaceDevices(ownerId: string, module: CorpModule | null, exclude?: { memberId: string | null }): Promise<Sub[]> {
  const subs = await prisma.pushSubscription.findMany({ where: { userId: ownerId }, select: { id: true, endpoint: true, p256dh: true, auth: true, memberId: true } });
  if (!subs.length) return [];
  const memberIds = [...new Set(subs.map((s) => s.memberId).filter((x): x is string => !!x))];
  const members = memberIds.length
    ? await prisma.orgMember.findMany({ where: { id: { in: memberIds }, ownerId }, select: { id: true, permissions: true } })
    : [];
  const perms = new Map(members.map((m) => [m.id, parsePermissions(m.permissions)]));
  return subs.filter((s) => {
    if (exclude && (s.memberId ?? null) === exclude.memberId) return false;
    if (!s.memberId) return true;
    const p = perms.get(s.memberId);
    if (!p) return false; // removed member
    return !module || canView({ accountType: 'CORPORATE', permissions: p }, module);
  });
}
