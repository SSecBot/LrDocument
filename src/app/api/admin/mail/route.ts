import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { handleRouteError, rateLimit, requestHost, tooManyRequests } from '@/lib/apiUtils';
import { getMailStatus, recommendedDnsRecords, sendMail, siteHostFrom } from '@/lib/mailer';

/** E-posta gönderimi: last result, sending mode and the optional DNS records. */
export async function GET(req: Request) {
  try {
    await requireAdmin();
    const host = siteHostFrom(requestHost(req));
    return NextResponse.json(
      {
        host,
        mode: process.env.SMTP_URL?.trim() ? 'smtp' : 'direct',
        from: process.env.MAIL_FROM?.trim() || `LrDocument <no-reply@${host}>`,
        status: await getMailStatus(),
        dns: recommendedDnsRecords(host),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error, 'Mail status error', 'E-posta durumu alınamadı.');
  }
}

/** Sends a test message to the signed-in admin's address. */
export async function POST(req: Request) {
  try {
    const session = await requireAdmin();
    const wait = rateLimit(`mail-test:${session.userId}`, 5, 15 * 60_000);
    if (wait) return tooManyRequests(wait);
    const admin = await prisma.user.findUnique({ where: { id: session.userId }, select: { email: true } });
    if (!admin) return NextResponse.json({ error: 'Yönetici bulunamadı.' }, { status: 404 });
    try {
      await sendMail({
        to: admin.email,
        subject: 'LrDocument test e-postası',
        text: 'Bu bir test e-postasıdır. Bu iletiyi aldıysanız doğrulama e-postaları da kullanıcılarınıza ulaşır.',
        html: '<p style="font-family:Arial,sans-serif">Bu bir test e-postasıdır. Bu iletiyi aldıysanız doğrulama e-postaları da kullanıcılarınıza ulaşır.</p>',
        siteHost: siteHostFrom(requestHost(req)),
      });
    } catch (err) {
      return NextResponse.json({ error: (err as Error).message }, { status: 502 });
    }
    return NextResponse.json({ success: true, message: `Test e-postası ${admin.email} adresine gönderildi. Gelen kutusunu ve spam klasörünü kontrol edin.` });
  } catch (error) {
    return handleRouteError(error, 'Mail test error', 'Test e-postası gönderilemedi.');
  }
}
