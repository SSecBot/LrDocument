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

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { status: 'APPROVED' },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    return NextResponse.json({
      success: true,
      message: `${updatedUser.name} (${updatedUser.email}) hesabı başarıyla onaylandı.`,
      user: updatedUser,
    });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('Unauthorized') || err.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Yönetici yetkisi gereklidir.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Onaylama işlemi başarısız.' }, { status: 500 });
  }
}
