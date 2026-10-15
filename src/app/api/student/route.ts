import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStudentAccess } from '@/lib/auth';
import { handleRouteError } from '@/lib/apiUtils';
import { academicDataSchema, MAX_ACADEMIC_JSON_BYTES } from '@/lib/academic/schema';
import { createDefaultData } from '@/lib/academic/grading';
import { applySchoolCalendar } from '@/lib/academic/schoolCalendar';
import { decryptText, encryptText } from '@/lib/dataCrypto';
import { getSystemSettings } from '@/lib/systemSettingsServer';
import { getSchoolCalendar } from '@/lib/schoolCalendarServer';
import { universityById } from '@/lib/universities';

/** Today in Türkiye (the server may run in UTC). */
function todayTR(): string {
  return new Intl.DateTimeFormat('en-CA', { timeZone: 'Europe/Istanbul' }).format(new Date());
}

export async function GET() {
  try {
    const session = await requireStudentAccess();
    const profile = await prisma.studentProfile.findUnique({ where: { userId: session.userId } });

    let data = null;
    if (profile) {
      try {
        const parsed = academicDataSchema.safeParse(JSON.parse(decryptText(session.userId, profile.data) || '{}'));
        if (parsed.success) data = parsed.data;
      } catch {
        data = null;
      }
    }
    data ??= createDefaultData(profile?.university ?? '', (await getSystemSettings()).academic);

    // Okulun akademik takvimi: dates the admin published for this university are filled in automatically.
    const university = universityById(profile?.universityId);
    const calendar = await getSchoolCalendar(university?.id);
    if (calendar) {
      const merged = applySchoolCalendar(data, calendar, todayTR());
      if (merged.changed) {
        data = merged.data;
        const plain = JSON.stringify(data);
        if (profile && plain.length <= MAX_ACADEMIC_JSON_BYTES) {
          await prisma.studentProfile.update({ where: { userId: session.userId }, data: { data: encryptText(session.userId, plain) } });
        }
      }
    }

    return NextResponse.json(
      {
        success: true,
        profile: profile
          ? {
              university: profile.university,
              universityId: profile.universityId,
              studentEmail: profile.studentEmail,
              department: profile.department,
              classYear: profile.classYear,
              studentNo: profile.studentNo ? decryptText(session.userId, profile.studentNo) : null,
            }
          : null,
        school: university
          ? {
              ...university,
              calendar: calendar ? { updatedAt: calendar.updatedAt, sourceUrl: calendar.sourceUrl, terms: calendar.terms.map((t) => t.name) } : null,
            }
          : null,
        data,
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error, 'Student fetch error', 'Ders bilgileri yüklenemedi.');
  }
}
