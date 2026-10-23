import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentSession } from '@/lib/auth';
import { getClientIp, handleRouteError, rateLimit, readJsonObject, tooManyRequests } from '@/lib/apiUtils';
import { LOCALES, setLocaleCookie, type Locale } from '@/lib/i18n/server';

/**
 * Changes the interface language: remembered in this browser (cookie) and, when signed in, on the
 * account so every device, push notification and e-mail follows it.
 */
export async function POST(req: NextRequest) {
  try {
    const wait = rateLimit(`locale:${getClientIp(req)}`, 30, 10 * 60_000);
    if (wait) return tooManyRequests(wait);
    const body = await readJsonObject(req, 1024);
    if (!LOCALES.includes(body.locale as Locale)) {
      return NextResponse.json({ error: 'Desteklenmeyen dil.' }, { status: 400 });
    }
    const locale = body.locale as Locale;
    const session = await getCurrentSession();
    if (session?.memberId) await prisma.orgMember.update({ where: { id: session.memberId }, data: { locale } });
    else if (session) await prisma.user.update({ where: { id: session.userId }, data: { locale } });
    const response = NextResponse.json({ success: true, locale });
    setLocaleCookie(response, locale);
    return response;
  } catch (error) {
    return handleRouteError(error, 'Locale error', 'Dil değiştirilemedi.');
  }
}
