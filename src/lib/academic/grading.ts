import type {
  AcademicData,
  Assessment,
  Course,
  CourseCurve,
  CourseSession,
  CurveBoundary,
  Exam,
  ExamType,
  Holiday,
  GradingSystem,
  LetterGrade,
  SessionKind,
  Term,
} from './types';
import { officialHolidays } from './holidays';

// ---------------------------------------------------------------------------
// Presets
// ---------------------------------------------------------------------------

/**
 * KTÜ (Karadeniz Teknik Üniversitesi) — sources: KTÜ Öğrenci İşleri 2026-2027 duyurusu
 * ("Başarı Notunun Değerlendirilmesine Dair Usul ve Esaslarda Değişiklik") and the
 * önlisans/lisans yönetmeliği:
 *  - yarıyıl içi %50 + yarıyıl sonu %50, yarıyıl sonu / bütünleme barajı 45
 *  - HBN < 30 → FF; 30+ öğrencili derslerde bağıl değerlendirme
 *  - devam: teorik %70, uygulama %80
 *  - DC: dönem ortalaması ≥ 2.00 ise başarılı; DD, FD, FF başarısız
 * The intermediate letter thresholds below are an absolute-scale estimate (only AA ≥ 86 and
 * CC 50–59 are published); users can edit them.
 */
export const KTU_GRADING: GradingSystem = {
  preset: 'ktu',
  universityName: 'Karadeniz Teknik Üniversitesi',
  finalWeight: 50,
  minFinal: 45,
  failBelowAverage: 30,
  attendanceTheory: 70,
  attendancePractice: 80,
  weeksPerTerm: 14,
  letters: [
    { letter: 'AA', min: 86, point: 4.0 },
    { letter: 'BA', min: 78, point: 3.5 },
    { letter: 'BB', min: 70, point: 3.0 },
    { letter: 'CB', min: 60, point: 2.5 },
    { letter: 'CC', min: 50, point: 2.0 },
    { letter: 'DC', min: 45, point: 1.5 },
    { letter: 'DD', min: 40, point: 1.0 },
    { letter: 'FD', min: 30, point: 0.5 },
    { letter: 'FF', min: 0, point: 0 },
  ],
  conditionalLetters: ['DC'],
  conditionalGpa: 2.0,
  failingLetters: ['DD', 'FD', 'FF'],
  gpaBasis: 'ects',
  relativeNote:
    'KTÜ’de 30 ve üzeri öğrencili derslerde bağıl değerlendirme uygulanır; kesin harf notu sınıfın not dağılımına göre değişir. Hocanın açıkladığı sınıf ortalaması ve standart sapmayı Notlar › Çan eğrisi bölümünden girerseniz o dersin harf notu bağıl sisteme göre hesaplanır; girmezseniz mutlak ölçeğe göre tahmin edilir.',
};

/** Common absolute scale used by many Turkish universities (editable). */
export const GENERAL_GRADING: GradingSystem = {
  preset: 'genel',
  universityName: '',
  finalWeight: 60,
  minFinal: 50,
  failBelowAverage: 0,
  attendanceTheory: 70,
  attendancePractice: 80,
  weeksPerTerm: 14,
  letters: [
    { letter: 'AA', min: 90, point: 4.0 },
    { letter: 'BA', min: 85, point: 3.5 },
    { letter: 'BB', min: 80, point: 3.0 },
    { letter: 'CB', min: 75, point: 2.5 },
    { letter: 'CC', min: 70, point: 2.0 },
    { letter: 'DC', min: 65, point: 1.5 },
    { letter: 'DD', min: 60, point: 1.0 },
    { letter: 'FD', min: 50, point: 0.5 },
    { letter: 'FF', min: 0, point: 0 },
  ],
  conditionalLetters: ['DC', 'DD'],
  conditionalGpa: 2.0,
  failingLetters: ['FD', 'FF'],
  gpaBasis: 'ects',
};

export function isKtu(university: string): boolean {
  const u = university.toLocaleLowerCase('tr-TR');
  return u.includes('karadeniz teknik') || /\bktü\b|\bktu\b/.test(u);
}

export function gradingForUniversity(university: string): GradingSystem {
  if (isKtu(university)) return structuredClone(KTU_GRADING);
  return { ...structuredClone(GENERAL_GRADING), universityName: university };
}

export function currentTermName(date = new Date()): string {
  const y = date.getFullYear();
  const m = date.getMonth() + 1;
  if (m >= 8) return `${y}-${y + 1} Güz`;
  if (m === 1) return `${y - 1}-${y} Güz`;
  return `${y - 1}-${y} Bahar`;
}

export function newId(): string {
  return Math.random().toString(36).slice(2, 9) + Date.now().toString(36);
}

export function createDefaultData(university: string): AcademicData {
  const term: Term = { id: newId(), name: currentTermName() };
  return {
    version: 1,
    grading: gradingForUniversity(university),
    terms: [term],
    activeTermId: term.id,
    courses: [],
    targetGpa: null,
    exams: [],
  };
}

export function defaultAssessments(grading: GradingSystem): Assessment[] {
  const finalWeight = Math.min(100, Math.max(0, grading.finalWeight));
  return [
    { id: newId(), name: 'Vize', type: 'vize', weight: 100 - finalWeight, score: null },
    { id: newId(), name: 'Final', type: 'final', weight: finalWeight, score: null },
  ];
}

// ---------------------------------------------------------------------------
// Schedule / attendance
// ---------------------------------------------------------------------------

export const DAYS = ['Pazartesi', 'Salı', 'Çarşamba', 'Perşembe', 'Cuma', 'Cumartesi', 'Pazar'];
export const DAYS_SHORT = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

export function minutesOf(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

/** Class hours of a session ("ders saati"): one per started hour block, at least 1. */
export function sessionHours(s: Pick<CourseSession, 'start' | 'end'>): number {
  const minutes = minutesOf(s.end) - minutesOf(s.start);
  return Math.max(1, Math.round(minutes / 60));
}

export function weeklyHoursFromSessions(sessions: CourseSession[]): { theory: number; practice: number } {
  let theory = 0;
  let practice = 0;
  for (const s of sessions) {
    if (s.kind === 'uygulama') practice += sessionHours(s);
    else theory += sessionHours(s);
  }
  return { theory, practice };
}

export type AttendanceState = 'ok' | 'warn' | 'over';

export interface AttendanceKindStatus {
  kind: SessionKind;
  weeklyHours: number;
  totalHours: number;
  allowed: number;
  used: number;
  remaining: number;
  /** Remaining absences expressed in weeks of this kind */
  remainingWeeks: number;
  state: AttendanceState;
  /** "takvim": counted from the term's academic calendar; "hafta": weeklyHours × weeksPerTerm */
  basis: 'takvim' | 'hafta';
}

// ---------------------------------------------------------------------------
// Academic calendar
// ---------------------------------------------------------------------------

const ISO_DATE = /^\d{4}-\d{2}-\d{2}$/;

function parseDate(d: string): Date {
  const [y, m, day] = d.split('-').map(Number);
  return new Date(y, m - 1, day);
}

function isoOf(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function hasCalendar(term: Term | undefined | null): term is Term & { start: string; end: string } {
  return !!term && !!term.start && !!term.end && ISO_DATE.test(term.start) && ISO_DATE.test(term.end) && term.end >= term.start;
}

/** User/calendar holidays plus (unless turned off) the official ones within the term. */
export function termHolidays(term: Term): Holiday[] {
  const own = term.holidays ?? [];
  if (term.autoHolidays === false || !hasCalendar(term)) return own;
  const official: Holiday[] = officialHolidays(term.start, term.end)
    // Skip official days already covered by a stored full-day entry.
    .filter((o) => !own.some((h) => !h.half && o.date >= h.start && o.date <= h.end))
    .map((o) => ({
      id: `auto-${o.date}`,
      name: o.name,
      start: o.date,
      end: o.date,
      auto: true,
      ...(o.half ? { half: true } : {}),
      ...(o.estimated ? { estimated: true } : {}),
    }));
  return [...own, ...official].sort((a, b) => a.start.localeCompare(b.start));
}

/** Holiday covering `date` (a full day wins over an afternoon-only arife). */
export function isHoliday(date: string, term: Term): Holiday | undefined {
  const covering = termHolidays(term).filter((h) => date >= h.start && date <= h.end);
  return covering.find((h) => !h.half) ?? covering[0];
}

function eachClassDay(term: Term & { start: string; end: string }, fn: (iso: string, weekday: number, holidays: Holiday[]) => void) {
  const holidays = termHolidays(term);
  const end = parseDate(term.end);
  // Guard against absurd ranges (max ~1 year).
  for (let d = parseDate(term.start), i = 0; d <= end && i < 400; d.setDate(d.getDate() + 1), i++) {
    const iso = isoOf(d);
    fn(iso, (d.getDay() + 6) % 7, holidays.filter((h) => iso >= h.start && iso <= h.end));
  }
}

/** How many full class days each weekday (0 = Pazartesi) has in the term. */
export function meetingsPerWeekday(term: Term): number[] | null {
  if (!hasCalendar(term)) return null;
  const counts = [0, 0, 0, 0, 0, 0, 0];
  eachClassDay(term, (_, weekday, hs) => {
    if (!hs.some((h) => !h.half)) counts[weekday]++;
  });
  return counts;
}

/** How many times a session actually takes place: holidays, exam weeks and arife afternoons excluded. */
export function sessionMeetings(session: Pick<CourseSession, 'day' | 'start'>, term: Term): number | null {
  if (!hasCalendar(term)) return null;
  let n = 0;
  eachClassDay(term, (_, weekday, hs) => {
    if (weekday !== session.day) return;
    if (hs.some((h) => !h.half)) return;
    if (hs.some((h) => h.half) && session.start >= '13:00') return;
    n++;
  });
  return n;
}

/** Number of calendar weeks between the first and last day of classes. */
export function calendarWeeks(term: Term): number | null {
  if (!hasCalendar(term)) return null;
  return Math.ceil((parseDate(term.end).getTime() - parseDate(term.start).getTime() + 86_400_000) / (7 * 86_400_000));
}

export function addDays(date: string, n: number): string {
  const d = parseDate(date);
  d.setDate(d.getDate() + n);
  return isoOf(d);
}

/** From this hour on, the overview shows tomorrow's classes instead of today's. */
export const TOMORROW_FROM_HOUR = 17;

export interface DayPlan {
  date: string;
  /** 0 = Pazartesi */
  weekday: number;
  /** Full-day holiday or exam period: no classes. */
  holiday?: Holiday;
  /** Afternoon-only holiday (arife, 28 Ekim): sessions from 13:00 are cancelled. */
  halfHoliday?: Holiday;
  /** Date falls before the first / after the last day of classes. */
  outside?: 'before' | 'after';
  sessions: { course: Course; session: CourseSession }[];
}

/** The classes that actually take place on `date`, after holidays and exam periods. */
export function dayPlan(courses: Course[], term: Term | undefined | null, date: string): DayPlan {
  const weekday = (parseDate(date).getDay() + 6) % 7;
  const h = term ? isHoliday(date, term) : undefined;
  const holiday = h && !h.half ? h : undefined;
  const halfHoliday = h?.half ? h : undefined;
  const outside = hasCalendar(term) ? (date < term.start ? 'before' : date > term.end ? 'after' : undefined) : undefined;
  const sessions =
    holiday || outside
      ? []
      : courses
          .flatMap((c) => c.sessions.filter((s) => s.day === weekday).map((s) => ({ course: c, session: s })))
          .filter(({ session }) => !halfHoliday || session.start < '13:00')
          .sort((a, b) => a.session.start.localeCompare(b.session.start));
  return { date, weekday, holiday, halfHoliday, outside, sessions };
}

const MONTHS_TR = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const shortDate = (iso: string) => `${Number(iso.slice(8, 10))} ${MONTHS_TR[Number(iso.slice(5, 7)) - 1]}`;

/** Message for a day without classes, or null when the plan has sessions. */
export function formatDayPlanEmpty(plan: DayPlan, tomorrow: boolean, term?: Term | null): { title: string; text?: string } | null {
  if (plan.sessions.length > 0) return null;
  const when = tomorrow ? 'Yarın' : 'Bugün';
  if (plan.outside === 'before' && term?.start) return { title: 'Dönem henüz başlamadı', text: `Dersler ${shortDate(term.start)} tarihinde başlıyor.` };
  if (plan.outside === 'after') return { title: 'Dönemin ders günleri sona erdi', text: 'Akademik takvime göre bu dönemde artık ders yapılmıyor.' };
  if (plan.holiday)
    return {
      title: plan.holiday.kind === 'sinav' ? `Sınav dönemi — ${plan.holiday.name}` : `${when} tatil — ${plan.holiday.name}`,
      text: `Akademik takvime göre ${when.toLowerCase()} ders yok; devamsızlık sayılmaz.`,
    };
  return { title: `${when} dersiniz yok` };
}

/** First day after `date` (within three weeks) that has a class, with its earliest session. */
export function nextClassDay(courses: Course[], term: Term | undefined | null, date: string): DayPlan | null {
  for (let i = 1; i <= 21; i++) {
    const plan = dayPlan(courses, term, addDays(date, i));
    if (plan.sessions.length > 0) return plan;
    if (plan.outside === 'after') return null;
  }
  return null;
}

/** Attendance is not required again for a retaken course failed on grades (devam şartı sağlanmış). */
export function isAttendanceExempt(course: Course): boolean {
  return course.retake?.reason === 'not';
}

export function attendanceStatus(course: Course, grading: GradingSystem, term?: Term | null): AttendanceKindStatus[] {
  const result: AttendanceKindStatus[] = [];
  if (isAttendanceExempt(course)) return result;
  const calendar = hasCalendar(term) ? term : null;
  const kinds: [SessionKind, number, number][] = [
    ['teori', course.theoryHours, grading.attendanceTheory],
    ['uygulama', course.practiceHours, grading.attendancePractice],
  ];
  for (const [kind, weeklyHours, required] of kinds) {
    if (weeklyHours <= 0) continue;
    const kindSessions = course.sessions.filter((s) => s.kind === kind);
    // With an academic calendar, count the real class days of each session; otherwise N weeks.
    const fromCalendar = calendar !== null && kindSessions.length > 0;
    const totalHours = fromCalendar
      ? kindSessions.reduce((sum, s) => sum + sessionHours(s) * (sessionMeetings(s, calendar) ?? 0), 0)
      : weeklyHours * grading.weeksPerTerm;
    const allowed = Math.floor((totalHours * (100 - required)) / 100 + 1e-9);
    const used = course.absences.filter((a) => a.kind === kind).reduce((sum, a) => sum + a.hours, 0);
    const remaining = allowed - used;
    let state: AttendanceState = 'ok';
    if (remaining < 0) state = 'over';
    else if (remaining < weeklyHours || (allowed > 0 && used / allowed >= 0.75)) state = 'warn';
    result.push({
      kind,
      weeklyHours,
      totalHours,
      allowed,
      used,
      remaining,
      remainingWeeks: Math.max(0, Math.floor(remaining / weeklyHours)),
      state,
      basis: fromCalendar ? 'takvim' : 'hafta',
    });
  }
  return result;
}

export function isAttendanceFailed(course: Course, grading: GradingSystem, term?: Term | null): boolean {
  return attendanceStatus(course, grading, term).some((s) => s.state === 'over');
}

// ---------------------------------------------------------------------------
// Course grade
// ---------------------------------------------------------------------------

export type CourseStatus = 'devam' | 'gecti' | 'sartli' | 'kaldi' | 'devamsiz';

export interface RequiredScore {
  letter: string;
  /** Average score needed on all remaining assessments, or null if unreachable */
  score: number | null;
}

export interface CourseGrade {
  /** Weighted average of entered scores, normalised to the weight entered so far */
  average: number | null;
  /** Contribution of entered scores to the final average (0–100) */
  earned: number;
  missingWeight: number;
  totalWeight: number;
  weightsValid: boolean;
  finalScore: number | null;
  usedButunleme: boolean;
  /** T-score of the average when a T-score curve is active */
  tScore: number | null;
  scale: GradeScale;
  letter: string | null;
  point: number | null;
  status: CourseStatus;
  reason?: string;
  required: RequiredScore[];
}

function round2(n: number): number {
  return Math.round(n * 100) / 100;
}

export function letterPoint(letter: string, grading: GradingSystem): number | null {
  if (letter === 'D') return 0; // devamsız
  const found = grading.letters.find((l) => l.letter === letter);
  return found ? found.point : null;
}

export function letterForScore(score: number, letters: LetterGrade[]): LetterGrade {
  const sorted = [...letters].sort((a, b) => b.min - a.min);
  return sorted.find((l) => score >= l.min) ?? sorted[sorted.length - 1];
}

// ---------------------------------------------------------------------------
// Bell curve (bağıl değerlendirme)
// ---------------------------------------------------------------------------

const CURVE_LETTERS = ['AA', 'BA', 'BB', 'CB', 'CC', 'DC', 'DD', 'FD'];

/**
 * Standard T-score table used in Turkish universities' bağıl değerlendirme yönergeleri:
 * the minimum T-score of each letter depends on the class average. FF is everything below FD.
 */
export const T_SCORE_TABLE: { label: string; meanAbove: number; mins: number[] }[] = [
  { label: 'Mükemmel (70–80)', meanAbove: 70, mins: [57, 52, 47, 42, 37, 32, 27, 22] },
  { label: 'Çok iyi (62,5–70)', meanAbove: 62.5, mins: [59, 54, 49, 44, 39, 34, 29, 24] },
  { label: 'İyi (57,5–62,5)', meanAbove: 57.5, mins: [61, 56, 51, 46, 41, 36, 31, 26] },
  { label: 'Ortanın üstü (52,5–57,5)', meanAbove: 52.5, mins: [63, 58, 53, 48, 43, 38, 33, 28] },
  { label: 'Orta (47,5–52,5)', meanAbove: 47.5, mins: [65, 60, 55, 50, 45, 40, 35, 30] },
  { label: 'Zayıf (42,5–47,5)', meanAbove: 42.5, mins: [67, 62, 57, 52, 47, 42, 37, 32] },
  { label: 'Kötü (42,5 ve altı)', meanAbove: -1, mins: [69, 64, 59, 54, 49, 44, 39, 34] },
];

export function tTableForMean(mean: number): { label: string; boundaries: CurveBoundary[] } {
  const row = T_SCORE_TABLE.find((r) => mean > r.meanAbove) ?? T_SCORE_TABLE[T_SCORE_TABLE.length - 1];
  return { label: row.label, boundaries: CURVE_LETTERS.map((letter, i) => ({ letter, min: row.mins[i] })) };
}

export function defaultCurve(grading: GradingSystem): CourseCurve {
  return {
    enabled: true,
    mode: 'tscore',
    mean: null,
    stdDev: null,
    autoTable: true,
    absoluteAbove: 80,
    boundaries: [...grading.letters]
      .filter((l) => l.min > 0)
      .sort((a, b) => b.min - a.min)
      .map((l) => ({ letter: l.letter, min: l.min })),
  };
}

export function tScoreOf(raw: number, mean: number, stdDev: number): number {
  return round2(50 + (10 * (raw - mean)) / stdDev);
}

export function rawForTScore(t: number, mean: number, stdDev: number): number {
  return round2(mean + (stdDev * (t - 50)) / 10);
}

export interface GradeScale {
  /** Letters in raw-score space, descending */
  letters: LetterGrade[];
  curved: boolean;
  mode: 'mutlak' | 'tscore' | 'raw';
  /** Label of the standard T table row in use */
  tableLabel?: string;
  /** T-score boundaries in use (tscore mode) */
  tBoundaries?: CurveBoundary[];
  /** Why the curve is not applied yet */
  note?: string;
  mean?: number;
  stdDev?: number;
}

/** Turns the course's curve (if any) into a letter table in raw-score space. */
export function gradeScale(course: Course, grading: GradingSystem): GradeScale {
  const absolute: GradeScale = { letters: [...grading.letters].sort((a, b) => b.min - a.min), curved: false, mode: 'mutlak' };
  const c = course.curve;
  if (!c || !c.enabled) return absolute;

  const lowest = absolute.letters[absolute.letters.length - 1];
  const build = (boundaries: CurveBoundary[], toRaw: (min: number) => number): LetterGrade[] => {
    const letters: LetterGrade[] = [];
    for (const b of boundaries) {
      const point = grading.letters.find((l) => l.letter === b.letter)?.point;
      if (point === undefined || b.letter === lowest.letter) continue;
      letters.push({ letter: b.letter, min: Math.max(0, toRaw(b.min)), point });
    }
    letters.push({ ...lowest, min: 0 });
    return letters.sort((a, b) => b.min - a.min);
  };

  if (c.mode === 'raw') {
    if (c.boundaries.length === 0) return { ...absolute, note: 'Hocanın harf aralıkları girilmedi.' };
    return { letters: build(c.boundaries, (m) => m), curved: true, mode: 'raw' };
  }

  if (c.mean === null || c.stdDev === null || c.stdDev <= 0) {
    return { ...absolute, note: 'Sınıf ortalaması ve standart sapma girilince çan eğrisi uygulanır.' };
  }
  if (c.absoluteAbove > 0 && c.mean > c.absoluteAbove) {
    return { ...absolute, note: `Sınıf ortalaması ${c.absoluteAbove} üzerinde olduğu için mutlak değerlendirme uygulanır.` };
  }
  const { mean, stdDev } = c;
  const table = c.autoTable ? tTableForMean(mean) : { label: undefined, boundaries: c.boundaries };
  return {
    letters: build(table.boundaries, (t) => rawForTScore(t, mean, stdDev)),
    curved: true,
    mode: 'tscore',
    tableLabel: table.label,
    tBoundaries: table.boundaries,
    mean,
    stdDev,
  };
}

function statusForLetter(letter: string, grading: GradingSystem): CourseStatus {
  if (letter === 'D') return 'devamsiz';
  if (letter === 'K') return 'kaldi';
  if (letter === 'G' || letter === 'S') return 'gecti';
  if (grading.failingLetters.includes(letter)) return 'kaldi';
  if (grading.conditionalLetters.includes(letter)) return 'sartli';
  return 'gecti';
}

/**
 * Computes the course grade. `overrides` maps assessment id → hypothetical score and is used by
 * the "what-if" simulator without touching saved data.
 */
export function computeCourseGrade(
  course: Course,
  grading: GradingSystem,
  overrides: Record<string, number | null> = {},
  term?: Term | null
): CourseGrade {
  const scoreOf = (a: Assessment) => (a.id in overrides ? overrides[a.id] : a.score);

  const butunleme = course.assessments.find((a) => a.type === 'butunleme');
  const butScore = butunleme ? scoreOf(butunleme) : null;
  const components = course.assessments.filter((a) => a.type !== 'butunleme');
  const finalComp = components.find((a) => a.type === 'final');
  const usedButunleme = butScore !== null && butScore !== undefined && !!finalComp;

  let earned = 0;
  let missingWeight = 0;
  let enteredWeight = 0;
  const totalWeight = components.reduce((sum, a) => sum + a.weight, 0);
  let finalScore: number | null = null;

  for (const a of components) {
    let s = scoreOf(a);
    if (a.type === 'final' && usedButunleme) s = butScore as number;
    if (a.type === 'final') finalScore = s ?? null;
    if (s === null || s === undefined) {
      missingWeight += a.weight;
    } else {
      earned += (s * a.weight) / 100;
      enteredWeight += a.weight;
    }
  }

  const weightsValid = Math.abs(totalWeight - 100) < 0.01;
  // Normalise if weights do not add up to 100 so averages stay on a 0–100 scale.
  const weightScale = totalWeight > 0 ? 100 / totalWeight : 1;
  const earnedScaled = earned * weightScale;
  const average = enteredWeight > 0 ? round2((earned * 100) / enteredWeight) : null;
  const scale = gradeScale(course, grading);
  const tFor = (raw: number | null) =>
    raw !== null && scale.mode === 'tscore' && scale.mean !== undefined && scale.stdDev ? tScoreOf(raw, scale.mean, scale.stdDev) : null;

  const base: Omit<CourseGrade, 'letter' | 'point' | 'status' | 'reason' | 'required'> = {
    average,
    earned: round2(earnedScaled),
    missingWeight,
    totalWeight,
    weightsValid,
    finalScore,
    usedButunleme,
    tScore: tFor(average),
    scale,
  };

  if (isAttendanceFailed(course, grading, term)) {
    return {
      ...base,
      letter: 'D',
      point: 0,
      status: 'devamsiz',
      reason: 'Devamsızlık sınırı aşıldı',
      required: [],
    };
  }

  if (course.manualLetter) {
    return {
      ...base,
      letter: course.manualLetter,
      point: letterPoint(course.manualLetter, grading),
      status: statusForLetter(course.manualLetter, grading),
      required: [],
    };
  }

  if (missingWeight > 0 || components.length === 0) {
    return { ...base, letter: null, point: null, status: 'devam', required: requiredScores(course, grading, scale, base) };
  }

  const raw = round2(earnedScaled);
  let letter: LetterGrade;
  let reason: string | undefined;
  const ff = grading.letters.find((l) => l.letter === 'FF') ?? letterForScore(0, grading.letters);
  if (finalComp && finalScore !== null && finalScore < grading.minFinal) {
    letter = ff;
    reason = `${usedButunleme ? 'Bütünleme' : 'Final'} notu barajın (${grading.minFinal}) altında`;
  } else if (grading.failBelowAverage > 0 && raw < grading.failBelowAverage) {
    letter = ff;
    reason = `Ortalama ${grading.failBelowAverage}’un altında`;
  } else {
    letter = letterForScore(raw, scale.letters);
  }

  return {
    ...base,
    average: raw,
    tScore: tFor(raw),
    letter: letter.letter,
    point: letter.point,
    status: statusForLetter(letter.letter, grading),
    reason,
    required: [],
  };
}

function requiredScores(
  course: Course,
  grading: GradingSystem,
  scale: GradeScale,
  g: Pick<CourseGrade, 'earned' | 'missingWeight' | 'totalWeight'>
): RequiredScore[] {
  if (g.missingWeight <= 0 || g.totalWeight <= 0) return [];
  const finalMissing = course.assessments.some(
    (a) => a.type === 'final' && a.score === null && !course.assessments.some((b) => b.type === 'butunleme' && b.score !== null)
  );
  const missingShare = g.missingWeight / g.totalWeight; // fraction of the grade still open
  const targets = [...scale.letters]
    .filter((l) => !grading.failingLetters.includes(l.letter))
    .sort((a, b) => a.min - b.min);

  return targets.map((l) => {
    const minAverage = Math.max(l.min, grading.failBelowAverage);
    let needed = (minAverage - g.earned) / missingShare;
    if (finalMissing) needed = Math.max(needed, grading.minFinal);
    needed = Math.max(0, Math.ceil(needed));
    return { letter: l.letter, score: needed > 100 ? null : needed };
  });
}

// ---------------------------------------------------------------------------
// GPA
// ---------------------------------------------------------------------------

export interface GradedCourse {
  course: Course;
  grade: CourseGrade;
  /** Status after resolving conditional letters with the term GPA */
  finalStatus: CourseStatus;
  weight: number;
}

export interface TermSummary {
  term: Term;
  courses: GradedCourse[];
  gpa: number | null;
  gradedWeight: number;
  totalWeight: number;
  earnedWeight: number;
}

function gpaWeight(course: Course, grading: GradingSystem): number {
  return grading.gpaBasis === 'ects' ? course.ects : course.credit;
}

function countsForGpa(course: Course, grade: CourseGrade): boolean {
  if (course.excludeFromGpa || grade.letter === null || grade.point === null) return false;
  return !['G', 'K', 'S'].includes(grade.letter);
}

export function weightedGpa(items: { point: number; weight: number }[]): number | null {
  const total = items.reduce((s, i) => s + i.weight, 0);
  if (total <= 0) return null;
  return round2(items.reduce((s, i) => s + i.point * i.weight, 0) / total);
}

export function summarizeTerm(data: AcademicData, term: Term): TermSummary {
  const g = data.grading;
  const graded = data.courses
    .filter((c) => c.termId === term.id)
    .map((course) => ({ course, grade: computeCourseGrade(course, g, {}, term), weight: gpaWeight(course, g) }));

  const gpa = weightedGpa(
    graded.filter((x) => countsForGpa(x.course, x.grade)).map((x) => ({ point: x.grade.point as number, weight: x.weight }))
  );

  const courses: GradedCourse[] = graded.map((x) => {
    let finalStatus = x.grade.status;
    if (finalStatus === 'sartli' && gpa !== null) finalStatus = gpa >= g.conditionalGpa ? 'gecti' : 'kaldi';
    return { ...x, finalStatus };
  });

  return {
    term,
    courses,
    gpa,
    gradedWeight: courses.filter((x) => countsForGpa(x.course, x.grade)).reduce((s, x) => s + x.weight, 0),
    totalWeight: courses.reduce((s, x) => s + x.weight, 0),
    earnedWeight: courses.filter((x) => x.finalStatus === 'gecti').reduce((s, x) => s + x.weight, 0),
  };
}

export interface CumulativeSummary {
  terms: TermSummary[];
  gpa: number | null;
  gradedWeight: number;
  earnedWeight: number;
  letterCounts: Record<string, number>;
}

/** Cumulative GPA: for repeated courses (same code) only the latest attempt counts. */
export function summarizeAll(data: AcademicData): CumulativeSummary {
  const terms = data.terms.map((t) => summarizeTerm(data, t));
  const latest = new Map<string, GradedCourse>();
  terms.forEach((ts) =>
    ts.courses.forEach((gc) => {
      if (!countsForGpa(gc.course, gc.grade)) return;
      const key = gc.course.code.trim().toLocaleUpperCase('tr-TR') || gc.course.id;
      latest.set(key, gc); // later terms overwrite earlier attempts
    })
  );
  const counted = [...latest.values()];
  const letterCounts: Record<string, number> = {};
  counted.forEach((gc) => {
    const l = gc.grade.letter as string;
    letterCounts[l] = (letterCounts[l] || 0) + 1;
  });
  return {
    terms,
    gpa: weightedGpa(counted.map((gc) => ({ point: gc.grade.point as number, weight: gc.weight }))),
    gradedWeight: counted.reduce((s, gc) => s + gc.weight, 0),
    earnedWeight: counted.filter((gc) => gc.finalStatus === 'gecti').reduce((s, gc) => s + gc.weight, 0),
    letterCounts,
  };
}

/** Average grade point needed on `upcomingWeight` more credits to reach `target`. */
export function requiredGpaForTarget(
  current: number | null,
  currentWeight: number,
  target: number,
  upcomingWeight: number
): number | null {
  if (upcomingWeight <= 0) return null;
  const needed = (target * (currentWeight + upcomingWeight) - (current ?? 0) * currentWeight) / upcomingWeight;
  return round2(needed);
}

export const STATUS_LABEL: Record<CourseStatus, string> = {
  devam: 'Devam ediyor',
  gecti: 'Geçti',
  sartli: 'Şartlı geçti',
  kaldi: 'Kaldı',
  devamsiz: 'Devamsız',
};

export const ASSESSMENT_LABEL: Record<Assessment['type'], string> = {
  vize: 'Vize / Ara sınav',
  quiz: 'Quiz',
  odev: 'Ödev',
  proje: 'Proje',
  lab: 'Laboratuvar',
  final: 'Final',
  butunleme: 'Bütünleme',
};

// ---------------------------------------------------------------------------
// Exams
// ---------------------------------------------------------------------------

export const EXAM_TYPE_LABEL: Record<ExamType, string> = {
  vize: 'Vize',
  final: 'Final',
  butunleme: 'Bütünleme',
  quiz: 'Quiz',
  proje: 'Proje / Teslim',
  diger: 'Diğer',
};

function dateAt(date: string, time?: string): Date {
  const [y, m, d] = date.split('-').map(Number);
  const [hh, mm] = (time || '00:00').split(':').map(Number);
  return new Date(y, (m || 1) - 1, d || 1, hh || 0, mm || 0);
}

/** Calendar days from today to `date` (0 = today, negative = past). */
export function daysUntil(date: string, now = new Date()): number {
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  return Math.round((dateAt(date).getTime() - today.getTime()) / 86_400_000);
}

export function isExamPast(exam: Exam, now = new Date()): boolean {
  const end = exam.end || exam.start;
  if (!end) return daysUntil(exam.date, now) < 0;
  return dateAt(exam.date, end).getTime() < now.getTime();
}

export function countdownLabel(exam: Exam, now = new Date()): string {
  const days = daysUntil(exam.date, now);
  if (days < 0) return `${-days} gün önce`;
  if (days === 0) {
    if (isExamPast(exam, now)) return 'Bugün yapıldı';
    if (exam.start) {
      const mins = Math.round((dateAt(exam.date, exam.start).getTime() - now.getTime()) / 60_000);
      if (mins <= 0) return 'Şu an';
      if (mins >= 60) return `Bugün, ${Math.floor(mins / 60)} sa ${mins % 60} dk sonra`;
      return `${mins} dk sonra`;
    }
    return 'Bugün';
  }
  if (days === 1) return 'Yarın';
  return `${days} gün kaldı`;
}

export function sortExams(exams: Exam[]): Exam[] {
  return [...exams].sort((a, b) => (a.date + (a.start || '')).localeCompare(b.date + (b.start || '')));
}

/** Upcoming (not yet finished) exams, soonest first. */
export function upcomingExams(exams: Exam[], now = new Date()): Exam[] {
  return sortExams(exams.filter((e) => !isExamPast(e, now)));
}
