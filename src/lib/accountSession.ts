import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { prisma } from './prisma';
import { COOKIE_NAME, sessionMaxAgeSeconds, setSessionCookie, signSessionToken, verifySessionToken } from './auth';
import { ACCOUNTS_COOKIE, type AccountEntry, readAccounts, setAccountsCookie, signAccounts } from './accounts';

/** Accounts remembered on this browser, including the active one (server-side only). */
export async function rememberedAccounts(): Promise<{ list: AccountEntry[]; active: AccountEntry | null }> {
  const store = await cookies();
  const list = await readAccounts(store.get(ACCOUNTS_COOKIE)?.value);
  const token = store.get(COOKIE_NAME)?.value;
  const payload = token ? await verifySessionToken(token) : null;
  const active = payload ? { userId: payload.userId, sv: payload.sv ?? 0 } : null;
  if (!active) return { list, active };
  // The active session is authoritative (e.g. after a password change bumped its version).
  return { list: [active, ...list.filter((a) => a.userId !== active.userId)], active };
}

/** Users from the list that may still sign in without a password (approved, same session version). */
export async function validAccountUsers(list: AccountEntry[]) {
  if (list.length === 0) return [];
  const users = await prisma.user.findMany({
    where: { id: { in: list.map((a) => a.userId) }, status: 'APPROVED' },
    select: { id: true, name: true, email: true, role: true, status: true, sessionVersion: true, accountType: true },
  });
  return list
    .map((a) => users.find((u) => u.id === a.userId && u.sessionVersion === a.sv))
    .filter((u): u is NonNullable<typeof u> => !!u);
}

/** Makes `user` the active session and stores the remembered-accounts list. */
export async function activateAccount(
  response: NextResponse,
  user: { id: string; role: string; sessionVersion: number },
  list: AccountEntry[]
) {
  const maxAge = await sessionMaxAgeSeconds();
  const token = await signSessionToken(
    { userId: user.id, email: '', name: '', role: user.role === 'ADMIN' ? 'ADMIN' : 'USER', status: 'APPROVED', sv: user.sessionVersion },
    maxAge
  );
  setSessionCookie(response, token, maxAge);
  setAccountsCookie(response, await signAccounts(list, maxAge), maxAge);
}
