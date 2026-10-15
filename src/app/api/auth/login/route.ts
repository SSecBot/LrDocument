import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, ensureDefaultAdmin } from '@/lib/auth';
import { activateAccount, rememberedAccounts } from '@/lib/accountSession';
import { withAccount } from '@/lib/accounts';
import { getClientIp, handleRouteError, rateLimit, readJsonObject, requestHost, tooManyRequests } from '@/lib/apiUtils';
import { getSystemSettings } from '@/lib/systemSettingsServer';
import { issueCode, maskEmail, VerificationError } from '@/lib/verification';
import { siteHostFrom } from '@/lib/mailer';
import { signLoginChallenge } from '@/lib/loginChallenge';

const INVALID_CREDENTIALS = 'Geçersiz e-posta veya şifre girdiniz.';

/**
 * E-mail + password sign-in. Order after a correct password: e-mail verification (code sent to the
 * address), account approval, then İki adımlı doğrulama (authenticator code, see /api/auth/login/2fa).
 */
export async function POST(req: NextRequest) {
  try {
    await ensureDefaultAdmin();

    const ip = getClientIp(req);
    const ipWait = rateLimit(`login-ip:${ip}`, 20, 15 * 60_000);
    if (ipWait) return tooManyRequests(ipWait);

    const body = await readJsonObject(req);
    const { email, password } = body;

    if (typeof email !== 'string' || typeof password !== 'string' || !email.trim() || !password) {
      return NextResponse.json({ error: 'Lütfen e-posta ve şifrenizi giriniz.' }, { status: 400 });
    }

    const cleanEmail = email.toLowerCase().trim().slice(0, 254);

    const emailWait = rateLimit(`login-email:${cleanEmail}`, 8, 15 * 60_000);
    if (emailWait) return tooManyRequests(emailWait);

    const user = await prisma.user.findUnique({ where: { email: cleanEmail } });

    // Always run bcrypt so response timing does not reveal whether the account exists.
    const isMatch = await comparePassword(password, user?.passwordHash);
    if (!user || !isMatch) {
      return NextResponse.json({ error: INVALID_CREDENTIALS }, { status: 401 });
    }

    // E-posta doğrulaması: the password is right, but the address was never confirmed.
    const { security } = await getSystemSettings();
    if (!user.emailVerifiedAt && user.role !== 'ADMIN' && security.requireEmailVerification) {
      let mailError: string | undefined;
      try {
        await issueCode(user.id, 'email', user.email, siteHostFrom(requestHost(req)));
      } catch (err) {
        // A code sent less than a minute ago is still valid; only report real delivery problems.
        if (err instanceof VerificationError && err.status === 502) mailError = err.message;
      }
      return NextResponse.json(
        {
          error: 'Giriş yapmadan önce e-posta adresinizi doğrulayın.',
          status: 'EMAIL_UNVERIFIED',
          email: maskEmail(user.email),
          ...(mailError ? { mailError } : {}),
        },
        { status: 403 }
      );
    }

    if (user.status === 'PENDING') {
      return NextResponse.json(
        {
          error: 'Kayıt talebiniz alındı. Yöneticinin (Admin) hesabınızı onaylaması bekleniyor.',
          status: 'PENDING',
        },
        { status: 403 }
      );
    }

    if (user.status !== 'APPROVED') {
      return NextResponse.json(
        {
          error: 'Hesap başvurunuz yönetici tarafından reddedildi. Lütfen yönetici ile iletişime geçiniz.',
          status: 'REJECTED',
        },
        { status: 403 }
      );
    }

    if (user.twoFactorEnabledAt && user.twoFactorSecret) {
      return NextResponse.json({ twoFactorRequired: true, challenge: await signLoginChallenge(user.id, user.sessionVersion) });
    }

    const response = NextResponse.json({
      success: true,
      user: { id: user.id, name: user.name, email: user.email, role: user.role, status: user.status },
    });
    // Signing in keeps the other accounts remembered on this browser (Hesap ekle).
    const { list } = await rememberedAccounts();
    await activateAccount(response, { userId: user.id, role: user.role, sessionVersion: user.sessionVersion }, withAccount(list, { userId: user.id, sv: user.sessionVersion }));
    return response;
  } catch (error) {
    return handleRouteError(error, 'Login error', 'Giriş yapılırken bir sunucu hatası oluştu.');
  }
}
