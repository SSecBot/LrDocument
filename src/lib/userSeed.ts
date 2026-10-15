import type { Prisma } from '@prisma/client';
import { INITIAL_FINANCE_CATEGORIES } from '@/data/initialData';
import { encryptRow } from './dataCrypto';

/**
 * Starting data for a new account. Notes get no folders (only the built-in “Favoriler” view);
 * finance starts with the default categories.
 */
export async function seedDefaultUserData(tx: Prisma.TransactionClient, userId: string) {
  await tx.financeCategory.createMany({
    data: INITIAL_FINANCE_CATEGORIES.map((cat) =>
      encryptRow('financeCategory', userId, {
        id: `${userId}_${cat.id}`,
        userId,
        name: cat.name,
        type: cat.type,
        isSystem: cat.isSystem || false,
      })
    ),
  });
  // Nothing written so far is plain text, so the legacy encryption scan can be skipped.
  await tx.user.update({ where: { id: userId }, data: { dataEncryptedAt: new Date() } });
}
