import { prisma } from './prisma';
import { ENCRYPTED_FIELDS, encryptRow, hasPlainFields, type EncryptedModel } from './dataCrypto';

type Row = Record<string, unknown> & { id: string };
type Delegate = {
  findMany(args: { where: { userId: string } }): Promise<Row[]>;
  update(args: { where: { id: string }; data: Record<string, unknown> }): Promise<unknown>;
};

const DELEGATES: Record<EncryptedModel, () => Delegate> = {
  note: () => prisma.note as unknown as Delegate,
  task: () => prisma.task as unknown as Delegate,
  kanbanCard: () => prisma.kanbanCard as unknown as Delegate,
  calendarEvent: () => prisma.calendarEvent as unknown as Delegate,
  financeTransaction: () => prisma.financeTransaction as unknown as Delegate,
  folder: () => prisma.folder as unknown as Delegate,
  financeCategory: () => prisma.financeCategory as unknown as Delegate,
  customer: () => prisma.customer as unknown as Delegate,
  studentProfile: () => prisma.studentProfile as unknown as Delegate,
};

const running = new Map<string, Promise<void>>();

/**
 * One-time upgrade for rows written before at-rest encryption: encrypts every plain-text field
 * of the user's data, then marks the user so the scan never runs again.
 */
export function encryptLegacyRows(userId: string): Promise<void> {
  let job = running.get(userId);
  if (!job) {
    job = (async () => {
      for (const model of Object.keys(ENCRYPTED_FIELDS) as EncryptedModel[]) {
        const rows = await DELEGATES[model]().findMany({ where: { userId } });
        for (const row of rows) {
          if (!hasPlainFields(model, row)) continue;
          const encrypted = encryptRow(model, userId, row);
          const data: Record<string, unknown> = {};
          for (const field of ENCRYPTED_FIELDS[model]) if (field in encrypted) data[field] = encrypted[field];
          // Keep "last edited" dates: this is a storage upgrade, not an edit.
          if (row.updatedAt instanceof Date) data.updatedAt = row.updatedAt;
          await DELEGATES[model]().update({ where: { id: row.id }, data });
        }
      }
      await prisma.user.update({ where: { id: userId }, data: { dataEncryptedAt: new Date() } });
    })().finally(() => running.delete(userId));
    running.set(userId, job);
  }
  return job;
}
