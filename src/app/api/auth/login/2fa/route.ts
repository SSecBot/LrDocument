import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { activateAccount, rememberedAccounts } from '@/lib/accountSession';
import { withAccount } from '@/lib/accounts';
import { getClientIp, handleRouteError, rateLimit, readJsonObject, tooManyRequests } from '@/lib/apiUtils';
import { readLoginChallenge } from '@/lib/loginChallenge';
import { decryptText } from '@/lib/dataCrypto';
import { hashRecoveryCode, verifyTotp } from '@/lib/totp';

/** Second step of sign-in: the authenticator code (or a one-time recovery code). */
export async function POST(req: NextRequest) {
  try {
    const ipWait = rateLimit(`2fa-ip:${getClientIp(req)}`, 30, 15 * 60_000);
    if (ipWait) return tooManyRequests(ipWait);

    const body = await readJsonObject(req, 4096);
    const challenge = await readLoginChallenge(body.challenge);
    if (!challenge) {
      return NextResponse.json({ error: 'Doğrulama süresi doldu. Lütfen yeniden giriş yapın.', expired: true }, { status: 401 });
    }
    const userWait = rateLimit(`2fa-user:${challenge.userId}`, 8, 15 * 60_000);
    if (userWait) return tooManyRequests(userWait);

    const user = await prisma.user.findUnique({ where: { id: challenge.userId } });
    if (!user || user.status !== 'APPROVED' || user.sessionVersion !== challenge.sv || !user.twoFactorSecret || !user.twoFactorEnabledAt) {
      return NextResponse.json({ error: 'Doğrulama süresi doldu. Lütfen yeniden giriş yapın.', expired: true }, { status: 401 });
    }

    const code = typeof body.code === 'string' ? body.code.trim() : '';
    let ok = false;
    if (/^\d{6}$/.test(code.replace(/\s/g, ''))) {
      const step = verifyTotp(decryptText(user.id, user.twoFactorSecret), code, user.twoFactorLastStep);
      if (step !== null) {
        // Atomic: two requests with the same code cannot both pass.
        const { count } = await prisma.user.updateMany({
          where: { id: user.id, OR: [{ twoFactorLastStep: null }, { twoFactorLastStep: { lt: step } }] },
          data: { twoFactorLastStep: step },
        });
        ok = count === 1;
      }
    } else if (code) {
      const hashes: string[] = JSON.parse(user.twoFactorRecovery || '[]');
      const hash = hashRecoveryCode(code);
      if (hashes.includes(hash)) {
        const { count } = await prisma.user.updateMany({
          where: { id: user.id, twoFactorRecovery: user.twoFactorRecovery },
          data: { twoFactorRecovery: JSON.stringify(hashes.filter((h) => h !== hash)) },
        });
        ok = count === 1;
      }
    }
    if (!ok) return NextResponse.json({ error: 'Kod hatalı veya süresi geçmiş.' }, { status: 401 });

    const response = NextResponse.json({ success: true });
    const { list } = await rememberedAccounts();
    await activateAccount(response, { userId: user.id, role: user.role, sessionVersion: user.sessionVersion }, withAccount(list, { userId: user.id, sv: user.sessionVersion }));
    return response;
  } catch (error) {
    return handleRouteError(error, '2FA login error', 'Doğrulama sırasında bir hata oluştu.');
  }
}
