import type { CorpPermissions, OrgRole } from '@/lib/corporate';

export type NoteFolder = 'matematik' | 'taslaklar' | 'arsiv' | 'ders-notlari' | 'formuller' | string;

export interface Note {
  id: string;
  title: string;
  content: string;
  folder: NoteFolder;
  tags: string[];
  isFavorite: boolean;
  isPinned: boolean;
  /** "text" (Markdown, default), "table" (spreadsheet JSON in content) or "pdf" (stored file) */
  kind?: NoteKind;
  /** PDF note: id of the encrypted file on the server */
  fileId?: string;
  createdAt: string;
  updatedAt: string;
}

export type NoteKind = 'text' | 'table' | 'pdf';

export type Platform = 'YouTube' | 'TikTok' | 'Instagram' | 'Web' | 'Podcast';

export type TaskPriority = 'yuksek' | 'orta' | 'dusuk';

export interface Task {
  id: string;
  title: string;
  description?: string;
  completed: boolean;
  priority: TaskPriority;
  /** Görev süresi aralığı: first day (optional); dueDate is the last day. YYYY-MM-DD */
  startDate?: string;
  dueDate?: string; // YYYY-MM-DD
  /** Saat on the due day (HH:mm); none = the whole day */
  dueTime?: string;
  linkedNoteId?: string;
  /** Who added it (shown in corporate workspaces) */
  createdBy?: string | null;
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
  linkedNoteId?: string;
  linkedTaskId?: string;
  status: EventStatus;
  checklist: EventChecklistItem[];
  /** Who added it (shown in corporate workspaces) */
  createdBy?: string | null;
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
  tags: string[];
  createdAt: string;
}

export type FinanceTransactionType = 'gelir' | 'gider';

export type RecurringFrequency = 'gunluk' | 'haftalik' | 'aylik' | 'yillik';

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
  endDate?: string; // YYYY-MM-DD (optional end of a recurring entry)
  currency?: CurrencyCode; // 'TRY' | 'USD' | 'EUR'
  originalAmount?: number; // Amount in original currency (e.g. 100 for $100)
  exchangeRate?: number; // Live base exchange rate (e.g. 34.20)
  markupTRY?: number; // Custom markup added to rate (e.g. 2.50)
  effectiveRate?: number; // Resulting rate (e.g. 36.70)
  description?: string;
  isRecurring?: boolean;
  recurringFrequency?: RecurringFrequency;
  isConfirmed?: boolean; // Gelir Geldi (Onayla) / Gider Ödendi (Onayla)
  dueDate?: string;
  priority?: TaskPriority; // 'yuksek' | 'orta' | 'dusuk'
  /** Kredi / borç: `amount` is the outstanding balance and `date` the next payment date. */
  isDebt?: boolean;
  /** Monthly interest, percent. */
  monthlyInterestRate?: number | null;
  /** Minimum payment as a percentage of the balance. */
  minPaymentRate?: number | null;
  /** Who added it (shown in corporate workspaces) */
  createdBy?: string | null;
  createdAt: string;
  /** Set on a recurring entry's copy shown in another month / day: the id of the stored record. */
  sourceId?: string;
}

// In-App Notification System
export type NotificationType = 'task_overdue' | 'finance_overdue' | 'calendar_upcoming' | 'activity' | 'system';

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

export type KanbanProjectType = 'genel' | 'icerik' | 'matematik' | 'finans' | string;

export interface KanbanCard {
  id: string;
  title: string;
  description?: string;
  projectType: KanbanProjectType;
  columnId: KanbanColumnId;
  priority: TaskPriority;
  dueDate?: string; // YYYY-MM-DD
  tags: string[];
  linkedNoteId?: string;
  /** Who added it (shown in corporate workspaces) */
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

/** Kurumsal › Müşteriler: one paid month of the commitment. */
export interface CustomerPayment {
  month: string; // YYYY-MM
  paidAt: string; // YYYY-MM-DD
  amount: number;
  /** Who recorded the payment (set by the server) */
  by?: string;
}

export interface Customer {
  id: string;
  name: string;
  contactName?: string | null;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  monthlyFee: number;
  /** Day of the month the payment is due. */
  paymentDay: number;
  startDate: string; // YYYY-MM-DD (taahhüt başlangıcı)
  endDate: string; // YYYY-MM-DD (taahhüt bitişi)
  payments: CustomerPayment[];
  notes?: string | null;
  /** Who added it (shown in corporate workspaces) */
  createdBy?: string | null;
  createdAt: string;
  updatedAt: string;
}

export type UserRole = 'ADMIN' | 'USER';
export type UserStatus = 'PENDING' | 'APPROVED' | 'REJECTED';
/** VIP: given by an admin, no payment ever (ömür boyu ücretsiz). */
export type SubscriptionPlan = 'Aylık' | 'Tek Seferlik' | 'VIP';
export type SubscriptionType = 'AYLIK' | 'TEK_SEFERLIK';
export type AccountType = 'STANDARD' | 'STUDENT' | 'CORPORATE';
/** WAIVED: the admin waived payment (VIP). */
export type PaymentStatus = 'PENDING' | 'MANUAL_APPROVED' | 'SUCCESSFUL' | 'WAIVED';

export interface UserProfile {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  subscriptionPlan?: SubscriptionPlan;
  subscriptionType?: SubscriptionType;
  paymentStatus?: PaymentStatus;
  accountType?: AccountType;
  organization?: string | null;
  seats?: number | null;
  /** Kurumsal üye (signed in with a corporate code). */
  memberId?: string;
  orgRole?: OrgRole;
  permissions?: CorpPermissions;
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
}

export interface AdminUserItem {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  subscriptionPlan: SubscriptionPlan;
  subscriptionType?: SubscriptionType;
  paymentStatus?: PaymentStatus;
  accountType?: AccountType;
  organization?: string | null;
  seats?: number | null;
  lastSeenAt?: string | null;
  emailVerifiedAt?: string | null;
  twoFactorEnabledAt?: string | null;
  studentDocument?: { fileName: string; mime: string; uploadedAt: string } | null;
  studentProfile?: {
    university: string;
    studentEmail: string;
    department: string;
    classYear: number;
    studentNo?: string | null;
    verifiedAt?: string | null;
    verifyMethod?: string | null;
    documentStatus?: string | null;
  } | null;
  createdAt: string;
  updatedAt: string;
  _count?: {
    notes: number;
    tasks: number;
    kanbanCards: number;
    events: number;
    mediaItems: number;
    transactions: number;
    orgMembers?: number;
  };
}

export interface AdminMetrics {
  totalUsers: number;
  pendingCount: number;
  approvedCount: number;
  rejectedCount: number;
  totalNotes: number;
  totalTasks: number;
  /** Users active within the last two minutes. */
  liveUsers: number;
}

export type ActiveTab =
  | 'dashboard'
  | 'notes'
  | 'personalNotes'
  | 'tasks'
  | 'calendar'
  | 'finance'
  | 'personalFinance'
  | 'customers'
  | 'team'
  | 'academic'
  | 'admin'
  | 'settings';


