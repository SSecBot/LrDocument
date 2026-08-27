import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    if (id === session.userId) {
      return NextResponse.json(
        { error: 'Kendi hesabınızı silemezsiniz.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({
      where: { id },
    });

    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    await prisma.user.delete({
      where: { id },
    });

    return NextResponse.json({
      success: true,
      message: `${user.name} (${user.email}) hesabı ve tüm verileri silindi.`,
    });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('Unauthorized') || err.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Yönetici yetkisi gereklidir.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Kullanıcı silme işlemi başarısız.' }, { status: 500 });
  }
}
