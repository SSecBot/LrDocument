import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, ensureDefaultAdmin, validatePassword } from '@/lib/auth';
import { seedDefaultUserData } from '@/lib/userSeed';
import {
  getClientIp,
  handleRouteError,
  normalizeEmail,
  normalizeName,
  rateLimit,
  readJsonObject,
  tooManyRequests,
} from '@/lib/apiUtils';

export async function POST(req: NextRequest) {
  try {
    await ensureDefaultAdmin();

    const wait = rateLimit(`register-ip:${getClientIp(req)}`, 5, 60 * 60_000);
    if (wait) return tooManyRequests(wait);

    const body = await readJsonObject(req);
    const { plan, subscriptionPlan } = body;

    if (!body.name || !body.email || !body.password) {
      return NextResponse.json({ error: 'Lütfen tüm alanları eksiksiz doldurunuz.' }, { status: 400 });
    }

    const name = normalizeName(body.name);
    if (!name) {
      return NextResponse.json({ error: 'İsim 2 ile 80 karakter arasında olmalıdır.' }, { status: 400 });
    }

    const cleanEmail = normalizeEmail(body.email);
    if (!cleanEmail) {
      return NextResponse.json({ error: 'Lütfen geçerli bir e-posta adresi giriniz.' }, { status: 400 });
    }

    const passwordError = validatePassword(body.password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing) {
      return NextResponse.json(
        { error: 'Bu e-posta adresiyle kayıtlı bir hesap zaten bulunmaktadır.' },
        { status: 400 }
      );
    }

    const planValue: 'Aylık' | 'Tek Seferlik' =
      subscriptionPlan === 'Tek Seferlik' || plan === 'lifetime' || plan === 'Tek Seferlik'
        ? 'Tek Seferlik'
        : 'Aylık';
    const subType: 'AYLIK' | 'TEK_SEFERLIK' = planValue === 'Tek Seferlik' ? 'TEK_SEFERLIK' : 'AYLIK';

    const passwordHash = await hashPassword(body.password as string);

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: cleanEmail,
          passwordHash,
          role: 'USER',
          status: 'PENDING',
          subscriptionType: subType,
          subscriptionPlan: planValue,
          paymentStatus: 'PENDING',
        },
      });
      await seedDefaultUserData(tx, user.id);
      return user;
    });

    return NextResponse.json(
      {
        success: true,
        message: 'Talebiniz oluşturuldu. Mail üzerinden iletişime geçilecektir.',
        status: 'PENDING',
        user: {
          id: newUser.id,
          name: newUser.name,
          email: newUser.email,
          role: newUser.role,
          status: newUser.status,
          subscriptionType: newUser.subscriptionType,
          subscriptionPlan: newUser.subscriptionPlan,
          paymentStatus: newUser.paymentStatus,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, 'Registration error', 'Kayıt işlemi sırasında bir sunucu hatası oluştu.');
  }
}
