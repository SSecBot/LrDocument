import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { handleRouteError } from '@/lib/apiUtils';
import { memberKey, rememberedAccounts, validAccountUsers } from '@/lib/accountSession';

/** Accounts signed in on this browser (for the account switcher). */
export async function GET() {
  try {
    const session = await requireAuth();
    const { list } = await rememberedAccounts();
    const accounts = await validAccountUsers(list);
    const activeKey = session.memberId ? memberKey(session.memberId) : session.userId;
    return NextResponse.json({
      accounts: accounts.map((a) => ({ id: a.key, name: a.name, email: a.label, active: a.key === activeKey })),
    });
  } catch (error) {
    return handleRouteError(error, 'Accounts list error', 'Hesaplar alınamadı.');
  }
}
