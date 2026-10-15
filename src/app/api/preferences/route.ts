import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { handleRouteError, rateLimit, readJsonObject, tooManyRequests } from '@/lib/apiUtils';
import { decryptText, encryptText } from '@/lib/dataCrypto';
import { parsePreferences, preferencesPatchSchema } from '@/lib/preferences';

// Read-modify-write per user is serialized so two quick updates cannot overwrite each other.
const queues = new Map<string, Promise<unknown>>();
function serialized<T>(userId: string, job: () => Promise<T>): Promise<T> {
  const run = (queues.get(userId) ?? Promise.resolve()).catch(() => undefined).then(job);
  queues.set(userId, run);
  run.finally(() => queues.get(userId) === run && queues.delete(userId)).catch(() => undefined);
  return run;
}

/** Merges a partial preference update into the user's encrypted preference record. */
export async function PATCH(req: Request) {
  try {
    const session = await requireAuth();
    const wait = rateLimit(`prefs:${session.userId}`, 120, 60_000);
    if (wait) return tooManyRequests(wait);

    const patch = preferencesPatchSchema.safeParse(await readJsonObject(req, 64 * 1024));
    if (!patch.success) return NextResponse.json({ error: 'Geçersiz tercih.' }, { status: 400 });

    const next = await serialized(session.userId, async () => {
      const user = await prisma.user.findUnique({ where: { id: session.userId }, select: { preferences: true } });
      let current: unknown = {};
      try {
        current = user?.preferences ? JSON.parse(decryptText(session.userId, user.preferences) || '{}') : {};
      } catch {
        current = {};
      }
      const merged = parsePreferences({ ...parsePreferences(current), ...patch.data });
      await prisma.user.update({
        where: { id: session.userId },
        data: { preferences: encryptText(session.userId, JSON.stringify(merged)) },
      });
      return merged;
    });
    return NextResponse.json({ success: true, preferences: next });
  } catch (error) {
    return handleRouteError(error, 'Preferences save error', 'Tercihler kaydedilemedi.');
  }
}
