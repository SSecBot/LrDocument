import { NextResponse } from 'next/server';
import { clearSessionCookie } from '@/lib/auth';
import { clearAccountsCookie } from '@/lib/accounts';
import { activateAccount, rememberedAccounts, validAccountUsers } from '@/lib/accountSession';
import { readJsonObject } from '@/lib/apiUtils';

/**
 * Signs out of the active account. Other accounts remembered on this browser stay signed in and
 * the next one becomes active; `{ "all": true }` signs out of every account.
 */
export async function POST(req: Request) {
  const body = await readJsonObject(req, 1024).catch(() => ({}) as Record<string, unknown>);
  const { list, active } = await rememberedAccounts();
  const rest = body.all === true ? [] : list.filter((a) => a.userId !== active?.userId);
  // Accounts whose session was revoked meanwhile are dropped from the list.
  const valid = await validAccountUsers(rest);
  const next = valid[0];

  const response = NextResponse.json({ success: true, message: 'Çıkış yapıldı.', switchedTo: next ? { id: next.key, name: next.name } : null });
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
}
