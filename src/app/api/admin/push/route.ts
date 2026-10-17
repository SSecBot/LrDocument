import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { handleRouteError, rateLimit, readJsonObject, tooManyRequests } from '@/lib/apiUtils';
import { getPushStatus, pushServiceOf, sendPush } from '@/lib/push';
import { getSweepInfo, runReminderSweep } from '@/lib/pushReminders';

/** Short device description from the browser's user agent. */
function deviceName(ua: string | null): string {
  const s = ua ?? '';
  const os = /iPhone/.test(s) ? 'iPhone' : /iPad/.test(s) ? 'iPad' : /Android/.test(s) ? 'Android' : /Windows/.test(s) ? 'Windows' : /Mac OS X/.test(s) ? 'Mac' : /Linux/.test(s) ? 'Linux' : 'Cihaz';
  const browser = /Edg\//.test(s) ? 'Edge' : /OPR\//.test(s) ? 'Opera' : /Firefox\//.test(s) ? 'Firefox' : /Chrome\//.test(s) ? 'Chrome' : /Safari\//.test(s) ? 'Safari' : '';
  return browser ? `${os} · ${browser}` : os;
}

/** Bildirimler (Web Push): devices, last result, the admin's own devices. */
export async function GET() {
  try {
    const session = await requireAdmin();
    const [subs, accounts, status, sweep] = await Promise.all([
      prisma.pushSubscription.findMany({ select: { endpoint: true } }),
      prisma.pushSubscription.findMany({ distinct: ['userId'], select: { userId: true } }),
      getPushStatus(),
      getSweepInfo(),
    ]);
    const byService: Record<string, number> = {};
    for (const s of subs) byService[pushServiceOf(s.endpoint)] = (byService[pushServiceOf(s.endpoint)] ?? 0) + 1;
    const mine = await prisma.pushSubscription.findMany({
      where: { userId: session.userId, memberId: null },
      orderBy: { createdAt: 'desc' },
      select: { id: true, endpoint: true, userAgent: true, createdAt: true, lastOkAt: true },
    });
    return NextResponse.json(
      {
        total: subs.length,
        accounts: accounts.length,
        byService,
        status,
        sweep,
        myDevices: mine.map((d) => ({
          id: d.id,
          name: deviceName(d.userAgent),
          service: pushServiceOf(d.endpoint),
          createdAt: d.createdAt.toISOString(),
          lastOkAt: d.lastOkAt?.toISOString() ?? null,
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error, 'Push status error', 'Bildirim durumu alınamadı.');
  }
}

/**
 * { action: 'test' }  → a test notification to every device of the signed-in admin
 * { action: 'sweep' } → runs the reminder check now (also outside 08:00–22:00); each reminder is still sent once
 */
export async function POST(req: Request) {
  try {
    const session = await requireAdmin();
    const wait = rateLimit(`push-admin:${session.userId}`, 10, 15 * 60_000);
    if (wait) return tooManyRequests(wait);
    const body = await readJsonObject(req, 1024);

    if (body.action === 'test') {
      const devices = await prisma.pushSubscription.findMany({
        where: { userId: session.userId, memberId: null },
        select: { id: true, endpoint: true, p256dh: true, auth: true },
      });
      if (!devices.length) {
        return NextResponse.json(
          { error: 'Hesabınızda bildirimleri açık cihaz yok. Önce bu cihazda (veya telefonunuzda) Ayarlar › Tercihler › Telefon ve bilgisayar bildirimleri’ni açın.' },
          { status: 400 }
        );
      }
      const sent = await sendPush(devices, {
        title: 'LrDocument test bildirimi',
        body: `Bildirimler çalışıyor · ${new Date().toLocaleTimeString('tr-TR', { timeZone: 'Europe/Istanbul', hour: '2-digit', minute: '2-digit' })}`,
        tab: 'admin',
        tag: 'lr-admin-test',
      });
      if (!sent) {
        const status = await getPushStatus();
        return NextResponse.json({ error: `Bildirim gönderilemedi. ${status.lastError ?? ''}`.trim() }, { status: 502 });
      }
      return NextResponse.json({ success: true, message: `${sent} / ${devices.length} cihaza gönderildi. Birkaç saniye içinde gelmeli.` });
    }

    if (body.action === 'sweep') {
      const sent = await runReminderSweep({ ignoreHours: true });
      return NextResponse.json({
        success: true,
        message: sent ? `${sent} hatırlatma bildirimi gönderildi.` : 'Gönderilecek yeni hatırlatma yok (her hatırlatma bir kez gönderilir).',
      });
    }

    return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 });
  } catch (error) {
    return handleRouteError(error, 'Push admin error', 'İşlem yapılamadı.');
  }
}
