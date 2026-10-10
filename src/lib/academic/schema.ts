import { z } from 'zod';

// Server-side validation for StudentProfile.data. Limits keep a single document small.
const id = z.string().min(1).max(64);
const shortText = (max: number) => z.string().trim().max(max);
const time = z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Saat SS:DD biçiminde olmalı.');
const date = z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-AA-GG biçiminde olmalı.');
const score = z.number().min(0).max(100).nullable();
const kind = z.enum(['teori', 'uygulama']);

const session = z.object({
  id,
  day: z.number().int().min(0).max(6),
  start: time,
  end: time,
  kind,
  room: shortText(40).optional(),
});

const absence = z.object({
  id,
  date,
  hours: z.number().int().min(1).max(12),
  kind,
  note: shortText(200).optional(),
});

const assessment = z.object({
  id,
  name: shortText(60),
  type: z.enum(['vize', 'quiz', 'odev', 'proje', 'lab', 'final', 'butunleme']),
  weight: z.number().min(0).max(100),
  score,
});

const curve = z.object({
  enabled: z.boolean(),
  mode: z.enum(['tscore', 'raw']),
  mean: z.number().min(0).max(100).nullable(),
  stdDev: z.number().min(0).max(100).nullable(),
  autoTable: z.boolean(),
  absoluteAbove: z.number().min(0).max(100),
  boundaries: z.array(z.object({ letter: z.string().trim().min(1).max(3), min: z.number().min(-100).max(200) })).max(15),
});

const exam = z.object({
  id,
  termId: id,
  courseId: id.nullable(),
  title: shortText(120).min(1, 'Sınav adı boş olamaz.'),
  type: z.enum(['vize', 'final', 'butunleme', 'quiz', 'proje', 'diger']),
  date,
  start: time.optional(),
  end: time.optional(),
  room: shortText(60).optional(),
  note: shortText(300).optional(),
  assessmentId: id.nullable().optional(),
});

const course = z.object({
  id,
  termId: id,
  code: shortText(20),
  name: shortText(120).min(1, 'Ders adı boş olamaz.'),
  credit: z.number().min(0).max(30),
  ects: z.number().min(0).max(60),
  instructor: shortText(80).optional(),
  color: z.string().regex(/^#[0-9a-fA-F]{6}$/),
  theoryHours: z.number().int().min(0).max(40),
  practiceHours: z.number().int().min(0).max(40),
  sessions: z.array(session).max(20),
  absences: z.array(absence).max(200),
  assessments: z.array(assessment).max(20),
  manualLetter: z.string().max(3).nullable().optional(),
  excludeFromGpa: z.boolean().optional(),
  curve: curve.nullable().optional(),
  retake: z.object({ reason: z.enum(['not', 'devamsizlik']) }).nullable().optional(),
});

const letter = z.object({
  letter: z.string().trim().min(1).max(3),
  min: z.number().min(0).max(100),
  point: z.number().min(0).max(5),
});

const grading = z.object({
  preset: z.enum(['ktu', 'genel', 'ozel']),
  universityName: shortText(120),
  finalWeight: z.number().min(0).max(100),
  minFinal: z.number().min(0).max(100),
  failBelowAverage: z.number().min(0).max(100),
  attendanceTheory: z.number().min(0).max(100),
  attendancePractice: z.number().min(0).max(100),
  weeksPerTerm: z.number().int().min(1).max(30),
  letters: z.array(letter).min(2).max(15),
  conditionalLetters: z.array(z.string().max(3)).max(10),
  conditionalGpa: z.number().min(0).max(5),
  failingLetters: z.array(z.string().max(3)).max(10),
  gpaBasis: z.enum(['ects', 'credit']),
  relativeNote: shortText(400).optional(),
});

export const academicDataSchema = z.object({
  version: z.literal(1),
  grading,
  terms: z
    .array(
      z.object({
        id,
        name: shortText(40).min(1),
        start: date.optional(),
        end: date.optional(),
        holidays: z.array(z.object({ id, name: shortText(80), start: date, end: date })).max(60).optional(),
      })
    )
    .min(1)
    .max(20),
  activeTermId: id.nullable(),
  courses: z.array(course).max(150),
  targetGpa: z.number().min(0).max(5).nullable().optional(),
  exams: z.array(exam).max(300).optional(),
});

export const MAX_ACADEMIC_JSON_BYTES = 400_000;
