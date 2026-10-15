import { generateKeyPairSync, createPublicKey } from 'crypto';
import { promises as dns } from 'dns';
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'fs';
import os from 'os';
import path from 'path';
import nodemailer from 'nodemailer';
import { prisma } from './prisma';
import { databaseDir } from './dataCrypto';

// ---------------------------------------------------------------------------
// E-mail without any third-party account.
//
// By default the server delivers mail itself: it looks up the recipient domain's mail servers (MX)
// and hands the message over on port 25, with STARTTLS when offered. Messages are DKIM-signed with
// a key created on first use; publishing the DNS records shown in Yönetici Paneli improves
// delivery, but nothing has to be configured for mail to work.
//
// Optional: SMTP_URL (e.g. smtps://user:pass@smtp.example.com) sends through a relay instead.
// MAIL_FROM overrides the sender (default: no-reply@<site domain>).
// ---------------------------------------------------------------------------

const DKIM_SELECTOR = 'lrdoc';
const DKIM_KEY_FILE = 'dkim-private.pem';
const STATUS_KEY = 'mailStatus';

export interface MailStatus {
  lastOkAt?: string;
  lastOkTo?: string;
  lastErrorAt?: string;
  lastError?: string;
}

let dkimKey: string | null = null;

/** DKIM private key (PEM), created next to the database on first use. */
function getDkimKey(): string {
  if (dkimKey) return dkimKey;
  const file = path.join(databaseDir(), DKIM_KEY_FILE);
  if (!existsSync(file)) {
    mkdirSync(path.dirname(file), { recursive: true });
    const { privateKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
    try {
      writeFileSync(file, privateKey.export({ type: 'pkcs8', format: 'pem' }), { mode: 0o600, flag: 'wx' });
    } catch (err) {
      if ((err as NodeJS.ErrnoException).code !== 'EEXIST') throw err;
    }
  }
  dkimKey = readFileSync(file, 'utf8');
  return dkimKey;
}

/** Bare host name of the site (no port), from SITE_URL or the request. */
export function siteHostFrom(requestHost?: string | null): string {
  const fromEnv = process.env.SITE_URL?.trim();
  let host = '';
  if (fromEnv) {
    try {
      host = new URL(fromEnv).hostname;
    } catch {}
  }
  if (!host && requestHost) host = requestHost.split(',')[0].trim().replace(/:\d+$/, '');
  host = host.toLowerCase();
  return /^[a-z0-9.-]+$/.test(host) ? host : os.hostname().toLowerCase();
}

/** DNS records that make self-sent mail trusted by Gmail, Outlook… (optional, shown to the admin). */
export function recommendedDnsRecords(host: string) {
  const pub = createPublicKey(getDkimKey()).export({ type: 'spki', format: 'der' }).toString('base64');
  return [
    { type: 'TXT', name: host, value: 'v=spf1 a mx ~all', purpose: 'SPF: bu sunucunun alan adınız adına e-posta gönderebileceğini belirtir.' },
    { type: 'TXT', name: `${DKIM_SELECTOR}._domainkey.${host}`, value: `v=DKIM1; k=rsa; p=${pub}`, purpose: 'DKIM: e-postaların imzasını doğrulatır.' },
    { type: 'TXT', name: `_dmarc.${host}`, value: 'v=DMARC1; p=none', purpose: 'DMARC: SPF/DKIM sonucuna göre davranışı belirtir.' },
  ];
}

async function mxHosts(domain: string): Promise<string[]> {
  // Test hook (not needed on a real server): deliver everything to one SMTP server, e.g. 127.0.0.1:2525.
  const override = process.env.MAIL_DIRECT_HOST?.trim();
  if (override) return [override];
  try {
    const records = await dns.resolveMx(domain);
    if (records.length) return records.sort((a, b) => a.priority - b.priority).map((r) => r.exchange);
  } catch {}
  return [domain]; // RFC 5321: no MX → the domain itself
}

async function recordStatus(patch: MailStatus) {
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: STATUS_KEY } });
    const value = { ...(row ? (JSON.parse(row.value) as MailStatus) : {}), ...patch };
    await prisma.systemSetting.upsert({
      where: { key: STATUS_KEY },
      update: { value: JSON.stringify(value) },
      create: { key: STATUS_KEY, value: JSON.stringify(value) },
    });
  } catch {}
}

export async function getMailStatus(): Promise<MailStatus> {
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: STATUS_KEY } });
    return row ? (JSON.parse(row.value) as MailStatus) : {};
  } catch {
    return {};
  }
}

export interface OutgoingMail {
  to: string;
  subject: string;
  text: string;
  html: string;
  /** Site host (from the request) used for the sender address and DKIM domain. */
  siteHost: string;
}

/** Sends one message; throws with a readable reason when every mail server refused it. */
export async function sendMail(mail: OutgoingMail): Promise<void> {
  const from = process.env.MAIL_FROM?.trim() || `LrDocument <no-reply@${mail.siteHost}>`;
  const message = {
    from,
    to: mail.to,
    subject: mail.subject,
    text: mail.text,
    html: mail.html,
    headers: { 'Auto-Submitted': 'auto-generated' },
  };
  const dkim = { domainName: mail.siteHost, keySelector: DKIM_SELECTOR, privateKey: getDkimKey() };

  try {
    if (process.env.SMTP_URL?.trim()) {
      await nodemailer.createTransport(process.env.SMTP_URL.trim(), { dkim }).sendMail(message);
    } else {
      const domain = mail.to.split('@')[1];
      if (!domain) throw new Error('Geçersiz alıcı adresi.');
      let lastError: unknown = null;
      let delivered = false;
      for (const target of (await mxHosts(domain)).slice(0, 3)) {
        const [host, port] = target.split(':');
        try {
          const transport = nodemailer.createTransport({
            host,
            port: Number(port) || 25,
            secure: false,
            name: mail.siteHost,
            // Opportunistic STARTTLS like any mail server; receiving servers often use self-issued certificates.
            tls: { rejectUnauthorized: false },
            connectionTimeout: 15_000,
            greetingTimeout: 15_000,
            socketTimeout: 30_000,
            dkim,
          });
          await transport.sendMail(message);
          delivered = true;
          break;
        } catch (err) {
          lastError = err;
        }
      }
      if (!delivered) throw lastError ?? new Error('Posta sunucusu bulunamadı.');
    }
    await recordStatus({ lastOkAt: new Date().toISOString(), lastOkTo: mail.to.replace(/^(.).*(@.*)$/, '$1***$2') });
  } catch (err) {
    const reason = describeMailError(err);
    await recordStatus({ lastErrorAt: new Date().toISOString(), lastError: reason });
    throw new Error(reason);
  }
}

function describeMailError(err: unknown): string {
  const e = err as { code?: string; responseCode?: number; message?: string };
  if (e?.code === 'ETIMEDOUT' || e?.code === 'ECONNREFUSED' || e?.code === 'ECONNECTION' || e?.code === 'ESOCKET') {
    return 'Alıcının posta sunucusuna bağlanılamadı (sunucunuzun 25 numaralı çıkış portu kapalı olabilir).';
  }
  if (e?.responseCode && e.responseCode >= 500) return `Alıcı posta sunucusu iletiyi reddetti: ${String(e.message).slice(0, 160)}`;
  return String(e?.message ?? err).slice(0, 200);
}
