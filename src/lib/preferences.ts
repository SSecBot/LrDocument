import { z } from 'zod';

/**
 * Per-user UI state. Stored encrypted on the server (User.preferences) — the browser keeps
 * nothing in cookies, localStorage or caches apart from the httpOnly session cookie.
 */
const fields = {
  sidebarCollapsed: z.boolean(),
  notesPanelCollapsed: z.boolean(),
  mathDrawerOpen: z.boolean(),
  /** Notlar: the Yazım araçları strip (roman / tez shortcuts) is open. */
  writingDrawerOpen: z.boolean(),
  calendarPanelCollapsed: z.boolean(),
  /** Calendar layers the user turned off (see src/lib/calendarFeed.ts). */
  calendarHiddenLayers: z.array(z.enum(['etkinlik', 'gorev', 'finans', 'ders', 'sinav', 'akademik', 'resmi', 'kanban', 'musteri'])).max(20),
  tasksView: z.enum(['liste', 'pano']),
  exchangeMarkupTRY: z.number().min(0).max(1000).nullable(),
  readNotificationIds: z.array(z.string().max(200)).max(500),
  dismissedNotificationIds: z.array(z.string().max(200)).max(500),
  /** Show new notifications as system (Windows / macOS / Android) notifications on this device. */
  desktopNotifications: z.boolean(),
  /** Notlar: folder order the user arranged (ids; folders not listed follow in creation order). */
  folderOrder: z.array(z.string().max(200)).max(300),
  /** Notlar: list order. "manual" uses noteOrder. Pinned notes always come first. */
  noteSort: z.enum(['updated', 'created', 'title', 'manual']),
  noteOrder: z.array(z.string().max(200)).max(1000),
  /**
   * Notlar: which folder is open when Notlar opens — "Tüm Notlar", the folder left last time, or one
   * chosen folder (notesStartFolderId). The last folder is kept per space (shared / Şahsi Notlar).
   */
  notesStartFolder: z.enum(['all', 'last', 'custom']),
  notesStartFolderId: z.string().max(200).nullable(),
  notesLastFolder: z.string().max(200).nullable(),
  notesLastFolderPersonal: z.string().max(200).nullable(),
  /** Kitap görünümü: PDFs and the note preview show two pages side by side (tablet / computer only). */
  pdfSpread: z.boolean(),
  /** Genel bakış widgets in display order; empty = default layout. */
  /**
   * Öğrenci: when the class reminder comes, in minutes before the start (0 = at the start,
   * negative = after it started). null = no class reminders.
   */
  classReminderMinutes: z.number().int().min(-30).max(120).nullable(),
  /** Single-key shortcuts (N, T, G+…) and swipe gestures (see src/components/layout/Shortcuts.tsx). */
  keyboardShortcuts: z.boolean(),
  touchGestures: z.boolean(),
  /**
   * PDF okuyucu: the last zoom the person left (share of the reader's width; 0.1 = %10), kept
   * separately for phones and larger screens. null = the default (%75 on phones, %50 otherwise).
   */
  pdfZoomMobile: z.number().min(0.1).max(4).nullable(),
  pdfZoomDesktop: z.number().min(0.1).max(4).nullable(),
  /** Bildirim sesi: off, the built-in chime, or the person's own uploaded sound (a stored file id). */
  notificationSound: z.enum(['off', 'default', 'custom']),
  notificationSoundFileId: z.string().regex(/^[a-f0-9]{32}$/).nullable(),
  notificationVolume: z.number().min(0).max(1),
  /** The welcome screen with the user guide was shown once. */
  guideSeen: z.boolean(),
  dashboardWidgets: z
    .array(z.object({ id: z.enum(['student', 'stats', 'notes', 'events', 'tasks', 'payments', 'month', 'exchange', 'academic', 'financeSummary', 'pinned']), visible: z.boolean() }).strict())
    .max(20),
};

export type UserPreferences = { [K in keyof typeof fields]: z.infer<(typeof fields)[K]> };

export const DEFAULT_PREFERENCES: UserPreferences = {
  sidebarCollapsed: false,
  notesPanelCollapsed: false,
  mathDrawerOpen: false,
  writingDrawerOpen: false,
  calendarPanelCollapsed: false,
  calendarHiddenLayers: [],
  tasksView: 'liste',
  exchangeMarkupTRY: null,
  readNotificationIds: [],
  dismissedNotificationIds: [],
  desktopNotifications: false,
  folderOrder: [],
  noteSort: 'updated',
  noteOrder: [],
  notesStartFolder: 'all',
  notesStartFolderId: null,
  notesLastFolder: null,
  notesLastFolderPersonal: null,
  pdfSpread: false,
  classReminderMinutes: 15,
  keyboardShortcuts: true,
  touchGestures: true,
  guideSeen: false,
  pdfZoomMobile: null,
  notificationSound: 'default',
  notificationSoundFileId: null,
  notificationVolume: 0.7,
  pdfZoomDesktop: null,
  dashboardWidgets: [],
};

/** Items sorted by a saved id order; items not in it keep their relative order after the listed ones. */
export function applyOrder<T extends { id: string }>(items: T[], order: string[]): T[] {
  if (!order.length) return items;
  const rank = new Map(order.map((id, i) => [id, i]));
  return items
    .map((item, i) => ({ item, r: rank.get(item.id) ?? order.length + i }))
    .sort((a, b) => a.r - b.r)
    .map((x) => x.item);
}

/** Moves `id` one step up (-1) or down (+1) within `ids`; returns the new order. */
export function moveId(ids: string[], id: string, step: -1 | 1): string[] {
  const i = ids.indexOf(id);
  const j = i + step;
  if (i < 0 || j < 0 || j >= ids.length) return ids;
  const next = [...ids];
  [next[i], next[j]] = [next[j], next[i]];
  return next;
}

/** Moves `id` to the position of `targetId` (drag and drop). */
export function moveIdTo(ids: string[], id: string, targetId: string): string[] {
  if (id === targetId || !ids.includes(id) || !ids.includes(targetId)) return ids;
  const without = ids.filter((x) => x !== id);
  const at = without.indexOf(targetId) + (ids.indexOf(id) < ids.indexOf(targetId) ? 1 : 0);
  without.splice(at, 0, id);
  return without;
}

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
