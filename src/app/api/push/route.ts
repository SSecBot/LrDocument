import { NextResponse, type NextRequest } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { getClientIp, handleRouteError, rateLimit, readJsonObject, tooManyRequests } from '@/lib/apiUtils';
import { isAllowedEndpoint, rememberPushSite, sendPush, vapidPublicKey } from '@/lib/push';

// Telefon ve bilgisayar bildirimleri (Web Push): the device's subscription is stored here; the
// server then pushes notifications to it even while the app is closed.

const subscriptionSchema = z.object({
  endpoint: z.string().url().max(1000),
  keys: z.object({
    p256dh: z.string().min(20).max(200),
    auth: z.string().min(8).max(100),
  }),
});

/** The server's public VAPID key, needed by the browser to subscribe. */
export async function GET() {
  try {
    await requireAuth();
    return NextResponse.json({ publicKey: vapidPublicKey() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleRouteError(error, 'Push key error', 'Bildirim anahtarı alınamadı.');
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    const wait = rateLimit(`push-sub:${session.memberId ?? session.userId}`, 20, 60 * 60_000);
    if (wait) return tooManyRequests(wait);
    const body = await readJsonObject(req, 4096);
    await rememberPushSite(req);
    const parsed = subscriptionSchema.safeParse(body.subscription);
    if (!parsed.success || !isAllowedEndpoint(parsed.data.endpoint)) {
      return NextResponse.json({ error: 'Bu tarayıcının bildirim aboneliği kabul edilmedi.' }, { status: 400 });
    }
    const { endpoint, keys } = parsed.data;
    const data = {
      userId: session.userId,
      memberId: session.memberId ?? null,
      p256dh: keys.p256dh,
      auth: keys.auth,
      userAgent: (req.headers.get('user-agent') ?? '').slice(0, 300) || null,
    };
    // The same device re-subscribing (or another account signing in on it) takes the endpoint over.
    const row = await prisma.pushSubscription.upsert({ where: { endpoint }, update: data, create: { endpoint, ...data } });
    // At most 10 devices per person: the oldest are dropped.
    const mine = await prisma.pushSubscription.findMany({
      where: { userId: session.userId, memberId: session.memberId ?? null },
      orderBy: { createdAt: 'desc' },
      select: { id: true },
    });
    if (mine.length > 10) await prisma.pushSubscription.deleteMany({ where: { id: { in: mine.slice(10).map((m) => m.id) } } });

    if (body.test === true) {
      await sendPush([{ id: row.id, endpoint, p256dh: keys.p256dh, auth: keys.auth }], {
        title: 'Bildirimler açık',
        body: 'Bu cihaza LrDocument bildirimleri gelecek; uygulama kapalıyken de.',
        tab: 'dashboard',
        tag: 'lr-test',
      });
    }
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, 'Push subscribe error', 'Bildirim aboneliği kaydedilemedi.');
  }
}

/**
 * Stops notifications for a device. Works without a session (it is also called right after
 * signing out); the endpoint is an unguessable address known only to that browser.
 */
export async function DELETE(req: NextRequest) {
  try {
    const wait = rateLimit(`push-unsub-ip:${getClientIp(req)}`, 60, 15 * 60_000);
    if (wait) return tooManyRequests(wait);
    const body = await readJsonObject(req, 2048).catch(() => ({}) as Record<string, unknown>);
    const endpoint = typeof body.endpoint === 'string' ? body.endpoint : '';
    if (endpoint) await prisma.pushSubscription.deleteMany({ where: { endpoint } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, 'Push unsubscribe error', 'Bildirim aboneliği kaldırılamadı.');
  }
}
