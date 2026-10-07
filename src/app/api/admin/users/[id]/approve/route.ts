import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { handleRouteError } from '@/lib/apiUtils';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        status: 'APPROVED',
        ...(user.paymentStatus === 'PENDING' ? { paymentStatus: 'MANUAL_APPROVED' } : {}),
      },
      select: { id: true, name: true, email: true, role: true, status: true, paymentStatus: true },
    });

    return NextResponse.json({
      success: true,
      message: `${updatedUser.name} (${updatedUser.email}) hesabı başarıyla onaylandı.`,
      user: updatedUser,
    });
  } catch (error) {
    return handleRouteError(error, 'Approve user error', 'Onaylama işlemi başarısız.');
  }
}
