import {
  Note,
  Task,
  CalendarEvent,
  FinanceTransaction,
  FinanceCategoryItem,
  KanbanCard,
} from '@/types';

export const INITIAL_NOTES: Note[] = [];


export const INITIAL_TASKS: Task[] = [];

export const INITIAL_EVENTS: CalendarEvent[] = [];

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
