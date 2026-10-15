import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentSession } from '@/lib/auth';
import { getClientIp, handleRouteError, normalizeEmail, rateLimit, readJsonObject, tooManyRequests } from '@/lib/apiUtils';
import { consumeCode, isAcademicEmail, VerificationError } from '@/lib/verification';

/**
 * Confirms the account e-mail with the code sent to it. Works signed in (Ayarlar) and signed out
 * (right after registering, or when sign-in asked for it) — then the address identifies the account.
 */
export async function POST(req: NextRequest) {
  try {
    const wait = rateLimit(`verify-email-ip:${getClientIp(req)}`, 30, 15 * 60_000);
    if (wait) return tooManyRequests(wait);

    const body = await readJsonObject(req, 2048);
    const session = await getCurrentSession();
    let userId: string | null = null;
    if (session && !session.memberId) userId = session.userId;
    else {
      const email = normalizeEmail(body.email);
      if (!email) return NextResponse.json({ error: 'Geçerli bir e-posta adresi girin.' }, { status: 400 });
      const user = await prisma.user.findUnique({ where: { email }, select: { id: true } });
      // Same message as a wrong code, so the endpoint does not reveal which addresses exist.
      if (!user) return NextResponse.json({ error: 'Kod hatalı veya süresi doldu.' }, { status: 400 });
      userId = user.id;
    }

    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, status: true, emailVerifiedAt: true, studentProfile: { select: { studentEmail: true, verifiedAt: true } } },
    });
    if (!user) return NextResponse.json({ error: 'Kod hatalı veya süresi doldu.' }, { status: 400 });
    if (user.emailVerifiedAt) return NextResponse.json({ success: true, alreadyVerified: true, status: user.status });

    await consumeCode(user.id, 'email', body.code, user.email);
    const now = new Date();
    await prisma.user.update({ where: { id: user.id }, data: { emailVerifiedAt: now } });

    // A student who signed up with the university address has proven it as well.
    const sp = user.studentProfile;
    if (sp && !sp.verifiedAt && sp.studentEmail.toLowerCase() === user.email.toLowerCase() && isAcademicEmail(user.email)) {
      await prisma.studentProfile.update({ where: { userId: user.id }, data: { verifiedAt: now, verifyMethod: 'email', documentStatus: null } });
    }
    return NextResponse.json({ success: true, status: user.status });
  } catch (error) {
    if (error instanceof VerificationError) return NextResponse.json({ error: error.message }, { status: error.status });
    return handleRouteError(error, 'Verify email error', 'Doğrulama sırasında bir hata oluştu.');
  }
}
