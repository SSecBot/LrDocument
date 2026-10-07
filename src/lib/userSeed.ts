import type { Prisma } from '@prisma/client';
import { INITIAL_FOLDERS, INITIAL_FINANCE_CATEGORIES } from '@/data/initialData';

/** Creates the default folders and finance categories for a freshly created user. */
export async function seedDefaultUserData(tx: Prisma.TransactionClient, userId: string) {
  await tx.folder.createMany({
    data: INITIAL_FOLDERS.map((folder) => ({
      id: `${userId}_${folder.id}`,
      userId,
      name: folder.name,
      description: folder.description,
      iconName: folder.iconName,
      isSystem: folder.isSystem || false,
    })),
  });

  await tx.financeCategory.createMany({
    data: INITIAL_FINANCE_CATEGORIES.map((cat) => ({
      id: `${userId}_${cat.id}`,
      userId,
      name: cat.name,
      type: cat.type,
      isSystem: cat.isSystem || false,
    })),
  });
}
