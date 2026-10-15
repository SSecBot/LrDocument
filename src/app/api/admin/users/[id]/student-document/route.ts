import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { handleRouteError } from '@/lib/apiUtils';
import { decryptText } from '@/lib/dataCrypto';

const ALLOWED = new Set(['application/pdf', 'image/jpeg', 'image/png']);

/** The uploaded öğrenci belgesi, for review (opened in a sandbox, never cached). */
export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    const doc = await prisma.studentDocument.findUnique({ where: { userId: id } });
    if (!doc || !ALLOWED.has(doc.mime)) return NextResponse.json({ error: 'Belge bulunamadı.' }, { status: 404 });
    const body = Buffer.from(decryptText(id, doc.data), 'base64');
    const ext = doc.mime === 'application/pdf' ? 'pdf' : doc.mime === 'image/png' ? 'png' : 'jpg';
    return new NextResponse(body, {
      headers: {
        'Content-Type': doc.mime,
        // Only PDF / JPEG / PNG are accepted (checked by content on upload) and nosniff stops the
        // browser from treating them as anything else. PDFs are downloaded, images shown inline.
        'Content-Disposition': `${ext === 'pdf' ? 'attachment' : 'inline'}; filename="ogrenci-belgesi.${ext}"`,
        'X-Content-Type-Options': 'nosniff',
        'Cache-Control': 'no-store',
      },
    });
  } catch (error) {
    return handleRouteError(error, 'Student document error', 'Belge açılamadı.');
  }
}
