import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { prisma } from './prisma';
import { COOKIE_NAME, sessionMaxAgeSeconds, setSessionCookie, signSessionToken, verifySessionToken } from './auth';
import { ACCOUNTS_COOKIE, type AccountEntry, readAccounts, setAccountsCookie, signAccounts } from './accounts';
import { decryptText } from './dataCrypto';

/** Remembered-account key of a corporate member (user accounts use their plain user id). */
export const memberKey = (memberId: string) => `m:${memberId}`;

/** An account that can become the active session without a password. */
export interface SwitchableAccount {
  /** Key in the remembered-accounts list (user id, or `m:<memberId>`). */
  key: string;
  /** Data owner (for a member: the corporate owner). */
  userId: string;
  memberId?: string;
  name: string;
  /** E-mail, or the organisation name for a member. */
  label: string;
  role: string;
  sessionVersion: number;
}

/** Accounts remembered on this browser, including the active one (server-side only). */
export async function rememberedAccounts(): Promise<{ list: AccountEntry[]; active: AccountEntry | null }> {
  const store = await cookies();
  const list = await readAccounts(store.get(ACCOUNTS_COOKIE)?.value);
  const token = store.get(COOKIE_NAME)?.value;
  const payload = token ? await verifySessionToken(token) : null;
  const active = payload
    ? { userId: payload.memberId ? memberKey(payload.memberId) : payload.userId, sv: payload.sv ?? 0 }
    : null;
  if (!active) return { list, active };
  // The active session is authoritative (e.g. after a password change bumped its version).
  return { list: [active, ...list.filter((a) => a.userId !== active.userId)], active };
}

/** Entries from the list that may still sign in without a password (approved, same session version). */
export async function validAccountUsers(list: AccountEntry[]): Promise<SwitchableAccount[]> {
  if (list.length === 0) return [];
  const memberIds = list.filter((a) => a.userId.startsWith('m:')).map((a) => a.userId.slice(2));
  const userIds = list.filter((a) => !a.userId.startsWith('m:')).map((a) => a.userId);
  const [users, members] = await Promise.all([
    userIds.length
      ? prisma.user.findMany({
          where: { id: { in: userIds }, status: 'APPROVED' },
          select: { id: true, name: true, email: true, role: true, sessionVersion: true },
        })
      : [],
    memberIds.length
      ? prisma.orgMember.findMany({
          where: { id: { in: memberIds }, owner: { status: 'APPROVED', accountType: 'CORPORATE' } },
          select: { id: true, ownerId: true, name: true, sessionVersion: true, owner: { select: { organization: true } } },
        })
      : [],
  ]);

  const out: SwitchableAccount[] = [];
  for (const a of list) {
    if (a.userId.startsWith('m:')) {
      const m = members.find((x) => x.id === a.userId.slice(2) && x.sessionVersion === a.sv);
      if (m) {
        out.push({
          key: a.userId,
          userId: m.ownerId,
          memberId: m.id,
          name: decryptText(m.ownerId, m.name),
          label: m.owner.organization ? `${m.owner.organization} · kurumsal` : 'Kurumsal üye',
          role: 'USER',
          sessionVersion: m.sessionVersion,
        });
      }
    } else {
      const u = users.find((x) => x.id === a.userId && x.sessionVersion === a.sv);
      if (u) out.push({ key: u.id, userId: u.id, name: u.name, label: u.email, role: u.role, sessionVersion: u.sessionVersion });
    }
  }
  return out;
}

/** Makes the account the active session and stores the remembered-accounts list. */
export async function activateAccount(
  response: NextResponse,
  account: { userId: string; memberId?: string; role: string; sessionVersion: number },
  list: AccountEntry[]
) {
  const maxAge = await sessionMaxAgeSeconds();
  const token = await signSessionToken(
    {
      userId: account.userId,
      memberId: account.memberId,
      email: '',
      name: '',
      role: account.role === 'ADMIN' ? 'ADMIN' : 'USER',
      status: 'APPROVED',
      sv: account.sessionVersion,
    },
    maxAge
  );
  setSessionCookie(response, token, maxAge);
  setAccountsCookie(response, await signAccounts(list, maxAge), maxAge);
}
