import {
  Note,
  Task,
  CalendarEvent,
  FolderItem,
  MediaItem,
  FinanceTransaction,
  FinanceCategoryItem,
  KanbanCard,
} from '@/types';

export const INITIAL_FOLDERS: FolderItem[] = [
  { id: 'genel', name: 'Genel Notlar', description: 'Genel araştırma, fikir ve çalışma dokümanları', iconName: 'Folder', isSystem: true },
  { id: 'matematik', name: 'Matematik & Teori', description: 'Teoremler, ispatlar ve derin matematiksel kavramlar', iconName: 'Sigma', isSystem: false },
  { id: 'taslaklar', name: 'Taslaklar & Çizimler', description: 'Geliştirilmekte olan ham araştırma notları', iconName: 'FileText', isSystem: false },
  { id: 'ders-notlari', name: 'Ders & Çalışma Notları', description: 'Referans dokümanları ve formül kartları', iconName: 'BookOpen', isSystem: false },
  { id: 'arsiv', name: 'Arşiv', description: 'Tamamlanmış ve arşivlenmiş içerik notları', iconName: 'Archive', isSystem: false },
];

export const INITIAL_NOTES: Note[] = [];


export const INITIAL_TASKS: Task[] = [];

export const INITIAL_EVENTS: CalendarEvent[] = [];

export const INITIAL_MEDIA_ITEMS: MediaItem[] = [];

export const INITIAL_FINANCE_CATEGORIES: FinanceCategoryItem[] = [
  { id: 'cat-yt', name: 'YouTube Geliri', type: 'gelir', isSystem: true },
  { id: 'cat-spons', name: 'Sponsorluk & İş Birlikleri', type: 'gelir', isSystem: true },
  { id: 'cat-bagis', name: 'Patreon & Katıl Bağışları', type: 'gelir', isSystem: true },
  { id: 'cat-yazilim', name: 'Yazılım & Abonelikler', type: 'gider', isSystem: true },
  { id: 'cat-donanim', name: 'Ekipman & Donanım', type: 'gider', isSystem: true },
  { id: 'cat-ofis', name: 'Stüdyo & Genel Giderler', type: 'gider', isSystem: true },
];

export const INITIAL_TRANSACTIONS: FinanceTransaction[] = [];

export const INITIAL_KANBAN_CARDS: KanbanCard[] = [];
