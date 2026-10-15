import { createHmac, randomBytes, timingSafeEqual } from 'crypto';
import { deriveSecret } from './dataCrypto';

// ---------------------------------------------------------------------------
// İki adımlı doğrulama with any authenticator app (Google Authenticator, Microsoft Authenticator,
// Authy, 1Password…): RFC 6238 TOTP, SHA-1, 6 digits, 30-second steps. Works without any
// external service.
// ---------------------------------------------------------------------------

const B32 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
const STEP_SECONDS = 30;

export function base32Encode(buf: Buffer): string {
  let bits = 0;
  let value = 0;
  let out = '';
  for (const byte of buf) {
    value = (value << 8) | byte;
    bits += 8;
    while (bits >= 5) {
      out += B32[(value >>> (bits - 5)) & 31];
      bits -= 5;
    }
  }
  if (bits > 0) out += B32[(value << (5 - bits)) & 31];
  return out;
}

export function base32Decode(input: string): Buffer {
  const clean = input.toUpperCase().replace(/[^A-Z2-7]/g, '');
  let bits = 0;
  let value = 0;
  const out: number[] = [];
  for (const ch of clean) {
    value = (value << 5) | B32.indexOf(ch);
    bits += 5;
    if (bits >= 8) {
      out.push((value >>> (bits - 8)) & 255);
      bits -= 8;
    }
  }
  return Buffer.from(out);
}

export function generateTotpSecret(): string {
  return base32Encode(randomBytes(20));
}

export function totpAt(secret: string, step: number): string {
  const counter = Buffer.alloc(8);
  counter.writeBigUInt64BE(BigInt(step));
  const mac = createHmac('sha1', base32Decode(secret)).update(counter).digest();
  const offset = mac[mac.length - 1] & 0xf;
  const bin = ((mac[offset] & 0x7f) << 24) | (mac[offset + 1] << 16) | (mac[offset + 2] << 8) | mac[offset + 3];
  return String(bin % 1_000_000).padStart(6, '0');
}

export const currentStep = (now = Date.now()) => Math.floor(now / 1000 / STEP_SECONDS);

/**
 * Returns the matching step (allowing ±1 step of clock drift) or null. Steps at or before
 * `lastStep` are rejected so a code cannot be used twice.
 */
export function verifyTotp(secret: string, code: unknown, lastStep: number | null | undefined, now = Date.now()): number | null {
  const clean = typeof code === 'string' ? code.replace(/\s/g, '') : '';
  if (!/^\d{6}$/.test(clean)) return null;
  const step = currentStep(now);
  for (const s of [step, step - 1, step + 1]) {
    if (lastStep != null && s <= lastStep) continue;
    const expected = Buffer.from(totpAt(secret, s));
    if (timingSafeEqual(expected, Buffer.from(clean))) return s;
  }
  return null;
}

export function otpauthUri(secret: string, account: string, issuer = 'LrDocument'): string {
  return `otpauth://totp/${encodeURIComponent(`${issuer}:${account}`)}?secret=${secret}&issuer=${encodeURIComponent(issuer)}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`;
}

// Recovery codes: 10 single-use codes "XXXX-XXXX", stored as HMACs.
let recoveryKey: Buffer | null = null;
export function hashRecoveryCode(code: string): string {
  recoveryKey ??= deriveSecret('totp-recovery:v1');
  return createHmac('sha256', recoveryKey).update(code.toUpperCase().replace(/[^A-Z0-9]/g, '')).digest('hex');
}

export function generateRecoveryCodes(n = 10): string[] {
  return Array.from({ length: n }, () => {
    const raw = base32Encode(randomBytes(5)).slice(0, 8);
    return `${raw.slice(0, 4)}-${raw.slice(4)}`;
  });
}
