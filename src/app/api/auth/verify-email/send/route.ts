import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentSession } from '@/lib/auth';
import { getClientIp, handleRouteError, normalizeEmail, rateLimit, readJsonObject, requestHost, tooManyRequests } from '@/lib/apiUtils';
import { issueCode, maskEmail, VerificationError } from '@/lib/verification';
import { siteHostFrom } from '@/lib/mailer';

const GENERIC = 'Adres kayıtlı ve doğrulanmamışsa yeni bir kod gönderildi.';

/** (Re)sends the account e-mail verification code. */
export async function POST(req: NextRequest) {
  try {
    const wait = rateLimit(`verify-send-ip:${getClientIp(req)}`, 10, 15 * 60_000);
    if (wait) return tooManyRequests(wait);

    const body = await readJsonObject(req, 1024).catch(() => ({}) as Record<string, unknown>);
    const session = await getCurrentSession();
    const signedIn = !!session && !session.memberId;
    let user: { id: string; email: string; emailVerifiedAt: Date | null } | null = null;
    if (signedIn) {
      user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, email: true, emailVerifiedAt: true } });
    } else {
      const email = normalizeEmail(body.email);
      if (!email) return NextResponse.json({ error: 'Geçerli bir e-posta adresi girin.' }, { status: 400 });
      user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true, emailVerifiedAt: true } });
    }

    if (!user || user.emailVerifiedAt) {
      if (signedIn) return NextResponse.json({ success: true, alreadyVerified: true });
      return NextResponse.json({ success: true, message: GENERIC });
    }
    try {
      await issueCode(user.id, 'email', user.email, siteHostFrom(requestHost(req)));
    } catch (err) {
      // Signed out: rate-limit hints are fine, but never confirm that an address exists.
      if (err instanceof VerificationError && (signedIn || err.status !== 502)) {
        return NextResponse.json({ error: err.message }, { status: err.status });
      }
      if (!signedIn) return NextResponse.json({ success: true, message: GENERIC });
      throw err;
    }
    return NextResponse.json({ success: true, message: signedIn ? `Kod ${maskEmail(user.email)} adresine gönderildi.` : GENERIC });
  } catch (error) {
    return handleRouteError(error, 'Verify email send error', 'Kod gönderilemedi.');
  }
}
