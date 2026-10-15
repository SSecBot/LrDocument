import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, requireAccountOwner, setSessionCookie, signSessionToken, sessionMaxAgeSeconds } from '@/lib/auth';
import { handleRouteError, rateLimit, readJsonObject, requestHost, tooManyRequests } from '@/lib/apiUtils';
import { consumeCode, issueCode, maskEmail, VerificationError } from '@/lib/verification';
import { siteHostFrom } from '@/lib/mailer';
import { z } from 'zod';

const updateEmailSchema = z.object({
  newEmail: z
    .string()
    .trim()
    .min(1, 'Lütfen yeni bir e-posta adresi giriniz.')
    .max(254, 'E-posta adresi çok uzun.')
    .email('Lütfen geçerli bir e-posta adresi giriniz.')
    .transform((val) => val.toLowerCase()),
  currentPassword: z.string().optional(),
  code: z.string().optional(),
});

/**
 * Two steps: (1) new address + current password → a code is sent to the new address;
 * (2) new address + code → the address changes (and counts as verified).
 */
export async function POST(req: Request) {
  try {
    const session = await requireAccountOwner();

    const wait = rateLimit(`update-email:${session.userId}`, 10, 15 * 60_000);
    if (wait) return tooManyRequests(wait);

    const parseResult = updateEmailSchema.safeParse(await readJsonObject(req));
    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || 'Geçersiz e-posta adresi formatı.';
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { newEmail, currentPassword, code } = parseResult.data;

    if (newEmail === session.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Girdiğiniz e-posta adresi mevcut e-posta adresiniz ile aynıdır.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    const existingUser = await prisma.user.findUnique({ where: { email: newEmail } });
    if (existingUser && existingUser.id !== session.userId) {
      return NextResponse.json(
        { error: 'Bu e-posta adresi başka bir hesap tarafından kullanılmaktadır.' },
        { status: 409 }
      );
    }

    if (!code) {
      // Changing the login e-mail is account-takeover sensitive: require the current password.
      if (!currentPassword || !(await comparePassword(currentPassword, user.passwordHash))) {
        return NextResponse.json(
          { error: 'E-posta adresini değiştirmek için mevcut şifrenizi doğru giriniz.' },
          { status: 400 }
        );
      }
      await issueCode(user.id, 'email-change', newEmail, siteHostFrom(requestHost(req)));
      return NextResponse.json({ success: true, codeSent: true, message: `Doğrulama kodu ${maskEmail(newEmail)} adresine gönderildi.` });
    }

    await consumeCode(user.id, 'email-change', code, newEmail);
    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: { email: newEmail, emailVerifiedAt: new Date() },
    });

    const maxAge = await sessionMaxAgeSeconds();
    const token = await signSessionToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role === 'ADMIN' ? 'ADMIN' : 'USER',
      status: 'APPROVED',
      subscriptionPlan: (updatedUser.subscriptionPlan as 'Aylık' | 'Tek Seferlik') || 'Aylık',
      sv: updatedUser.sessionVersion,
    }, maxAge);

    const response = NextResponse.json({
      success: true,
      message: 'E-posta adresiniz doğrulandı ve güncellendi.',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        status: updatedUser.status,
        subscriptionPlan: updatedUser.subscriptionPlan,
      },
    });
    setSessionCookie(response, token, maxAge);
    return response;
  } catch (error) {
    if (error instanceof VerificationError) return NextResponse.json({ error: error.message }, { status: error.status });
    return handleRouteError(error, 'Update email error', 'E-posta güncellenirken sunucu hatası oluştu.');
  }
}
