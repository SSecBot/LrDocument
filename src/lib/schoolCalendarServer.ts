import { prisma } from './prisma';
import { schoolTermsSchema, type SchoolCalendar } from './academic/schoolCalendar';
import { BUNDLED_CALENDARS } from './bundledCalendars';
import { universityById } from './universities';

/** `updatedBy` of a calendar that came from data/akademik-takvimler (not edited by an admin). */
export const BUNDLED_BY = 'hazır takvim';
const SEED_KEY = 'calendarSeed';
let seeding: Promise<void> | null = null;

/**
 * Publishes the calendars shipped in data/akademik-takvimler once per university and academic year.
 * A calendar an admin published or edited is never replaced; one the admin removed stays removed
 * until a newer year is shipped.
 */
export function seedBundledCalendars(): Promise<void> {
  seeding ??= (async () => {
    try {
      const row = await prisma.systemSetting.findUnique({ where: { key: SEED_KEY } });
      const done: Record<string, string> = row ? JSON.parse(row.value) : {};
      let changed = false;
      for (const c of BUNDLED_CALENDARS) {
        if (done[c.universityId] === c.year || !universityById(c.universityId)) continue;
        const terms = schoolTermsSchema.safeParse(c.terms);
        if (!terms.success) {
          console.warn(`[takvim] ${c.universityId} hazır takvimi geçersiz: ${terms.error.issues[0]?.message}`);
          continue;
        }
        const existing = await prisma.universityCalendar.findUnique({ where: { universityId: c.universityId }, select: { updatedBy: true } });
        if (!existing || existing.updatedBy === BUNDLED_BY) {
          const value = { terms: JSON.stringify(terms.data), sourceUrl: c.sourceUrl, updatedBy: BUNDLED_BY };
          await prisma.universityCalendar.upsert({ where: { universityId: c.universityId }, update: value, create: { universityId: c.universityId, ...value } });
        }
        done[c.universityId] = c.year;
        changed = true;
      }
      if (changed) {
        const value = JSON.stringify(done);
        await prisma.systemSetting.upsert({ where: { key: SEED_KEY }, update: { value }, create: { key: SEED_KEY, value } });
      }
    } catch (err) {
      seeding = null; // try again on the next request
      console.error('[takvim] Hazır takvimler yüklenemedi:', err);
    }
  })();
  return seeding;
}

/** The published calendar of a university, or null. */
export async function getSchoolCalendar(universityId: string | null | undefined): Promise<SchoolCalendar | null> {
  if (!universityId) return null;
  await seedBundledCalendars();
  const row = await prisma.universityCalendar.findUnique({ where: { universityId } });
  if (!row) return null;
  try {
    const terms = schoolTermsSchema.parse(JSON.parse(row.terms));
    return { universityId, terms, sourceUrl: row.sourceUrl, updatedAt: row.updatedAt.toISOString() };
  } catch {
    return null;
  }
}

/** Publishes (or replaces) a university's calendar. */
export async function saveSchoolCalendar(universityId: string, terms: unknown, sourceUrl: string | null, updatedBy: string): Promise<SchoolCalendar> {
  const parsed = schoolTermsSchema.parse(terms);
  const value = { terms: JSON.stringify(parsed), sourceUrl, updatedBy };
  await prisma.universityCalendar.upsert({ where: { universityId }, update: value, create: { universityId, ...value } });
  return (await getSchoolCalendar(universityId))!;
}
