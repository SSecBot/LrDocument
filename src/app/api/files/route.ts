import { createHash, randomBytes } from 'crypto';
import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { handleRouteError, rateLimit, readBodyBytes, tooManyRequests } from '@/lib/apiUtils';
import { encryptBytes, encryptText } from '@/lib/dataCrypto';
import {
  MAX_ACCOUNT_FILE_BYTES,
  MAX_FILE_BYTES,
  MAX_FILES,
  MAX_SOUND_BYTES,
  fileAccess,
  fileTypeFor,
  packFile,
  personalKey,
  safeFileName,
  type FilePurpose,
} from '@/lib/storedFiles';

/**
 * Upload a file. The body is the raw file; Content-Type gives its type and X-File-Name its
 * (URI-encoded) name.
 *   ?personal=1     a PDF of the person's "Şahsi Notlar" (kurumsal)
 *   ?purpose=sound  the person's notification sound (replaces the previous one)
 * The content is checked (it must really be that type), hashed, compressed and encrypted.
 */
export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    const wait = rateLimit(`file-upload:${session.memberId ?? session.userId}`, 60, 60 * 60_000);
    if (wait) return tooManyRequests(wait);

    const params = new URL(req.url).searchParams;
    const purpose: FilePurpose = params.get('purpose') === 'sound' ? 'sound' : 'note';
    const personal = params.get('personal') === '1';
    if (personal && session.accountType !== 'CORPORATE') {
      return NextResponse.json({ error: 'Şahsi dosya yalnızca kurumsal hesapta kullanılabilir.' }, { status: 400 });
    }
    // A sound belongs to the person: in a corporate account it is always a private file.
    const personalOf = personalKey(session, personal || (purpose === 'sound' && session.accountType === 'CORPORATE'));
    if (purpose === 'note' && fileAccess(session, personalOf) !== 'edit') {
      return NextResponse.json({ error: 'Bu bölüme dosya ekleme yetkiniz yok.' }, { status: 403 });
    }

    const found = fileTypeFor(purpose, (req.headers.get('content-type') ?? '').split(';')[0].trim().toLowerCase());
    if (!found) {
      return NextResponse.json({ error: purpose === 'sound' ? 'Ses dosyası MP3, WAV, OGG veya M4A olmalı.' : 'Yalnızca PDF dosyaları eklenebilir.' }, { status: 415 });
    }
    const data = await readBodyBytes(req, purpose === 'sound' ? MAX_SOUND_BYTES : MAX_FILE_BYTES);
    if (!data.length || !found.type.check(data)) {
      return NextResponse.json({ error: purpose === 'sound' ? 'Dosya geçerli bir ses dosyası değil.' : 'Dosya geçerli bir PDF değil.' }, { status: 400 });
    }

    const userId = session.userId;
    const usage = await prisma.storedFile.aggregate({ where: { userId }, _sum: { size: true }, _count: true });
    if (usage._count >= MAX_FILES || (usage._sum.size ?? 0) + data.length > MAX_ACCOUNT_FILE_BYTES) {
      return NextResponse.json({ error: 'Dosya depolama sınırına ulaşıldı. Eski PDF notlarını silip tekrar deneyin.' }, { status: 409 });
    }

    const id = randomBytes(16).toString('hex');
    const name = safeFileName(req.headers.get('x-file-name'), found.type.ext);
    const packed = await packFile(data);
    await prisma.storedFile.create({
      data: {
        id,
        userId,
        personalOf,
        purpose,
        name: encryptText(userId, name),
        mime: found.mime,
        size: data.length,
        sha256: createHash('sha256').update(data).digest('hex'),
        compression: packed.compression ?? 'none',
        data: new Uint8Array(encryptBytes(userId, packed.data)),
      },
    });
    if (purpose === 'sound') {
      // One sound per person: the earlier one is no longer used.
      await prisma.storedFile.deleteMany({ where: { userId, personalOf, purpose: 'sound', id: { not: id } } });
    }
    return NextResponse.json({ success: true, id, name, size: data.length });
  } catch (error) {
    return handleRouteError(error, 'File upload error', 'Dosya yüklenemedi.');
  }
}
