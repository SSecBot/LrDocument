import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStudentAccess } from '@/lib/auth';
import { handleRouteError } from '@/lib/apiUtils';
import { academicDataSchema } from '@/lib/academic/schema';
import { createDefaultData } from '@/lib/academic/grading';
import { decryptText } from '@/lib/dataCrypto';
import { getSystemSettings } from '@/lib/systemSettingsServer';

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

    return NextResponse.json(
      {
        success: true,
        profile: profile
          ? {
              university: profile.university,
              studentEmail: profile.studentEmail,
              department: profile.department,
              classYear: profile.classYear,
              studentNo: profile.studentNo ? decryptText(session.userId, profile.studentNo) : null,
            }
          : null,
        data: data ?? createDefaultData(profile?.university ?? '', (await getSystemSettings()).academic),
      },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    return handleRouteError(error, 'Student fetch error', 'Ders bilgileri yüklenemedi.');
  }
}
