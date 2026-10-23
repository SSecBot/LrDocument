import { sendMail } from './mailer';
import { prisma } from './prisma';
import { normalizeLocale, translatorFor, type Locale } from './i18n/server';

// Informational e-mails (hesap onayı, talep sonuçları). Sent after the response with next/server
// `after`, so an unreachable mail server never slows down or fails the admin's action.

const esc = (s: string) => s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);

/** Shared HTML frame of every LrDocument e-mail; `rows` are table rows (<tr>…</tr>). */
export function mailShell(rows: string, locale: Locale = 'tr'): string {
  return `<!doctype html><html lang="${locale}"><body style="margin:0;background:#f4f5f6;font-family:Arial,Helvetica,sans-serif;color:#1d2125">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr><td align="center" style="padding:32px 16px">
<table role="presentation" width="100%" style="max-width:480px;background:#ffffff;border-radius:8px;border:1px solid #e3e6e8" cellpadding="0" cellspacing="0">
<tr><td style="padding:24px 28px 8px;font-size:18px;font-weight:bold">Σ LrDocument</td></tr>
${rows}
</table></td></tr></table></body></html>`;
}

export interface Notice {
  subject: string;
  title: string;
  /** Plain-text paragraphs (escaped for HTML). */
  paragraphs: string[];
  cta?: { label: string; url: string };
}

export function renderNotice(source: Notice, locale: Locale = 'tr'): { text: string; html: string } {
  // Texts written in Turkish here are matched against the dictionary; names and notes stay as written.
  const t = translatorFor(locale);
  const n: Notice = {
    subject: t.msg(source.subject),
    title: t.msg(source.title),
    paragraphs: source.paragraphs.map((p) => p.split('\n').map((line) => t.msg(line)).join('\n')),
    ...(source.cta ? { cta: { label: t.msg(source.cta.label), url: source.cta.url } } : {}),
  };
  const text = [n.title, '', ...n.paragraphs, ...(n.cta ? ['', `${n.cta.label}: ${n.cta.url}`] : [])].join('\n');
  const rows = [
    `<tr><td style="padding:8px 28px 4px;font-size:16px;font-weight:bold">${esc(n.title)}</td></tr>`,
    ...n.paragraphs.map((p) => `<tr><td style="padding:6px 28px;font-size:14px;line-height:1.6;white-space:pre-line">${esc(p)}</td></tr>`),
    n.cta
      ? `<tr><td style="padding:16px 28px 8px"><a href="${esc(n.cta.url)}" style="display:inline-block;background:#c2560c;color:#ffffff;text-decoration:none;font-weight:bold;font-size:14px;padding:12px 20px;border-radius:6px">${esc(n.cta.label)}</a></td></tr>`
      : '',
    `<tr><td style="padding:12px 28px 24px;font-size:12px;line-height:1.6;color:#6b7378">${esc(t('Bu e-posta LrDocument hesabınızla ilgili bir işlem nedeniyle otomatik gönderildi.'))}</td></tr>`,
  ].join('\n');
  return { text, html: mailShell(rows, locale) };
}

/** Sends a notice; failures are logged (and shown in Yönetici Paneli › Varsayılanlar › E-posta), never thrown. */
export async function sendNotice(to: string, notice: Notice, siteHost: string): Promise<boolean> {
  try {
    // The recipient's language (their account's), Turkish for anyone else.
    const user = await prisma.user.findUnique({ where: { email: to.trim().toLowerCase() }, select: { locale: true } }).catch(() => null);
    const locale = normalizeLocale(user?.locale);
    await sendMail({ to, subject: translatorFor(locale).msg(notice.subject), siteHost, ...renderNotice(notice, locale) });
    return true;
  } catch (err) {
    console.warn(`[mail] "${notice.subject}" gönderilemedi: ${(err as Error).message}`);
    return false;
  }
}
