'use client';

import { useState, useEffect } from 'react';
import {
  Note,
  Script,
  ScriptSection,
  ScriptSectionType,
  Task,
  CalendarEvent,
  FolderItem,
  MediaItem,
  FinanceTransaction,
  FinanceCategoryItem,
  FinanceTransactionType,
  KanbanCard,
  KanbanColumnId,
  ActiveTab,
  ScriptStatus,
  EventStatus,
  TaskPriority,
  AppNotification,
  NotificationType,
  CurrencyCode,
  ExchangeRates,
} from '@/types';
import {
  INITIAL_NOTES,
  INITIAL_SCRIPTS,
  INITIAL_TASKS,
  INITIAL_EVENTS,
  INITIAL_FOLDERS,
  INITIAL_MEDIA_ITEMS,
  INITIAL_TRANSACTIONS,
  INITIAL_FINANCE_CATEGORIES,
  INITIAL_KANBAN_CARDS,
} from '@/data/initialData';
import { generateId } from '@/lib/utils';
import {
  DEFAULT_EXCHANGE_RATES,
  fetchLiveExchangeRates,
  convertCurrencyToTRY,
} from '@/lib/exchangeRates';

export interface ToastMessage {
  id: string;
  type: 'success' | 'info' | 'warning' | 'error';
  title: string;
  message?: string;
}

interface AppState {
  // Navigation & UI
  activeTab: ActiveTab;
  setActiveTab: (tab: ActiveTab) => void;
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

  // Scripts
  scripts: Script[];
  activeScriptId: string | null;
  setActiveScriptId: (id: string | null) => void;
  addScript: (partial?: Partial<Script>) => string;
  updateScript: (id: string, partial: Partial<Script>) => void;
  deleteScript: (id: string) => void;
  updateScriptStatus: (id: string, status: ScriptStatus) => void;
  addScriptSection: (scriptId: string, section: { type: ScriptSectionType; title: string; content?: string; visualNotes?: string }) => void;
  updateScriptSection: (scriptId: string, sectionId: string, partial: Partial<ScriptSection>) => void;
  deleteScriptSection: (scriptId: string, sectionId: string) => void;

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

  // Media
  mediaItems: MediaItem[];
  addMediaItem: (item: Omit<MediaItem, 'id' | 'createdAt'>) => string;
  updateMediaItem: (id: string, partial: Partial<MediaItem>) => void;
  deleteMediaItem: (id: string) => void;

  // Finance & Multi-Currency
  transactions: FinanceTransaction[];
  financeCategories: FinanceCategoryItem[];
  exchangeRates: ExchangeRates;
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

// LocalStorage Keys (Production Clean)
const STORAGE_KEYS = {
  NOTES: 'lrdocument_notes_prod',
  SCRIPTS: 'lrdocument_scripts_prod',
  TASKS: 'lrdocument_tasks_prod',
  KANBAN: 'lrdocument_kanban_prod',
  EVENTS: 'lrdocument_events_prod',
  FOLDERS: 'lrdocument_folders_prod',
  MEDIA: 'lrdocument_media_prod',
  FINANCE: 'lrdocument_finance_prod',
  FINANCE_CATEGORIES: 'lrdocument_finance_cats_prod',
  EXCHANGE_RATES: 'lrdocument_exchange_rates_prod',
  NOTIFICATIONS_READ: 'lrdocument_notifs_read_prod',
  NOTIFICATIONS_DISMISSED: 'lrdocument_notifs_dismissed_prod',
};

// Global Store State Singleton
const globalState: {
  activeTab: ActiveTab;
  isCommandPaletteOpen: boolean;
  isNotificationPanelOpen: boolean;
  toasts: ToastMessage[];
  readNotificationIds: string[];
  dismissedNotificationIds: string[];
  notes: Note[];
  activeNoteId: string | null;
  activeFolder: string;
  folders: FolderItem[];
  scripts: Script[];
  activeScriptId: string | null;
  tasks: Task[];
  kanbanCards: KanbanCard[];
  events: CalendarEvent[];
  mediaItems: MediaItem[];
  transactions: FinanceTransaction[];
  financeCategories: FinanceCategoryItem[];
  exchangeRates: ExchangeRates;
} = {
  activeTab: 'dashboard',
  isCommandPaletteOpen: false,
  isNotificationPanelOpen: false,
  toasts: [],
  readNotificationIds: [],
  dismissedNotificationIds: [],
  notes: INITIAL_NOTES,
  activeNoteId: INITIAL_NOTES[0]?.id || null,
  activeFolder: 'all',
  folders: INITIAL_FOLDERS,
  scripts: INITIAL_SCRIPTS,
  activeScriptId: INITIAL_SCRIPTS[0]?.id || null,
  tasks: INITIAL_TASKS,
  kanbanCards: INITIAL_KANBAN_CARDS,
  events: INITIAL_EVENTS,
  mediaItems: INITIAL_MEDIA_ITEMS,
  transactions: INITIAL_TRANSACTIONS,
  financeCategories: INITIAL_FINANCE_CATEGORIES,
  exchangeRates: DEFAULT_EXCHANGE_RATES,
};

const listeners = new Set<() => void>();

function notify() {
  listeners.forEach(fn => fn());
}

function saveToLocalStorage() {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(STORAGE_KEYS.NOTES, JSON.stringify(globalState.notes));
    localStorage.setItem(STORAGE_KEYS.SCRIPTS, JSON.stringify(globalState.scripts));
    localStorage.setItem(STORAGE_KEYS.TASKS, JSON.stringify(globalState.tasks));
    localStorage.setItem(STORAGE_KEYS.KANBAN, JSON.stringify(globalState.kanbanCards));
    localStorage.setItem(STORAGE_KEYS.EVENTS, JSON.stringify(globalState.events));
    localStorage.setItem(STORAGE_KEYS.FOLDERS, JSON.stringify(globalState.folders));
    localStorage.setItem(STORAGE_KEYS.MEDIA, JSON.stringify(globalState.mediaItems));
    localStorage.setItem(STORAGE_KEYS.FINANCE, JSON.stringify(globalState.transactions));
    localStorage.setItem(STORAGE_KEYS.FINANCE_CATEGORIES, JSON.stringify(globalState.financeCategories));
    localStorage.setItem(STORAGE_KEYS.EXCHANGE_RATES, JSON.stringify(globalState.exchangeRates));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_READ, JSON.stringify(globalState.readNotificationIds));
    localStorage.setItem(STORAGE_KEYS.NOTIFICATIONS_DISMISSED, JSON.stringify(globalState.dismissedNotificationIds));
  } catch (err) {
    console.error('LocalStorage save error:', err);
  }
}

function loadFromLocalStorage() {
  if (typeof window === 'undefined') return;
  try {
    const savedNotes = localStorage.getItem(STORAGE_KEYS.NOTES);
    if (savedNotes) globalState.notes = JSON.parse(savedNotes);

    const savedScripts = localStorage.getItem(STORAGE_KEYS.SCRIPTS);
    if (savedScripts) globalState.scripts = JSON.parse(savedScripts);

    const savedTasks = localStorage.getItem(STORAGE_KEYS.TASKS);
    if (savedTasks) globalState.tasks = JSON.parse(savedTasks);

    const savedKanban = localStorage.getItem(STORAGE_KEYS.KANBAN);
    if (savedKanban) globalState.kanbanCards = JSON.parse(savedKanban);

    const savedEvents = localStorage.getItem(STORAGE_KEYS.EVENTS);
    if (savedEvents) globalState.events = JSON.parse(savedEvents);

    const savedFolders = localStorage.getItem(STORAGE_KEYS.FOLDERS);
    if (savedFolders) globalState.folders = JSON.parse(savedFolders);

    const savedMedia = localStorage.getItem(STORAGE_KEYS.MEDIA);
    if (savedMedia) globalState.mediaItems = JSON.parse(savedMedia);

    const savedFinance = localStorage.getItem(STORAGE_KEYS.FINANCE);
    if (savedFinance) globalState.transactions = JSON.parse(savedFinance);

    const savedCats = localStorage.getItem(STORAGE_KEYS.FINANCE_CATEGORIES);
    if (savedCats) globalState.financeCategories = JSON.parse(savedCats);

    const savedRates = localStorage.getItem(STORAGE_KEYS.EXCHANGE_RATES);
    if (savedRates) globalState.exchangeRates = JSON.parse(savedRates);

    const savedNotifsRead = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_READ);
    if (savedNotifsRead) globalState.readNotificationIds = JSON.parse(savedNotifsRead);

    const savedNotifsDismissed = localStorage.getItem(STORAGE_KEYS.NOTIFICATIONS_DISMISSED);
    if (savedNotifsDismissed) globalState.dismissedNotificationIds = JSON.parse(savedNotifsDismissed);
  } catch (err) {
    console.error('LocalStorage load error:', err);
  }
}

// Sync task to calendar helper
function syncTaskToCalendar(task: Task, isDelete: boolean = false) {
  if (isDelete) {
    globalState.events = globalState.events.filter(e => e.linkedTaskId !== task.id);
    return;
  }

  const existingEventIndex = globalState.events.findIndex(e => e.linkedTaskId === task.id);

  if (task.dueDate) {
    if (existingEventIndex >= 0) {
      globalState.events[existingEventIndex] = {
        ...globalState.events[existingEventIndex],
        title: `Görev Teslimi: ${task.title}`,
        date: task.dueDate,
        status: task.completed ? 'yayinlandi' : 'planlandi',
        linkedNoteId: task.linkedNoteId,
        linkedScriptId: task.linkedScriptId,
      };
    } else {
      globalState.events.push({
        id: `event-task-${task.id}`,
        title: `Görev Teslimi: ${task.title}`,
        description: task.description || 'Görevler modülünden otomatik senkronize edildi.',
        date: task.dueDate,
        time: '12:00',
        durationMinutes: 45,
        eventType: 'gorev',
        linkedTaskId: task.id,
        linkedNoteId: task.linkedNoteId,
        linkedScriptId: task.linkedScriptId,
        status: task.completed ? 'yayinlandi' : 'planlandi',
        checklist: [],
        createdAt: new Date().toISOString(),
      });
    }
  } else if (existingEventIndex >= 0) {
    globalState.events = globalState.events.filter(e => e.linkedTaskId !== task.id);
  }
}

// Overdue check helper: If task is uncompleted and dueDate < today, its effective priority is 'yuksek'
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

// Overdue check for transactions: if !isConfirmed and date < today
export function isTransactionOverdue(trans: FinanceTransaction): boolean {
  if (trans.isConfirmed) return false;
  const now = new Date();
  const dateObj = new Date(trans.date);
  dateObj.setHours(23, 59, 59, 999);
  return dateObj.getTime() < now.getTime();
}

// Dynamic priority elevation for finance transactions
export function getEffectiveTransactionPriority(trans: FinanceTransaction): TaskPriority {
  if (isTransactionOverdue(trans)) return 'yuksek';
  return trans.priority || 'orta';
}

// Dynamic Notification Engine
export function getComputedNotifications(): AppNotification[] {
  const notifs: AppNotification[] = [];

  // 1. Overdue Tasks
  globalState.tasks.forEach(task => {
    if (!task.completed && isTaskOverdue(task)) {
      notifs.push({
        id: `notif-task-${task.id}`,
        title: `Gecikmiş Görev: ${task.title}`,
        message: `Son teslim tarihi (${task.dueDate}) geçmiş ve henüz tamamlanmamış. Öncelik "Yüksek" olarak işaretlendi.`,
        type: 'task_overdue',
        priority: 'yuksek',
        isRead: globalState.readNotificationIds.includes(`notif-task-${task.id}`),
        targetTab: 'tasks',
        targetId: task.id,
        actionType: 'complete_task',
        createdAt: task.dueDate || new Date().toISOString(),
      });
    }
  });

  // 2. Overdue / Unconfirmed Finance Transactions
  globalState.transactions.forEach(trans => {
    if (!trans.isConfirmed && isTransactionOverdue(trans)) {
      notifs.push({
        id: `notif-trans-${trans.id}`,
        title: trans.type === 'gelir' ? `Gecikmiş Gelir Onayı: ${trans.title}` : `Vadesi Geçmiş Gider: ${trans.title}`,
        message: `₺${trans.amount.toLocaleString('tr-TR')} tutarındaki ${trans.category} işlemi (${trans.date}) onay bekliyor. Öncelik "Yüksek" seviyesine yükseltildi.`,
        type: 'finance_overdue',
        priority: 'yuksek',
        isRead: globalState.readNotificationIds.includes(`notif-trans-${trans.id}`),
        targetTab: 'finance',
        targetId: trans.id,
        actionType: 'confirm_finance',
        createdAt: trans.date || new Date().toISOString(),
      });
    }
  });

  // 3. Upcoming Calendar Events (Scheduled for today, tomorrow or next 2 days)
  const todayStr = '2026-08-23';
  const tomorrowStr = '2026-08-24';
  const dayAfterStr = '2026-08-25';

  globalState.events.forEach(ev => {
    if (ev.status !== 'yayinlandi' && ev.status !== 'iptal') {
      if (ev.date === todayStr || ev.date === tomorrowStr || ev.date === dayAfterStr) {
        const isToday = ev.date === todayStr;
        const isTomorrow = ev.date === tomorrowStr;
        const whenText = isToday ? 'Bugün' : isTomorrow ? 'Yarın' : ev.date;

        notifs.push({
          id: `notif-event-${ev.id}`,
          title: `Takvim Hatırlatması (${whenText}): ${ev.title}`,
          message: `${whenText} ${ev.time ? ev.time + ' saatinde' : ''} ${ev.platform ? '[' + ev.platform + '] ' : ''}${ev.description || 'Yayın ve içerik planı takvimde yer alıyor.'}`,
          type: 'calendar_upcoming',
          priority: isToday ? 'yuksek' : 'orta',
          isRead: globalState.readNotificationIds.includes(`notif-event-${ev.id}`),
          targetTab: 'calendar',
          targetId: ev.id,
          actionType: 'view',
          createdAt: ev.date || new Date().toISOString(),
        });
      }
    }
  });

  // Filter out dismissed notifications
  return notifs.filter(n => !globalState.dismissedNotificationIds.includes(n.id));
}

export function useAppStore(): AppState {
  const [, setTick] = useState(0);

  useEffect(() => {
    loadFromLocalStorage();
    const listener = () => setTick(t => t + 1);
    listeners.add(listener);

    // Initial background exchange rates refresh
    fetchLiveExchangeRates(globalState.exchangeRates.markupTRY).then(rates => {
      globalState.exchangeRates = rates;
      saveToLocalStorage();
      notify();
    }).catch(() => { });

    return () => {
      listeners.delete(listener);
    };
  }, []);

  const addToast = (toast: Omit<ToastMessage, 'id'>) => {
    const id = generateId();
    globalState.toasts = [...globalState.toasts, { ...toast, id }];
    notify();
    setTimeout(() => {
      globalState.toasts = globalState.toasts.filter(t => t.id !== id);
      notify();
    }, 4000);
  };

  const removeToast = (id: string) => {
    globalState.toasts = globalState.toasts.filter(t => t.id !== id);
    notify();
  };

  const computedNotifications = getComputedNotifications();
  const unreadNotificationCount = computedNotifications.filter(n => !n.isRead).length;

  return {
    activeTab: globalState.activeTab,
    setActiveTab: (tab) => {
      globalState.activeTab = tab;
      notify();
    },
    isCommandPaletteOpen: globalState.isCommandPaletteOpen,
    setIsCommandPaletteOpen: (open) => {
      globalState.isCommandPaletteOpen = open;
      notify();
    },
    isNotificationPanelOpen: globalState.isNotificationPanelOpen,
    setIsNotificationPanelOpen: (open) => {
      globalState.isNotificationPanelOpen = open;
      notify();
    },
    toasts: globalState.toasts,
    addToast,
    removeToast,

    // Notification Center
    notifications: computedNotifications,
    unreadNotificationCount,
    markNotificationAsRead: (id) => {
      if (!globalState.readNotificationIds.includes(id)) {
        globalState.readNotificationIds = [...globalState.readNotificationIds, id];
        saveToLocalStorage();
        notify();
      }
    },
    markAllNotificationsAsRead: () => {
      const allIds = computedNotifications.map(n => n.id);
      globalState.readNotificationIds = Array.from(new Set([...globalState.readNotificationIds, ...allIds]));
      saveToLocalStorage();
      notify();
      addToast({ type: 'success', title: 'Bildirimler Okundu', message: 'Tüm aktif bildirimler okundu olarak işaretlendi.' });
    },
    deleteNotification: (id) => {
      if (!globalState.dismissedNotificationIds.includes(id)) {
        globalState.dismissedNotificationIds = [...globalState.dismissedNotificationIds, id];
        saveToLocalStorage();
        notify();
        addToast({ type: 'info', title: 'Bildirim Kaldırıldı', message: 'Bildirim panodan temizlendi.' });
      }
    },
    resolveNotificationAction: (notifId, actionType, targetId) => {
      if (!globalState.readNotificationIds.includes(notifId)) {
        globalState.readNotificationIds = [...globalState.readNotificationIds, notifId];
      }

      if (actionType === 'complete_task') {
        const task = globalState.tasks.find(t => t.id === targetId);
        if (task) {
          const completed = !task.completed;
          globalState.tasks = globalState.tasks.map(t =>
            t.id === targetId ? { ...t, completed, completedAt: completed ? new Date().toISOString() : undefined } : t
          );
          syncTaskToCalendar({ ...task, completed });
          saveToLocalStorage();
          notify();
          addToast({ type: 'success', title: 'Görev Tamamlandı ✓', message: `"${task.title}" başarıyla tamamlandı.` });
        }
      } else if (actionType === 'confirm_finance') {
        const trans = globalState.transactions.find(t => t.id === targetId);
        if (trans) {
          const isConfirmed = !trans.isConfirmed;
          globalState.transactions = globalState.transactions.map(t =>
            t.id === targetId ? { ...t, isConfirmed } : t
          );
          saveToLocalStorage();
          notify();
          addToast({
            type: 'success',
            title: isConfirmed ? (trans.type === 'gelir' ? 'Gelir Onaylandı ✓' : 'Gider Ödendi ✓') : 'İşlem Güncellendi',
            message: `"${trans.title}" (₺${trans.amount.toLocaleString('tr-TR')}) onaylandı.`
          });
        }
      }
    },

    // Notes
    notes: globalState.notes,
    activeNoteId: globalState.activeNoteId,
    setActiveNoteId: (id) => {
      globalState.activeNoteId = id;
      notify();
    },
    activeFolder: globalState.activeFolder,
    setActiveFolder: (folder) => {
      globalState.activeFolder = folder;
      notify();
    },
    folders: globalState.folders,
    addFolder: (name, description = '') => {
      const id = generateId();
      const newFolder: FolderItem = { id, name, description, iconName: 'Folder', isSystem: false };
      globalState.folders = [...globalState.folders, newFolder];
      saveToLocalStorage();
      notify();
      addToast({ type: 'success', title: 'Klasör Oluşturuldu', message: `"${name}" klasörü eklendi.` });
      return id;
    },
    updateFolder: (id, name, description = '') => {
      globalState.folders = globalState.folders.map(f => f.id === id ? { ...f, name, description } : f);
      saveToLocalStorage();
      notify();
      addToast({ type: 'success', title: 'Klasör Güncellendi', message: `"${name}" güncellendi.` });
    },
    deleteFolder: (id) => {
      const folderToDelete = globalState.folders.find(f => f.id === id);
      if (!folderToDelete) return;
      globalState.notes = globalState.notes.map(n => n.folder === id ? { ...n, folder: 'genel' } : n);
      globalState.folders = globalState.folders.filter(f => f.id !== id);
      if (globalState.activeFolder === id) globalState.activeFolder = 'all';
      saveToLocalStorage();
      notify();
      addToast({ type: 'info', title: 'Klasör Silindi', message: `"${folderToDelete.name}" silindi. Notlar Genel Notlar klasörüne aktarıldı.` });
    },
    addNote: (partial = {}) => {
      const id = generateId();
      const newNote: Note = {
        id,
        title: partial.title || 'Yeni Matematik Notu',
        content: partial.content || '# Yeni Not\n\nBuraya KaTeX formülleri ($...$) veya metin yazın...',
        folder: partial.folder || (globalState.activeFolder !== 'all' && globalState.activeFolder !== 'favorites' ? globalState.activeFolder : 'genel'),
        tags: partial.tags || ['Yeni'],
        isFavorite: partial.isFavorite || false,
        isPinned: partial.isPinned || false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      globalState.notes = [newNote, ...globalState.notes];
      globalState.activeNoteId = id;
      saveToLocalStorage();
      notify();
      addToast({ type: 'success', title: 'Not Oluşturuldu', message: `"${newNote.title}" açıldı.` });
      return id;
    },
    updateNote: (id, partial) => {
      globalState.notes = globalState.notes.map(n =>
        n.id === id ? { ...n, ...partial, updatedAt: new Date().toISOString() } : n
      );
      saveToLocalStorage();
      notify();
    },
    deleteNote: (id) => {
      const note = globalState.notes.find(n => n.id === id);
      globalState.notes = globalState.notes.filter(n => n.id !== id);
      if (globalState.activeNoteId === id) {
        globalState.activeNoteId = globalState.notes[0]?.id || null;
      }
      saveToLocalStorage();
      notify();
      addToast({ type: 'info', title: 'Not Silindi', message: note ? `"${note.title}" kaldırıldı.` : '' });
    },
    toggleFavoriteNote: (id) => {
      globalState.notes = globalState.notes.map(n =>
        n.id === id ? { ...n, isFavorite: !n.isFavorite, updatedAt: new Date().toISOString() } : n
      );
      saveToLocalStorage();
      notify();
    },
    togglePinNote: (id) => {
      globalState.notes = globalState.notes.map(n =>
        n.id === id ? { ...n, isPinned: !n.isPinned, updatedAt: new Date().toISOString() } : n
      );
      saveToLocalStorage();
      notify();
    },

    // Scripts
    scripts: globalState.scripts,
    activeScriptId: globalState.activeScriptId,
    setActiveScriptId: (id) => {
      globalState.activeScriptId = id;
      notify();
    },
    addScript: (partial = {}) => {
      const id = generateId();
      const newScript: Script = {
        id,
        title: partial.title || 'Yeni Video Senaryosu',
        targetPlatform: partial.targetPlatform || 'YouTube',
        status: partial.status || 'fikir',
        sections: partial.sections || [
          {
            id: generateId(),
            type: 'hook',
            title: 'Kanca (İlk 10 Saniye)',
            content: 'İzleyiciyi hemen yakalayacak şaşırtıcı matematiksel soru veya paradoks...',
            visualNotes: 'Dinamik animasyon veya el çizimi görseli ekleyin',
            estimatedSeconds: 15,
          },
        ],
        speakingRateWPM: 130,
        linkedNoteId: partial.linkedNoteId,
        tags: partial.tags || ['Yeni'],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      globalState.scripts = [newScript, ...globalState.scripts];
      globalState.activeScriptId = id;
      saveToLocalStorage();
      notify();
      addToast({ type: 'success', title: 'Senaryo Başlatıldı', message: `"${newScript.title}" oluşturuldu.` });
      return id;
    },
    updateScript: (id, partial) => {
      globalState.scripts = globalState.scripts.map(s =>
        s.id === id ? { ...s, ...partial, updatedAt: new Date().toISOString() } : s
      );
      saveToLocalStorage();
      notify();
    },
    deleteScript: (id) => {
      const script = globalState.scripts.find(s => s.id === id);
      globalState.scripts = globalState.scripts.filter(s => s.id !== id);
      if (globalState.activeScriptId === id) {
        globalState.activeScriptId = globalState.scripts[0]?.id || null;
      }
      saveToLocalStorage();
      notify();
      addToast({ type: 'info', title: 'Senaryo Silindi', message: script ? `"${script.title}" kaldırıldı.` : '' });
    },
    updateScriptStatus: (id, status) => {
      globalState.scripts = globalState.scripts.map(s =>
        s.id === id ? { ...s, status, updatedAt: new Date().toISOString() } : s
      );
      saveToLocalStorage();
      notify();
    },
    addScriptSection: (scriptId, section) => {
      const newSec: ScriptSection = {
        id: generateId(),
        type: section.type,
        title: section.title,
        content: section.content || '',
        visualNotes: section.visualNotes || '',
        estimatedSeconds: 30,
      };
      globalState.scripts = globalState.scripts.map(s => {
        if (s.id !== scriptId) return s;
        return {
          ...s,
          sections: [...s.sections, newSec],
          updatedAt: new Date().toISOString(),
        };
      });
      saveToLocalStorage();
      notify();
    },
    updateScriptSection: (scriptId, sectionId, partial) => {
      globalState.scripts = globalState.scripts.map(s => {
        if (s.id !== scriptId) return s;
        return {
          ...s,
          sections: s.sections.map(sec => sec.id === sectionId ? { ...sec, ...partial } : sec),
          updatedAt: new Date().toISOString(),
        };
      });
      saveToLocalStorage();
      notify();
    },
    deleteScriptSection: (scriptId, sectionId) => {
      globalState.scripts = globalState.scripts.map(s => {
        if (s.id !== scriptId) return s;
        return {
          ...s,
          sections: s.sections.filter(sec => sec.id !== sectionId),
          updatedAt: new Date().toISOString(),
        };
      });
      saveToLocalStorage();
      notify();
    },

    // Tasks
    tasks: globalState.tasks,
    addTask: (taskData) => {
      const id = generateId();
      const newTask: Task = {
        ...taskData,
        id,
        createdAt: new Date().toISOString(),
      };
      globalState.tasks = [newTask, ...globalState.tasks];
      syncTaskToCalendar(newTask);
      saveToLocalStorage();
      notify();
      addToast({ type: 'success', title: 'Görev Eklendi', message: `"${newTask.title}" eklendi.` });
      return id;
    },
    updateTask: (id, partial) => {
      globalState.tasks = globalState.tasks.map(t => {
        if (t.id !== id) return t;
        const updated = { ...t, ...partial };
        syncTaskToCalendar(updated);
        return updated;
      });
      saveToLocalStorage();
      notify();
    },
    toggleTask: (id) => {
      const task = globalState.tasks.find(t => t.id === id);
      if (!task) return;
      const completed = !task.completed;
      globalState.tasks = globalState.tasks.map(t =>
        t.id === id ? { ...t, completed, completedAt: completed ? new Date().toISOString() : undefined } : t
      );
      syncTaskToCalendar({ ...task, completed });
      saveToLocalStorage();
      notify();
      addToast({
        type: completed ? 'success' : 'info',
        title: completed ? 'Görev Tamamlandı' : 'Görev Yeniden Açıldı',
        message: `"${task.title}"`
      });
    },
    deleteTask: (id) => {
      const task = globalState.tasks.find(t => t.id === id);
      if (task) syncTaskToCalendar(task, true);
      globalState.tasks = globalState.tasks.filter(t => t.id !== id);
      saveToLocalStorage();
      notify();
      addToast({ type: 'info', title: 'Görev Silindi', message: task ? `"${task.title}" kaldırıldı.` : '' });
    },

    // Universal Kanban
    kanbanCards: globalState.kanbanCards,
    addKanbanCard: (cardData) => {
      const id = generateId();
      const newCard: KanbanCard = {
        ...cardData,
        id,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      };
      globalState.kanbanCards = [newCard, ...globalState.kanbanCards];
      saveToLocalStorage();
      notify();
      addToast({ type: 'success', title: 'Kanban Kartı Eklendi', message: `"${newCard.title}" panoya eklendi.` });
      return id;
    },
    updateKanbanCard: (id, partial) => {
      globalState.kanbanCards = globalState.kanbanCards.map(c =>
        c.id === id ? { ...c, ...partial, updatedAt: new Date().toISOString() } : c
      );
      saveToLocalStorage();
      notify();
    },
    deleteKanbanCard: (id) => {
      const card = globalState.kanbanCards.find(c => c.id === id);
      globalState.kanbanCards = globalState.kanbanCards.filter(c => c.id !== id);
      saveToLocalStorage();
      notify();
      addToast({ type: 'info', title: 'Kart Silindi', message: card ? `"${card.title}" panodan kaldırıldı.` : '' });
    },
    moveKanbanCard: (id, columnId) => {
      globalState.kanbanCards = globalState.kanbanCards.map(c =>
        c.id === id ? { ...c, columnId, updatedAt: new Date().toISOString() } : c
      );
      saveToLocalStorage();
      notify();
    },

    // Calendar
    events: globalState.events,
    addEvent: (eventData) => {
      const id = generateId();
      const newEvent: CalendarEvent = {
        ...eventData,
        id,
        createdAt: new Date().toISOString(),
      };
      globalState.events = [...globalState.events, newEvent];
      saveToLocalStorage();
      notify();
      addToast({ type: 'success', title: 'Etkinlik Eklendi', message: `"${newEvent.title}" takvime işlendi.` });
      return id;
    },
    updateEvent: (id, partial) => {
      globalState.events = globalState.events.map(e =>
        e.id === id ? { ...e, ...partial } : e
      );
      saveToLocalStorage();
      notify();
    },
    deleteEvent: (id) => {
      const ev = globalState.events.find(e => e.id === id);
      globalState.events = globalState.events.filter(e => e.id !== id);
      saveToLocalStorage();
      notify();
      addToast({ type: 'info', title: 'Etkinlik Silindi', message: ev ? `"${ev.title}" takvimden kaldırıldı.` : '' });
    },
    updateEventStatus: (id, status) => {
      globalState.events = globalState.events.map(e =>
        e.id === id ? { ...e, status } : e
      );
      saveToLocalStorage();
      notify();
    },
    rescheduleEvent: (id, newDate) => {
      const ev = globalState.events.find(e => e.id === id);
      if (!ev) return;
      globalState.events = globalState.events.map(e =>
        e.id === id ? { ...e, date: newDate } : e
      );
      if (ev.linkedTaskId) {
        globalState.tasks = globalState.tasks.map(t =>
          t.id === ev.linkedTaskId ? { ...t, dueDate: newDate } : t
        );
      }
      saveToLocalStorage();
      notify();
      addToast({ type: 'success', title: 'Tarih Güncellendi', message: `"${ev.title}" ${newDate} tarihine taşındı.` });
    },

    // Media
    mediaItems: globalState.mediaItems,
    addMediaItem: (itemData) => {
      const id = generateId();
      const newItem: MediaItem = {
        ...itemData,
        id,
        createdAt: new Date().toISOString(),
      };
      globalState.mediaItems = [newItem, ...globalState.mediaItems];
      saveToLocalStorage();
      notify();
      addToast({ type: 'success', title: 'Medya Eklendi', message: `"${newItem.title}" depoya kaydedildi.` });
      return id;
    },
    updateMediaItem: (id, partial) => {
      globalState.mediaItems = globalState.mediaItems.map(m =>
        m.id === id ? { ...m, ...partial } : m
      );
      saveToLocalStorage();
      notify();
      addToast({ type: 'success', title: 'Medya Güncellendi', message: 'Değişiklikler kaydedildi.' });
    },
    deleteMediaItem: (id) => {
      const item = globalState.mediaItems.find(m => m.id === id);
      globalState.mediaItems = globalState.mediaItems.filter(m => m.id !== id);
      saveToLocalStorage();
      notify();
      addToast({ type: 'info', title: 'Medya Silindi', message: item ? `"${item.title}" depodan kaldırıldı.` : '' });
    },

    // Finance & Multi-Currency
    transactions: globalState.transactions,
    financeCategories: globalState.financeCategories,
    exchangeRates: globalState.exchangeRates,

    fetchExchangeRates: async () => {
      try {
        const rates = await fetchLiveExchangeRates(globalState.exchangeRates.markupTRY);
        globalState.exchangeRates = rates;
        saveToLocalStorage();
        notify();
        addToast({
          type: 'success',
          title: 'Döviz Kurları Güncellendi',
          message: `USD: ${rates.USD.toFixed(2)} ₺ (+${rates.markupTRY.toFixed(2)} ₺ Marj = ${(rates.USD + rates.markupTRY).toFixed(2)} ₺) | EUR: ${rates.EUR.toFixed(2)} ₺`
        });
      } catch (err) {
        addToast({ type: 'warning', title: 'Kur Güncellenemedi', message: 'Yedek kurlar kullanılmaya devam ediyor.' });
      }
    },

    setExchangeRateMarkup: (markup: number) => {
      globalState.exchangeRates = {
        ...globalState.exchangeRates,
        markupTRY: Number(markup.toFixed(2)),
      };
      saveToLocalStorage();
      notify();
    },

    addTransaction: (transData) => {
      const id = generateId();
      const currency = transData.currency || 'TRY';
      const inputAmount = transData.originalAmount !== undefined ? transData.originalAmount : transData.amount;

      // Convert to TRY using currency conversion service with markup
      const conv = convertCurrencyToTRY(
        inputAmount,
        currency,
        globalState.exchangeRates,
        transData.markupTRY
      );

      const newTrans: FinanceTransaction = {
        ...transData,
        id,
        amount: conv.baseAmountTRY,
        currency,
        originalAmount: inputAmount,
        exchangeRate: conv.liveRate,
        markupTRY: conv.markup,
        effectiveRate: conv.effectiveRate,
        isConfirmed: transData.isConfirmed !== undefined ? transData.isConfirmed : true,
        priority: transData.priority || 'orta',
        createdAt: new Date().toISOString(),
      };

      globalState.transactions = [newTrans, ...globalState.transactions];
      saveToLocalStorage();
      notify();
      addToast({
        type: 'success',
        title: newTrans.type === 'gelir' ? 'Gelir Kaydedildi' : 'Gider Kaydedildi',
        message: currency === 'TRY'
          ? `"${newTrans.title}" (₺${newTrans.amount.toLocaleString('tr-TR')}) eklendi.`
          : `"${newTrans.title}" (${currency === 'USD' ? '$' : '€'}${inputAmount} = ₺${newTrans.amount.toLocaleString('tr-TR')}) eklendi.`
      });
      return id;
    },

    updateTransaction: (id, partial) => {
      globalState.transactions = globalState.transactions.map(t => {
        if (t.id !== id) return t;

        const updatedCurrency = partial.currency !== undefined ? partial.currency : (t.currency || 'TRY');
        const updatedOriginalAmount = partial.originalAmount !== undefined
          ? partial.originalAmount
          : partial.amount !== undefined
            ? partial.amount
            : (t.originalAmount || t.amount);

        const conv = convertCurrencyToTRY(
          updatedOriginalAmount,
          updatedCurrency,
          globalState.exchangeRates,
          partial.markupTRY !== undefined ? partial.markupTRY : t.markupTRY
        );

        return {
          ...t,
          ...partial,
          amount: conv.baseAmountTRY,
          currency: updatedCurrency,
          originalAmount: updatedOriginalAmount,
          exchangeRate: conv.liveRate,
          markupTRY: conv.markup,
          effectiveRate: conv.effectiveRate,
        };
      });

      saveToLocalStorage();
      notify();
      addToast({ type: 'success', title: 'İşlem Güncellendi', message: 'Finans kaydı güncellendi.' });
    },

    deleteTransaction: (id) => {
      const item = globalState.transactions.find(t => t.id === id);
      globalState.transactions = globalState.transactions.filter(t => t.id !== id);
      saveToLocalStorage();
      notify();
      addToast({ type: 'info', title: 'Kayıt Silindi', message: item ? `"${item.title}" kaydı silindi.` : '' });
    },

    toggleTransactionConfirmation: (id) => {
      const trans = globalState.transactions.find(t => t.id === id);
      if (!trans) return;
      const isConfirmed = !trans.isConfirmed;
      globalState.transactions = globalState.transactions.map(t =>
        t.id === id ? { ...t, isConfirmed } : t
      );
      saveToLocalStorage();
      notify();
      addToast({
        type: isConfirmed ? 'success' : 'info',
        title: isConfirmed
          ? (trans.type === 'gelir' ? 'Gelir Alındı (Onaylandı)' : 'Gider Ödendi (Onaylandı)')
          : 'Onay Kaldırıldı (Beklemede)',
        message: `"${trans.title}" durumu güncellendi.`
      });
    },

    addFinanceCategory: (name, type) => {
      const id = generateId();
      const newCat: FinanceCategoryItem = { id, name: name.trim(), type, isSystem: false };
      globalState.financeCategories = [...globalState.financeCategories, newCat];
      saveToLocalStorage();
      notify();
      addToast({ type: 'success', title: 'Kategori Eklendi', message: `"${name}" eklendi.` });
      return id;
    },

    updateFinanceCategory: (id, name) => {
      const oldCat = globalState.financeCategories.find(c => c.id === id);
      const oldName = oldCat?.name;
      globalState.financeCategories = globalState.financeCategories.map(c =>
        c.id === id ? { ...c, name: name.trim() } : c
      );
      if (oldName && oldName !== name.trim()) {
        globalState.transactions = globalState.transactions.map(t =>
          t.category === oldName ? { ...t, category: name.trim() } : t
        );
      }
      saveToLocalStorage();
      notify();
      addToast({ type: 'success', title: 'Kategori Güncellendi', message: `"${name}" olarak kaydedildi.` });
    },

    deleteFinanceCategory: (id) => {
      const cat = globalState.financeCategories.find(c => c.id === id);
      if (!cat) return;
      globalState.financeCategories = globalState.financeCategories.filter(c => c.id !== id);
      saveToLocalStorage();
      notify();
      addToast({ type: 'info', title: 'Kategori Silindi', message: `"${cat.name}" silindi.` });
    },
  };
}
