// ---------------------------------------------------------------------------
// Gizli notlar: encryption in the browser (Web Crypto). The key is derived from the vault password
// with PBKDF2-SHA-256 and lives only in memory while the vault is open; the server stores ciphertext.
// Format: "v1.<iv base64url>.<AES-256-GCM ciphertext base64url>".
// ---------------------------------------------------------------------------

export const VAULT_ITERATIONS = 600_000;
export const VAULT_MIN_PASSWORD = 6;
const CHECK_TEXT = 'lrdocument-gizli-notlar';

export interface VaultMeta {
  salt: string;
  check: string;
  iterations: number;
}

export interface SecretNoteData {
  title: string;
  content: string;
  isPinned?: boolean;
}

function toB64(bytes: Uint8Array): string {
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

function fromB64(value: string): Uint8Array<ArrayBuffer> {
  const bin = atob(value.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - (value.length % 4)) % 4));
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

export function vaultSupported(): boolean {
  return typeof crypto !== 'undefined' && !!crypto.subtle;
}

export async function deriveKey(password: string, salt: string, iterations: number): Promise<CryptoKey> {
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(password.normalize('NFC')), 'PBKDF2', false, ['deriveKey']);
  return crypto.subtle.deriveKey(
    { name: 'PBKDF2', hash: 'SHA-256', salt: fromB64(salt), iterations },
    base,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt']
  );
}

export async function encryptText(key: CryptoKey, text: string): Promise<string> {
  const iv = crypto.getRandomValues(new Uint8Array(12));
  const data = await crypto.subtle.encrypt({ name: 'AES-GCM', iv }, key, new TextEncoder().encode(text));
  return `v1.${toB64(iv)}.${toB64(new Uint8Array(data))}`;
}

/** Throws when the key is wrong or the text was changed. */
export async function decryptText(key: CryptoKey, payload: string): Promise<string> {
  const [v, iv, data] = payload.split('.');
  if (v !== 'v1' || !iv || !data) throw new Error('Bilinmeyen biçim');
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: fromB64(iv) }, key, fromB64(data));
  return new TextDecoder().decode(plain);
}

/** New vault for a password: random salt and the encrypted check text. */
export async function createVault(password: string): Promise<{ meta: VaultMeta; key: CryptoKey }> {
  const salt = toB64(crypto.getRandomValues(new Uint8Array(16)));
  const key = await deriveKey(password, salt, VAULT_ITERATIONS);
  return { meta: { salt, check: await encryptText(key, CHECK_TEXT), iterations: VAULT_ITERATIONS }, key };
}

/** The key for the vault, or null when the password is wrong. */
export async function openVault(password: string, meta: VaultMeta): Promise<CryptoKey | null> {
  const key = await deriveKey(password, meta.salt, meta.iterations);
  try {
    return (await decryptText(key, meta.check)) === CHECK_TEXT ? key : null;
  } catch {
    return null;
  }
}

export async function sealNote(key: CryptoKey, note: SecretNoteData): Promise<string> {
  return encryptText(key, JSON.stringify({ title: note.title, content: note.content, isPinned: !!note.isPinned }));
}

export async function openNote(key: CryptoKey, payload: string): Promise<SecretNoteData> {
  const data = JSON.parse(await decryptText(key, payload)) as Partial<SecretNoteData>;
  return { title: String(data.title ?? ''), content: String(data.content ?? ''), isPinned: !!data.isPinned };
}
