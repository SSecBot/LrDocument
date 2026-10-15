import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStudentAccess } from '@/lib/auth';
import { handleRouteError, readJsonObject } from '@/lib/apiUtils';
import { studentProfileSchema } from '@/lib/studentProfile';
import { decryptText, encryptRow } from '@/lib/dataCrypto';
import { catalogFields } from '@/lib/universities';

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

    const input = { ...parsed.data, ...catalogFields(parsed.data) };
    const fields = encryptRow('studentProfile', session.userId, input);
    // A confirmed student e-mail belongs to that address: a new one must be confirmed again, and the
    // old address stops working for sign-in.
    const before = await prisma.studentProfile.findUnique({ where: { userId: session.userId }, select: { studentEmail: true, verifyMethod: true } });
    const emailChanged = !!before && before.studentEmail.toLowerCase() !== input.studentEmail.toLowerCase();
    const reset = emailChanged
      ? { loginEmail: null, ...(before.verifyMethod === 'email' ? { verifiedAt: null, verifyMethod: null } : {}) }
      : {};
    const profile = await prisma.studentProfile.upsert({
      where: { userId: session.userId },
      update: { ...fields, ...reset },
      create: { userId: session.userId, ...fields },
    });

    return NextResponse.json({
      success: true,
      message: 'Öğrenci bilgileriniz güncellendi.',
      profile: {
        university: profile.university,
        universityId: profile.universityId,
        studentEmail: profile.studentEmail,
        department: profile.department,
        classYear: profile.classYear,
        studentNo: profile.studentNo ? decryptText(session.userId, profile.studentNo) : null,
      },
    });
  } catch (error) {
    return handleRouteError(error, 'Student profile update error', 'Öğrenci bilgileri güncellenemedi.');
  }
}
