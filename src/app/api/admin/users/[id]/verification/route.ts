import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { handleRouteError, readJsonObject } from '@/lib/apiUtils';

/**
 * Manual verification decisions:
 *  verify-email      — mark the e-mail as confirmed (e.g. when mail cannot be delivered)
 *  student-approve   — öğrenci belgesi accepted → student verified
 *  student-reject    — document rejected; the student may upload another one
 *  student-revoke    — remove a student verification
 *  reset-2fa         — turn off İki adımlı doğrulama for a user who lost the authenticator
 */
export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const { action } = await readJsonObject(req, 1024);
    const user = await prisma.user.findUnique({ where: { id }, select: { id: true, name: true, studentProfile: { select: { id: true } } } });
    if (!user) return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });

    switch (action) {
      case 'verify-email':
        await prisma.user.update({ where: { id }, data: { emailVerifiedAt: new Date() } });
        return NextResponse.json({ success: true, message: `${user.name} e-postası doğrulanmış sayıldı.` });
      case 'student-approve':
      case 'student-reject':
      case 'student-revoke': {
        if (!user.studentProfile) return NextResponse.json({ error: 'Öğrenci bilgisi yok.' }, { status: 400 });
        const data =
          action === 'student-approve'
            ? { verifiedAt: new Date(), verifyMethod: 'document', documentStatus: null }
            : action === 'student-reject'
              ? { documentStatus: 'rejected' }
              : { verifiedAt: null, verifyMethod: null, documentStatus: null };
        await prisma.studentProfile.update({ where: { userId: id }, data });
        // The document is only kept until it is reviewed.
        await prisma.studentDocument.deleteMany({ where: { userId: id } });
        const message =
          action === 'student-approve' ? 'Öğrencilik doğrulandı.' : action === 'student-reject' ? 'Belge reddedildi.' : 'Öğrenci doğrulaması kaldırıldı.';
        return NextResponse.json({ success: true, message });
      }
      case 'reset-2fa':
        await prisma.user.update({
          where: { id },
          data: { twoFactorSecret: null, twoFactorPending: null, twoFactorEnabledAt: null, twoFactorLastStep: null, twoFactorRecovery: null },
        });
        return NextResponse.json({ success: true, message: `${user.name} için iki adımlı doğrulama kapatıldı.` });
      default:
        return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 });
    }
  } catch (error) {
    return handleRouteError(error, 'Admin verification error', 'İşlem yapılamadı.');
  }
}
