import { NextResponse } from 'next/server';
import QRCode from 'qrcode';
import { prisma } from '@/lib/prisma';
import { comparePassword, requireAccountOwner } from '@/lib/auth';
import { handleRouteError, rateLimit, readJsonObject, tooManyRequests } from '@/lib/apiUtils';
import { decryptText, encryptText } from '@/lib/dataCrypto';
import { generateRecoveryCodes, generateTotpSecret, hashRecoveryCode, otpauthUri, verifyTotp } from '@/lib/totp';

/** İki adımlı doğrulama status. */
export async function GET() {
  try {
    const session = await requireAccountOwner();
    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { twoFactorEnabledAt: true, twoFactorRecovery: true } });
    return NextResponse.json({
      enabled: !!user?.twoFactorEnabledAt,
      enabledAt: user?.twoFactorEnabledAt?.toISOString() ?? null,
      recoveryLeft: user?.twoFactorEnabledAt ? (JSON.parse(user.twoFactorRecovery || '[]') as string[]).length : 0,
    });
  } catch (error) {
    return handleRouteError(error, '2FA status error', 'Durum alınamadı.');
  }
}

/**
 * { action: 'setup', password }   → new secret + QR code (not active until confirmed)
 * { action: 'enable', code }      → confirms the first code, returns one-time recovery codes
 * { action: 'disable', password, code } → turns it off (authenticator or recovery code)
 */
export async function POST(req: Request) {
  try {
    const session = await requireAccountOwner();
    const wait = rateLimit(`2fa-manage:${session.userId}`, 20, 15 * 60_000);
    if (wait) return tooManyRequests(wait);

    const body = await readJsonObject(req, 4096);
    const user = await prisma.user.findUnique({ where: { id: session.userId } });
    if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });

    if (body.action === 'setup') {
      if (user.twoFactorEnabledAt) return NextResponse.json({ error: 'İki adımlı doğrulama zaten açık.' }, { status: 400 });
      if (!(await comparePassword(body.password, user.passwordHash))) {
        return NextResponse.json({ error: 'Şifreniz hatalı.' }, { status: 400 });
      }
      const secret = generateTotpSecret();
      await prisma.user.update({ where: { id: user.id }, data: { twoFactorPending: encryptText(user.id, secret) } });
      const uri = otpauthUri(secret, user.email);
      const qr = await QRCode.toString(uri, { type: 'svg', margin: 1, errorCorrectionLevel: 'M' });
      return NextResponse.json({ secret, uri, qr: `data:image/svg+xml;base64,${Buffer.from(qr).toString('base64')}` });
    }

    if (body.action === 'enable') {
      if (!user.twoFactorPending) return NextResponse.json({ error: 'Önce kurulumu başlatın.' }, { status: 400 });
      const secret = decryptText(user.id, user.twoFactorPending);
      const step = verifyTotp(secret, body.code, null);
      if (step === null) return NextResponse.json({ error: 'Kod hatalı. Uygulamadaki güncel kodu girin.' }, { status: 400 });
      const recovery = generateRecoveryCodes();
      await prisma.user.update({
        where: { id: user.id },
        data: {
          twoFactorSecret: encryptText(user.id, secret),
          twoFactorPending: null,
          twoFactorEnabledAt: new Date(),
          twoFactorLastStep: step,
          twoFactorRecovery: JSON.stringify(recovery.map(hashRecoveryCode)),
        },
      });
      return NextResponse.json({ success: true, recoveryCodes: recovery });
    }

    if (body.action === 'disable') {
      if (!user.twoFactorEnabledAt || !user.twoFactorSecret) return NextResponse.json({ success: true });
      if (!(await comparePassword(body.password, user.passwordHash))) {
        return NextResponse.json({ error: 'Şifreniz hatalı.' }, { status: 400 });
      }
      const code = typeof body.code === 'string' ? body.code : '';
      const totpOk = verifyTotp(decryptText(user.id, user.twoFactorSecret), code, user.twoFactorLastStep) !== null;
      const recoveryOk = (JSON.parse(user.twoFactorRecovery || '[]') as string[]).includes(hashRecoveryCode(code));
      if (!totpOk && !recoveryOk) return NextResponse.json({ error: 'Doğrulama kodu hatalı.' }, { status: 400 });
      await prisma.user.update({
        where: { id: user.id },
        data: { twoFactorSecret: null, twoFactorPending: null, twoFactorEnabledAt: null, twoFactorLastStep: null, twoFactorRecovery: null },
      });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 });
  } catch (error) {
    return handleRouteError(error, '2FA manage error', 'İki adımlı doğrulama ayarı değiştirilemedi.');
  }
}
