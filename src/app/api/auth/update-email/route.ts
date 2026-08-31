import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { getCurrentSession, signSessionToken, COOKIE_NAME } from '@/lib/auth';
import { z } from 'zod';

const updateEmailSchema = z.object({
  newEmail: z
    .string()
    .trim()
    .min(1, 'Lütfen yeni bir e-posta adresi giriniz.')
    .email('Lütfen geçerli bir e-posta adresi giriniz.')
    .transform((val) => val.toLowerCase()),
});

export async function POST(req: NextRequest) {
  try {
    const session = await getCurrentSession();
    if (!session) {
      return NextResponse.json({ error: 'Yetkilendirme gerekli.' }, { status: 401 });
    }

    const body = await req.json();
    const parseResult = updateEmailSchema.safeParse(body);

    if (!parseResult.success) {
      const errorMsg = parseResult.error.issues[0]?.message || 'Geçersiz e-posta adresi formatı.';
      return NextResponse.json({ error: errorMsg }, { status: 400 });
    }

    const { newEmail } = parseResult.data;

    // Check if new email is identical to current
    if (newEmail === session.email.toLowerCase()) {
      return NextResponse.json(
        { error: 'Girdiğiniz e-posta adresi mevcut e-posta adresiniz ile aynıdır.' },
        { status: 400 }
      );
    }

    // Database-level uniqueness check
    const existingUser = await prisma.user.findUnique({
      where: { email: newEmail },
    });

    if (existingUser && existingUser.id !== session.userId) {
      return NextResponse.json(
        { error: 'Bu e-posta adresi başka bir hesap tarafından kullanılmaktadır.' },
        { status: 409 }
      );
    }

    // Persist updated email to database
    const updatedUser = await prisma.user.update({
      where: { id: session.userId },
      data: { email: newEmail },
    });

    // Re-issue JWT session token with updated email
    const token = await signSessionToken({
      userId: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name,
      role: updatedUser.role as 'ADMIN' | 'USER',
      status: updatedUser.status as 'APPROVED',
      subscriptionPlan: (updatedUser.subscriptionPlan as 'Aylık' | 'Tek Seferlik') || 'Aylık',
    });

    const response = NextResponse.json({
      success: true,
      message: 'E-posta adresiniz başarıyla güncellendi.',
      user: {
        id: updatedUser.id,
        email: updatedUser.email,
        name: updatedUser.name,
        role: updatedUser.role,
        status: updatedUser.status,
        subscriptionPlan: updatedUser.subscriptionPlan,
      },
    });

    response.cookies.set({
      name: COOKIE_NAME,
      value: token,
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
    });

    return response;
  } catch (error) {
    console.error('Update email error:', error);
    return NextResponse.json(
      { error: 'E-posta güncellenirken sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}
