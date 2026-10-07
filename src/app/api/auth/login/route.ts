import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, signSessionToken, ensureDefaultAdmin, setSessionCookie } from '@/lib/auth';
import { getClientIp, handleRouteError, rateLimit, readJsonObject, tooManyRequests } from '@/lib/apiUtils';

const INVALID_CREDENTIALS = 'Geçersiz e-posta veya şifre girdiniz.';

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

    const token = await signSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role === 'ADMIN' ? 'ADMIN' : 'USER',
      status: 'APPROVED',
      sv: user.sessionVersion,
    });

    const response = NextResponse.json({
      success: true,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    return handleRouteError(error, 'Login error', 'Giriş yapılırken bir sunucu hatası oluştu.');
  }
}
