import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, ensureDefaultAdmin } from '@/lib/auth';
import { INITIAL_FOLDERS, INITIAL_FINANCE_CATEGORIES } from '@/data/initialData';

export async function POST(req: NextRequest) {
  try {
    await ensureDefaultAdmin();

    const body = await req.json();
    const { name, email, password, plan, subscriptionPlan } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Lütfen tüm alanları eksiksiz doldurunuz.' },
        { status: 400 }
      );
    }

    const cleanEmail = email.toLowerCase().trim();

    if (password.length < 6) {
      return NextResponse.json(
        { error: 'Şifre en az 6 karakter olmalıdır.' },
        { status: 400 }
      );
    }

    const existing = await prisma.user.findUnique({
      where: { email: cleanEmail },
    });

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

    const passwordHash = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: 'USER',
        status: 'PENDING',
        subscriptionPlan: planValue,
      },
    });

    for (const folder of INITIAL_FOLDERS) {
      await prisma.folder.create({
        data: {
          id: `${newUser.id}_${folder.id}`,
          userId: newUser.id,
          name: folder.name,
          description: folder.description,
          iconName: folder.iconName,
          isSystem: folder.isSystem || false,
        },
      });
    }

    for (const cat of INITIAL_FINANCE_CATEGORIES) {
      await prisma.financeCategory.create({
        data: {
          id: `${newUser.id}_${cat.id}`,
          userId: newUser.id,
          name: cat.name,
          type: cat.type,
          isSystem: cat.isSystem || false,
        },
      });
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
          subscriptionPlan: newUser.subscriptionPlan,
        },
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Registration error:', error);
    return NextResponse.json(
      { error: 'Kayıt işlemi sırasında bir sunucu hatası oluştu.' },
      { status: 500 }
    );
  }
}
