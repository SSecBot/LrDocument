import { SignJWT, jwtVerify } from 'jose';
import type { NextResponse } from 'next/server';
import { getJwtSecretKey } from './jwtSecret';

// ---------------------------------------------------------------------------
// Multiple accounts on one browser ("Hesap ekle / Hesap değiştir").
//
// Besides the session cookie there is one more httpOnly cookie holding a signed list of the
// accounts signed in on this browser: only opaque user ids and session versions, no names or
// e-mails. Switching is verified on the server against the database, so a password change
// (which bumps the session version) drops the account from the list.
// ---------------------------------------------------------------------------

export const ACCOUNTS_COOKIE = 'lr_accounts';
export const MAX_ACCOUNTS = 5;

export interface AccountEntry {
  userId: string;
  sv: number;
}

const TYP = 'lr-accounts';

export async function signAccounts(list: AccountEntry[], maxAgeSeconds: number): Promise<string> {
  return new SignJWT({ typ: TYP, accts: list.slice(0, MAX_ACCOUNTS).map((a) => [a.userId, a.sv]) })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(getJwtSecretKey());
}

export async function readAccounts(token: string | undefined): Promise<AccountEntry[]> {
  if (!token) return [];
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), { algorithms: ['HS256'] });
    if (payload.typ !== TYP || !Array.isArray(payload.accts)) return [];
    return (payload.accts as unknown[])
      .filter((a): a is [string, number] => Array.isArray(a) && typeof a[0] === 'string' && typeof a[1] === 'number')
      .slice(0, MAX_ACCOUNTS)
      .map(([userId, sv]) => ({ userId, sv }));
  } catch {
    return [];
  }
}

/** Puts `entry` first (most recently used) and drops duplicates of the same user. */
export function withAccount(list: AccountEntry[], entry: AccountEntry): AccountEntry[] {
  return [entry, ...list.filter((a) => a.userId !== entry.userId)].slice(0, MAX_ACCOUNTS);
}

export function setAccountsCookie(response: NextResponse, token: string, maxAgeSeconds: number) {
  response.cookies.set({
    name: ACCOUNTS_COOKIE,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  });
}

export function clearAccountsCookie(response: NextResponse) {
  response.cookies.set({ name: ACCOUNTS_COOKIE, value: '', httpOnly: true, secure: process.env.NODE_ENV === 'production', sameSite: 'lax', path: '/', maxAge: 0 });
}
