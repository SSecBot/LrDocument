// Data stored as JSON in StudentProfile.data. Keep in sync with the zod schema in ./schema.ts.

export type SessionKind = 'teori' | 'uygulama';

export interface CourseSession {
  id: string;
  /** 0 = Pazartesi … 6 = Pazar */
  day: number;
  /** HH:mm */
  start: string;
  end: string;
  kind: SessionKind;
  room?: string;
}

export interface Absence {
  id: string;
  /** YYYY-MM-DD */
  date: string;
  /** Number of class hours missed */
  hours: number;
  kind: SessionKind;
  note?: string;
}

export type AssessmentType = 'vize' | 'quiz' | 'odev' | 'proje' | 'lab' | 'final' | 'butunleme';

export interface Assessment {
  id: string;
  name: string;
  type: AssessmentType;
  /** Percentage weight in the course grade. Bütünleme takes the final's weight. */
  weight: number;
  /** 0–100, null while not yet announced */
  score: number | null;
}

export interface Course {
  id: string;
  termId: string;
  code: string;
  name: string;
  /** Yerel kredi */
  credit: number;
  ects: number;
  instructor?: string;
  color: string;
  /** Weekly class hours used for attendance limits */
  theoryHours: number;
  practiceHours: number;
  sessions: CourseSession[];
  absences: Absence[];
  assessments: Assessment[];
  /** For completed courses entered only with their transcript letter */
  manualLetter?: string | null;
  /** e.g. non-credit courses (G/K) */
  excludeFromGpa?: boolean;
  /** Instructor's bell curve (bağıl değerlendirme); replaces the letter table for this course */
  curve?: CourseCurve | null;
  /**
   * Alttan alınan ders: why it was failed before. "not" = attendance was already fulfilled, so
   * attendance is not required again; "devamsizlik" = attendance is tracked as usual.
   */
  retake?: { reason: 'not' | 'devamsizlik' } | null;
}

export type CurveMode = 'tscore' | 'raw';

export interface CurveBoundary {
  letter: string;
  /** Minimum T-score (tscore mode) or raw score (raw mode), inclusive */
  min: number;
}

export interface CourseCurve {
  enabled: boolean;
  /**
   * tscore: T = 50 + 10·(HBN − ortalama) / std. sapma, letters from a T-score table
   * raw: the instructor announced raw-score boundaries directly
   */
  mode: CurveMode;
  /** Class average (sınıf ortalaması) */
  mean: number | null;
  stdDev: number | null;
  /** tscore mode: pick the standard table by class average instead of `boundaries` */
  autoTable: boolean;
  /** Above this class average absolute grading applies (0 = never) */
  absoluteAbove: number;
  boundaries: CurveBoundary[];
}

export type ExamType = 'vize' | 'final' | 'butunleme' | 'quiz' | 'proje' | 'diger';

export interface Exam {
  id: string;
  termId: string;
  courseId: string | null;
  title: string;
  type: ExamType;
  /** YYYY-MM-DD */
  date: string;
  /** HH:mm */
  start?: string;
  end?: string;
  room?: string;
  note?: string;
  /** Assessment whose score is entered from the exam list */
  assessmentId?: string | null;
}

export interface Holiday {
  id: string;
  name: string;
  /** YYYY-MM-DD, inclusive */
  start: string;
  end: string;
}

export interface Term {
  id: string;
  name: string;
  /** Academic calendar: first and last day of classes (YYYY-MM-DD). Without it weeksPerTerm is used. */
  start?: string;
  end?: string;
  /** Days without classes (resmî tatiller, ara tatil…) */
  holidays?: Holiday[];
}

export interface LetterGrade {
  letter: string;
  /** Minimum raw score (inclusive) */
  min: number;
  point: number;
}

export interface GradingSystem {
  preset: 'ktu' | 'genel' | 'ozel';
  universityName: string;
  /** Default final weight for new courses (%) */
  finalWeight: number;
  /** Minimum final / bütünleme score; below it the course is failed regardless of average */
  minFinal: number;
  /** Raw average below this is FF regardless of the curve (KTÜ: 30). 0 = disabled */
  failBelowAverage: number;
  /** Required attendance percentages */
  attendanceTheory: number;
  attendancePractice: number;
  weeksPerTerm: number;
  /** Descending by min */
  letters: LetterGrade[];
  /** Letters that pass only if the term GPA reaches conditionalGpa (e.g. DC) */
  conditionalLetters: string[];
  conditionalGpa: number;
  /** Letters that always fail */
  failingLetters: string[];
  /** GPA weighting basis */
  gpaBasis: 'ects' | 'credit';
  /** Relative grading note shown to the user (KTÜ uses curve for big classes) */
  relativeNote?: string;
}

export interface AcademicData {
  version: 1;
  grading: GradingSystem;
  terms: Term[];
  activeTermId: string | null;
  courses: Course[];
  /** Optional target cumulative GPA for planning */
  targetGpa?: number | null;
  exams?: Exam[];
}
