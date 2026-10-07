import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { handleRouteError } from '@/lib/apiUtils';

export async function PATCH(
  _req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await requireAdmin();
    const { id } = await params;

    if (id === session.userId) {
      return NextResponse.json({ error: 'Kendi hesabınızı reddedemezsiniz.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      // Bumping the session version immediately signs the user out everywhere.
      data: { status: 'REJECTED', sessionVersion: { increment: 1 } },
      select: { id: true, name: true, email: true, role: true, status: true },
    });

    return NextResponse.json({
      success: true,
      message: `${updatedUser.name} (${updatedUser.email}) hesabı reddedildi.`,
      user: updatedUser,
    });
  } catch (error) {
    return handleRouteError(error, 'Reject user error', 'Reddetme işlemi başarısız.');
  }
}
