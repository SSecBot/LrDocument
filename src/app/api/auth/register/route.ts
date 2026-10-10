import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, ensureDefaultAdmin, validatePassword } from '@/lib/auth';
import { seedDefaultUserData } from '@/lib/userSeed';
import { studentProfileSchema } from '@/lib/studentProfile';
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

    // Optional university-student registration (half price, unlocks the course tracker).
    const isStudent = body.accountType === 'STUDENT';
    let studentProfile: ReturnType<typeof studentProfileSchema.parse> | null = null;
    if (isStudent) {
      const parsed = studentProfileSchema.safeParse(body.student ?? {});
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || 'Öğrenci bilgileri geçersiz.' },
          { status: 400 }
        );
      }
      studentProfile = parsed.data;
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
          accountType: isStudent ? 'STUDENT' : 'STANDARD',
        },
      });
      await seedDefaultUserData(tx, user.id);
      if (studentProfile) {
        await tx.studentProfile.create({ data: { userId: user.id, ...studentProfile } });
      }
      return user;
    }).catch((err: unknown) => {
      // Two simultaneous sign-ups with the same e-mail: the unique index rejects the second one.
      if ((err as { code?: string })?.code === 'P2002') return null;
      throw err;
    });
    if (!newUser) {
      return NextResponse.json(
        { error: 'Bu e-posta adresiyle kayıtlı bir hesap zaten bulunmaktadır.' },
        { status: 400 }
      );
    }

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
          accountType: newUser.accountType,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    return handleRouteError(error, 'Registration error', 'Kayıt işlemi sırasında bir sunucu hatası oluştu.');
  }
}
