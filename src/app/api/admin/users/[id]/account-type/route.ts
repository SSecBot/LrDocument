import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { handleRouteError, readJsonObject } from '@/lib/apiUtils';
import { ACCOUNT_TYPE_LABEL, clampSeats } from '@/lib/pricing';
import { getSystemSettings } from '@/lib/systemSettingsServer';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;
    const body = await readJsonObject(req);
    const accountType = body.accountType;
    if (accountType !== 'STANDARD' && accountType !== 'STUDENT' && accountType !== 'CORPORATE') {
      return NextResponse.json({ error: 'Geçersiz hesap tipi.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    let corporate: { organization: string | null; seats: number | null } = { organization: null, seats: null };
    if (accountType === 'CORPORATE') {
      const { pricing } = await getSystemSettings();
      const organization =
        typeof body.organization === 'string' ? body.organization.trim().slice(0, 120) : user.organization ?? '';
      // Once the owner has added people, the seat count follows the team (owner + members).
      const members = await prisma.orgMember.count({ where: { ownerId: id } });
      corporate = {
        organization: organization || null,
        seats: members > 0 ? members + 1 : clampSeats(body.seats ?? user.seats, pricing),
      };
    }

    // The student profile (and its course data) is kept when switching back, so nothing is lost.
    const updatedUser = await prisma.user.update({
      where: { id },
      data: { accountType, ...corporate },
      select: { id: true, name: true, email: true, accountType: true, organization: true, seats: true },
    });

    return NextResponse.json({
      success: true,
      message: `${updatedUser.name} hesabı ${ACCOUNT_TYPE_LABEL[accountType].toLocaleLowerCase('tr-TR')} olarak güncellendi.`,
      user: updatedUser,
    });
  } catch (error) {
    return handleRouteError(error, 'Account type update error', 'Hesap tipi güncellenemedi.');
  }
}
