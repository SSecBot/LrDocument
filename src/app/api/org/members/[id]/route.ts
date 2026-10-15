import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthError } from '@/lib/auth';
import { encryptText } from '@/lib/dataCrypto';
import { MAX_MANAGERS, formatCorporateCode, parsePermissions } from '@/lib/corporate';
import { generateCorporateCode, hashCorporateCode, requireOrgManager, syncSeats } from '@/lib/corporateServer';
import { handleRouteError, normalizeName, readJsonObject } from '@/lib/apiUtils';

type Params = { params: Promise<{ id: string }> };

/**
 * Owner: name, role (max two managers), permissions, new code (signs the member out).
 * Manager: permissions of ordinary members only.
 */
export async function PATCH(req: Request, { params }: Params) {
  try {
    const session = await requireOrgManager();
    const ownerId = session.userId;
    const { id } = await params;
    const member = await prisma.orgMember.findFirst({ where: { id, ownerId } });
    if (!member) return NextResponse.json({ error: 'Kişi bulunamadı.' }, { status: 404 });

    const body = await readJsonObject(req, 8 * 1024);
    const data: Record<string, unknown> = {};
    let code: string | null = null;

    if (!session.isOwner) {
      if (body.name !== undefined || body.role !== undefined || body.regenerateCode) {
        throw new AuthError(403, 'Bu değişikliği yalnızca kurum sahibi yapabilir.');
      }
      if (member.role === 'MANAGER') throw new AuthError(403, 'Yöneticilerin izinlerini yalnızca kurum sahibi değiştirebilir.');
    }

    if (body.name !== undefined) {
      const name = normalizeName(body.name);
      if (!name) return NextResponse.json({ error: 'İsim 2 ile 80 karakter arasında olmalıdır.' }, { status: 400 });
      data.name = encryptText(ownerId, name);
    }
    if (body.role !== undefined) {
      const role = body.role === 'MANAGER' ? 'MANAGER' : 'MEMBER';
      if (role === 'MANAGER' && member.role !== 'MANAGER') {
        const managers = await prisma.orgMember.count({ where: { ownerId, role: 'MANAGER' } });
        if (managers >= MAX_MANAGERS) {
          return NextResponse.json({ error: `En fazla ${MAX_MANAGERS} yönetici olabilir.` }, { status: 400 });
        }
      }
      data.role = role;
    }
    if (body.permissions !== undefined) data.permissions = JSON.stringify(parsePermissions(body.permissions));
    if (body.regenerateCode === true) {
      code = generateCorporateCode();
      data.codeHash = hashCorporateCode(code);
      data.codeHint = code.slice(-4);
      // The old code stops working and every open session of the member ends.
      data.sessionVersion = { increment: 1 };
    }

    if (Object.keys(data).length === 0) return NextResponse.json({ error: 'Değişiklik yok.' }, { status: 400 });
    await prisma.orgMember.update({ where: { id }, data });
    return NextResponse.json({ success: true, ...(code ? { code: formatCorporateCode(code) } : {}) });
  } catch (error) {
    return handleRouteError(error, 'Org member update error', 'Kişi güncellenemedi.');
  }
}

/** Removes a person (owner only); the price follows the new head count. */
export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await requireOrgManager();
    if (!session.isOwner) throw new AuthError(403, 'Kişi çıkarmayı yalnızca kurum sahibi yapabilir.');
    const { id } = await params;
    const { count } = await prisma.orgMember.deleteMany({ where: { id, ownerId: session.userId } });
    if (!count) return NextResponse.json({ error: 'Kişi bulunamadı.' }, { status: 404 });
    const seats = await syncSeats(session.userId);
    return NextResponse.json({ success: true, seats });
  } catch (error) {
    return handleRouteError(error, 'Org member delete error', 'Kişi çıkarılamadı.');
  }
}
