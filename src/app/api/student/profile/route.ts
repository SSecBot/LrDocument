import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStudentAccess } from '@/lib/auth';
import { handleRouteError, readJsonObject } from '@/lib/apiUtils';
import { studentProfileSchema } from '@/lib/studentProfile';

export async function PATCH(req: Request) {
  try {
    const session = await requireStudentAccess();
    const parsed = studentProfileSchema.safeParse(await readJsonObject(req));
    if (!parsed.success) {
      return NextResponse.json(
        { error: parsed.error.issues[0]?.message || 'Öğrenci bilgileri geçersiz.' },
        { status: 400 }
      );
    }

    const profile = await prisma.studentProfile.upsert({
      where: { userId: session.userId },
      update: parsed.data,
      create: { userId: session.userId, ...parsed.data },
    });

    return NextResponse.json({
      success: true,
      message: 'Öğrenci bilgileriniz güncellendi.',
      profile: {
        university: profile.university,
        studentEmail: profile.studentEmail,
        department: profile.department,
        classYear: profile.classYear,
        studentNo: profile.studentNo,
      },
    });
  } catch (error) {
    return handleRouteError(error, 'Student profile update error', 'Öğrenci bilgileri güncellenemedi.');
  }
}
