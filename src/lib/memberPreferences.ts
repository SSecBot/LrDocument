import { prisma } from './prisma';
import { decryptText, encryptText } from './dataCrypto';

// A corporate member keeps own UI preferences (panels, read notifications) — encrypted like a
// user's, under a key of its own, so members of the same workspace do not overwrite each other.
const keyId = (memberId: string) => `member:${memberId}`;

export async function readMemberPreferences(memberId: string): Promise<unknown> {
  const row = await prisma.orgMember.findUnique({ where: { id: memberId }, select: { preferences: true } });
  if (!row?.preferences) return {};
  try {
    return JSON.parse(decryptText(keyId(memberId), row.preferences) || '{}');
  } catch {
    return {};
  }
}

export async function writeMemberPreferences(memberId: string, value: unknown): Promise<void> {
  await prisma.orgMember.update({
    where: { id: memberId },
    data: { preferences: encryptText(keyId(memberId), JSON.stringify(value)) },
  });
}
