import { prisma } from './prisma';
import { resolveSystemSettings, systemSettingsSchema, type SystemSettings } from './systemSettings';
import { landingContentSchema, resolveLandingContent, type LandingContent } from './landingContent';

const KEY = 'system';
const TTL_MS = 30_000;
let cache: { value: SystemSettings; at: number } | null = null;
/** Done once: the döviz kur marjı used to default to 2.50 TL; it now starts at 0 (opt-in). */
const MARKUP_MIGRATION_KEY = 'migration:markupZero';
let markupChecked = false;

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
  let value = resolveSystemSettings(stored);
  if (stored && !markupChecked && value.finance.exchangeMarkupTRY === 2.5) {
    try {
      const done = await prisma.systemSetting.findUnique({ where: { key: MARKUP_MIGRATION_KEY } });
      if (!done) {
        value = { ...value, finance: { ...value.finance, exchangeMarkupTRY: 0 } };
        await prisma.systemSetting.upsert({ where: { key: KEY }, update: { value: JSON.stringify(value) }, create: { key: KEY, value: JSON.stringify(value) } });
      }
    } catch {}
  }
  if (stored && !markupChecked) {
    markupChecked = true;
    // Mark the migration as done so an admin who sets 2.50 TL again keeps it.
    prisma.systemSetting
      .upsert({ where: { key: MARKUP_MIGRATION_KEY }, update: {}, create: { key: MARKUP_MIGRATION_KEY, value: '1' } })
      .catch(() => {});
  }
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
