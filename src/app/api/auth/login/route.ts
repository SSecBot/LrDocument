import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { comparePassword, signSessionToken, ensureDefaultAdmin, COOKIE_NAME } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    await ensureDefaultAdmin();

    const body = await req.json();
    const { email, password } = body;

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Lütfen e-posta ve şifrenizi giriniz.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    const user = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'Geçersiz e-posta veya şifre girdiniz.' },
        { status: 401 }
      );
    }

    const isMatch = await comparePassword(password, user.passwordHash);
    if (!isMatch) {
      return NextResponse.json(
        { error: 'Geçersiz e-posta veya şifre girdiniz.' },
        { status: 401 }
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

    if (user.status === 'REJECTED') {
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
      role: user.role as 'ADMIN' | 'USER',
      status: user.status as 'APPROVED',
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
    console.error('Login error:', error);
    return NextResponse.json(
      { error: 'Giriş yapılırken bir sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}
