import { NextResponse } from 'next/server';
import { requireAuth } from '@/lib/auth';
import { handleRouteError } from '@/lib/apiUtils';
import { rememberedAccounts, validAccountUsers } from '@/lib/accountSession';

/** Accounts signed in on this browser (for the account switcher). */
export async function GET() {
  try {
    const session = await requireAuth();
    const { list } = await rememberedAccounts();
    const users = await validAccountUsers(list);
    return NextResponse.json({
      accounts: users.map((u) => ({ id: u.id, name: u.name, email: u.email, active: u.id === session.userId })),
    });
  } catch (error) {
    return handleRouteError(error, 'Accounts list error', 'Hesaplar alınamadı.');
  }
}
