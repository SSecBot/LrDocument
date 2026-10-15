import type { Feedback } from '@prisma/client';
import { decryptText, encryptText } from './dataCrypto';
import type { AdminFeedbackItem, FeedbackItem, FeedbackKind, FeedbackStatus } from './feedback';

export function sealPayload(userId: string, payload: unknown): string {
  return encryptText(userId, JSON.stringify(payload));
}

export function openPayload(row: Pick<Feedback, 'userId' | 'payload'>): Record<string, unknown> | null {
  if (!row.payload) return null;
  try {
    return JSON.parse(decryptText(row.userId, row.payload));
  } catch {
    return null;
  }
}

export function toFeedbackItem(row: Feedback): FeedbackItem {
  return {
    id: row.id,
    kind: row.kind as FeedbackKind,
    subject: row.subject,
    message: decryptText(row.userId, row.message),
    status: row.status as FeedbackStatus,
    adminNote: row.adminNote,
    authorName: row.authorName,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
    resolvedAt: row.resolvedAt?.toISOString() ?? null,
  };
}

export function toAdminFeedbackItem(
  row: Feedback & { user: { id: string; name: string; email: string; accountType: string } | null }
): AdminFeedbackItem {
  const payload = openPayload(row);
  const { context, ...rest } = payload ?? {};
  return {
    ...toFeedbackItem(row),
    user: row.user,
    payload: Object.keys(rest).length ? (rest as AdminFeedbackItem['payload']) : null,
    context: typeof context === 'string' ? context : null,
  };
}
