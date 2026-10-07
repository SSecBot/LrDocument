import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { handleRouteError, readJsonObject } from '@/lib/apiUtils';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const { role } = await readJsonObject(req);

    if (role !== 'ADMIN' && role !== 'USER') {
      return NextResponse.json({ error: 'Geçersiz rol.' }, { status: 400 });
    }

    if (id === session.userId && role === 'USER') {
      return NextResponse.json(
        { error: 'Kendi yöneticilik rolünüzü kaldıramazsınız.' },
        { status: 400 }
      );
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { role },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    return NextResponse.json({
      success: true,
      message: `Rol ${role} olarak güncellendi.`,
      user: updatedUser,
    });
  } catch (error) {
    return handleRouteError(error, 'Role update error', 'Rol güncelleme başarısız.');
  }
}
