import { createHmac, randomInt } from 'crypto';
import { prisma } from './prisma';
import { AuthError, requireAuth, type UserJWTPayload } from './auth';
import { deriveSecret } from './dataCrypto';
import { CODE_ALPHABET, CODE_LENGTH } from './corporate';
import { getSystemSettings } from './systemSettingsServer';

let codeKey: Buffer | null = null;

/**
 * Codes are stored only as an HMAC (keyed with a secret derived from the server master key), so a
 * database copy alone does not reveal them; 60 random bits plus login rate limits make guessing
 * infeasible.
 */
export function hashCorporateCode(normalized: string): string {
  codeKey ??= deriveSecret('corporate-code:v1');
  return createHmac('sha256', codeKey).update(normalized).digest('hex');
}

export function generateCorporateCode(): string {
  let code = '';
  for (let i = 0; i < CODE_LENGTH; i++) code += CODE_ALPHABET[randomInt(CODE_ALPHABET.length)];
  return code;
}

/** Owner or manager of a corporate workspace (the members page and permission changes). */
export async function requireOrgManager(): Promise<UserJWTPayload & { isOwner: boolean }> {
  const session = await requireAuth();
  if (session.accountType !== 'CORPORATE' || (session.orgRole !== 'OWNER' && session.orgRole !== 'MANAGER')) {
    throw new AuthError(403, 'Bu bölüm yalnızca kurum sahibi ve yöneticilerine açıktır.');
  }
  return { ...session, isOwner: session.orgRole === 'OWNER' };
}

/** Seats = owner + members; keeps the price (kişi sayısı × kişi başı fiyat) in step with the team. */
export async function syncSeats(ownerId: string): Promise<number> {
  const members = await prisma.orgMember.count({ where: { ownerId } });
  const seats = members + 1;
  await prisma.user.update({ where: { id: ownerId }, data: { seats } });
  return seats;
}

/** Most members an owner may add (admin's Kurumsal en fazla kişi, minus the owner). */
export async function maxMembers(): Promise<number> {
  const { pricing } = await getSystemSettings();
  return Math.max(0, pricing.corporateMaxSeats - 1);
}
