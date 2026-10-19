import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { handleRouteError, readJsonObject } from '@/lib/apiUtils';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { subscriptionPlan } = await readJsonObject(req);

    if (subscriptionPlan !== 'Aylık' && subscriptionPlan !== 'Tek Seferlik' && subscriptionPlan !== 'VIP') {
      return NextResponse.json(
        { error: 'Geçersiz abonelik planı. "Aylık", "Tek Seferlik" veya "VIP" olmalıdır.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        subscriptionPlan,
        // Keep the enum-style column in sync with the display plan.
        subscriptionType: subscriptionPlan === 'VIP' ? 'VIP' : subscriptionPlan === 'Tek Seferlik' ? 'TEK_SEFERLIK' : 'AYLIK',
        // VIP: the admin waives payment for good; leaving VIP brings back the normal payment state.
        ...(subscriptionPlan === 'VIP'
          ? { paymentStatus: 'WAIVED' }
          : user.paymentStatus === 'WAIVED'
            ? { paymentStatus: user.status === 'APPROVED' ? 'MANUAL_APPROVED' : 'PENDING' }
            : {}),
      },
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        subscriptionPlan: true,
        subscriptionType: true,
        paymentStatus: true,
      },
    });

    return NextResponse.json({
      success: true,
      message:
        subscriptionPlan === 'VIP'
          ? `${updatedUser.name} VIP oldu: ömür boyu ücretsiz, ödeme istenmeyecek.`
          : `${updatedUser.name} kullanıcısının abonelik planı "${subscriptionPlan}" olarak güncellendi.`,
      user: updatedUser,
    });
  } catch (error) {
    return handleRouteError(error, 'Plan update error', 'Plan güncellenirken bir hata oluştu.');
  }
}
