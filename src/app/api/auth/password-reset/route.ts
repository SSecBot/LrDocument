import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, validateNewPassword } from '@/lib/auth';
import { findUserByLoginEmail } from '@/lib/loginEmail';
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
    // The code goes to the address that was entered: the account e-mail or a confirmed student e-mail.
    const user = await findUserByLoginEmail(email);

    if (body.action === 'send') {
      // Same limit for every address, so a "too many codes" answer does not reveal that the account exists.
      const emailWait =
        rateLimit(`pw-reset-resend:${email}`, 1, 60_000) || rateLimit(`pw-reset-email:${email}`, 5, 60 * 60_000);
      if (emailWait) return tooManyRequests(emailWait);
      if (user) {
        try {
          await issueCode(user.id, 'password-reset', email, siteHostFrom(requestHost(req)));
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
      await consumeCode(user.id, 'password-reset', body.code, email);
      await prisma.user.update({
        where: { id: user.id },
        data: {
          passwordHash: await hashPassword(body.newPassword as string),
          sessionVersion: { increment: 1 },
          // Receiving the code at the account e-mail proves that address.
          ...(email === user.email ? { emailVerifiedAt: new Date() } : {}),
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
