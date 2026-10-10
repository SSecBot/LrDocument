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
    const { accountType } = await readJsonObject(req);

    if (accountType !== 'STANDARD' && accountType !== 'STUDENT') {
      return NextResponse.json({ error: 'Geçersiz hesap tipi.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    // The student profile (and its course data) is kept when switching back, so nothing is lost.
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { accountType },
      select: { id: true, name: true, email: true, accountType: true },
    });

    return NextResponse.json({
      success: true,
      message: `${updatedUser.name} hesabı ${accountType === 'STUDENT' ? 'öğrenci' : 'standart'} olarak güncellendi.`,
      user: updatedUser,
    });
  } catch (error) {
    return handleRouteError(error, 'Account type update error', 'Hesap tipi güncellenemedi.');
  }
}
