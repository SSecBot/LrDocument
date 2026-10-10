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
}

export interface Term {
  id: string;
  name: string;
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
}
