// Shared between the Node runtime (auth.ts) and proxy.ts — must not import Node-only modules.

const DEV_FALLBACK_SECRET = 'lrdocument_dev_only_insecure_secret_do_not_use_in_production';
const KNOWN_WEAK_SECRETS = new Set([
  DEV_FALLBACK_SECRET,
  'lrdocument_super_secret_jwt_key_2026_production',
  'your_secure_jwt_secret_here',
]);

let cachedKey: Uint8Array | null = null;

export function getJwtSecretKey(): Uint8Array {
  if (cachedKey) return cachedKey;

  const secret = process.env.JWT_SECRET;
  const isProduction = process.env.NODE_ENV === 'production';

  if (!secret || KNOWN_WEAK_SECRETS.has(secret) || secret.length < 32) {
    if (isProduction) {
      throw new Error(
        'JWT_SECRET ortam değişkeni tanımlı değil veya zayıf. Üretim ortamında en az 32 karakterlik rastgele bir değer zorunludur.'
      );
    }
    console.warn('[auth] JWT_SECRET güvenli değil; yalnızca geliştirme için varsayılan anahtar kullanılıyor.');
    cachedKey = new TextEncoder().encode(secret && secret.length >= 32 ? secret : DEV_FALLBACK_SECRET);
    return cachedKey;
  }

  cachedKey = new TextEncoder().encode(secret);
  return cachedKey;
}

export const COOKIE_NAME = 'lr_session';
export const SESSION_MAX_AGE_SECONDS = 30 * 24 * 60 * 60;
