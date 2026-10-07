import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  comparePassword,
  hashPassword,
  requireAuth,
  setSessionCookie,
  signSessionToken,
  validatePassword,
} from '@/lib/auth';
import { handleRouteError, rateLimit, readJsonObject, tooManyRequests } from '@/lib/apiUtils';

export async function POST(req: Request) {
  try {
    const session = await requireAuth();

    const wait = rateLimit(`change-password:${session.userId}`, 10, 15 * 60_000);
    if (wait) return tooManyRequests(wait);

    const { currentPassword, newPassword, confirmPassword } = await readJsonObject(req);

    if (typeof currentPassword !== 'string' || typeof newPassword !== 'string' || !currentPassword || !newPassword) {
      return NextResponse.json(
        { error: 'Lütfen mevcut şifrenizi ve yeni şifrenizi giriniz.' },
        { status: 400 }
      );
    }

    if (confirmPassword !== undefined && newPassword !== confirmPassword) {
      return NextResponse.json({ error: 'Yeni şifreler birbiriyle eşleşmiyor.' }, { status: 400 });
    }

    const passwordError = validatePassword(newPassword);
    if (passwordError) {
      return NextResponse.json({ error: passwordError.replace('Şifre', 'Yeni şifre') }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    const isMatch = await comparePassword(currentPassword, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json({ error: 'Mevcut şifrenizi hatalı girdiniz.' }, { status: 400 });
    }

    // Bumping the session version signs out every other device that used the old password.
    const updated = await prisma.user.update({
      where: { id: session.userId },
      data: {
        passwordHash: await hashPassword(newPassword),
        sessionVersion: { increment: 1 },
      },
    });

    const token = await signSessionToken({
      userId: updated.id,
      email: updated.email,
      name: updated.name,
      role: updated.role === 'ADMIN' ? 'ADMIN' : 'USER',
      status: 'APPROVED',
      sv: updated.sessionVersion,
    });

    const response = NextResponse.json({
      success: true,
      message: 'Şifreniz başarıyla güncellendi. Diğer cihazlardaki oturumlar sonlandırıldı.',
    });
    setSessionCookie(response, token);
    return response;
  } catch (error) {
    return handleRouteError(error, 'Change password error', 'Şifre değiştirilirken bir hata oluştu.');
  }
}
