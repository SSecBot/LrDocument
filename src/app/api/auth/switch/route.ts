import { NextResponse } from 'next/server';
import { handleRouteError, readJsonObject } from '@/lib/apiUtils';
import { withAccount } from '@/lib/accounts';
import { activateAccount, rememberedAccounts, validAccountUsers } from '@/lib/accountSession';

/** Switches to another account that is already signed in on this browser. */
export async function POST(req: Request) {
  try {
    const { userId } = await readJsonObject(req, 1024);
    if (typeof userId !== 'string' || !userId) {
      return NextResponse.json({ error: 'Geçersiz hesap.' }, { status: 400 });
    }
    const { list, active } = await rememberedAccounts();
    if (!active) return NextResponse.json({ error: 'Giriş yapmanız gerekmektedir.' }, { status: 401 });

    const target = (await validAccountUsers(list.filter((a) => a.userId === userId)))[0];
    if (!target) {
      return NextResponse.json(
        { error: 'Bu hesabın oturumu sona ermiş. Lütfen “Hesap ekle” ile yeniden giriş yapın.' },
        { status: 403 }
      );
    }
    const response = NextResponse.json({ success: true });
    await activateAccount(response, target, withAccount(list, { userId: target.id, sv: target.sessionVersion }));
    return response;
  } catch (error) {
    return handleRouteError(error, 'Account switch error', 'Hesap değiştirilemedi.');
  }
}
