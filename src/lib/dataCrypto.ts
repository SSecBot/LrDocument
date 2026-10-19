import { createCipheriv, createDecipheriv, hkdfSync, randomBytes } from 'crypto';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import path from 'path';

// ---------------------------------------------------------------------------
// At-rest encryption of user content (AES-256-GCM).
//
// Every user gets an own key, derived with HKDF from the server master key and the user id.
// The user id is also bound as associated data, so a ciphertext copied into another user's row
// does not decrypt. Values written before encryption existed are returned as-is and encrypted
// on the next write (or by `encryptLegacyRows`).
//
// Master key: DATA_ENCRYPTION_KEY, or — when it is not set — a key file next to the SQLite
// database, created on first use. scripts/update.sh copies it into .env and keeps a backup.
// Losing the key makes the encrypted data unreadable.
// ---------------------------------------------------------------------------

const PREFIX = 'enc1:';
export const KEY_FILE_NAME = 'data-encryption.key';

let masterKey: Buffer | null = null;
const userKeys = new Map<string, Buffer>();

/** Directory of the SQLite file (Prisma resolves relative paths against prisma/). */
export function databaseDir(): string {
  const url = process.env.DATABASE_URL ?? 'file:./dev.db';
  const file = url.replace(/^file:/, '').split('?')[0];
  return path.dirname(path.isAbsolute(file) ? file : path.join(process.cwd(), 'prisma', file));
}

function loadOrCreateKeyFile(): string {
  const file = path.join(databaseDir(), KEY_FILE_NAME);
  if (!existsSync(file)) {
    mkdirSync(path.dirname(file), { recursive: true });
    try {
      // 'wx' fails if another process created the file first; then we read that one.
      writeFileSync(file, randomBytes(48).toString('base64'), { mode: 0o600, flag: 'wx' });
      console.warn(`[crypto] DATA_ENCRYPTION_KEY tanımlı değil; yeni anahtar oluşturuldu: ${file}. Bu dosyayı yedekleyin.`);
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    }
  }
  return readFileSync(file, 'utf8').trim();
}

function getMasterKey(): Buffer {
  if (masterKey) return masterKey;
  const env = process.env.DATA_ENCRYPTION_KEY?.trim();
  if (env && env.length < 32) {
    throw new Error('DATA_ENCRYPTION_KEY en az 32 karakter olmalıdır (openssl rand -base64 48).');
  }
  const raw = env || loadOrCreateKeyFile();
  if (raw.length < 32) throw new Error(`${KEY_FILE_NAME} geçersiz (en az 32 karakter olmalı).`);
  masterKey = Buffer.from(raw, 'utf8');
  return masterKey;
}

function keyFor(userId: string): Buffer {
  let key = userKeys.get(userId);
  if (!key) {
    key = Buffer.from(hkdfSync('sha256', getMasterKey(), Buffer.from(userId, 'utf8'), 'lrdocument:user-data:v1', 32));
    if (userKeys.size > 5000) userKeys.clear();
    userKeys.set(userId, key);
  }
  return key;
}

/** A purpose-bound secret derived from the master key (e.g. for HMAC lookups). */
export function deriveSecret(purpose: string): Buffer {
  return Buffer.from(hkdfSync('sha256', getMasterKey(), Buffer.alloc(0), `lrdocument:${purpose}`, 32));
}

export function isEncrypted(value: unknown): value is string {
  return typeof value === 'string' && value.startsWith(PREFIX);
}

export function encryptText(userId: string, plain: string): string {
  if (isEncrypted(plain)) return plain;
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFor(userId), iv);
  cipher.setAAD(Buffer.from(userId, 'utf8'));
  const body = Buffer.concat([cipher.update(plain, 'utf8'), cipher.final()]);
  return PREFIX + Buffer.concat([iv, cipher.getAuthTag(), body]).toString('base64');
}

/** Files: [12-byte IV | 16-byte tag | ciphertext], bound to the account like text values. */
export function encryptBytes(userId: string, plain: Buffer): Buffer {
  const iv = randomBytes(12);
  const cipher = createCipheriv('aes-256-gcm', keyFor(userId), iv);
  cipher.setAAD(Buffer.from(`file:${userId}`, 'utf8'));
  const body = Buffer.concat([cipher.update(plain), cipher.final()]);
  return Buffer.concat([iv, cipher.getAuthTag(), body]);
}

/** Throws when the key is wrong or the stored bytes were changed. */
export function decryptBytes(userId: string, raw: Buffer): Buffer {
  const decipher = createDecipheriv('aes-256-gcm', keyFor(userId), raw.subarray(0, 12));
  decipher.setAAD(Buffer.from(`file:${userId}`, 'utf8'));
  decipher.setAuthTag(raw.subarray(12, 28));
  return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]);
}

export function decryptText(userId: string, value: string): string {
  if (!isEncrypted(value)) return value;
  try {
    const raw = Buffer.from(value.slice(PREFIX.length), 'base64');
    const decipher = createDecipheriv('aes-256-gcm', keyFor(userId), raw.subarray(0, 12));
    decipher.setAAD(Buffer.from(userId, 'utf8'));
    decipher.setAuthTag(raw.subarray(12, 28));
    return Buffer.concat([decipher.update(raw.subarray(28)), decipher.final()]).toString('utf8');
  } catch {
    // Wrong key or tampered data: never leak the ciphertext into the UI.
    console.error('[crypto] Bir kayıt çözülemedi (anahtar değişmiş olabilir).');
    return '';
  }
}

/** Encrypted columns per Prisma model. Dates, amounts and ids stay plain for sorting and indexes. */
export const ENCRYPTED_FIELDS = {
  note: ['title', 'content', 'tags'],
  task: ['title', 'description'],
  kanbanCard: ['title', 'description', 'tags'],
  calendarEvent: ['title', 'description', 'checklist'],
  financeTransaction: ['title', 'description'],
  folder: ['name', 'description'],
  financeCategory: ['name'],
  customer: ['name', 'contactName', 'phone', 'email', 'address', 'payments', 'notes'],
  studentProfile: ['data', 'studentNo'],
} as const;

export type EncryptedModel = keyof typeof ENCRYPTED_FIELDS;

type Row = Record<string, unknown>;

export function encryptRow<T extends Row>(model: EncryptedModel, userId: string, row: T): T {
  const out: Row = { ...row };
  for (const field of ENCRYPTED_FIELDS[model]) {
    if (typeof out[field] === 'string') out[field] = encryptText(userId, out[field] as string);
  }
  return out as T;
}

export function decryptRow<T extends Row>(model: EncryptedModel, userId: string, row: T): T {
  const out: Row = { ...row };
  for (const field of ENCRYPTED_FIELDS[model]) {
    if (typeof out[field] === 'string') out[field] = decryptText(userId, out[field] as string);
  }
  return out as T;
}

/** True when any encrypted column of the row still holds plain text. */
export function hasPlainFields(model: EncryptedModel, row: Row): boolean {
  return ENCRYPTED_FIELDS[model].some((f) => typeof row[f] === 'string' && row[f] !== '' && !isEncrypted(row[f]));
}
