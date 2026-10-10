import type {
  AcademicData,
  Assessment,
  Course,
  CourseSession,
  GradingSystem,
  LetterGrade,
  SessionKind,
  Term,
} from './types';

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
    'KTÜ’de 30 ve üzeri öğrencili derslerde bağıl değerlendirme uygulanır; kesin harf notu sınıfın not dağılımına göre değişir. Buradaki harf notu mutlak ölçeğe göre tahmindir.',
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
}

export function attendanceStatus(course: Course, grading: GradingSystem): AttendanceKindStatus[] {
  const result: AttendanceKindStatus[] = [];
  const kinds: [SessionKind, number, number][] = [
    ['teori', course.theoryHours, grading.attendanceTheory],
    ['uygulama', course.practiceHours, grading.attendancePractice],
  ];
  for (const [kind, weeklyHours, required] of kinds) {
    if (weeklyHours <= 0) continue;
    const totalHours = weeklyHours * grading.weeksPerTerm;
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
    });
  }
  return result;
}

export function isAttendanceFailed(course: Course, grading: GradingSystem): boolean {
  return attendanceStatus(course, grading).some((s) => s.state === 'over');
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

export function letterForScore(score: number, grading: GradingSystem): LetterGrade {
  const sorted = [...grading.letters].sort((a, b) => b.min - a.min);
  return sorted.find((l) => score >= l.min) ?? sorted[sorted.length - 1];
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
  overrides: Record<string, number | null> = {}
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
  const scale = totalWeight > 0 ? 100 / totalWeight : 1;
  const earnedScaled = earned * scale;
  const average = enteredWeight > 0 ? round2((earned * 100) / enteredWeight) : null;

  const base: Omit<CourseGrade, 'letter' | 'point' | 'status' | 'reason' | 'required'> = {
    average,
    earned: round2(earnedScaled),
    missingWeight,
    totalWeight,
    weightsValid,
    finalScore,
    usedButunleme,
  };

  if (isAttendanceFailed(course, grading)) {
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
    return { ...base, letter: null, point: null, status: 'devam', required: requiredScores(course, grading, base) };
  }

  const raw = round2(earnedScaled);
  let letter: LetterGrade;
  let reason: string | undefined;
  const ff = grading.letters.find((l) => l.letter === 'FF') ?? letterForScore(0, grading);
  if (finalComp && finalScore !== null && finalScore < grading.minFinal) {
    letter = ff;
    reason = `${usedButunleme ? 'Bütünleme' : 'Final'} notu barajın (${grading.minFinal}) altında`;
  } else if (grading.failBelowAverage > 0 && raw < grading.failBelowAverage) {
    letter = ff;
    reason = `Ortalama ${grading.failBelowAverage}’un altında`;
  } else {
    letter = letterForScore(raw, grading);
  }

  return {
    ...base,
    average: raw,
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
  g: Pick<CourseGrade, 'earned' | 'missingWeight' | 'totalWeight'>
): RequiredScore[] {
  if (g.missingWeight <= 0 || g.totalWeight <= 0) return [];
  const finalMissing = course.assessments.some(
    (a) => a.type === 'final' && a.score === null && !course.assessments.some((b) => b.type === 'butunleme' && b.score !== null)
  );
  const missingShare = g.missingWeight / g.totalWeight; // fraction of the grade still open
  const targets = [...grading.letters]
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
    .map((course) => ({ course, grade: computeCourseGrade(course, g), weight: gpaWeight(course, g) }));

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
