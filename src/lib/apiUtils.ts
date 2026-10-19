import { NextRequest, NextResponse } from 'next/server';
import { AuthError } from './auth';

/** Converts thrown errors into a safe JSON response without leaking internals. */
export function handleRouteError(error: unknown, logLabel: string, fallbackMessage: string) {
  if (error instanceof AuthError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  if (error instanceof BadRequestError) {
    return NextResponse.json({ error: error.message }, { status: error.status });
  }
  console.error(`${logLabel}:`, error);
  return NextResponse.json({ error: fallbackMessage }, { status: 500 });
}

export class BadRequestError extends Error {
  constructor(message: string, public readonly status: 400 | 409 | 413 = 400) {
    super(message);
    this.name = 'BadRequestError';
  }
}

/** Default request-body cap; fits a note or an inline image (media items allow ~2 MB data URLs). */
export const DEFAULT_MAX_BODY_BYTES = 3 * 1024 * 1024;

/**
 * Parses a JSON object body; throws BadRequestError for malformed, non-object or oversized payloads.
 * The size is checked before parsing so a huge body cannot tie up the server.
 */
export async function readJsonObject(req: Request, maxBytes = DEFAULT_MAX_BODY_BYTES): Promise<Record<string, unknown>> {
  const tooLarge = () => new BadRequestError('İstek gövdesi çok büyük.', 413);
  const declared = Number(req.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw tooLarge();

  // Read in chunks and stop at the cap: a chunked body without Content-Length cannot fill memory.
  let raw = '';
  if (req.body) {
    const reader = req.body.getReader();
    const decoder = new TextDecoder();
    let received = 0;
    try {
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        received += value.byteLength;
        if (received > maxBytes) {
          await reader.cancel().catch(() => {});
          throw tooLarge();
        }
        raw += decoder.decode(value, { stream: true });
      }
      raw += decoder.decode();
      if (Number.isFinite(declared) && declared > 0 && received !== declared) throw new BadRequestError('İstek eksik geldi; tekrar deneyin.');
    } catch (err) {
      if (err instanceof BadRequestError) throw err;
      throw new BadRequestError('Geçersiz istek gövdesi.');
    }
  }

  let body: unknown;
  try {
    body = JSON.parse(raw);
  } catch {
    throw new BadRequestError('Geçersiz istek gövdesi.');
  }
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    throw new BadRequestError('Geçersiz istek gövdesi.');
  }
  return body as Record<string, unknown>;
}

/** Raw request body (uploads), read in chunks and refused as soon as it grows past `maxBytes`. */
export async function readBodyBytes(req: Request, maxBytes: number): Promise<Buffer> {
  const declared = Number(req.headers.get('content-length'));
  if (Number.isFinite(declared) && declared > maxBytes) throw new BadRequestError('Dosya çok büyük.', 413);
  if (!req.body) return Buffer.alloc(0);
  const reader = req.body.getReader();
  const chunks: Uint8Array[] = [];
  let received = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    received += value.byteLength;
    if (received > maxBytes) {
      await reader.cancel().catch(() => {});
      throw new BadRequestError('Dosya çok büyük.', 413);
    }
    chunks.push(value);
  }
  // A body shorter than announced (connection cut, or cut by a proxy) must not be stored as a file.
  if (Number.isFinite(declared) && declared > 0 && received !== declared) throw new BadRequestError('Dosya eksik geldi; tekrar deneyin.');
  return Buffer.concat(chunks);
}

// ---------------------------------------------------------------------------
// In-memory sliding-window rate limiter. Suitable for the single-process
// PM2/VPS deployment described in README; use Redis for multi-instance setups.
// ---------------------------------------------------------------------------
const buckets = new Map<string, number[]>();
let lastSweep = Date.now();

export function getClientIp(req: NextRequest): string {
  // nginx (see README) sets X-Real-IP to $remote_addr, which the client cannot forge.
  const realIp = req.headers.get('x-real-ip');
  if (realIp) return realIp.trim();
  // Otherwise use the entry appended by the nearest proxy; earlier entries are client-supplied.
  const forwarded = req.headers.get('x-forwarded-for');
  if (forwarded) return forwarded.split(',').pop()!.trim();
  return 'unknown';
}

/** Host the visitor used (nginx passes it as Host); used for the e-mail sender domain. */
export function requestHost(req: Request): string | null {
  return req.headers.get('x-forwarded-host') || req.headers.get('host');
}

/** Returns the number of seconds to wait, or 0 when the request is allowed. */
export function rateLimit(key: string, limit: number, windowMs: number): number {
  const now = Date.now();

  if (now - lastSweep > 60_000) {
    lastSweep = now;
    for (const [k, hits] of buckets) {
      if (hits.length === 0 || now - hits[hits.length - 1] > 60 * 60_000) buckets.delete(k);
    }
  }

  const hits = (buckets.get(key) || []).filter((t) => now - t < windowMs);
  if (hits.length >= limit) {
    buckets.set(key, hits);
    return Math.max(1, Math.ceil((windowMs - (now - hits[0])) / 1000));
  }
  hits.push(now);
  buckets.set(key, hits);
  return 0;
}

export function tooManyRequests(retryAfterSeconds: number) {
  return NextResponse.json(
    { error: `Çok fazla deneme yapıldı. Lütfen ${Math.ceil(retryAfterSeconds / 60)} dakika sonra tekrar deneyin.` },
    { status: 429, headers: { 'Retry-After': String(retryAfterSeconds) } }
  );
}

export const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function normalizeEmail(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const email = value.trim().toLowerCase();
  if (email.length > 254 || !EMAIL_REGEX.test(email)) return null;
  return email;
}

export function normalizeName(value: unknown): string | null {
  if (typeof value !== 'string') return null;
  const name = value.trim().replace(/\s+/g, ' ');
  if (name.length < 2 || name.length > 80) return null;
  return name;
}
