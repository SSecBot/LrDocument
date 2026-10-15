import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, validateNewPassword } from '@/lib/auth';
import { getClientIp, handleRouteError, normalizeEmail, rateLimit, readJsonObject, requestHost, tooManyRequests } from '@/lib/apiUtils';
import { consumeCode, issueCode, VerificationError } from '@/lib/verification';
import { siteHostFrom } from '@/lib/mailer';

const GENERIC = 'Bu adresle kayıtlı bir hesap varsa şifre sıfırlama kodu gönderildi.';

/**
 * Şifremi unuttum:
 *  { action: 'send', email }                       → a code is e-mailed (same answer whether or not the account exists)
 *  { action: 'reset', email, code, newPassword }   → new password; every open session ends
 * İki adımlı doğrulama stays on: the next sign-in still asks for the authenticator code.
 */
export async function POST(req: NextRequest) {
  try {
    const wait = rateLimit(`pw-reset-ip:${getClientIp(req)}`, 15, 15 * 60_000);
    if (wait) return tooManyRequests(wait);

    const body = await readJsonObject(req, 2048);
    const email = normalizeEmail(body.email);
    if (!email) return NextResponse.json({ error: 'Geçerli bir e-posta adresi girin.' }, { status: 400 });
    const user = await prisma.user.findUnique({ where: { email }, select: { id: true, email: true } });

    if (body.action === 'send') {
      if (user) {
        try {
          await issueCode(user.id, 'password-reset', user.email, siteHostFrom(requestHost(req)));
        } catch (err) {
          // Rate limits are reported; delivery problems are not (that would confirm the account exists).
          if (err instanceof VerificationError && err.status === 429) return NextResponse.json({ error: err.message }, { status: 429 });
          if (!(err instanceof VerificationError)) throw err;
        }
      }
      return NextResponse.json({ success: true, message: GENERIC });
    }

    if (body.action === 'reset') {
      if (!user) return NextResponse.json({ error: 'Kod hatalı veya süresi doldu.' }, { status: 400 });
      const passwordError = await validateNewPassword(body.newPassword);
      if (passwordError) return NextResponse.json({ error: passwordError }, { status: 400 });
      await consumeCode(user.id, 'password-reset', body.code, user.email);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await hashPassword(body.newPassword as string),
          sessionVersion: { increment: 1 },
          // Receiving the code proves the address.
          emailVerifiedAt: new Date(),
        },
      });
      return NextResponse.json({ success: true, message: 'Şifreniz güncellendi. Yeni şifrenizle giriş yapabilirsiniz.' });
    }

    return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 });
  } catch (error) {
    if (error instanceof VerificationError) return NextResponse.json({ error: error.message }, { status: error.status });
    return handleRouteError(error, 'Password reset error', 'Şifre sıfırlanamadı.');
  }
}
