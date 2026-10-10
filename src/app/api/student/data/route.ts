import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStudentAccess } from '@/lib/auth';
import { handleRouteError, rateLimit, readJsonObject, tooManyRequests } from '@/lib/apiUtils';
import { academicDataSchema, MAX_ACADEMIC_JSON_BYTES } from '@/lib/academic/schema';

export async function PUT(req: Request) {
  try {
    const session = await requireStudentAccess();

    const wait = rateLimit(`student-data:${session.userId}`, 120, 60_000);
    if (wait) return tooManyRequests(wait);

    const body = await readJsonObject(req);
    const parsed = academicDataSchema.safeParse(body.data);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { error: `Geçersiz ders verisi: ${issue?.message ?? 'bilinmeyen hata'} (${issue?.path.join('.') ?? ''})` },
        { status: 400 }
      );
    }

    const json = JSON.stringify(parsed.data);
    if (json.length > MAX_ACADEMIC_JSON_BYTES) {
      return NextResponse.json({ error: 'Ders verisi çok büyük.' }, { status: 413 });
    }

    // Admins can use the tracker without a student profile; one is created on first save.
    await prisma.studentProfile.upsert({
      where: { userId: session.userId },
      update: { data: json },
      create: { userId: session.userId, university: '', studentEmail: '', department: '', classYear: 1, data: json },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, 'Student data save error', 'Ders bilgileri kaydedilemedi.');
  }
}
