import { createHmac, randomInt, timingSafeEqual } from 'crypto';
import { prisma } from './prisma';
import { deriveSecret } from './dataCrypto';
import { sendMail } from './mailer';
import { mailShell } from './notices';
export { isAcademicEmail } from './studentProfile';

// ---------------------------------------------------------------------------
// Six-digit codes sent by e-mail. Only an HMAC (bound to the code's row) is stored; a code is
// valid for 15 minutes and 5 attempts, a new one can be requested after 60 seconds.
// ---------------------------------------------------------------------------

export type CodePurpose = 'email' | 'email-change' | 'student-email' | 'password-reset';

const TTL_MS = 15 * 60_000;
const MAX_ATTEMPTS = 5;
const RESEND_AFTER_MS = 60_000;
const MAX_PER_HOUR = 6;

let key: Buffer | null = null;
const hashCode = (rowId: string, code: string) => {
  key ??= deriveSecret('verification-code:v1');
  return createHmac('sha256', key).update(`${rowId}:${code}`).digest('hex');
};

export class VerificationError extends Error {
  constructor(message: string, readonly status: 400 | 429 | 502 = 400) {
    super(message);
    this.name = 'VerificationError';
  }
}

const SUBJECT: Record<CodePurpose, string> = {
  email: 'E-posta doğrulama kodunuz',
  'email-change': 'Yeni e-posta adresinizi doğrulayın',
  'student-email': 'Öğrenci e-postası doğrulama kodunuz',
  'password-reset': 'Şifre sıfırlama kodunuz',
};

const INTRO: Record<CodePurpose, string> = {
  email: 'LrDocument hesabınızın e-posta adresini doğrulamak için aşağıdaki kodu girin.',
  'email-change': 'LrDocument hesabınızın e-posta adresini bu adresle değiştirmek için aşağıdaki kodu girin.',
  'student-email': 'Öğrenci e-postanızı doğrulamak için aşağıdaki kodu LrDocument’e girin. Doğrulanan adresle giriş de yapabilirsiniz.',
  'password-reset': 'LrDocument hesabınızın şifresini sıfırlamak için aşağıdaki kodu girin.',
};

function renderMail(purpose: CodePurpose, code: string) {
  const text = `${INTRO[purpose]}\n\nKod: ${code}\n\nKod 15 dakika geçerlidir. Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz.`;
  const html = mailShell(`<tr><td style="padding:8px 28px;font-size:14px;line-height:1.6">${INTRO[purpose]}</td></tr>
<tr><td style="padding:16px 28px"><div style="font-size:32px;letter-spacing:8px;font-weight:bold;text-align:center;background:#f4f5f6;border-radius:6px;padding:14px 0;color:#c25e12">${code}</div></td></tr>
<tr><td style="padding:8px 28px 24px;font-size:12px;line-height:1.6;color:#6b7378">Kod 15 dakika geçerlidir. Bu isteği siz yapmadıysanız bu e-postayı yok sayabilirsiniz; hesabınızda bir değişiklik yapılmaz.</td></tr>`);
  return { text, html };
}

/** Creates a code and e-mails it. Throws VerificationError (rate limit, delivery failure). */
export async function issueCode(userId: string, purpose: CodePurpose, target: string, siteHost: string): Promise<void> {
  const to = target.trim().toLowerCase();
  const recent = await prisma.verificationCode.findMany({
    where: { userId, purpose, createdAt: { gte: new Date(Date.now() - 60 * 60_000) } },
    orderBy: { createdAt: 'desc' },
    select: { createdAt: true },
  });
  if (recent[0] && Date.now() - recent[0].createdAt.getTime() < RESEND_AFTER_MS) {
    const wait = Math.ceil((RESEND_AFTER_MS - (Date.now() - recent[0].createdAt.getTime())) / 1000);
    throw new VerificationError(`Yeni kod için ${wait} saniye bekleyin.`, 429);
  }
  if (recent.length >= MAX_PER_HOUR) throw new VerificationError('Çok fazla kod istendi. Bir saat sonra tekrar deneyin.', 429);

  const code = String(randomInt(0, 1_000_000)).padStart(6, '0');
  // Older unused codes for the same purpose stop working.
  await prisma.verificationCode.updateMany({ where: { userId, purpose, consumedAt: null }, data: { consumedAt: new Date() } });
  const row = await prisma.verificationCode.create({
    data: { userId, purpose, target: to, codeHash: 'pending', expiresAt: new Date(Date.now() + TTL_MS) },
  });
  await prisma.verificationCode.update({ where: { id: row.id }, data: { codeHash: hashCode(row.id, code) } });

  if (process.env.NODE_ENV !== 'production' && process.env.MAIL_LOG_CODES === '1') {
    console.info(`[mail] ${purpose} kodu ${to}: ${code}`);
  }
  try {
    await sendMail({ to, subject: SUBJECT[purpose], ...renderMail(purpose, code), siteHost });
  } catch (err) {
    // The code cannot reach the user: drop it (and its rate-limit slot) so a retry is possible.
    await prisma.verificationCode.delete({ where: { id: row.id } }).catch(() => undefined);
    throw new VerificationError(`Doğrulama e-postası gönderilemedi. ${(err as Error).message}`, 502);
  }
}

/**
 * Checks a code; on success it is consumed and the target address is returned.
 * `target`, when given, must match the address the code was sent to.
 */
export async function consumeCode(userId: string, purpose: CodePurpose, code: unknown, target?: string): Promise<string> {
  const clean = typeof code === 'string' ? code.replace(/\D/g, '') : '';
  if (clean.length !== 6) throw new VerificationError('Kod 6 haneli olmalıdır.');
  const row = await prisma.verificationCode.findFirst({
    where: { userId, purpose, consumedAt: null },
    orderBy: { createdAt: 'desc' },
  });
  if (!row || row.expiresAt.getTime() < Date.now()) throw new VerificationError('Kodun süresi doldu. Yeni kod isteyin.');
  if (target && row.target !== target.trim().toLowerCase()) throw new VerificationError('Kod bu adres için gönderilmedi. Yeni kod isteyin.');
  if (row.attempts >= MAX_ATTEMPTS) throw new VerificationError('Çok fazla hatalı deneme. Yeni kod isteyin.', 429);

  const expected = Buffer.from(row.codeHash, 'hex');
  const actual = Buffer.from(hashCode(row.id, clean), 'hex');
  if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
    await prisma.verificationCode.update({ where: { id: row.id }, data: { attempts: { increment: 1 } } });
    const left = MAX_ATTEMPTS - row.attempts - 1;
    throw new VerificationError(left > 0 ? `Kod hatalı. ${left} deneme hakkınız kaldı.` : 'Kod hatalı. Yeni kod isteyin.');
  }
  // Single use, even with two requests racing for the same code.
  const { count } = await prisma.verificationCode.updateMany({ where: { id: row.id, consumedAt: null }, data: { consumedAt: new Date() } });
  if (!count) throw new VerificationError('Kod zaten kullanıldı.');
  return row.target;
}

/** "a***@ornek.com" for messages that must not reveal the full address. */
export function maskEmail(email: string): string {
  const [local, domain] = email.split('@');
  return `${local.slice(0, 1)}***@${domain ?? ''}`;
}
