import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { clearSessionCookie, comparePassword, requireAccountOwner } from '@/lib/auth';
import { clearAccountsCookie } from '@/lib/accounts';
import { activateAccount, rememberedAccounts, validAccountUsers } from '@/lib/accountSession';
import { handleRouteError, rateLimit, readJsonObject, tooManyRequests } from '@/lib/apiUtils';
import { DELETE_PHRASE } from '@/lib/deleteAccount';


/**
 * Ayarlar › Hesap › Hesabı sil: deletes the signed-in account and everything in it (notes, files,
 * finance, ders takibi, kurumsal üyeler…; all rows cascade from User). Needs the password and the
 * typed phrase. Kurumsal üyeler cannot delete the organisation; the admin account is kept.
 */
export async function POST(req: Request) {
  try {
    const session = await requireAccountOwner();
    const wait = rateLimit(`delete-account:${session.userId}`, 5, 15 * 60_000);
    if (wait) return tooManyRequests(wait);

    const { password, confirm } = await readJsonObject(req, 4096);
    if (typeof confirm !== 'string' || confirm.trim().toLocaleUpperCase('tr-TR') !== DELETE_PHRASE) {
      return NextResponse.json({ error: `Onay için “${DELETE_PHRASE}” yazın.` }, { status: 400 });
    }
    if (typeof password !== 'string' || !password) {
      return NextResponse.json({ error: 'Şifrenizi girin.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { id: true, role: true, passwordHash: true } });
    if (!user) return NextResponse.json({ error: 'Hesap bulunamadı.' }, { status: 404 });
    if (user.role === 'ADMIN') {
      return NextResponse.json({ error: 'Yönetici hesabı buradan silinemez.' }, { status: 403 });
    }
    if (!(await comparePassword(password, user.passwordHash))) {
      return NextResponse.json({ error: 'Şifreniz hatalı.' }, { status: 400 });
    }

    await prisma.user.delete({ where: { id: user.id } });

    // Like signing out: another account remembered on this browser becomes active, if any.
    const { list } = await rememberedAccounts();
    const valid = await validAccountUsers(list.filter((a) => a.userId !== user.id));
    const next = valid[0];
    const response = NextResponse.json({ success: true, switchedTo: next ? { id: next.key, name: next.name } : null });
    if (next) {
      await activateAccount(
        response,
        next,
        valid.map((u) => ({ userId: u.key, sv: u.sessionVersion }))
      );
    } else {
      clearSessionCookie(response);
      clearAccountsCookie(response);
    }
    return response;
  } catch (error) {
    return handleRouteError(error, 'Delete account error', 'Hesap silinemedi.');
  }
}
