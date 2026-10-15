import { z } from 'zod';

/**
 * Per-user UI state. Stored encrypted on the server (User.preferences) — the browser keeps
 * nothing in cookies, localStorage or caches apart from the httpOnly session cookie.
 */
const fields = {
  sidebarCollapsed: z.boolean(),
  notesPanelCollapsed: z.boolean(),
  mathDrawerOpen: z.boolean(),
  calendarPanelCollapsed: z.boolean(),
  tasksView: z.enum(['liste', 'pano']),
  exchangeMarkupTRY: z.number().min(0).max(1000).nullable(),
  readNotificationIds: z.array(z.string().max(200)).max(500),
  dismissedNotificationIds: z.array(z.string().max(200)).max(500),
};

export type UserPreferences = { [K in keyof typeof fields]: z.infer<(typeof fields)[K]> };

export const DEFAULT_PREFERENCES: UserPreferences = {
  sidebarCollapsed: false,
  notesPanelCollapsed: false,
  mathDrawerOpen: false,
  calendarPanelCollapsed: false,
  tasksView: 'liste',
  exchangeMarkupTRY: null,
  readNotificationIds: [],
  dismissedNotificationIds: [],
};

/**
 * Partial update: only the keys that were sent. (Built without `.default()` on purpose — in zod 4
 * a partial of defaulted fields would fill in every missing key and overwrite stored values.)
 */
export const preferencesPatchSchema = z.object(fields).partial().strict();

/** Lenient read: unknown keys are dropped, invalid ones fall back to their default. */
export function parsePreferences(raw: unknown): UserPreferences {
  const obj = raw && typeof raw === 'object' && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const out = { ...DEFAULT_PREFERENCES } as Record<string, unknown>;
  for (const [key, field] of Object.entries(fields)) {
    const r = field.safeParse(obj[key]);
    if (r.success) out[key] = r.data;
  }
  return out as UserPreferences;
}
