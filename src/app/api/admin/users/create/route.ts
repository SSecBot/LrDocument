import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, requireAdmin, validatePassword } from '@/lib/auth';
import { seedDefaultUserData } from '@/lib/userSeed';
import { handleRouteError, normalizeEmail, normalizeName, readJsonObject } from '@/lib/apiUtils';

export async function POST(req: Request) {
  try {
    await requireAdmin();

    const body = await readJsonObject(req);
    const { role, subscriptionPlan, status } = body;

    if (!body.name || !body.email || !body.password) {
      return NextResponse.json(
        { error: 'Lütfen isim, e-posta ve şifre alanlarını eksiksiz giriniz.' },
        { status: 400 }
      );
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

    const passwordHash = await hashPassword(body.password as string);
    const planValue = subscriptionPlan === 'Tek Seferlik' ? 'Tek Seferlik' : 'Aylık';
    const subType: 'AYLIK' | 'TEK_SEFERLIK' = planValue === 'Tek Seferlik' ? 'TEK_SEFERLIK' : 'AYLIK';
    const roleValue = role === 'ADMIN' ? 'ADMIN' : 'USER';
    const statusValue = status === 'PENDING' || status === 'REJECTED' ? status : 'APPROVED';
    const payStatus = statusValue === 'APPROVED' ? 'MANUAL_APPROVED' : 'PENDING';

    const newUser = await prisma.$transaction(async (tx) => {
      const user = await tx.user.create({
        data: {
          name,
          email: cleanEmail,
          passwordHash,
          role: roleValue,
          status: statusValue,
          subscriptionType: subType,
          subscriptionPlan: planValue,
          paymentStatus: payStatus,
        },
      });
      await seedDefaultUserData(tx, user.id);
      return user;
    });

    return NextResponse.json({
      success: true,
      user: {
        id: newUser.id,
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
        subscriptionType: newUser.subscriptionType,
        subscriptionPlan: newUser.subscriptionPlan,
        paymentStatus: newUser.paymentStatus,
        createdAt: newUser.createdAt.toISOString(),
      },
    });
  } catch (error) {
    return handleRouteError(error, 'Admin create user error', 'Kullanıcı oluşturulamadı.');
  }
}
