import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;
    const body = await req.json();
    const { role } = body;

    if (role !== 'ADMIN' && role !== 'USER') {
      return NextResponse.json({ error: 'Geçersiz rol.' }, { status: 400 });
    }

    if (id === session.userId && role === 'USER') {
      return NextResponse.json(
        { error: 'Kendi yöneticilik rolünüzü kaldıramazsınız.' },
        { status: 400 }
      );
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
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('Unauthorized') || err.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Yönetici yetkisi gereklidir.' }, { status: 403 });
    }
    return NextResponse.json({ error: 'Rol güncelleme başarısız.' }, { status: 500 });
  }
}
