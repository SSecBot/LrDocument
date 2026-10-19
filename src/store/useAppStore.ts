'use client';

import { createContext, useContext, useState, useEffect } from 'react';
import {
  Note,
  Task,
  CalendarEvent,
  FolderItem,
  FinanceTransaction,
  FinanceCategoryItem,
  FinanceTransactionType,
  KanbanCard,
  KanbanColumnId,
  ActiveTab,
  EventStatus,
  TaskPriority,
  AppNotification,
  ExchangeRates,
  UserProfile,
  Customer,
  CustomerPayment,
} from '@/types';
import { INITIAL_FINANCE_CATEGORIES } from '@/data/initialData';
import { DEFAULT_PREFERENCES, parsePreferences, type UserPreferences } from '@/lib/preferences';
import { DEFAULT_SYSTEM_SETTINGS, resolveSystemSettings, type SystemSettings } from '@/lib/systemSettings';
import { formatCurrencyTRY, generateId, toLocalDateString } from '@/lib/utils';
import { playNotificationSound, resetNotificationSound } from '@/lib/notificationSound';
import { CORP_MODULE_LABEL, ENTITY_MODULE, canEdit, isCorporate, type CorpModule } from '@/lib/corporate';
import {
  DEFAULT_EXCHANGE_RATES,
  fetchLiveExchangeRates,
  convertCurrencyToTRY,
} from '@/lib/exchangeRates';

export type SettingsSection = 'hesap' | 'guvenlik' | 'ogrenci' | 'ders' | 'tercihler' | 'destek';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
}

interface AppState {
  // Authentication & Current User
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLoadingData: boolean;
  checkAuth: (force?: boolean) => Promise<void>;
  logout: (all?: boolean) => Promise<void>;
  switchAccount: (userId: string) => Promise<string | null>;
  loadUserData: (silent?: boolean) => Promise<void>;

  // Admin-defined defaults and the user's server-side UI preferences
  systemSettings: SystemSettings;
  preferences: UserPreferences;
  setPreference: <K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) => void;

  // Navigation & UI
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
  settingsSection: SettingsSection;
  openSettings: (section?: SettingsSection) => void;
  setSettingsSection: (section: SettingsSection) => void;
  isMobileSidebarOpen: boolean;
  setIsMobileSidebarOpen: (open: boolean) => void;
  isCommandPaletteOpen: boolean;
  setIsCommandPaletteOpen: (open: boolean) => void;
  isNotificationPanelOpen: boolean;
  setIsNotificationPanelOpen: (open: boolean) => void;
  toasts: ToastMessage[];
  addToast: (toast: Omit<ToastMessage, 'id'>) => void;
  removeToast: (id: string) => void;

  // Notification Center
  notifications: AppNotification[];
  unreadNotificationCount: number;
  markNotificationAsRead: (id: string) => void;
  markAllNotificationsAsRead: () => void;
  deleteNotification: (id: string) => void;
  resolveNotificationAction: (notifId: string, actionType: string, targetId: string) => void;

  // Notes
  notes: Note[];
  activeNoteId: string | null;
  setActiveNoteId: (id: string | null) => void;
  activeFolder: string;
  setActiveFolder: (folder: string) => void;
  folders: FolderItem[];
  addFolder: (name: string, description?: string, iconName?: string) => string;
  updateFolder: (id: string, name: string, description?: string, iconName?: string) => void;
  /** Removes a folder; its notes move to "Tüm notlar", or are deleted too with `withNotes`. */
  deleteFolder: (id: string, options?: { withNotes?: boolean }) => void;
  addNote: (partial?: Partial<Note>) => string;
  updateNote: (id: string, partial: Partial<Note>) => void;
  deleteNote: (id: string) => void;
  toggleFavoriteNote: (id: string) => void;
  togglePinNote: (id: string) => void;

  // Tasks
  tasks: Task[];
  addTask: (task: Omit<Task, 'id' | 'createdAt'>) => string;
  updateTask: (id: string, partial: Partial<Task>) => void;
  toggleTask: (id: string) => void;
  deleteTask: (id: string) => void;

  // Standalone Universal Kanban
  kanbanCards: KanbanCard[];
  addKanbanCard: (card: Omit<KanbanCard, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateKanbanCard: (id: string, partial: Partial<KanbanCard>) => void;
  deleteKanbanCard: (id: string) => void;
  moveKanbanCard: (id: string, columnId: KanbanColumnId) => void;

  // Calendar
  events: CalendarEvent[];
  addEvent: (event: Omit<CalendarEvent, 'id' | 'createdAt'>) => string;
  updateEvent: (id: string, partial: Partial<CalendarEvent>) => void;
  deleteEvent: (id: string) => void;
  updateEventStatus: (id: string, status: EventStatus) => void;
  rescheduleEvent: (id: string, newDate: string) => void;

  // Finance & Multi-Currency
  transactions: FinanceTransaction[];
  financeCategories: FinanceCategoryItem[];
  exchangeRates: ExchangeRates;
  customers: Customer[];
  /** Kurumsal: who changed a record from another tab, and when (live updates). */
  remoteEdits: Record<string, { by: string; at: number }>;
  addCustomer: (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>) => string;
  updateCustomer: (id: string, partial: Partial<Customer>) => void;
  deleteCustomer: (id: string) => void;
  fetchExchangeRates: () => Promise<void>;
  setExchangeRateMarkup: (markup: number) => void;
  addTransaction: (transaction: Omit<FinanceTransaction, 'id' | 'createdAt'>) => string;
  updateTransaction: (id: string, partial: Partial<FinanceTransaction>) => void;
  deleteTransaction: (id: string) => void;
  toggleTransactionConfirmation: (id: string) => void;
  addFinanceCategory: (name: string, type: FinanceTransactionType) => string;
  updateFinanceCategory: (id: string, name: string) => void;
  deleteFinanceCategory: (id: string) => void;
}

// Global Store State Singleton (Database-First, Zero LocalStorage, Resilient Session Cache)
let isAuthCheckStarted = false;
let isAuthInitialized = false;

type GlobalState = {
  currentUser: UserProfile | null;
  isAuthenticated: boolean;
  isLoadingAuth: boolean;
  isLoadingData: boolean;
  activeTab: ActiveTab;
  settingsSection: SettingsSection;
  isMobileSidebarOpen: boolean;
  isCommandPaletteOpen: boolean;
  isNotificationPanelOpen: boolean;
  toasts: ToastMessage[];
  systemSettings: SystemSettings;
  preferences: UserPreferences;
  notes: Note[];
  activeNoteId: string | null;
  activeFolder: string;
  folders: FolderItem[];
  tasks: Task[];
  kanbanCards: KanbanCard[];
  events: CalendarEvent[];
  transactions: FinanceTransaction[];
  financeCategories: FinanceCategoryItem[];
  exchangeRates: ExchangeRates;
  customers: Customer[];
  remoteEdits: Record<string, { by: string; at: number }>;
  /** Kurumsal: what teammates added while this tab is open (newest first). */
  activity: AppNotification[];
  /** Kurumsal "Şahsi Notlar / Şahsi Finans": the signed-in person's private records. */
  personal: SpaceBucket;
};

/** Records and selection of one space (the shared workspace or the person's private one). */
type SpaceBucket = {
  notes: Note[];
  folders: FolderItem[];
  transactions: FinanceTransaction[];
  activeNoteId: string | null;
  activeFolder: string;
};

/**
 * Kurumsal accounts have a shared workspace and, per person, a private one ("Şahsi"). Components
 * rendered inside <SpaceContext.Provider value="personal"> (Şahsi Notlar, Şahsi Finans) get the
 * private notes, folders and transactions — and actions that write there — from useAppStore().
 */
export type Space = 'shared' | 'personal';
export const SpaceContext = createContext<Space>('shared');

const emptyBucket = (): SpaceBucket => ({ notes: [], folders: [], transactions: [], activeNoteId: null, activeFolder: 'all' });

function bucket(space: Space): SpaceBucket {
  return space === 'personal' ? globalState.personal : (globalState as unknown as SpaceBucket);
}

const globalState: GlobalState = {
  currentUser: null,
  isAuthenticated: false,
  isLoadingAuth: true,
  isLoadingData: false,
  activeTab: 'dashboard',
  settingsSection: 'hesap',
  isMobileSidebarOpen: false,
  isCommandPaletteOpen: false,
  isNotificationPanelOpen: false,
  toasts: [],
  systemSettings: DEFAULT_SYSTEM_SETTINGS,
  preferences: DEFAULT_PREFERENCES,
  notes: [],
  activeNoteId: null,
  activeFolder: 'all',
  folders: [],
  tasks: [],
  kanbanCards: [],
  events: [],
  transactions: [],
  financeCategories: INITIAL_FINANCE_CATEGORIES,
  exchangeRates: DEFAULT_EXCHANGE_RATES,
  customers: [],
  remoteEdits: {},
  activity: [],
  personal: emptyBucket(),
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
  scheduleDesktopCheck();
}

/** Display name stored as "Ekleyen" (the server sets the authoritative value). */
function authorName(): string | null {
  return globalState.currentUser?.name ?? null;
}

type MutationEntity = 'note' | 'task' | 'kanban' | 'event' | 'finance' | 'folder' | 'category' | 'customer';

/**
 * Kurumsal: a member without edit permission for a module gets a notice instead of a local change
 * that the server would reject anyway.
 */
function guardEdit(module: CorpModule, space: Space = 'shared'): boolean {
  // The private space is the person's own, outside the team permissions.
  if (space === 'personal' || canEdit(globalState.currentUser, module)) return true;
  pushToast({ type: 'warning', title: 'Yetkiniz yok', message: `${CORP_MODULE_LABEL[module]} bölümünü yalnızca görüntüleyebilirsiniz.` });
  return false;
}

// Upserts are debounced per record so typing in an editor sends one request per pause, not per keystroke.
const UPSERT_DEBOUNCE_MS = 500;
const pendingUpserts = new Map<string, { timer: ReturnType<typeof setTimeout>; send: (keepalive?: boolean) => Promise<void> }>();
let lastSyncErrorAt = 0;
/** Identifies this tab so it can ignore the live echo of its own changes. */
const CLIENT_ID = Math.random().toString(36).slice(2) + Date.now().toString(36);
let inFlightMutations = 0;

function reportSyncError(message: string) {
  // Throttle so a flaky connection does not flood the screen with toasts.
  const now = Date.now();
  if (now - lastSyncErrorAt < 5000) return;
  lastSyncErrorAt = now;
  pushToast({ type: 'error', title: 'Kaydedilemedi', message });
}

async function sendMutation(
  entity: MutationEntity,
  action: 'create' | 'upsert' | 'delete',
  id?: string,
  data?: unknown,
  keepalive = false,
  space: Space = 'shared'
) {
  inFlightMutations++;
  try {
    const body = JSON.stringify({ entity, action, id, data, ...(space === 'personal' ? { personal: true } : {}) });
    const res = await fetch('/api/data/mutate', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-Client-Id': CLIENT_ID },
      body,
      // keepalive lets the request finish while the page unloads (browsers cap it at 64 KB).
      keepalive: keepalive && body.length < 60_000,
    });
    if (res.status === 401) {
      reportSyncError('Oturumunuz sona erdi. Lütfen tekrar giriş yapın.');
      return;
    }
    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      reportSyncError(errData.error || 'Değişiklik sunucuya kaydedilemedi.');
    }
  } catch {
    reportSyncError('Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edin.');
  } finally {
    inFlightMutations--;
  }
}

function mutateDB(entity: MutationEntity, action: 'create' | 'upsert' | 'delete', id?: string, data?: unknown, space: Space = 'shared') {
  // Side effects into a module the member may not edit (e.g. a task's calendar entry) stay local.
  if (space === 'shared' && !canEdit(globalState.currentUser, ENTITY_MODULE[entity])) return;
  const key = `${space}:${entity}:${id}`;
  const pending = pendingUpserts.get(key);
  if (pending) {
    clearTimeout(pending.timer);
    pendingUpserts.delete(key);
  }

  if (action === 'upsert' && id) {
    const send = (keepalive?: boolean) => sendMutation(entity, action, id, data, keepalive, space);
    const timer = setTimeout(() => {
      pendingUpserts.delete(key);
      send();
    }, UPSERT_DEBOUNCE_MS);
    pendingUpserts.set(key, { timer, send });
    return;
  }

  // Creates and deletes go out immediately; a pending upsert for a deleted record is simply dropped.
  sendMutation(entity, action, id, data, false, space);
}

/** Sends all debounced writes immediately (before leaving the page; Ctrl+S in the editor). */
export function flushPendingMutations() {
  pendingUpserts.forEach(({ timer, send }) => {
    clearTimeout(timer);
    send(true);
  });
  pendingUpserts.clear();
}

if (typeof window !== 'undefined') {
  window.addEventListener('pagehide', () => {
    flushPendingMutations();
    flushPreferences(true);
  });
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') {
      flushPendingMutations();
      flushPreferences(true);
    }
  });
}

function syncTaskToCalendar(task: Task, isDelete: boolean = false) {
  if (isDelete) {
    globalState.events = globalState.events.filter((e) => e.linkedTaskId !== task.id);
    mutateDB('event', 'delete', `event-task-${task.id}`);
    return;
  }

  const existingEventIndex = globalState.events.findIndex((e) => e.linkedTaskId === task.id);

  if (task.dueDate) {
    if (existingEventIndex >= 0) {
      const updatedEvent = {
        ...globalState.events[existingEventIndex],
        title: `Görev Teslimi: ${task.title}`,
        date: task.dueDate,
        status: (task.completed ? 'yayinlandi' : 'planlandi') as EventStatus,
        linkedNoteId: task.linkedNoteId,
      };
      globalState.events[existingEventIndex] = updatedEvent;
      mutateDB('event', 'upsert', updatedEvent.id, updatedEvent);
    } else {
      const newEvent: CalendarEvent = {
        id: `event-task-${task.id}`,
        title: `Görev Teslimi: ${task.title}`,
        description: task.description || 'Görevler modülünden otomatik senkronize edildi.',
        date: task.dueDate,
        time: '12:00',
        durationMinutes: 45,
        eventType: 'gorev',
        linkedTaskId: task.id,
        linkedNoteId: task.linkedNoteId,
        status: task.completed ? 'yayinlandi' : 'planlandi',
        checklist: [],
        createdAt: new Date().toISOString(),
      };
      globalState.events.push(newEvent);
      mutateDB('event', 'create', newEvent.id, newEvent);
    }
  } else if (existingEventIndex >= 0) {
    globalState.events = globalState.events.filter((e) => e.linkedTaskId !== task.id);
    mutateDB('event', 'delete', `event-task-${task.id}`);
  }
}

export function isTaskOverdue(task: Task): boolean {
  if (task.completed || !task.dueDate) return false;
  const now = new Date();
  const due = new Date(task.dueDate);
  due.setHours(23, 59, 59, 999);
  return due.getTime() < now.getTime();
}

export function getEffectiveTaskPriority(task: Task): TaskPriority {
  if (isTaskOverdue(task)) return 'yuksek';
  return task.priority;
}

export function isTransactionOverdue(trans: FinanceTransaction): boolean {
  // Debts are paid through "Asgariyi öde" in Krediler ve borçlar, not by confirming the balance.
  if (trans.isConfirmed || trans.isDebt) return false;
  const now = new Date();
  const dateObj = new Date(trans.date);
  dateObj.setHours(23, 59, 59, 999);
  return dateObj.getTime() < now.getTime();
}

export function getEffectiveTransactionPriority(trans: FinanceTransaction): TaskPriority {
  if (isTransactionOverdue(trans)) return 'yuksek';
  return trans.priority || 'orta';
}

export function getComputedNotifications(): AppNotification[] {
  const notifs: AppNotification[] = globalState.activity.map((a) => ({
    ...a,
    isRead: globalState.preferences.readNotificationIds.includes(a.id),
  }));

  globalState.tasks.forEach((task) => {
    if (!task.completed && isTaskOverdue(task)) {
      notifs.push({
        id: `notif-task-${task.id}`,
        title: `Gecikmiş Görev: ${task.title}`,
        message: `Son teslim tarihi (${task.dueDate}) geçmiş ve henüz tamamlanmamış. Öncelik "Yüksek" olarak işaretlendi.`,
        type: 'task_overdue',
        priority: 'yuksek',
        isRead: globalState.preferences.readNotificationIds.includes(`notif-task-${task.id}`),
        targetTab: 'tasks',
        targetId: task.id,
        actionType: 'complete_task',
        createdAt: task.dueDate || new Date().toISOString(),
      });
    }
  });

  // Shared transactions and (kurumsal) the person's own "Şahsi Finans" records.
  const ownTx = globalState.personal.transactions.map((t) => [t, 'personalFinance'] as const);
  [...globalState.transactions.map((t) => [t, 'finance'] as const), ...ownTx].forEach(([trans, tab]) => {
    if (!trans.isConfirmed && isTransactionOverdue(trans)) {
      notifs.push({
        id: `notif-trans-${trans.id}`,
        title: trans.type === 'gelir' ? `Gecikmiş Gelir Onayı: ${trans.title}` : `Vadesi Geçmiş Gider: ${trans.title}`,
        message: `₺${trans.amount.toLocaleString('tr-TR')} tutarındaki ${trans.category} işlemi (${trans.date}) onay bekliyor. Öncelik "Yüksek" seviyesine yükseltildi.`,
        type: 'finance_overdue',
        priority: 'yuksek',
        isRead: globalState.preferences.readNotificationIds.includes(`notif-trans-${trans.id}`),
        targetTab: tab,
        targetId: trans.id,
        actionType: 'confirm_finance',
        createdAt: trans.date || new Date().toISOString(),
      });
    }
  });

  const today = new Date();
  const todayStr = toLocalDateString(today);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const tomorrowStr = toLocalDateString(tomorrow);

  globalState.events.forEach((ev) => {
    if (ev.status !== 'yayinlandi' && ev.status !== 'iptal') {
      if (ev.date === todayStr || ev.date === tomorrowStr) {
        const isToday = ev.date === todayStr;
        const whenText = isToday ? 'Bugün' : 'Yarın';

        notifs.push({
          id: `notif-event-${ev.id}`,
          title: `Takvim Hatırlatması (${whenText}): ${ev.title}`,
          message: `${whenText} ${ev.time ? ev.time + ' saatinde' : ''} ${ev.platform ? '[' + ev.platform + '] ' : ''}${ev.description || 'Yayın ve içerik planı takvimde yer alıyor.'}`,
          type: 'calendar_upcoming',
          priority: isToday ? 'yuksek' : 'orta',
          isRead: globalState.preferences.readNotificationIds.includes(`notif-event-${ev.id}`),
          targetTab: 'calendar',
          targetId: ev.id,
          actionType: 'view',
          createdAt: ev.date || new Date().toISOString(),
        });
      }
    }
  });

  return notifs.filter((n) => !globalState.preferences.dismissedNotificationIds.includes(n.id));
}

// ---------------------------------------------------------------------------
// Store actions (module scope: they only touch the shared singleton state)
// ---------------------------------------------------------------------------

/** Virtual note views that are not stored folders. */
export const NOTE_VIEWS = ['all', 'favorites', 'secret'] as const;
function isRealFolder(id: string): boolean {
  return !!id && !(NOTE_VIEWS as readonly string[]).includes(id);
}

/** Replaces the cached system defaults (after an admin saved new ones). */
export function applySystemSettings(settings: SystemSettings) {
  globalState.systemSettings = settings;
  if (globalState.preferences.exchangeMarkupTRY === null) {
    globalState.exchangeRates = { ...globalState.exchangeRates, markupTRY: settings.finance.exchangeMarkupTRY };
  }
  notify();
}

let systemSettingsRequest: Promise<void> | null = null;
function loadSystemSettings(): Promise<void> {
  systemSettingsRequest ??= fetch('/api/settings')
    .then((r) => (r.ok ? r.json() : null))
    .then((json) => {
      if (!json?.settings) return;
      // The admin's markup applies until the user picks an own one.
      applySystemSettings(resolveSystemSettings(json.settings));
    })
    .catch(() => {})
    .finally(() => {
      systemSettingsRequest = null;
    });
  return systemSettingsRequest;
}

// Preference changes are batched and saved encrypted on the server (nothing is kept in the browser).
let pendingPrefs: Partial<UserPreferences> = {};
let prefsTimer: ReturnType<typeof setTimeout> | null = null;

/** Sends pending preference changes now (instead of after the short debounce). */
export function flushPreferences(keepalive = false) {
  if (prefsTimer) clearTimeout(prefsTimer);
  prefsTimer = null;
  if (!globalState.isAuthenticated || Object.keys(pendingPrefs).length === 0) return;
  const body = JSON.stringify(pendingPrefs);
  pendingPrefs = {};
  fetch('/api/preferences', { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body, keepalive }).catch(() => {});
}

function setPreference<K extends keyof UserPreferences>(key: K, value: UserPreferences[K]) {
  globalState.preferences = { ...globalState.preferences, [key]: value };
  pendingPrefs = { ...pendingPrefs, [key]: value };
  if (prefsTimer) clearTimeout(prefsTimer);
  prefsTimer = setTimeout(() => flushPreferences(), 600);
  notify();
}

const checkAuth = async (force: boolean = false) => {
  if (isAuthInitialized && !force) return;

  try {
    if (!isAuthInitialized) {
      globalState.isLoadingAuth = true;
      notify();
    }

    loadSystemSettings();
    // Refresh live currency exchange rates on session start
    fetchExchangeRates().catch(() => {});

    const res = await fetch('/api/auth/me');
    const data = await res.json();

    if (data.authenticated && data.user) {
      globalState.currentUser = data.user;
      globalState.isAuthenticated = true;
      startPresence();
      await loadUserData();
      startRealtime();
    } else {
      globalState.currentUser = null;
      globalState.isAuthenticated = false;
    }
  } catch {
    // No connection: show the offline page (served by the service worker) instead of the sign-in
    // page, so a signed-in user is not sent to log in again.
    if (typeof navigator !== 'undefined' && !navigator.onLine && typeof window !== 'undefined') {
      window.location.replace('/offline.html');
      return;
    }
    globalState.currentUser = null;
    globalState.isAuthenticated = false;
  } finally {
    isAuthInitialized = true;
    globalState.isLoadingAuth = false;
    notify();
  }
};

const loadUserData = async (silent = false) => {
  try {
    if (!silent) {
      globalState.isLoadingData = true;
      notify();
    }
    const res = await fetch('/api/data');
    if (res.ok) {
      const json = await res.json();
      if (json.success && json.data) {
        globalState.notes = json.data.notes || [];
        globalState.tasks = json.data.tasks || [];
        globalState.kanbanCards = json.data.kanbanCards || [];
        globalState.events = json.data.events || [];
        globalState.transactions = json.data.transactions || [];
        globalState.customers = json.data.customers || [];
        globalState.folders = json.data.folders || [];
        const own = json.data.personal;
        globalState.personal = {
          ...globalState.personal,
          notes: own?.notes || [],
          folders: own?.folders || [],
          transactions: own?.transactions || [],
        };
        globalState.preferences = parsePreferences(json.data.preferences);
        if (!silent) syncPushSubscription();
        if (globalState.preferences.exchangeMarkupTRY !== null) {
          globalState.exchangeRates = { ...globalState.exchangeRates, markupTRY: globalState.preferences.exchangeMarkupTRY };
        }
        globalState.financeCategories = json.data.financeCategories?.length
          ? json.data.financeCategories
          : INITIAL_FINANCE_CATEGORIES;

        if (globalState.notes.length > 0 && !globalState.activeNoteId) {
          globalState.activeNoteId = globalState.notes[0].id;
        }
      }
    } else {
      pushToast({
        type: 'error',
        title: 'Veriler yüklenemedi',
        message: 'Çalışma alanı verileriniz alınamadı. Lütfen sayfayı yenileyin.',
      });
    }
  } catch (err) {
    console.error('Failed to load user data from database:', err);
    pushToast({
      type: 'error',
      title: 'Bağlantı hatası',
      message: 'Sunucuya ulaşılamadı. İnternet bağlantınızı kontrol edip sayfayı yenileyin.',
    });
  } finally {
    globalState.isLoadingData = false;
    dataLoadedOnce = true;
    notify();
  }
};

/** Clears every in-memory record and reloads, so no data of the previous account survives. */
function leaveTo(path: string) {
  stopRealtime();
  desktopSeen = null;
  dataLoadedOnce = false;
  // The next account on this browser must not receive the previous one's notifications.
  const unsubscribed = unsubscribePush();
  globalState.activity = [];
  globalState.currentUser = null;
  globalState.isAuthenticated = false;
  isAuthInitialized = false;
  isAuthCheckStarted = false;
  globalState.notes = [];
  globalState.tasks = [];
  globalState.kanbanCards = [];
  globalState.events = [];
  globalState.transactions = [];
  globalState.customers = [];
  globalState.folders = [];
  globalState.personal = emptyBucket();
  resetNotificationSound();
  globalState.preferences = DEFAULT_PREFERENCES;
  notify();
  // Navigate once the device is unsubscribed (at most 1.5 s).
  Promise.race([unsubscribed, new Promise((resolve) => setTimeout(resolve, 1500))]).finally(() => {
    window.location.href = path;
  });
}

/** Signs out of the active account; another remembered account (if any) becomes active. */
const logout = async (all = false) => {
  flushPendingMutations();
  flushPreferences(true);
  let switched = false;
  try {
    const res = await fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ all }),
    });
    const data = await res.json().catch(() => ({}));
    switched = !!data.switchedTo;
  } catch {}
  leaveTo(switched ? '/dashboard' : '/login');
};

/** Switches to another account that is signed in on this browser. */
const switchAccount = async (userId: string): Promise<string | null> => {
  flushPendingMutations();
  flushPreferences(true);
  try {
    const res = await fetch('/api/auth/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ userId }),
    });
    if (!res.ok) return (await res.json().catch(() => ({}))).error || 'Hesap değiştirilemedi.';
  } catch {
    return 'Sunucuya ulaşılamadı.';
  }
  leaveTo('/dashboard');
  return null;
};

// ---------------------------------------------------------------------------
// Kurumsal live updates: teammates' saved changes arrive over /api/realtime and are merged into
// the store. A record this tab is still editing (unsent debounced write) keeps the local version.
// ---------------------------------------------------------------------------
type RealtimeEvent = {
  entity: MutationEntity;
  action: 'create' | 'upsert' | 'delete';
  id: string;
  data?: Record<string, unknown>;
  by: string;
  origin: string;
  /** Present for the person's own private ("Şahsi") records */
  personalOf?: string;
};

const ENTITY_STATE: Record<MutationEntity, keyof GlobalState> = {
  note: 'notes',
  task: 'tasks',
  kanban: 'kanbanCards',
  event: 'events',
  finance: 'transactions',
  folder: 'folders',
  category: 'financeCategories',
  customer: 'customers',
};

/** Kurumsal: a teammate's new record (or customer payment) as a live notification. */
function activityFor(evt: RealtimeEvent, before: Record<string, unknown> | undefined): AppNotification | null {
  if (!isCorporate(globalState.currentUser) || evt.action === 'delete' || !evt.data) return null;
  if (!evt.by || evt.by === globalState.currentUser?.name) return null;
  const d = evt.data;
  const str = (v: unknown) => (typeof v === 'string' ? v : '');
  let title = '';
  let message = '';
  let targetTab: ActiveTab = 'dashboard';
  if (evt.entity === 'customer') {
    const paidBefore = Array.isArray(before?.payments) ? before.payments.length : 0;
    const paid = Array.isArray(d.payments) ? (d.payments as CustomerPayment[]) : [];
    if (!before) {
      title = `${evt.by} yeni müşteri ekledi`;
      message = str(d.name);
    } else if (paid.length > paidBefore) {
      const last = [...paid].sort((a, b) => b.paidAt.localeCompare(a.paidAt))[0];
      title = `${evt.by} ödeme kaydetti`;
      message = `${str(d.name)} · ${formatCurrencyTRY(last?.amount ?? 0)}`;
    } else return null;
    targetTab = 'customers';
  } else {
    if (before) return null; // only new records
    if (evt.entity === 'task') [title, targetTab] = [`${evt.by} yeni görev ekledi`, 'tasks'];
    else if (evt.entity === 'kanban') [title, targetTab] = [`${evt.by} panoya kart ekledi`, 'tasks'];
    else if (evt.entity === 'event') [title, targetTab] = [`${evt.by} takvime etkinlik ekledi`, 'calendar'];
    else if (evt.entity === 'note') [title, targetTab] = [`${evt.by} yeni not ekledi`, 'notes'];
    else if (evt.entity === 'finance') {
      title = `${evt.by} yeni ${d.type === 'gider' ? 'gider' : 'gelir'} kaydı ekledi`;
      targetTab = 'finance';
    } else return null;
    message = evt.entity === 'finance' ? `${str(d.title)} · ${formatCurrencyTRY(Number(d.amount) || 0)}` : str(d.title) || 'Başlıksız';
  }
  return {
    id: `act-${evt.entity}-${evt.id}-${Date.now().toString(36)}`,
    title,
    message,
    type: 'activity',
    priority: 'orta',
    isRead: false,
    targetTab,
    targetId: evt.id,
    actionType: 'view',
    createdAt: new Date().toISOString(),
  };
}

function applyRealtimeEvent(evt: RealtimeEvent) {
  if (evt.origin === CLIENT_ID) return;
  const key = ENTITY_STATE[evt.entity];
  if (!key || typeof evt.id !== 'string') return;
  const space: Space = evt.personalOf ? 'personal' : 'shared';
  // Private records live in their own bucket (notes, folders and transactions only).
  const target = (space === 'personal' ? globalState.personal : globalState) as unknown as Record<string, unknown>;
  if (space === 'personal' && !(key in globalState.personal)) return;
  const list = target[key] as { id: string }[];
  const activity = space === 'personal' ? null : activityFor(evt, list.find((r) => r.id === evt.id) as Record<string, unknown> | undefined);
  if (activity) {
    globalState.activity = [activity, ...globalState.activity].slice(0, 30);
    pushToast({ type: 'info', title: activity.title, message: activity.message });
  }
  if (evt.action === 'delete') {
    target[key] = list.filter((r) => r.id !== evt.id);
    const b = bucket(space);
    if (evt.entity === 'note' && b.activeNoteId === evt.id) b.activeNoteId = null;
  } else {
    if (pendingUpserts.has(`${space}:${evt.entity}:${evt.id}`) || !evt.data) return;
    const current = list.find((r) => r.id === evt.id);
    const merged = { ...(current ?? {}), ...evt.data, id: evt.id };
    target[key] = current
      ? list.map((r) => (r.id === evt.id ? merged : r))
      : evt.entity === 'note'
        ? [merged, ...list]
        : [...list, merged];
  }
  globalState.remoteEdits = { ...globalState.remoteEdits, [`${evt.entity}:${evt.id}`]: { by: evt.by, at: Date.now() } };
  notify();
}

let realtimeSource: EventSource | null = null;
function startRealtime() {
  if (realtimeSource || typeof window === 'undefined' || typeof EventSource === 'undefined') return;
  let dropped = false;
  const source = new EventSource('/api/realtime');
  realtimeSource = source;
  source.onmessage = (e) => {
    try {
      applyRealtimeEvent(JSON.parse(e.data));
    } catch {}
  };
  source.onerror = () => {
    dropped = true;
  };
  source.onopen = () => {
    // After a dropped connection, catch up on what was missed meanwhile.
    if (dropped && pendingUpserts.size === 0 && inFlightMutations === 0) loadUserData(true);
    dropped = false;
  };
}

function stopRealtime() {
  realtimeSource?.close();
  realtimeSource = null;
}

// Presence ping for the admin's live-user count (every minute while the tab is visible).
let presenceTimer: ReturnType<typeof setInterval> | null = null;
function startPresence() {
  if (presenceTimer || typeof window === 'undefined') return;
  const ping = () => {
    if (document.visibilityState === 'visible' && globalState.isAuthenticated) {
      fetch('/api/auth/me', { cache: 'no-store' }).catch(() => {});
    }
  };
  presenceTimer = setInterval(() => {
    ping();
    // Time-based reminders (overdue tasks, today's events) appear without a reload.
    notify();
  }, 60_000);
  document.addEventListener('visibilitychange', () => {
    ping();
    // Kurumsal: the workspace is shared, so pick up teammates' changes when the tab is shown again
    // (only when none of this tab's own edits are still on their way to the server).
    if (
      document.visibilityState === 'visible' &&
      isCorporate(globalState.currentUser) &&
      pendingUpserts.size === 0 &&
      inFlightMutations === 0
    ) {
      loadUserData(true);
    }
  });
}


// ---------------------------------------------------------------------------
// Live notifications: a notification that appears while the app is open (a teammate's new record,
// a task that just became overdue, today's event) is also shown as a system notification when the
// user turned that on and the window is in the background (installed app on Windows included).
// ---------------------------------------------------------------------------
let desktopSeen: Set<string> | null = null;
let desktopTimer: ReturnType<typeof setTimeout> | null = null;
let dataLoadedOnce = false;

function scheduleDesktopCheck() {
  if (desktopTimer || typeof window === 'undefined') return;
  desktopTimer = setTimeout(() => {
    desktopTimer = null;
    checkDesktopNotifications();
  }, 800);
}

function checkDesktopNotifications() {
  if (!globalState.isAuthenticated || !dataLoadedOnce || globalState.isLoadingData) return;
  const unread = getComputedNotifications().filter((n) => !n.isRead);
  // The first look only records what is already there; only later arrivals are announced.
  if (!desktopSeen) {
    desktopSeen = new Set(unread.map((n) => n.id));
    return;
  }
  const fresh = unread.filter((n) => !desktopSeen!.has(n.id));
  if (!fresh.length) return;
  fresh.forEach((n) => desktopSeen!.add(n.id));
  const p = globalState.preferences;
  void playNotificationSound(p.notificationSound, p.notificationSoundFileId, p.notificationVolume);
  if (!globalState.preferences.desktopNotifications || typeof Notification === 'undefined' || Notification.permission !== 'granted') return;
  // In the foreground the bell (and the toast for teammates' changes) is enough; with Web Push the
  // server already notifies this device.
  if (pushActive || (document.visibilityState === 'visible' && document.hasFocus())) return;
  for (const n of fresh.slice(0, 3)) showSystemNotification(n);
}

function showSystemNotification(n: AppNotification) {
  const options: NotificationOptions = {
    body: n.message.slice(0, 180),
    tag: n.id,
    icon: '/icons/icon-192.png',
    badge: '/icons/badge-96.png',
    data: { tab: n.targetTab ?? 'dashboard' },
  };
  const fallback = () => {
    try {
      const shown = new Notification(n.title, options);
      shown.onclick = () => {
        window.focus();
        if (n.targetTab) setActiveTab(n.targetTab);
        shown.close();
      };
    } catch {}
  };
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker
      .getRegistration()
      .then((reg) => (reg ? reg.showNotification(n.title, options) : fallback()))
      .catch(fallback);
  } else fallback();
}

/** Asks for permission (must run from a click) and stores the choice. Returns the result. */
// Web Push (phones included): with a push subscription the server delivers the notifications, also
// while the app is closed; the in-page system notifications above are then not needed.
let pushActive = false;

function pushSupported(): boolean {
  return typeof window !== 'undefined' && 'serviceWorker' in navigator && 'PushManager' in window && typeof Notification !== 'undefined';
}

function base64UrlToBytes(value: string): Uint8Array<ArrayBuffer> {
  const pad = '='.repeat((4 - (value.length % 4)) % 4);
  const raw = atob((value + pad).replace(/-/g, '+').replace(/_/g, '/'));
  const out = new Uint8Array(new ArrayBuffer(raw.length));
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

/** Subscribes this device and registers it with the server. Returns false when push is unavailable. */
async function subscribePush(test: boolean): Promise<boolean> {
  if (!pushSupported() || Notification.permission !== 'granted') return false;
  try {
    const reg = await Promise.race([
      navigator.serviceWorker.ready,
      new Promise<null>((resolve) => setTimeout(() => resolve(null), 5000)),
    ]);
    if (!reg) return false;
    const keyRes = await fetch('/api/push', { cache: 'no-store' });
    if (!keyRes.ok) return false;
    const { publicKey } = await keyRes.json();
    let sub = await reg.pushManager.getSubscription();
    // A subscription made with another server key (e.g. a reinstalled server) is replaced.
    const currentKey = sub?.options.applicationServerKey;
    if (sub && currentKey && btoa(String.fromCharCode(...new Uint8Array(currentKey))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '') !== publicKey) {
      await sub.unsubscribe().catch(() => {});
      sub = null;
    }
    sub ??= await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: base64UrlToBytes(publicKey) });
    const res = await fetch('/api/push', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ subscription: sub.toJSON(), test }),
    });
    pushActive = res.ok;
    return res.ok;
  } catch {
    pushActive = false;
    return false;
  }
}

async function unsubscribePush() {
  pushActive = false;
  if (!pushSupported()) return;
  try {
    const reg = await navigator.serviceWorker.getRegistration();
    const sub = await reg?.pushManager.getSubscription();
    if (!sub) return;
    await fetch('/api/push', { method: 'DELETE', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ endpoint: sub.endpoint }) }).catch(() => {});
    await sub.unsubscribe();
  } catch {}
}

/** After sign-in: keep this device's push subscription in step with the saved preference. */
function syncPushSubscription() {
  if (!globalState.preferences.desktopNotifications || !pushSupported() || Notification.permission !== 'granted') return;
  void subscribePush(false);
}

export async function enableDesktopNotifications(on: boolean): Promise<NotificationPermission | 'unsupported'> {
  if (typeof Notification === 'undefined') return 'unsupported';
  if (!on) {
    setPreference('desktopNotifications', false);
    await unsubscribePush();
    return Notification.permission;
  }
  const permission = Notification.permission === 'default' ? await Notification.requestPermission() : Notification.permission;
  setPreference('desktopNotifications', permission === 'granted');
  // Phones and installed apps: the server sends a test notification through Web Push.
  if (permission === 'granted' && !(await subscribePush(true))) {
    showSystemNotification({
      id: 'lr-test',
      title: 'Bildirimler açık',
      message: 'Yeni bildirimler artık burada da görünecek.',
      type: 'system',
      priority: 'orta',
      isRead: false,
      createdAt: new Date().toISOString(),
    });
  }
  return permission;
}

// A click on a system notification shown by the service worker opens the related page.
if (typeof window !== 'undefined' && 'serviceWorker' in navigator) {
  navigator.serviceWorker.addEventListener('message', (e: MessageEvent) => {
    // A push arrived while this window is shown: the system notification is silent, the chosen sound plays here.
    if (e.data && e.data.type === 'lr-push') {
      const p = globalState.preferences;
      void playNotificationSound(p.notificationSound, p.notificationSoundFileId, p.notificationVolume);
    }
    const tab = e.data && e.data.type === 'lr-open-tab' ? (e.data.tab as ActiveTab) : null;
    if (tab) setActiveTab(tab);
  });
}

const addToast = (toast: Omit<ToastMessage, 'id'>) => pushToast(toast);

function pushToast(toast: Omit<ToastMessage, 'id'>) {
  const id = generateId();
  globalState.toasts = [...globalState.toasts, { ...toast, id }];
  notify();
  setTimeout(() => {
    globalState.toasts = globalState.toasts.filter((t) => t.id !== id);
    notify();
  }, 4000);
}

const removeToast = (id: string) => {
  globalState.toasts = globalState.toasts.filter((t) => t.id !== id);
  notify();
};

const markNotificationAsRead = (id: string) => {
  if (!globalState.preferences.readNotificationIds.includes(id)) {
    setPreference('readNotificationIds', [...globalState.preferences.readNotificationIds, id].slice(-500));
  }
};

const markAllNotificationsAsRead = () => {
  const allIds = getComputedNotifications().map((n) => n.id);
  setPreference('readNotificationIds', Array.from(new Set([...globalState.preferences.readNotificationIds, ...allIds])).slice(-500));
};

const deleteNotification = (id: string) => {
  if (!globalState.preferences.dismissedNotificationIds.includes(id)) {
    setPreference('dismissedNotificationIds', [...globalState.preferences.dismissedNotificationIds, id].slice(-500));
  }
};

const resolveNotificationAction = (notifId: string, actionType: string, targetId: string) => {
  deleteNotification(notifId);

  if (actionType === 'complete_task') {
    const taskIndex = globalState.tasks.findIndex((t) => t.id === targetId);
    if (taskIndex >= 0) {
      const updatedTask = {
        ...globalState.tasks[taskIndex],
        completed: true,
        completedAt: new Date().toISOString(),
      };
      globalState.tasks = [
        ...globalState.tasks.slice(0, taskIndex),
        updatedTask,
        ...globalState.tasks.slice(taskIndex + 1),
      ];
      syncTaskToCalendar(updatedTask);
      mutateDB('task', 'upsert', updatedTask.id, updatedTask);
      addToast({
        type: 'success',
        title: 'Görev Tamamlandı',
        message: `"${updatedTask.title}" tamamlandı olarak işaretlendi.`,
      });
    }
  } else if (actionType === 'confirm_finance') {
    const own = globalState.personal.transactions.find((t) => t.id === targetId);
    if (own) {
      updateTransactionIn('personal', targetId, { isConfirmed: true });
      addToast({ type: 'success', title: 'Finans Onaylandı', message: `"${own.title}" işlemi onaylandı.` });
    }
    const transIndex = globalState.transactions.findIndex((t) => t.id === targetId);
    if (transIndex >= 0) {
      const updatedTrans = {
        ...globalState.transactions[transIndex],
        isConfirmed: true,
      };
      globalState.transactions = [
        ...globalState.transactions.slice(0, transIndex),
        updatedTrans,
        ...globalState.transactions.slice(transIndex + 1),
      ];
      mutateDB('finance', 'upsert', updatedTrans.id, updatedTrans);
      addToast({
        type: 'success',
        title: 'Finans Onaylandı',
        message: `"${updatedTrans.title}" işlemi onaylandı.`,
      });
    }
  }
  notify();
};

// ---------------------------------------------------------------------------
// Notes, folders and transactions exist in two spaces (shared / personal); every action below takes
// the space it works in. useAppStore() hands out the versions bound to the surrounding SpaceContext.
// ---------------------------------------------------------------------------

function addFolderIn(space: Space, name: string, description?: string, iconName = 'Folder'): string {
  if (!guardEdit('notes', space)) return '';
  const b = bucket(space);
  const id = generateId();
  const newFolder: FolderItem = { id, name, description, iconName, isSystem: false };
  b.folders = [...b.folders, newFolder];
  mutateDB('folder', 'create', id, newFolder, space);
  notify();
  return id;
}

function updateFolderIn(space: Space, id: string, name: string, description?: string, iconName?: string) {
  if (!guardEdit('notes', space)) return;
  const b = bucket(space);
  b.folders = b.folders.map((f) => (f.id === id ? { ...f, name, description, ...(iconName ? { iconName } : {}) } : f));
  const updated = b.folders.find((f) => f.id === id);
  if (updated) mutateDB('folder', 'upsert', id, updated, space);
  notify();
}

function deleteFolderIn(space: Space, id: string, options?: { withNotes?: boolean }) {
  if (!guardEdit('notes', space)) return;
  const b = bucket(space);
  b.folders = b.folders.filter((f) => f.id !== id);
  if (b.activeFolder === id) b.activeFolder = 'all';
  if (options?.withNotes) {
    const removed = b.notes.filter((n) => n.folder === id);
    b.notes = b.notes.filter((n) => n.folder !== id);
    if (removed.some((n) => n.id === b.activeNoteId)) b.activeNoteId = b.notes[0]?.id || null;
    for (const n of removed) mutateDB('note', 'delete', n.id, undefined, space);
  } else {
    // The notes stay; they just leave the deleted folder.
    b.notes = b.notes.map((n) => {
      if (n.folder !== id) return n;
      const moved = { ...n, folder: '' };
      mutateDB('note', 'upsert', n.id, moved, space);
      return moved;
    });
  }
  mutateDB('folder', 'delete', id, undefined, space);
  notify();
}

function addNoteIn(space: Space, partial?: Partial<Note>): string {
  if (!guardEdit('notes', space)) return '';
  const b = bucket(space);
  const id = generateId();
  const now = new Date().toISOString();
  const newNote: Note = {
    id,
    title: partial?.title || (partial?.kind === 'table' ? 'Yeni Tablo' : 'Yeni Not'),
    content: partial?.content || '',
    folder: partial?.folder ?? (isRealFolder(b.activeFolder) ? b.activeFolder : ''),
    tags: partial?.tags || [],
    isFavorite: partial?.isFavorite || false,
    isPinned: partial?.isPinned || false,
    kind: partial?.kind ?? 'text',
    ...(partial?.fileId ? { fileId: partial.fileId } : {}),
    createdAt: now,
    updatedAt: now,
  };
  b.notes = [newNote, ...b.notes];
  b.activeNoteId = id;
  mutateDB('note', 'create', id, newNote, space);
  notify();
  return id;
}

function updateNoteIn(space: Space, id: string, partial: Partial<Note>) {
  if (!guardEdit('notes', space)) return;
  const b = bucket(space);
  b.notes = b.notes.map((n) => (n.id === id ? { ...n, ...partial, updatedAt: new Date().toISOString() } : n));
  const updated = b.notes.find((n) => n.id === id);
  if (updated) mutateDB('note', 'upsert', id, updated, space);
  notify();
}

function deleteNoteIn(space: Space, id: string) {
  if (!guardEdit('notes', space)) return;
  const b = bucket(space);
  b.notes = b.notes.filter((n) => n.id !== id);
  if (b.activeNoteId === id) b.activeNoteId = b.notes[0]?.id || null;
  // The server removes a PDF note's file together with the note.
  mutateDB('note', 'delete', id, undefined, space);
  notify();
}

function toggleFavoriteNoteIn(space: Space, id: string) {
  const n = bucket(space).notes.find((x) => x.id === id);
  if (n) updateNoteIn(space, id, { isFavorite: !n.isFavorite });
}

function togglePinNoteIn(space: Space, id: string) {
  const n = bucket(space).notes.find((x) => x.id === id);
  if (n) updateNoteIn(space, id, { isPinned: !n.isPinned });
}

function setActiveNoteIdIn(space: Space, id: string | null) {
  bucket(space).activeNoteId = id;
  notify();
}

function setActiveFolderIn(space: Space, folder: string) {
  bucket(space).activeFolder = folder;
  notify();
}


const addTask = (task: Omit<Task, 'id' | 'createdAt'>): string => {
  if (!guardEdit('work')) return '';
  const id = generateId();
  const newTask: Task = {
    ...task,
    id,
    createdBy: authorName(),
    createdAt: new Date().toISOString(),
  };
  globalState.tasks = [newTask, ...globalState.tasks];
  syncTaskToCalendar(newTask);
  mutateDB('task', 'create', id, newTask);
  notify();
  return id;
};

const updateTask = (id: string, partial: Partial<Task>) => {
  if (!guardEdit('work')) return;
  globalState.tasks = globalState.tasks.map((t) => (t.id === id ? { ...t, ...partial } : t));
  const updated = globalState.tasks.find((t) => t.id === id);
  if (updated) {
    syncTaskToCalendar(updated);
    mutateDB('task', 'upsert', id, updated);
  }
  notify();
};

const toggleTask = (id: string) => {
  if (!guardEdit('work')) return;
  globalState.tasks = globalState.tasks.map((t) => {
    if (t.id !== id) return t;
    const completed = !t.completed;
    return {
      ...t,
      completed,
      completedAt: completed ? new Date().toISOString() : undefined,
    };
  });
  const updated = globalState.tasks.find((t) => t.id === id);
  if (updated) {
    syncTaskToCalendar(updated);
    mutateDB('task', 'upsert', id, updated);
  }
  notify();
};

const deleteTask = (id: string) => {
  if (!guardEdit('work')) return;
  const taskToDelete = globalState.tasks.find((t) => t.id === id);
  if (taskToDelete) syncTaskToCalendar(taskToDelete, true);
  globalState.tasks = globalState.tasks.filter((t) => t.id !== id);
  mutateDB('task', 'delete', id);
  notify();
};

const addKanbanCard = (card: Omit<KanbanCard, 'id' | 'createdAt' | 'updatedAt'>): string => {
  if (!guardEdit('work')) return '';
  const id = generateId();
  const newCard: KanbanCard = {
    ...card,
    id,
    createdBy: authorName(),
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  globalState.kanbanCards = [newCard, ...globalState.kanbanCards];
  mutateDB('kanban', 'create', id, newCard);
  notify();
  return id;
};

const updateKanbanCard = (id: string, partial: Partial<KanbanCard>) => {
  if (!guardEdit('work')) return;
  globalState.kanbanCards = globalState.kanbanCards.map((c) =>
    c.id === id ? { ...c, ...partial, updatedAt: new Date().toISOString() } : c
  );
  const updated = globalState.kanbanCards.find((c) => c.id === id);
  if (updated) mutateDB('kanban', 'upsert', id, updated);
  notify();
};

const deleteKanbanCard = (id: string) => {
  if (!guardEdit('work')) return;
  globalState.kanbanCards = globalState.kanbanCards.filter((c) => c.id !== id);
  mutateDB('kanban', 'delete', id);
  notify();
};

const moveKanbanCard = (id: string, columnId: KanbanColumnId) => {
  if (!guardEdit('work')) return;
  globalState.kanbanCards = globalState.kanbanCards.map((c) =>
    c.id === id ? { ...c, columnId, updatedAt: new Date().toISOString() } : c
  );
  const updated = globalState.kanbanCards.find((c) => c.id === id);
  if (updated) mutateDB('kanban', 'upsert', id, updated);
  notify();
};

const addEvent = (event: Omit<CalendarEvent, 'id' | 'createdAt'>): string => {
  if (!guardEdit('calendar')) return '';
  const id = generateId();
  const newEvent: CalendarEvent = {
    ...event,
    id,
    createdBy: authorName(),
    createdAt: new Date().toISOString(),
  };
  globalState.events = [...globalState.events, newEvent];
  mutateDB('event', 'create', id, newEvent);
  notify();
  return id;
};

const updateEvent = (id: string, partial: Partial<CalendarEvent>) => {
  if (!guardEdit('calendar')) return;
  globalState.events = globalState.events.map((e) => (e.id === id ? { ...e, ...partial } : e));
  const updated = globalState.events.find((e) => e.id === id);
  if (updated) mutateDB('event', 'upsert', id, updated);
  notify();
};

const deleteEvent = (id: string) => {
  if (!guardEdit('calendar')) return;
  globalState.events = globalState.events.filter((e) => e.id !== id);
  mutateDB('event', 'delete', id);
  notify();
};

const updateEventStatus = (id: string, status: EventStatus) => {
  if (!guardEdit('calendar')) return;
  globalState.events = globalState.events.map((e) => (e.id === id ? { ...e, status } : e));
  const updated = globalState.events.find((e) => e.id === id);
  if (updated) mutateDB('event', 'upsert', id, updated);
  notify();
};

const rescheduleEvent = (id: string, newDate: string) => {
  if (!guardEdit('calendar')) return;
  globalState.events = globalState.events.map((e) => (e.id === id ? { ...e, date: newDate } : e));
  const updated = globalState.events.find((e) => e.id === id);
  if (updated) mutateDB('event', 'upsert', id, updated);
  notify();
};

let exchangeRatesRequest: Promise<void> | null = null;

const fetchExchangeRates = (): Promise<void> => {
  // Share one in-flight request between all callers.
  if (!exchangeRatesRequest) {
    exchangeRatesRequest = fetchLiveExchangeRates(globalState.exchangeRates.markupTRY)
      .then((rates) => {
        globalState.exchangeRates = rates;
        notify();
      })
      .catch(() => {})
      .finally(() => {
        exchangeRatesRequest = null;
      });
  }
  return exchangeRatesRequest;
};

// USD/EUR hold the raw market rate; the markup is applied on top when converting.
const setExchangeRateMarkup = (markup: number) => {
  if (!Number.isFinite(markup) || markup < 0) return;
  globalState.exchangeRates = { ...globalState.exchangeRates, markupTRY: markup };
  setPreference('exchangeMarkupTRY', markup);
};

function addTransactionIn(space: Space, transaction: Omit<FinanceTransaction, 'id' | 'createdAt'>): string {
  if (!guardEdit('finance', space)) return '';
  const b = bucket(space);
  const id = generateId();
  const currency = transaction.currency || 'TRY';
  let amountInTRY = transaction.amount;
  let convertedInfo = undefined;

  if (currency !== 'TRY') {
    convertedInfo = convertCurrencyToTRY(transaction.originalAmount || transaction.amount, currency, globalState.exchangeRates);
    amountInTRY = convertedInfo.baseAmountTRY;
  }

  const newTransaction: FinanceTransaction = {
    ...transaction,
    id,
    amount: amountInTRY,
    currency,
    originalAmount: transaction.originalAmount || (currency !== 'TRY' ? transaction.amount : undefined),
    effectiveRate: convertedInfo?.effectiveRate,
    exchangeRate: convertedInfo?.liveRate,
    markupTRY: convertedInfo?.markup,
    createdBy: authorName(),
    createdAt: new Date().toISOString(),
  };
  b.transactions = [newTransaction, ...b.transactions];
  mutateDB('finance', 'create', id, newTransaction, space);
  notify();
  return id;
}

function updateTransactionIn(space: Space, id: string, partial: Partial<FinanceTransaction>) {
  if (!guardEdit('finance', space)) return;
  const b = bucket(space);
  b.transactions = b.transactions.map((t) => {
    if (t.id !== id) return t;
    const currency = partial.currency || t.currency || 'TRY';
    let amountInTRY = partial.amount !== undefined ? partial.amount : t.amount;
    if (currency !== 'TRY' && partial.originalAmount !== undefined) {
      amountInTRY = convertCurrencyToTRY(partial.originalAmount, currency, globalState.exchangeRates).baseAmountTRY;
    }
    return { ...t, ...partial, amount: amountInTRY, currency };
  });
  const updated = b.transactions.find((t) => t.id === id);
  if (updated) mutateDB('finance', 'upsert', id, updated, space);
  notify();
}

function deleteTransactionIn(space: Space, id: string) {
  if (!guardEdit('finance', space)) return;
  const b = bucket(space);
  b.transactions = b.transactions.filter((t) => t.id !== id);
  mutateDB('finance', 'delete', id, undefined, space);
  notify();
}

function toggleTransactionConfirmationIn(space: Space, id: string) {
  const t = bucket(space).transactions.find((x) => x.id === id);
  if (t) updateTransactionIn(space, id, { isConfirmed: !t.isConfirmed });
}


const addCustomer = (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): string => {
  if (!guardEdit('customers')) return '';
  const id = generateId();
  const now = new Date().toISOString();
  const created: Customer = { ...customer, id, createdBy: authorName(), createdAt: now, updatedAt: now };
  globalState.customers = [...globalState.customers, created];
  mutateDB('customer', 'create', id, created);
  notify();
  return id;
};

const updateCustomer = (id: string, partial: Partial<Customer>) => {
  if (!guardEdit('customers')) return;
  globalState.customers = globalState.customers.map((c) =>
    c.id === id ? { ...c, ...partial, updatedAt: new Date().toISOString() } : c
  );
  const updated = globalState.customers.find((c) => c.id === id);
  if (updated) mutateDB('customer', 'upsert', id, updated);
  notify();
};

const deleteCustomer = (id: string) => {
  if (!guardEdit('customers')) return;
  globalState.customers = globalState.customers.filter((c) => c.id !== id);
  mutateDB('customer', 'delete', id);
  notify();
};

const addFinanceCategory = (name: string, type: FinanceTransactionType): string => {
  if (!guardEdit('finance')) return '';
  const id = generateId();
  const newCat: FinanceCategoryItem = { id, name, type, isSystem: false };
  globalState.financeCategories = [...globalState.financeCategories, newCat];
  mutateDB('category', 'create', id, newCat);
  notify();
  return id;
};

const updateFinanceCategory = (id: string, name: string) => {
  if (!guardEdit('finance')) return;
  globalState.financeCategories = globalState.financeCategories.map((c) =>
    c.id === id ? { ...c, name } : c
  );
  const updated = globalState.financeCategories.find((c) => c.id === id);
  if (updated) mutateDB('category', 'upsert', id, updated);
  notify();
};

const deleteFinanceCategory = (id: string) => {
  if (!guardEdit('finance')) return;
  globalState.financeCategories = globalState.financeCategories.filter((c) => c.id !== id);
  mutateDB('category', 'delete', id);
  notify();
};

const setActiveTab = (tab: ActiveTab) => {
  globalState.activeTab = tab;
  notify();
};

const setSettingsSection = (section: SettingsSection) => {
  globalState.settingsSection = section;
  notify();
};

const openSettings = (section: SettingsSection = 'hesap') => {
  globalState.settingsSection = section;
  globalState.activeTab = 'settings';
  notify();
};

const setIsMobileSidebarOpen = (open: boolean) => {
  globalState.isMobileSidebarOpen = open;
  notify();
};

const setIsCommandPaletteOpen = (open: boolean) => {
  globalState.isCommandPaletteOpen = open;
  notify();
};

const setIsNotificationPanelOpen = (open: boolean) => {
  globalState.isNotificationPanelOpen = open;
  notify();
};

function spaceApi(space: Space) {
  return {
    setActiveNoteId: (id: string | null) => setActiveNoteIdIn(space, id),
    setActiveFolder: (folder: string) => setActiveFolderIn(space, folder),
    addFolder: (name: string, description?: string, iconName?: string) => addFolderIn(space, name, description, iconName),
    updateFolder: (id: string, name: string, description?: string, iconName?: string) => updateFolderIn(space, id, name, description, iconName),
    deleteFolder: (id: string, options?: { withNotes?: boolean }) => deleteFolderIn(space, id, options),
    addNote: (partial?: Partial<Note>) => addNoteIn(space, partial),
    updateNote: (id: string, partial: Partial<Note>) => updateNoteIn(space, id, partial),
    deleteNote: (id: string) => deleteNoteIn(space, id),
    toggleFavoriteNote: (id: string) => toggleFavoriteNoteIn(space, id),
    togglePinNote: (id: string) => togglePinNoteIn(space, id),
    addTransaction: (t: Omit<FinanceTransaction, 'id' | 'createdAt'>) => addTransactionIn(space, t),
    updateTransaction: (id: string, partial: Partial<FinanceTransaction>) => updateTransactionIn(space, id, partial),
    deleteTransaction: (id: string) => deleteTransactionIn(space, id),
    toggleTransactionConfirmation: (id: string) => toggleTransactionConfirmationIn(space, id),
  };
}
const SPACE_API = { shared: spaceApi('shared'), personal: spaceApi('personal') };

/** Full edit rights inside the person's private space (team permissions do not apply there). */
function personalUser(user: UserProfile | null): UserProfile | null {
  if (!user) return user;
  return { ...user, permissions: { notes: 'edit', customers: 'none', work: 'none', calendar: 'none', finance: 'edit' } };
}

export function useAppStore(): AppState {
  const [, setTick] = useState(0);
  const space = useContext(SpaceContext);
  const b = bucket(space);
  const api = SPACE_API[space];

  useEffect(() => {
    const listener = () => setTick((t) => t + 1);
    listeners.add(listener);

    // Initial auth check (also refreshes live exchange rates) once per page load
    if (!isAuthCheckStarted) {
      isAuthCheckStarted = true;
      checkAuth();
    }

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const notifications = getComputedNotifications();
  const unreadNotificationCount = notifications.filter((n) => !n.isRead).length;

  return {
    systemSettings: globalState.systemSettings,
    preferences: globalState.preferences,
    setPreference,

    currentUser: space === 'personal' ? personalUser(globalState.currentUser) : globalState.currentUser,
    isAuthenticated: globalState.isAuthenticated,
    isLoadingAuth: globalState.isLoadingAuth,
    isLoadingData: globalState.isLoadingData,
    checkAuth,
    logout,
    switchAccount,
    loadUserData,

    activeTab: globalState.activeTab,
    setActiveTab,
    settingsSection: globalState.settingsSection,
    openSettings,
    setSettingsSection,
    isMobileSidebarOpen: globalState.isMobileSidebarOpen,
    setIsMobileSidebarOpen,
    isCommandPaletteOpen: globalState.isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    isNotificationPanelOpen: globalState.isNotificationPanelOpen,
    setIsNotificationPanelOpen,
    toasts: globalState.toasts,
    addToast,
    removeToast,

    notifications,
    unreadNotificationCount,
    markNotificationAsRead,
    markAllNotificationsAsRead,
    deleteNotification,
    resolveNotificationAction,

    notes: b.notes,
    activeNoteId: b.activeNoteId,
    activeFolder: b.activeFolder,
    folders: b.folders,
    ...api,


    tasks: globalState.tasks,
    addTask,
    updateTask,
    toggleTask,
    deleteTask,

    kanbanCards: globalState.kanbanCards,
    addKanbanCard,
    updateKanbanCard,
    deleteKanbanCard,
    moveKanbanCard,

    events: globalState.events,
    addEvent,
    updateEvent,
    deleteEvent,
    updateEventStatus,
    rescheduleEvent,

    transactions: b.transactions,
    financeCategories: globalState.financeCategories,
    exchangeRates: globalState.exchangeRates,
    fetchExchangeRates,
    setExchangeRateMarkup,
    addFinanceCategory,
    updateFinanceCategory,
    deleteFinanceCategory,

    customers: globalState.customers,
    remoteEdits: globalState.remoteEdits,
    addCustomer,
    updateCustomer,
    deleteCustomer,
  };
}
