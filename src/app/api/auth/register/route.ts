import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, ensureDefaultAdmin, validateNewPassword } from '@/lib/auth';
import { seedDefaultUserData } from '@/lib/userSeed';
import { studentProfileSchema } from '@/lib/studentProfile';
import { catalogFields } from '@/lib/universities';
import { emailInUse } from '@/lib/loginEmail';
import { encryptRow } from '@/lib/dataCrypto';
import { normalizeAccountType } from '@/lib/pricing';
import { getSystemSettings } from '@/lib/systemSettingsServer';
import { issueCode } from '@/lib/verification';
import { LOCALES, requestLocale, setLocaleCookie, type Locale } from '@/lib/i18n/server';
import { siteHostFrom } from '@/lib/mailer';
import {
  getClientIp,
  handleRouteError,
  normalizeEmail,
  normalizeName,
  rateLimit,
  readJsonObject,
  requestHost,
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

    const passwordError = await validateNewPassword(body.password);
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 });
    }

    // Bireysel, Kurumsal (priced per seat) or university student (discount + course tracker).
    const accountType = normalizeAccountType(body.accountType);
    const isStudent = accountType === 'STUDENT';
    let corporate: { organization: string; seats: number } | null = null;
    if (accountType === 'CORPORATE') {
      const { pricing } = await getSystemSettings();
      const organization = typeof body.organization === 'string' ? body.organization.trim().replace(/\s+/g, ' ') : '';
      const seats = Number(body.seats);
      if (organization.length < 2 || organization.length > 120) {
        return NextResponse.json({ error: 'Kurum adı 2 ile 120 karakter arasında olmalıdır.' }, { status: 400 });
      }
      if (!Number.isInteger(seats) || seats < pricing.corporateMinSeats || seats > pricing.corporateMaxSeats) {
        return NextResponse.json(
          { error: `Kişi sayısı ${pricing.corporateMinSeats} ile ${pricing.corporateMaxSeats} arasında olmalıdır.` },
          { status: 400 }
        );
      }
      corporate = { organization, seats };
    }
    let studentProfile: ReturnType<typeof studentProfileSchema.parse> | null = null;
    if (isStudent) {
      const parsed = studentProfileSchema.safeParse(body.student ?? {});
      if (!parsed.success) {
        return NextResponse.json(
          { error: parsed.error.issues[0]?.message || 'Öğrenci bilgileri geçersiz.' },
          { status: 400 }
        );
      }
      studentProfile = { ...parsed.data, ...catalogFields(parsed.data) };
    }

    if (await emailInUse(cleanEmail)) {
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
    // Chosen on the sign-up form (it also switches the form itself); the page language otherwise.
    const locale = LOCALES.includes(body.locale as Locale) ? (body.locale as Locale) : await requestLocale();

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
          accountType,
          organization: corporate?.organization ?? null,
          seats: corporate?.seats ?? null,
          locale,
        },
      });
      await seedDefaultUserData(tx, user.id);
      if (studentProfile) {
        await tx.studentProfile.create({ data: { userId: user.id, ...encryptRow('studentProfile', user.id, studentProfile) } });
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

    // E-posta doğrulaması: the code is sent right away; the sign-up screen asks for it.
    let verification: { sent: boolean; error?: string } = { sent: true };
    try {
      await issueCode(newUser.id, 'email', newUser.email, siteHostFrom(requestHost(req)));
    } catch (err) {
      verification = { sent: false, error: (err as Error).message };
    }

    const response = NextResponse.json(
      {
        success: true,
        verification,
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
    setLocaleCookie(response, locale);
    return response;
  } catch (error) {
    return handleRouteError(error, 'Registration error', 'Kayıt işlemi sırasında bir sunucu hatası oluştu.');
  }
}
