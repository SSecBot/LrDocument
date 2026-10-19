import { promisify } from 'util';
import { brotliCompress, brotliDecompress, constants } from 'zlib';
import { accessOf } from './corporate';
import type { UserJWTPayload } from './auth';

const compress = promisify(brotliCompress);
const decompress = promisify(brotliDecompress);

// ---------------------------------------------------------------------------
// Stored files: PDF notes and the person's notification sound. Kept in the database, compressed
// (Brotli, before encryption — encrypted bytes do not compress) and encrypted with the account's
// key; nothing is stored in the browser (no cookies, no local storage, no cache).
// ---------------------------------------------------------------------------

export const MAX_FILE_BYTES = 25 * 1024 * 1024;
export const MAX_SOUND_BYTES = 1024 * 1024;
/** All files of one account together. */
export const MAX_ACCOUNT_FILE_BYTES = 1024 * 1024 * 1024;
export const MAX_FILES = 2000;

export type FilePurpose = 'note' | 'sound';
type FileType = { ext: string; check: (b: Buffer) => boolean };

export const FILE_TYPES: Record<string, FileType> = {
  'application/pdf': { ext: 'pdf', check: (b) => b.subarray(0, 5).toString('latin1') === '%PDF-' },
};

/** Notification sounds: checked by their content, not only by the name the browser sends. */
export const SOUND_TYPES: Record<string, FileType> = {
  'audio/mpeg': { ext: 'mp3', check: (b) => b.subarray(0, 3).toString('latin1') === 'ID3' || (b[0] === 0xff && (b[1] & 0xe0) === 0xe0) },
  'audio/wav': { ext: 'wav', check: (b) => b.subarray(0, 4).toString('latin1') === 'RIFF' && b.subarray(8, 12).toString('latin1') === 'WAVE' },
  'audio/ogg': { ext: 'ogg', check: (b) => b.subarray(0, 4).toString('latin1') === 'OggS' },
  'audio/mp4': { ext: 'm4a', check: (b) => b.subarray(4, 8).toString('latin1') === 'ftyp' },
};
const SOUND_ALIASES: Record<string, string> = { 'audio/mp3': 'audio/mpeg', 'audio/x-wav': 'audio/wav', 'audio/wave': 'audio/wav', 'audio/x-m4a': 'audio/mp4', 'audio/aac': 'audio/mp4' };

export function fileTypeFor(purpose: FilePurpose, mime: string): { mime: string; type: FileType } | null {
  if (purpose === 'sound') {
    const m = SOUND_ALIASES[mime] ?? mime;
    return SOUND_TYPES[m] ? { mime: m, type: SOUND_TYPES[m] } : null;
  }
  return FILE_TYPES[mime] ? { mime, type: FILE_TYPES[mime] } : null;
}

/** Compresses when it pays off (PDFs with uncompressed parts, WAV sounds); otherwise keeps the bytes. */
export async function packFile(plain: Buffer): Promise<{ data: Buffer; compression: 'br' | null }> {
  const packed = await compress(plain, {
    params: { [constants.BROTLI_PARAM_QUALITY]: 6, [constants.BROTLI_PARAM_SIZE_HINT]: plain.length },
  });
  return packed.length < plain.length * 0.97 ? { data: packed, compression: 'br' } : { data: plain, compression: null };
}

export async function unpackFile(data: Buffer, compression: string | null): Promise<Buffer> {
  if (compression !== 'br') return data;
  // A stored file is never larger than the upload limit, so a bigger result means damaged data.
  return decompress(data, { maxOutputLength: MAX_FILE_BYTES + 1 });
}

/** "owner" or the member id for a private ("Şahsi") file; null for the shared space. */
export function personalKey(session: UserJWTPayload, personal: boolean): string | null {
  return personal ? (session.memberId ?? 'owner') : null;
}

/** May this session read / change a file of the given space? */
export function fileAccess(session: UserJWTPayload, personalOf: string | null): 'none' | 'view' | 'edit' {
  if (personalOf) return personalOf === (session.memberId ?? 'owner') && session.accountType === 'CORPORATE' ? 'edit' : 'none';
  return accessOf(session, 'notes');
}

export function safeFileName(name: unknown, ext: string): string {
  let decoded = '';
  try {
    decoded = typeof name === 'string' ? decodeURIComponent(name.slice(0, 600)) : '';
  } catch {
    decoded = ''; // malformed encoding: fall back to a plain name
  }
  const base = decoded.replace(/[^\p{L}\p{N} ._()-]/gu, '').trim().slice(0, 120);
  return base ? (base.toLowerCase().endsWith(`.${ext}`) ? base : `${base}.${ext}`) : `belge.${ext}`;
}
