import { createHash } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { handleRouteError, rateLimit, tooManyRequests } from '@/lib/apiUtils';
import { decryptBytes, decryptText } from '@/lib/dataCrypto';
import { fileAccess, unpackFile } from '@/lib/storedFiles';

type Params = { params: Promise<{ id: string }> };
const ID_RE = /^[a-f0-9]{32}$/;

/** The decrypted file, checked against its hash. Never cached; opened by the in-app PDF viewer. */
export async function GET(_req: Request, { params }: Params) {
  try {
    const session = await requireAuth();
    const wait = rateLimit(`file-read:${session.memberId ?? session.userId}`, 300, 15 * 60_000);
    if (wait) return tooManyRequests(wait);
    const { id } = await params;
    if (!ID_RE.test(id)) return NextResponse.json({ error: 'Dosya bulunamadı.' }, { status: 404 });
    const file = await prisma.storedFile.findUnique({ where: { id } });
    // Another account's file (or a private one of someone else) looks exactly like a missing one.
    if (!file || file.userId !== session.userId || fileAccess(session, file.personalOf) === 'none') {
      return NextResponse.json({ error: 'Dosya bulunamadı.' }, { status: 404 });
    }
    let data: Buffer;
    try {
      data = await unpackFile(decryptBytes(file.userId, Buffer.from(file.data)), file.compression);
    } catch {
      return NextResponse.json({ error: 'Dosya çözülemedi.' }, { status: 500 });
    }
    if (createHash('sha256').update(data).digest('hex') !== file.sha256) {
      return NextResponse.json({ error: 'Dosya bozulmuş (doğrulama tutmadı).' }, { status: 500 });
    }
    const name = decryptText(file.userId, file.name) || (file.purpose === 'sound' ? 'ses' : 'belge.pdf');
    return new Response(new Uint8Array(data), {
      headers: {
        'Content-Type': file.mime,
        'Content-Length': String(data.length),
        'Content-Disposition': `inline; filename="${file.purpose === 'sound' ? 'ses' : 'belge.pdf'}"; filename*=UTF-8''${encodeURIComponent(name)}`,
        'Cache-Control': 'no-store',
        'X-Content-Type-Options': 'nosniff',
        // Opened directly, a PDF still cannot run scripts in the site's origin.
        'Content-Security-Policy': "sandbox; default-src 'none'",
      },
    });
  } catch (error) {
    return handleRouteError(error, 'File read error', 'Dosya açılamadı.');
  }
}

export async function DELETE(_req: Request, { params }: Params) {
  try {
    const session = await requireAuth();
    const { id } = await params;
    if (!ID_RE.test(id)) return NextResponse.json({ success: true });
    const file = await prisma.storedFile.findUnique({ where: { id }, select: { userId: true, personalOf: true } });
    if (!file || file.userId !== session.userId) return NextResponse.json({ success: true });
    if (fileAccess(session, file.personalOf) !== 'edit') {
      return NextResponse.json({ error: 'Bu dosyayı silme yetkiniz yok.' }, { status: 403 });
    }
    // Still attached to a note (e.g. a copy of the note)? Keep it.
    const used = await prisma.note.count({ where: { userId: session.userId, fileId: id } });
    if (used > 0) return NextResponse.json({ success: true, kept: true });
    await prisma.storedFile.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, 'File delete error', 'Dosya silinemedi.');
  }
}
