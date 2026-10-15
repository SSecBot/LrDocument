'use client';

import { useState, useEffect } from 'react';
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
} from '@/types';
import { INITIAL_FINANCE_CATEGORIES } from '@/data/initialData';
import { DEFAULT_PREFERENCES, parsePreferences, type UserPreferences } from '@/lib/preferences';
import { DEFAULT_SYSTEM_SETTINGS, resolveSystemSettings, type SystemSettings } from '@/lib/systemSettings';
import { generateId, toLocalDateString } from '@/lib/utils';
import { CORP_MODULE_LABEL, ENTITY_MODULE, canEdit, isCorporate, type CorpModule } from '@/lib/corporate';
import {
  DEFAULT_EXCHANGE_RATES,
  fetchLiveExchangeRates,
  convertCurrencyToTRY,
} from '@/lib/exchangeRates';

export type SettingsSection = 'hesap' | 'guvenlik' | 'ogrenci' | 'ders' | 'tercihler';

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
  addFolder: (name: string, description?: string) => string;
  updateFolder: (id: string, name: string, description?: string) => void;
  deleteFolder: (id: string) => void;
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
};

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
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach((fn) => fn());
}

type MutationEntity = 'note' | 'task' | 'kanban' | 'event' | 'finance' | 'folder' | 'category' | 'customer';

/**
 * Kurumsal: a member without edit permission for a module gets a notice instead of a local change
 * that the server would reject anyway.
 */
function guardEdit(module: CorpModule): boolean {
  if (canEdit(globalState.currentUser, module)) return true;
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
  keepalive = false
) {
  inFlightMutations++;
  try {
    const body = JSON.stringify({ entity, action, id, data });
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

function mutateDB(entity: MutationEntity, action: 'create' | 'upsert' | 'delete', id?: string, data?: unknown) {
  // Side effects into a module the member may not edit (e.g. a task's calendar entry) stay local.
  if (!canEdit(globalState.currentUser, ENTITY_MODULE[entity])) return;
  const key = `${entity}:${id}`;
  const pending = pendingUpserts.get(key);
  if (pending) {
    clearTimeout(pending.timer);
    pendingUpserts.delete(key);
  }

  if (action === 'upsert' && id) {
    const send = (keepalive?: boolean) => sendMutation(entity, action, id, data, keepalive);
    const timer = setTimeout(() => {
      pendingUpserts.delete(key);
      send();
    }, UPSERT_DEBOUNCE_MS);
    pendingUpserts.set(key, { timer, send });
    return;
  }

  // Creates and deletes go out immediately; a pending upsert for a deleted record is simply dropped.
  sendMutation(entity, action, id, data);
}

/** Sends all debounced writes immediately (used before leaving the page). */
function flushPendingMutations() {
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
  const notifs: AppNotification[] = [];

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

  globalState.transactions.forEach((trans) => {
    if (!trans.isConfirmed && isTransactionOverdue(trans)) {
      notifs.push({
        id: `notif-trans-${trans.id}`,
        title: trans.type === 'gelir' ? `Gecikmiş Gelir Onayı: ${trans.title}` : `Vadesi Geçmiş Gider: ${trans.title}`,
        message: `₺${trans.amount.toLocaleString('tr-TR')} tutarındaki ${trans.category} işlemi (${trans.date}) onay bekliyor. Öncelik "Yüksek" seviyesine yükseltildi.`,
        type: 'finance_overdue',
        priority: 'yuksek',
        isRead: globalState.preferences.readNotificationIds.includes(`notif-trans-${trans.id}`),
        targetTab: 'finance',
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
export const NOTE_VIEWS = ['all', 'favorites'] as const;
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

function flushPreferences(keepalive = false) {
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
      if (isCorporate(globalState.currentUser)) startRealtime();
    } else {
      globalState.currentUser = null;
      globalState.isAuthenticated = false;
    }
  } catch {
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
        globalState.preferences = parsePreferences(json.data.preferences);
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
    notify();
  }
};

/** Clears every in-memory record and reloads, so no data of the previous account survives. */
function leaveTo(path: string) {
  stopRealtime();
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
  globalState.preferences = DEFAULT_PREFERENCES;
  notify();
  window.location.href = path;
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

function applyRealtimeEvent(evt: RealtimeEvent) {
  if (evt.origin === CLIENT_ID) return;
  const key = ENTITY_STATE[evt.entity];
  if (!key || typeof evt.id !== 'string') return;
  const list = globalState[key] as unknown as { id: string }[];
  if (evt.action === 'delete') {
    globalState[key] = list.filter((r) => r.id !== evt.id) as never;
    if (evt.entity === 'note' && globalState.activeNoteId === evt.id) globalState.activeNoteId = null;
  } else {
    if (pendingUpserts.has(`${evt.entity}:${evt.id}`) || !evt.data) return;
    const current = list.find((r) => r.id === evt.id);
    const merged = { ...(current ?? {}), ...evt.data, id: evt.id };
    globalState[key] = (current
      ? list.map((r) => (r.id === evt.id ? merged : r))
      : evt.entity === 'note'
        ? [merged, ...list]
        : [...list, merged]) as never;
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
  presenceTimer = setInterval(ping, 60_000);
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

const addFolder = (name: string, description?: string): string => {
  if (!guardEdit('notes')) return '';
  const id = generateId();
  const newFolder: FolderItem = {
    id,
    name,
    description,
    iconName: 'Folder',
    isSystem: false,
  };
  globalState.folders = [...globalState.folders, newFolder];
  mutateDB('folder', 'create', id, newFolder);
  notify();
  return id;
};

const updateFolder = (id: string, name: string, description?: string) => {
  if (!guardEdit('notes')) return;
  globalState.folders = globalState.folders.map((f) =>
    f.id === id ? { ...f, name, description } : f
  );
  const updated = globalState.folders.find((f) => f.id === id);
  if (updated) mutateDB('folder', 'upsert', id, updated);
  notify();
};

const deleteFolder = (id: string) => {
  if (!guardEdit('notes')) return;
  globalState.folders = globalState.folders.filter((f) => f.id !== id);
  if (globalState.activeFolder === id) {
    globalState.activeFolder = 'all';
  }
  // The notes stay; they just leave the deleted folder.
  globalState.notes = globalState.notes.map((n) => {
    if (n.folder !== id) return n;
    const moved = { ...n, folder: '' };
    mutateDB('note', 'upsert', n.id, moved);
    return moved;
  });
  mutateDB('folder', 'delete', id);
  notify();
};

const addNote = (partial?: Partial<Note>): string => {
  if (!guardEdit('notes')) return '';
  const id = generateId();
  const newNote: Note = {
    id,
    title: partial?.title || 'Yeni Not',
    content: partial?.content || '',
    folder: partial?.folder ?? (isRealFolder(globalState.activeFolder) ? globalState.activeFolder : ''),
    tags: partial?.tags || [],
    isFavorite: partial?.isFavorite || false,
    isPinned: partial?.isPinned || false,
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };
  globalState.notes = [newNote, ...globalState.notes];
  globalState.activeNoteId = id;
  mutateDB('note', 'create', id, newNote);
  notify();
  return id;
};

const updateNote = (id: string, partial: Partial<Note>) => {
  if (!guardEdit('notes')) return;
  globalState.notes = globalState.notes.map((n) =>
    n.id === id ? { ...n, ...partial, updatedAt: new Date().toISOString() } : n
  );
  const updated = globalState.notes.find((n) => n.id === id);
  if (updated) mutateDB('note', 'upsert', id, updated);
  notify();
};

const deleteNote = (id: string) => {
  if (!guardEdit('notes')) return;
  globalState.notes = globalState.notes.filter((n) => n.id !== id);
  if (globalState.activeNoteId === id) {
    globalState.activeNoteId = globalState.notes[0]?.id || null;
  }
  mutateDB('note', 'delete', id);
  notify();
};

const toggleFavoriteNote = (id: string) => {
  if (!guardEdit('notes')) return;
  globalState.notes = globalState.notes.map((n) =>
    n.id === id ? { ...n, isFavorite: !n.isFavorite, updatedAt: new Date().toISOString() } : n
  );
  const updated = globalState.notes.find((n) => n.id === id);
  if (updated) mutateDB('note', 'upsert', id, updated);
  notify();
};

const togglePinNote = (id: string) => {
  if (!guardEdit('notes')) return;
  globalState.notes = globalState.notes.map((n) =>
    n.id === id ? { ...n, isPinned: !n.isPinned, updatedAt: new Date().toISOString() } : n
  );
  const updated = globalState.notes.find((n) => n.id === id);
  if (updated) mutateDB('note', 'upsert', id, updated);
  notify();
};

const addTask = (task: Omit<Task, 'id' | 'createdAt'>): string => {
  if (!guardEdit('work')) return '';
  const id = generateId();
  const newTask: Task = {
    ...task,
    id,
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

const addTransaction = (transaction: Omit<FinanceTransaction, 'id' | 'createdAt'>): string => {
  if (!guardEdit('finance')) return '';
  const id = generateId();
  const currency = transaction.currency || 'TRY';
  let amountInTRY = transaction.amount;
  let convertedInfo = undefined;

  if (currency !== 'TRY') {
    convertedInfo = convertCurrencyToTRY(
      transaction.originalAmount || transaction.amount,
      currency,
      globalState.exchangeRates
    );
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
    createdAt: new Date().toISOString(),
  };
  globalState.transactions = [newTransaction, ...globalState.transactions];
  mutateDB('finance', 'create', id, newTransaction);
  notify();
  return id;
};

const updateTransaction = (id: string, partial: Partial<FinanceTransaction>) => {
  if (!guardEdit('finance')) return;
  globalState.transactions = globalState.transactions.map((t) => {
    if (t.id !== id) return t;
    const currency = partial.currency || t.currency || 'TRY';
    let amountInTRY = partial.amount !== undefined ? partial.amount : t.amount;

    if (currency !== 'TRY' && partial.originalAmount !== undefined) {
      const conv = convertCurrencyToTRY(
        partial.originalAmount,
        currency,
        globalState.exchangeRates
      );
      amountInTRY = conv.baseAmountTRY;
    }

    return {
      ...t,
      ...partial,
      amount: amountInTRY,
      currency,
    };
  });
  const updated = globalState.transactions.find((t) => t.id === id);
  if (updated) mutateDB('finance', 'upsert', id, updated);
  notify();
};

const deleteTransaction = (id: string) => {
  if (!guardEdit('finance')) return;
  globalState.transactions = globalState.transactions.filter((t) => t.id !== id);
  mutateDB('finance', 'delete', id);
  notify();
};

const toggleTransactionConfirmation = (id: string) => {
  if (!guardEdit('finance')) return;
  globalState.transactions = globalState.transactions.map((t) =>
    t.id === id ? { ...t, isConfirmed: !t.isConfirmed } : t
  );
  const updated = globalState.transactions.find((t) => t.id === id);
  if (updated) mutateDB('finance', 'upsert', id, updated);
  notify();
};

const addCustomer = (customer: Omit<Customer, 'id' | 'createdAt' | 'updatedAt'>): string => {
  if (!guardEdit('customers')) return '';
  const id = generateId();
  const now = new Date().toISOString();
  const created: Customer = { ...customer, id, createdAt: now, updatedAt: now };
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

const setActiveNoteId = (id: string | null) => {
  globalState.activeNoteId = id;
  notify();
};

const setActiveFolder = (folder: string) => {
  globalState.activeFolder = folder;
  notify();
};


export function useAppStore(): AppState {
  const [, setTick] = useState(0);

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

    currentUser: globalState.currentUser,
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

    notes: globalState.notes,
    activeNoteId: globalState.activeNoteId,
    setActiveNoteId,
    activeFolder: globalState.activeFolder,
    setActiveFolder,
    folders: globalState.folders,
    addFolder,
    updateFolder,
    deleteFolder,
    addNote,
    updateNote,
    deleteNote,
    toggleFavoriteNote,
    togglePinNote,


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

    transactions: globalState.transactions,
    financeCategories: globalState.financeCategories,
    exchangeRates: globalState.exchangeRates,
    fetchExchangeRates,
    setExchangeRateMarkup,
    addTransaction,
    updateTransaction,
    deleteTransaction,
    toggleTransactionConfirmation,
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
