import { prisma } from './prisma';
import { resolveSystemSettings, systemSettingsSchema, type SystemSettings } from './systemSettings';
import { landingContentSchema, resolveLandingContent, type LandingContent } from './landingContent';

const KEY = 'system';
const TTL_MS = 30_000;
let cache: { value: SystemSettings; at: number } | null = null;

/** Current system defaults (short in-process cache; refreshed immediately after an admin save). */
export async function getSystemSettings(): Promise<SystemSettings> {
  if (cache && Date.now() - cache.at < TTL_MS) return cache.value;
  let stored: unknown = null;
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: KEY } });
    stored = row ? JSON.parse(row.value) : null;
  } catch (error) {
    console.error('[settings] Sistem ayarları okunamadı, varsayılanlar kullanılıyor:', error);
  }
  const value = resolveSystemSettings(stored);
  cache = { value, at: Date.now() };
  return value;
}

export async function saveSystemSettings(input: unknown): Promise<SystemSettings> {
  const value = systemSettingsSchema.parse(input);
  await prisma.systemSetting.upsert({
    where: { key: KEY },
    update: { value: JSON.stringify(value) },
    create: { key: KEY, value: JSON.stringify(value) },
  });
  cache = { value, at: Date.now() };
  return value;
}

const LANDING_KEY = 'landing';

/** Landing page texts (no cache: the public page and the editor always show the saved version). */
export async function getLandingContent(): Promise<LandingContent> {
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: LANDING_KEY } });
    return resolveLandingContent(row ? JSON.parse(row.value) : null);
  } catch (error) {
    console.error('[settings] Açılış sayfası içeriği okunamadı, varsayılan kullanılıyor:', error);
    return resolveLandingContent(null);
  }
}

export async function saveLandingContent(input: unknown): Promise<LandingContent> {
  const value = landingContentSchema.parse(input);
  await prisma.systemSetting.upsert({
    where: { key: LANDING_KEY },
    update: { value: JSON.stringify(value) },
    create: { key: LANDING_KEY, value: JSON.stringify(value) },
  });
  return value;
}
