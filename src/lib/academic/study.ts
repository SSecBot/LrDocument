import type { AcademicData, Course, StudyLog, StudySession, Term } from './types';
import { hasCalendar } from './grading';
import { t } from '@/lib/i18n';

// ---------------------------------------------------------------------------
// Ders çalışma takvimi: weekly study slots per course (chosen by the student, like a timetable),
// what was studied, and the "devamsızlık" of studying: at least %60 of the term's whole study plan
// must be studied, so when the missed time passes %40 of the plan for the term the student is warned
// how many hours to add to later sessions.
// Shared by the page and the push reminders (server), so it uses plain dates only.
// ---------------------------------------------------------------------------

/** Above this share of the term's planned study time missed, the course gets a warning. */
export const STUDY_WARN_RATIO = 0.4;
/** A count of past days is limited (a term is ~4 months). */
const MAX_DAYS = 400;

export const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};
export const slotMinutes = (s: Pick<StudySession, 'start' | 'end'>) => Math.max(0, toMinutes(s.end) - toMinutes(s.start));

/** 0 = Pazartesi … 6 = Pazar for a YYYY-MM-DD date. */
export function weekdayOf(date: string): number {
  return (new Date(`${date}T12:00:00Z`).getUTCDay() + 6) % 7;
}

function addDays(date: string, days: number): string {
  const d = new Date(`${date}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

/** "2 sa 30 dk", "45 dk", "3 saat" */
export function formatDuration(minutes: number): string {
  const m = Math.max(0, Math.round(minutes));
  const h = Math.floor(m / 60);
  const r = m % 60;
  if (!h) return t('{r} dk', { r });
  return r ? t('{h} sa {r} dk', { h, r }) : t('{h} saat', { h });
}

export interface StudyNow {
  /** YYYY-MM-DD (local / Türkiye time) */
  date: string;
  /** Minutes since midnight */
  minutes: number;
}

export function studySessionsOf(data: AcademicData, termId: string): StudySession[] {
  return (data.study?.sessions ?? []).filter((s) => s.termId === termId);
}

/**
 * Days on which the slot already took place (it ended), from when it was added (and the term start)
 * up to now (and the term end).
 */
export function pastOccurrences(session: StudySession, term: Term | undefined, now: StudyNow): string[] {
  return occurrences(session, term, now.date).filter((day) => day < now.date || now.minutes >= toMinutes(session.end));
}

/** The slot takes place on `date` (its weekday, after it was added, within the term). */
export function occursOn(session: StudySession, term: Term | undefined, date: string): boolean {
  if (weekdayOf(date) !== session.day || date < session.since) return false;
  return !term || !hasCalendar(term) || (date >= term.start && date <= term.end);
}

/** Every day the slot takes place from when it was added (and the term start) up to `until` (and the term end). */
function occurrences(session: StudySession, term: Term | undefined, until: string): string[] {
  let from = session.since;
  if (term && hasCalendar(term)) {
    if (term.start > from) from = term.start;
    if (term.end < until) until = term.end;
  }
  if (until < from) return [];
  // First matching weekday on or after `from`.
  let day = addDays(from, (session.day - weekdayOf(from) + 7) % 7);
  const out: string[] = [];
  for (let i = 0; day <= until && i < MAX_DAYS / 7 + 2; i++) {
    out.push(day);
    day = addDays(day, 7);
  }
  return out;
}

export interface CourseStudyStats {
  course: Course;
  sessions: StudySession[];
  /** Minutes per week in the plan */
  weeklyMinutes: number;
  /** Planned minutes of the slots that already took place */
  plannedMinutes: number;
  /** Planned minutes of the whole term (only the slots so far when the term has no dates) */
  termMinutes: number;
  /** Missed time the term still allows before the warning (%40 of termMinutes minus the deficit) */
  allowanceMinutes: number;
  studiedMinutes: number;
  missedMinutes: number;
  /** Extra study outside the plan (telafi or any other time) */
  makeupMinutes: number;
  /** Missed time not yet made up: "x saat eksik" */
  deficitMinutes: number;
  /** deficit / termMinutes */
  ratio: number;
  warn: boolean;
  /** Slots that ended without an entry (counted as not studied) */
  unmarked: { session: StudySession; date: string }[];
}

const logKey = (sessionId: string | null, date: string) => `${sessionId}|${date}`;

export function courseStudyStats(data: AcademicData, term: Term | undefined, courses: Course[], now: StudyNow): CourseStudyStats[] {
  const termId = term?.id ?? data.activeTermId;
  const sessions = termId ? studySessionsOf(data, termId) : [];
  const logs = data.study?.logs ?? [];
  const byKey = new Map<string, StudyLog>();
  for (const l of logs) if (l.sessionId) byKey.set(logKey(l.sessionId, l.date), l);

  return courses.map((course) => {
    const own = sessions.filter((s) => s.courseId === course.id);
    let planned = 0;
    let termTotal = 0;
    let studied = 0;
    let missed = 0;
    const unmarked: CourseStudyStats['unmarked'] = [];
    for (const s of own) {
      const length = slotMinutes(s);
      if (term && hasCalendar(term)) termTotal += length * occurrences(s, term, term.end).length;
      for (const date of pastOccurrences(s, term, now)) {
        planned += length;
        const log = byKey.get(logKey(s.id, date));
        if (!log) {
          missed += length;
          unmarked.push({ session: s, date });
        } else if (log.status === 'done') studied += length;
        else if (log.status === 'partial') {
          const m = Math.min(length, log.minutes ?? 0);
          studied += m;
          missed += length - m;
        } else missed += length;
      }
    }
    const makeup = logs
      .filter((l) => l.status === 'makeup' && l.courseId === course.id && (!term || !hasCalendar(term) || (l.date >= term.start && l.date <= term.end)))
      .reduce((sum, l) => sum + (l.minutes ?? 0), 0);
    const deficit = Math.max(0, missed - makeup);
    // The %60 rule applies to the whole term, like class attendance: a missed slot early in the term
    // is measured against everything planned until the term ends, not just the weeks so far.
    const termMinutes = Math.max(termTotal, planned);
    const ratio = termMinutes > 0 ? deficit / termMinutes : 0;
    return {
      course,
      sessions: own,
      weeklyMinutes: own.reduce((sum, s) => sum + slotMinutes(s), 0),
      plannedMinutes: planned,
      termMinutes,
      allowanceMinutes: Math.max(0, Math.floor(termMinutes * STUDY_WARN_RATIO) - deficit),
      studiedMinutes: studied + makeup,
      missedMinutes: missed,
      makeupMinutes: makeup,
      deficitMinutes: deficit,
      ratio,
      warn: termMinutes > 0 && ratio > STUDY_WARN_RATIO,
      unmarked: unmarked.sort((a, b) => b.date.localeCompare(a.date)),
    };
  });
}

/** The warning sentence shown in Ders Takibi and in the end-of-study notification. */
export function studyWarning(s: Pick<CourseStudyStats, 'course' | 'ratio' | 'deficitMinutes' | 'termMinutes'>): string {
  const over = s.deficitMinutes - Math.floor(s.termMinutes * STUDY_WARN_RATIO);
  return `${s.course.code || s.course.name}: dönemin çalışma planının %${Math.round(s.ratio * 100)}’i yapılmadı (en az %${Math.round((1 - STUDY_WARN_RATIO) * 100)} çalışılmalı). ${formatDuration(
    s.deficitMinutes
  )} eksik — en az ${formatDuration(Math.max(1, over))} ileriki çalışmalara eklenmeli.`;
}

/** Two slots of the same day overlap. */
export function overlaps(a: Pick<StudySession, 'day' | 'start' | 'end'>, b: Pick<StudySession, 'day' | 'start' | 'end'>): boolean {
  return a.day === b.day && a.start < b.end && b.start < a.end;
}
