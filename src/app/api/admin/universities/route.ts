import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { handleRouteError } from '@/lib/apiUtils';
import { schoolTermsSchema } from '@/lib/academic/schoolCalendar';
import { BUNDLED_BY, seedBundledCalendars } from '@/lib/schoolCalendarServer';

/** Yönetici Paneli › Üniversiteler: students per university and which calendars are published. */
export async function GET() {
  try {
    await requireAdmin();
    await seedBundledCalendars();
    const [byId, unlisted, calendars] = await Promise.all([
      prisma.studentProfile.groupBy({ by: ['universityId'], where: { universityId: { not: null }, user: { accountType: 'STUDENT' } }, _count: { _all: true } }),
      prisma.studentProfile.groupBy({ by: ['university'], where: { universityId: null, university: { not: '' }, user: { accountType: 'STUDENT' } }, _count: { _all: true } }),
      prisma.universityCalendar.findMany(),
    ]);
    const students = Object.fromEntries(byId.map((r) => [r.universityId!, r._count._all]));
    const published = Object.fromEntries(
      calendars.map((c) => {
        let terms: string[] = [];
        try {
          terms = schoolTermsSchema.parse(JSON.parse(c.terms)).map((t) => t.name);
        } catch {}
        return [c.universityId, { updatedAt: c.updatedAt.toISOString(), terms, bundled: c.updatedBy === BUNDLED_BY }];
      })
    );
    return NextResponse.json(
      {
        students,
        calendars: published,
        // Schools typed by hand (not in the catalog), so the admin can see who is not matched.
        unlisted: unlisted.map((r) => ({ name: r.university, count: r._count._all })).sort((a, b) => b.count - a.count).slice(0, 50),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error, 'Admin universities error', 'Üniversiteler alınamadı.');
  }
}
