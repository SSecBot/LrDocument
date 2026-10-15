import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireStudentAccess } from '@/lib/auth';
import { handleRouteError, rateLimit, readJsonObject, requestHost, tooManyRequests } from '@/lib/apiUtils';
import { encryptText } from '@/lib/dataCrypto';
import { consumeCode, isAcademicEmail, issueCode, maskEmail, VerificationError } from '@/lib/verification';
import { siteHostFrom } from '@/lib/mailer';

// Öğrencilik doğrulaması:
//  1. a code sent to the university e-mail (instant), or
//  2. an uploaded öğrenci belgesi (e-Devlet PDF or a photo), reviewed in Yönetici Paneli.

const MAX_DOC_BYTES = 3 * 1024 * 1024;
const MIME: Record<string, (b: Buffer) => boolean> = {
  'application/pdf': (b) => b.subarray(0, 5).toString('latin1') === '%PDF-',
  'image/jpeg': (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  'image/png': (b) => b.subarray(0, 8).equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
};

export async function GET() {
  try {
    const session = await requireStudentAccess();
    return NextResponse.json(await statusOf(session.userId), { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleRouteError(error, 'Student verify status error', 'Durum alınamadı.');
  }
}

async function statusOf(userId: string) {
  const sp = await prisma.studentProfile.findUnique({
    where: { userId },
    select: { studentEmail: true, verifiedAt: true, verifyMethod: true, documentStatus: true },
  });
  return {
    verified: !!sp?.verifiedAt,
    verifiedAt: sp?.verifiedAt?.toISOString() ?? null,
    method: sp?.verifyMethod ?? null,
    documentStatus: sp?.documentStatus ?? null,
    studentEmail: sp?.studentEmail ?? null,
    academic: sp ? isAcademicEmail(sp.studentEmail) : false,
  };
}

export async function POST(req: Request) {
  try {
    const session = await requireStudentAccess();
    const wait = rateLimit(`student-verify:${session.userId}`, 20, 15 * 60_000);
    if (wait) return tooManyRequests(wait);

    const body = await readJsonObject(req, MAX_DOC_BYTES * 1.4 + 4096);
    const sp = await prisma.studentProfile.findUnique({ where: { userId: session.userId } });
    if (!sp) return NextResponse.json({ error: 'Önce öğrenci bilgilerinizi kaydedin.' }, { status: 400 });
    if (sp.verifiedAt) return NextResponse.json({ success: true, ...(await statusOf(session.userId)) });

    if (body.action === 'send') {
      if (!isAcademicEmail(sp.studentEmail)) {
        return NextResponse.json({ error: 'Öğrenci e-postanız üniversite uzantılı değil. Belge yükleyerek doğrulayın.' }, { status: 400 });
      }
      await issueCode(session.userId, 'student-email', sp.studentEmail, siteHostFrom(requestHost(req)));
      return NextResponse.json({ success: true, message: `Kod ${maskEmail(sp.studentEmail)} adresine gönderildi.` });
    }

    if (body.action === 'confirm') {
      await consumeCode(session.userId, 'student-email', body.code, sp.studentEmail);
      await prisma.studentProfile.update({ where: { userId: session.userId }, data: { verifiedAt: new Date(), verifyMethod: 'email', documentStatus: null } });
      await prisma.studentDocument.deleteMany({ where: { userId: session.userId } });
      return NextResponse.json({ success: true, ...(await statusOf(session.userId)) });
    }

    if (body.action === 'document') {
      const mime = typeof body.mime === 'string' ? body.mime : '';
      const fileName = typeof body.fileName === 'string' ? body.fileName.replace(/[^\p{L}\p{N} ._-]/gu, '').slice(0, 120) || 'belge' : 'belge';
      const data = typeof body.data === 'string' ? body.data : '';
      const check = MIME[mime];
      if (!check) return NextResponse.json({ error: 'Yalnızca PDF, JPG veya PNG yükleyebilirsiniz.' }, { status: 400 });
      const buf = Buffer.from(data, 'base64');
      if (buf.length === 0 || buf.length > MAX_DOC_BYTES) return NextResponse.json({ error: 'Dosya en fazla 3 MB olabilir.' }, { status: 400 });
      if (!check(buf)) return NextResponse.json({ error: 'Dosya içeriği seçilen türle uyuşmuyor.' }, { status: 400 });
      const stored = { fileName, mime, data: encryptText(session.userId, buf.toString('base64')), uploadedAt: new Date() };
      await prisma.studentDocument.upsert({ where: { userId: session.userId }, update: stored, create: { userId: session.userId, ...stored } });
      await prisma.studentProfile.update({ where: { userId: session.userId }, data: { documentStatus: 'pending' } });
      return NextResponse.json({ success: true, ...(await statusOf(session.userId)) });
    }

    return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 });
  } catch (error) {
    if (error instanceof VerificationError) return NextResponse.json({ error: error.message }, { status: error.status });
    return handleRouteError(error, 'Student verify error', 'Doğrulama yapılamadı.');
  }
}
