import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { hashPassword, requireAdmin } from '@/lib/auth';
import { INITIAL_FOLDERS, INITIAL_FINANCE_CATEGORIES } from '@/data/initialData';

export async function POST(req: NextRequest) {
  try {
    await requireAdmin();

    const body = await req.json();
    const { name, email, password, role, subscriptionPlan, status } = body;

    if (!name || !email || !password) {
      return NextResponse.json(
        { error: 'Lütfen isim, e-posta ve şifre alanlarını eksiksiz giriniz.' },
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

    const passwordHash = await hashPassword(password);
    const planValue = subscriptionPlan === 'Tek Seferlik' ? 'Tek Seferlik' : 'Aylık';
    const subType: 'AYLIK' | 'TEK_SEFERLIK' = planValue === 'Tek Seferlik' ? 'TEK_SEFERLIK' : 'AYLIK';
    const roleValue = role === 'ADMIN' ? 'ADMIN' : 'USER';
    const statusValue = status === 'PENDING' || status === 'REJECTED' ? status : 'APPROVED';
    const payStatus = statusValue === 'APPROVED' ? 'MANUAL_APPROVED' : 'PENDING';

    const newUser = await prisma.user.create({
      data: {
        name: name.trim(),
        email: cleanEmail,
        passwordHash,
        role: roleValue,
        status: statusValue,
        subscriptionType: subType,
        subscriptionPlan: planValue,
        paymentStatus: payStatus,
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
  } catch (error: any) {
    if (error.message?.includes('Unauthorized') || error.message?.includes('Forbidden')) {
      return NextResponse.json({ error: 'Bu işlem için yönetici yetkisi gereklidir.' }, { status: 403 });
    }
    console.error('Admin create user error:', error);
    return NextResponse.json({ error: 'Kullanıcı oluşturulamadı.' }, { status: 500 });
  }
}
