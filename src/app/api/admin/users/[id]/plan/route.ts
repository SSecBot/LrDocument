import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { subscriptionPlan } = body;

    if (subscriptionPlan !== 'Aylık' && subscriptionPlan !== 'Tek Seferlik') {
      return NextResponse.json(
        { error: 'Geçersiz abonelik planı. "Aylık" veya "Tek Seferlik" olmalıdır.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { subscriptionPlan },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        subscriptionPlan: true,
      },
    });

    return NextResponse.json({
      success: true,
      message: `${updatedUser.name} kullanıcısının abonelik planı "${subscriptionPlan}" olarak güncellendi.`,
      user: updatedUser,
    });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('Unauthorized') || err.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Yönetici yetkisi gereklidir.' }, { status: 403 });
    }
    console.error('Plan update error:', error);
    return NextResponse.json({ error: 'Plan güncellenirken bir hata oluştu.' }, { status: 500 });
  }
}
