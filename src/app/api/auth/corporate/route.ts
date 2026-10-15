import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { ensureDefaultAdmin } from '@/lib/auth';
import { activateAccount, memberKey, rememberedAccounts } from '@/lib/accountSession';
import { withAccount } from '@/lib/accounts';
import { normalizeCorporateCode } from '@/lib/corporate';
import { hashCorporateCode } from '@/lib/corporateServer';
import { getClientIp, handleRouteError, rateLimit, readJsonObject, tooManyRequests } from '@/lib/apiUtils';

const INVALID_CODE = 'Kurumsal kod geçersiz. Kodu kurum sahibinden aldığınız şekilde girin.';

/** Kurumsal giriş: the personal code decides which corporate workspace the member enters. */
export async function POST(req: NextRequest) {
  try {
    await ensureDefaultAdmin();

    const wait = rateLimit(`corp-login-ip:${getClientIp(req)}`, 10, 15 * 60_000);
    if (wait) return tooManyRequests(wait);

    const { code } = await readJsonObject(req, 1024);
    const normalized = normalizeCorporateCode(code);
    if (!normalized) return NextResponse.json({ error: INVALID_CODE }, { status: 401 });

    const member = await prisma.orgMember.findUnique({
      where: { codeHash: hashCorporateCode(normalized) },
      select: { id: true, ownerId: true, sessionVersion: true, owner: { select: { status: true, accountType: true } } },
    });
    if (!member) return NextResponse.json({ error: INVALID_CODE }, { status: 401 });
    if (member.owner.status !== 'APPROVED' || member.owner.accountType !== 'CORPORATE') {
      return NextResponse.json({ error: 'Bu kurumsal hesap şu anda aktif değil. Kurum sahibiyle iletişime geçin.' }, { status: 403 });
    }

    const response = NextResponse.json({ success: true });
    const { list } = await rememberedAccounts();
    await activateAccount(
      response,
      { userId: member.ownerId, memberId: member.id, role: 'USER', sessionVersion: member.sessionVersion },
      withAccount(list, { userId: memberKey(member.id), sv: member.sessionVersion })
    );
    return response;
  } catch (error) {
    return handleRouteError(error, 'Corporate login error', 'Giriş yapılırken bir sunucu hatası oluştu.');
  }
}
