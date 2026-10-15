import type { ActiveTab, Customer, KanbanCard } from '@/types';
import type { AcademicData } from './academic/types';
import { EXAM_TYPE_LABEL, addDays, hasCalendar, termHolidays } from './academic/grading';
import { officialHolidays } from './academic/holidays';
import { paymentSchedule } from './customers';
import { formatCurrencyTRY } from './utils';

// ---------------------------------------------------------------------------
// Everything that belongs on the calendar besides the user's own events, tasks and finance rows:
// classes and exams from Ders Takibi, the academic calendar (term days, holidays, exam weeks),
// official holidays, Kanban due dates and customer payment days. Derived, read-only items; each
// links back to the module it comes from.
// ---------------------------------------------------------------------------

export type CalendarLayer =
  | 'etkinlik'
  | 'gorev'
  | 'finans'
  | 'ders'
  | 'sinav'
  | 'akademik'
  | 'resmi'
  | 'kanban'
  | 'musteri';

export const CALENDAR_LAYERS: CalendarLayer[] = ['etkinlik', 'gorev', 'finans', 'ders', 'sinav', 'akademik', 'resmi', 'kanban', 'musteri'];

export const CALENDAR_LAYER_LABEL: Record<CalendarLayer, string> = {
  etkinlik: 'Etkinlikler',
  gorev: 'Görevler',
  finans: 'Finans',
  ders: 'Dersler',
  sinav: 'Sınavlar',
  akademik: 'Akademik takvim',
  resmi: 'Resmî tatiller',
  kanban: 'Kanban',
  musteri: 'Müşteri ödemeleri',
};

export interface FeedItem {
  id: string;
  date: string;
  layer: Exclude<CalendarLayer, 'etkinlik' | 'gorev' | 'finans'>;
  title: string;
  time?: string;
  detail?: string;
  /** Full-day "no classes" marker (holiday, exam week) — shown as the day's label. */
  dayLabel?: boolean;
  overdue?: boolean;
  tab: ActiveTab;
}

interface FeedInput {
  start: string;
  end: string;
  today: string;
  academic?: AcademicData | null;
  kanbanCards?: KanbanCard[];
  customers?: Customer[];
}

/** Without an academic calendar, weekly classes are only shown around today (not forever). */
const NO_CALENDAR_WINDOW_DAYS = 120;
const MAX_DAYS = 800;

function* daysBetween(start: string, end: string) {
  for (let d = start, i = 0; d <= end && i < MAX_DAYS; d = addDays(d, 1), i++) yield d;
}

const weekday = (date: string) => (new Date(`${date}T12:00:00`).getDay() + 6) % 7;
const maxDate = (a: string, b: string) => (a > b ? a : b);
const minDate = (a: string, b: string) => (a < b ? a : b);

export function buildCalendarFeed({ start, end, today, academic, kanbanCards = [], customers = [] }: FeedInput): Map<string, FeedItem[]> {
  const byDate = new Map<string, FeedItem[]>();
  const push = (item: FeedItem) => {
    const list = byDate.get(item.date);
    if (list) list.push(item);
    else byDate.set(item.date, [item]);
  };
  const labelled = new Set<string>(); // date|name of holidays already added

  if (academic) {
    const courseName = new Map(academic.courses.map((c) => [c.id, c.code || c.name]));
    for (const term of academic.terms) {
      const courses = academic.courses.filter((c) => c.termId === term.id && c.sessions.length > 0);
      if (hasCalendar(term)) {
        const holidays = termHolidays(term);
        for (const h of holidays) {
          for (const date of daysBetween(maxDate(h.start, start), minDate(h.end, end))) {
            labelled.add(`${date}|${h.name}`);
            push({
              id: `hol-${term.id}-${h.id}-${date}`,
              date,
              layer: h.auto ? 'resmi' : 'akademik',
              title: h.half ? `${h.name} (öğleden sonra)` : h.name,
              detail: h.kind === 'sinav' ? 'Sınav dönemi — ders yok' : h.half ? '13:00’ten sonra ders yok' : 'Ders yok',
              dayLabel: !h.half,
              tab: 'academic',
            });
          }
        }
        if (term.start >= start && term.start <= end) {
          push({ id: `term-start-${term.id}`, date: term.start, layer: 'akademik', title: `Derslerin başlangıcı`, detail: term.name, tab: 'academic' });
        }
        if (term.end >= start && term.end <= end) {
          push({ id: `term-end-${term.id}`, date: term.end, layer: 'akademik', title: `Derslerin son günü`, detail: term.name, tab: 'academic' });
        }
        if (courses.length === 0) continue;
        for (const date of daysBetween(maxDate(term.start, start), minDate(term.end, end))) {
          const covering = holidays.filter((h) => date >= h.start && date <= h.end);
          if (covering.some((h) => !h.half)) continue;
          const afternoonOff = covering.some((h) => h.half);
          addClasses(date, courses, afternoonOff);
        }
      } else if (term.id === academic.activeTermId && courses.length > 0) {
        const from = maxDate(start, addDays(today, -7));
        const to = minDate(end, addDays(today, NO_CALENDAR_WINDOW_DAYS));
        for (const date of daysBetween(from, to)) addClasses(date, courses, false);
      }
    }

    for (const exam of academic.exams ?? []) {
      if (exam.date < start || exam.date > end) continue;
      const course = exam.courseId ? courseName.get(exam.courseId) : undefined;
      push({
        id: `exam-${exam.id}`,
        date: exam.date,
        layer: 'sinav',
        title: exam.title || `${course ?? ''} ${EXAM_TYPE_LABEL[exam.type]}`.trim(),
        time: exam.start ? (exam.end ? `${exam.start}–${exam.end}` : exam.start) : undefined,
        detail: [course, exam.room].filter(Boolean).join(' · ') || EXAM_TYPE_LABEL[exam.type],
        tab: 'academic',
      });
    }
  }

  function addClasses(date: string, courses: AcademicData['courses'], afternoonOff: boolean) {
    const wd = weekday(date);
    for (const course of courses) {
      for (const s of course.sessions) {
        if (s.day !== wd || (afternoonOff && s.start >= '13:00')) continue;
        push({
          id: `class-${course.id}-${s.id}-${date}`,
          date,
          layer: 'ders',
          title: course.code ? `${course.code} ${course.name}` : course.name,
          time: `${s.start}–${s.end}`,
          detail: [s.kind === 'uygulama' ? 'Uygulama' : 'Teori', s.room].filter(Boolean).join(' · '),
          tab: 'academic',
        });
      }
    }
  }

  // Official holidays for everybody (students already have them from their term calendar).
  for (const h of officialHolidays(start, end)) {
    if (labelled.has(`${h.date}|${h.name}`)) continue;
    push({
      id: `official-${h.date}`,
      date: h.date,
      layer: 'resmi',
      title: h.half ? `${h.name} (yarım gün)` : h.name,
      detail: h.estimated ? 'Resmî tatil (tarih tahminî)' : 'Resmî tatil',
      dayLabel: !h.half,
      tab: 'calendar',
    });
  }

  for (const card of kanbanCards) {
    if (!card.dueDate || card.columnId === 'tamamlandi' || card.dueDate < start || card.dueDate > end) continue;
    push({
      id: `kanban-${card.id}`,
      date: card.dueDate,
      layer: 'kanban',
      title: card.title,
      detail: 'Kanban kartı son tarihi',
      overdue: card.dueDate < today,
      tab: 'tasks',
    });
  }

  for (const c of customers) {
    if (c.endDate < start || c.startDate > end) continue;
    for (const item of paymentSchedule(c, today)) {
      if (item.state === 'paid' || item.due < start || item.due > end) continue;
      push({
        id: `cust-${c.id}-${item.month}`,
        date: item.due,
        layer: 'musteri',
        title: `${c.name} ödemesi`,
        detail: formatCurrencyTRY(c.monthlyFee),
        overdue: item.state === 'overdue',
        tab: 'customers',
      });
    }
  }

  for (const list of byDate.values()) {
    list.sort((a, b) => Number(!!b.dayLabel) - Number(!!a.dayLabel) || (a.time ?? '99').localeCompare(b.time ?? '99'));
  }
  return byDate;
}
