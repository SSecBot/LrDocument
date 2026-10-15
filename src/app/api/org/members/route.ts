import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AuthError, LIVE_WINDOW_MS } from '@/lib/auth';
import { decryptText, encryptText } from '@/lib/dataCrypto';
import { DEFAULT_MEMBER_PERMISSIONS, MAX_MANAGERS, formatCorporateCode, parsePermissions } from '@/lib/corporate';
import { generateCorporateCode, hashCorporateCode, maxMembers, requireOrgManager, syncSeats } from '@/lib/corporateServer';
import { handleRouteError, normalizeName, rateLimit, readJsonObject, tooManyRequests } from '@/lib/apiUtils';

/** Members of the signed-in corporate workspace (owner and managers only). */
export async function GET() {
  try {
    const session = await requireOrgManager();
    const ownerId = session.userId;
    const [owner, members, limit] = await Promise.all([
      prisma.user.findUnique({
        where: { id: ownerId },
        select: { name: true, email: true, lastSeenAt: true, organization: true, subscriptionPlan: true },
      }),
      prisma.orgMember.findMany({ where: { ownerId }, orderBy: { createdAt: 'asc' } }),
      maxMembers(),
    ]);
    const liveSince = Date.now() - LIVE_WINDOW_MS;
    return NextResponse.json(
      {
        owner: owner && {
          name: owner.name,
          email: session.isOwner ? owner.email : undefined,
          live: !!owner.lastSeenAt && owner.lastSeenAt.getTime() >= liveSince,
        },
        organization: owner?.organization ?? null,
        seats: members.length + 1,
        subscriptionPlan: owner?.subscriptionPlan ?? 'Aylık',
        maxMembers: limit,
        maxManagers: MAX_MANAGERS,
        members: members.map((m) => ({
          id: m.id,
          name: decryptText(ownerId, m.name),
          role: m.role === 'MANAGER' ? 'MANAGER' : 'MEMBER',
          permissions: parsePermissions(m.permissions),
          codeHint: m.codeHint,
          live: !!m.lastSeenAt && m.lastSeenAt.getTime() >= liveSince,
          lastSeenAt: m.lastSeenAt?.toISOString() ?? null,
          createdAt: m.createdAt.toISOString(),
        })),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error, 'Org members list error', 'Kurum üyeleri alınamadı.');
  }
}

/** Adds a person (owner only). The personal code is returned once and never stored in plain text. */
export async function POST(req: Request) {
  try {
    const session = await requireOrgManager();
    if (!session.isOwner) throw new AuthError(403, 'Kişi eklemeyi yalnızca kurum sahibi yapabilir.');
    const ownerId = session.userId;

    const wait = rateLimit(`org-add:${ownerId}`, 60, 60 * 60_000);
    if (wait) return tooManyRequests(wait);

    const body = await readJsonObject(req, 8 * 1024);
    const name = normalizeName(body.name);
    if (!name) return NextResponse.json({ error: 'İsim 2 ile 80 karakter arasında olmalıdır.' }, { status: 400 });

    const [count, managers, limit] = await Promise.all([
      prisma.orgMember.count({ where: { ownerId } }),
      prisma.orgMember.count({ where: { ownerId, role: 'MANAGER' } }),
      maxMembers(),
    ]);
    if (count >= limit) {
      return NextResponse.json({ error: `Bir kuruma en fazla ${limit} kişi eklenebilir.` }, { status: 400 });
    }
    const role = body.role === 'MANAGER' ? 'MANAGER' : 'MEMBER';
    if (role === 'MANAGER' && managers >= MAX_MANAGERS) {
      return NextResponse.json({ error: `En fazla ${MAX_MANAGERS} yönetici olabilir.` }, { status: 400 });
    }
    const permissions = body.permissions ? parsePermissions(body.permissions) : DEFAULT_MEMBER_PERMISSIONS;

    // A collision of two random 60-bit codes is practically impossible; retry anyway.
    for (let attempt = 0; attempt < 3; attempt++) {
      const code = generateCorporateCode();
      try {
        const member = await prisma.orgMember.create({
          data: {
            ownerId,
            name: encryptText(ownerId, name),
            codeHash: hashCorporateCode(code),
            codeHint: code.slice(-4),
            role,
            permissions: JSON.stringify(permissions),
          },
        });
        const seats = await syncSeats(ownerId);
        return NextResponse.json({ success: true, id: member.id, code: formatCorporateCode(code), seats }, { status: 201 });
      } catch (err) {
        if ((err as { code?: string })?.code !== 'P2002') throw err;
      }
    }
    return NextResponse.json({ error: 'Kod oluşturulamadı, tekrar deneyin.' }, { status: 500 });
  } catch (error) {
    return handleRouteError(error, 'Org member add error', 'Kişi eklenemedi.');
  }
}
