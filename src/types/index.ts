export type NoteFolder = 'matematik' | 'taslaklar' | 'arsiv' | 'ders-notlari' | 'formuller' | string;

export interface Note {
  id: string;
  title: string;
  content: string;
  folder: NoteFolder;
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  createdAt: string;
  updatedAt: string;
}

export type ScriptSectionType = 'hook' | 'intro' | 'body' | 'proof' | 'example' | 'cta' | 'custom';

export interface ScriptSection {
  id: string;
  type: ScriptSectionType;
  title: string;
  content: string;
  visualNotes?: string;
  estimatedSeconds?: number;
}

export type Platform = 'YouTube' | 'TikTok' | 'Instagram' | 'Web' | 'Podcast';

export type ScriptStatus = 'fikir' | 'senaryo_hazir' | 'cekimde' | 'kurguda' | 'yayina_hazir';

export interface Script {
  id: string;
  title: string;
  targetPlatform: Platform;
  status: ScriptStatus;
  sections: ScriptSection[];
  speakingRateWPM: number; // varsayılan 130
  linkedNoteId?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
}

export type TaskPriority = 'yuksek' | 'orta' | 'dusuk';

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: TaskPriority;
  dueDate?: string; // YYYY-MM-DD
  linkedNoteId?: string;
  linkedScriptId?: string;
  createdAt: string;
  completedAt?: string;
}

export type CalendarEventType = 'yayin' | 'gorev' | 'ozel_gun' | 'finans';

export type EventStatus = 'planlandi' | 'hazirlaniyor' | 'yayinlandi' | 'iptal';

export interface EventChecklistItem {
  id: string;
  text: string;
  done: boolean;
}

export interface CalendarEvent {
  id: string;
  title: string;
  description?: string;
  date: string; // YYYY-MM-DD
  time?: string; // HH:mm
  durationMinutes: number;
  eventType: CalendarEventType;
  platform?: Platform;
  linkedScriptId?: string;
  linkedNoteId?: string;
  linkedTaskId?: string;
  status: EventStatus;
  checklist: EventChecklistItem[];
  createdAt: string;
}

export interface FolderItem {
  id: string;
  name: string;
  description?: string;
  iconName?: string;
  isSystem?: boolean;
}

export type MediaType = 'image' | 'sketch' | 'video_link' | 'diagram';

export interface MediaItem {
  id: string;
  title: string;
  description?: string;
  type: MediaType;
  url: string;
  thumbnailUrl?: string;
  linkedNoteId?: string;
  linkedScriptId?: string;
  tags: string[];
  createdAt: string;
}

export type FinanceTransactionType = 'gelir' | 'gider';

export type RecurringFrequency = 'gunluk' | 'haftalik' | 'aylik';

export interface FinanceCategoryItem {
  id: string;
  name: string;
  type: FinanceTransactionType;
  isSystem?: boolean;
}

export type FinanceCategory = string;

export type CurrencyCode = 'TRY' | 'USD' | 'EUR';

export interface ExchangeRates {
  USD: number; // e.g. 34.20
  EUR: number; // e.g. 37.10
  lastUpdated: string;
  markupTRY: number; // default 2.50
  isLive: boolean;
}

export interface FinanceTransaction {
  id: string;
  title: string;
  amount: number; // Base amount in TRY
  type: FinanceTransactionType;
  category: FinanceCategory;
  date: string; // YYYY-MM-DD
  currency?: CurrencyCode; // 'TRY' | 'USD' | 'EUR'
  originalAmount?: number; // Amount in original currency (e.g. 100 for $100)
  exchangeRate?: number; // Live base exchange rate (e.g. 34.20)
  markupTRY?: number; // Custom markup added to rate (e.g. 2.50)
  effectiveRate?: number; // Resulting rate (e.g. 36.70)
  description?: string;
  linkedScriptId?: string;
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  isConfirmed?: boolean; // Gelir Geldi (Onayla) / Gider Ödendi (Onayla)
  dueDate?: string;
  priority?: TaskPriority; // 'yuksek' | 'orta' | 'dusuk'
  createdAt: string;
}

// In-App Notification System
export type NotificationType = 'task_overdue' | 'finance_overdue' | 'calendar_upcoming' | 'system';

export interface AppNotification {
  id: string;
  title: string;
  message: string;
  type: NotificationType;
  priority: TaskPriority;
  isRead: boolean;
  targetTab?: ActiveTab;
  targetId?: string;
  actionType?: 'complete_task' | 'confirm_finance' | 'view';
  createdAt: string;
}

// Kanban Universal Module Types
export type KanbanColumnId = 'fikir' | 'yapilacak' | 'devam_ediyor' | 'inceleme' | 'tamamlandi';

export type KanbanProjectType = 'genel' | 'icerik' | 'matematik' | 'finans' | 'senaryo' | string;

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  projectType: KanbanProjectType;
  columnId: KanbanColumnId;
  priority: TaskPriority;
  dueDate?: string; // YYYY-MM-DD
  tags: string[];
  linkedScriptId?: string;
  linkedNoteId?: string;
  createdAt: string;
  updatedAt: string;
}

export type ActiveTab = 'dashboard' | 'notes' | 'scripts' | 'media' | 'tasks' | 'kanban' | 'calendar' | 'finance';
