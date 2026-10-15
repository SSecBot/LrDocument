import { z } from 'zod';
import type { AcademicData, Holiday, Term } from './types';
import { holidaySchema } from './schema';
import { newId } from './grading';
import { fold } from './scheduleParser';

// ---------------------------------------------------------------------------
// University calendars published by an admin (UniversityCalendar). Every student of that university
// gets the term dates, exam weeks and holidays in Ders Takibi without uploading anything.
// ---------------------------------------------------------------------------

export interface SchoolTerm {
  id: string;
  /** "2026-2027 Güz" — matched to the student's term of the same name */
  name: string;
  start?: string;
  end?: string;
  holidays: Holiday[];
}

export interface SchoolCalendar {
  universityId: string;
  terms: SchoolTerm[];
  sourceUrl: string | null;
  updatedAt: string;
}

/** A real calendar day (2026-02-30 is rejected). */
const date = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Tarih YYYY-AA-GG biçiminde olmalı.')
  .refine((s) => {
    const d = new Date(`${s}T00:00:00Z`);
    return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s;
  }, 'Geçersiz tarih.');
const dated = <T extends { start: string; end: string }>(h: T) => h.end >= h.start;

export const schoolTermsSchema = z
  .array(
    z
      .object({
        id: z.string().min(1).max(64),
        name: z.string().trim().min(1, 'Dönem adı boş olamaz.').max(40),
        start: date.optional(),
        end: date.optional(),
        holidays: z
          .array(holidaySchema.extend({ start: date, end: date }).refine(dated, 'Tatil bitişi başlangıçtan önce olamaz.'))
          .max(60)
          .default([]),
      })
      .refine((t) => !t.start || !t.end || t.start <= t.end, 'Dönem bitişi başlangıçtan önce olamaz.')
  )
  .max(12);

const norm = (s: string) => fold(s).replace(/[^a-z0-9]/g, '');

/** Holidays as stored in the student's term: marked as coming from the school, ids kept stable. */
function schoolHolidays(t: SchoolTerm): Holiday[] {
  return t.holidays.map((h) => ({ id: `s${h.id}`.slice(0, 64), name: h.name, start: h.start, end: h.end, ...(h.half ? { half: true } : {}), ...(h.kind ? { kind: h.kind } : {}), school: true }));
}

/**
 * Brings the school's calendar into the student's data. A term with the same name (or one filled
 * from the same school term before) gets the dates; school terms that are still running or ahead are
 * added. Terms whose dates the student changed by hand (no `school` marker) are left alone.
 */
export function applySchoolCalendar(data: AcademicData, cal: SchoolCalendar, today: string): { data: AcademicData; changed: boolean } {
  let terms = [...data.terms];
  let changed = false;
  for (const st of cal.terms) {
    if (!st.start || !st.end) continue;
    const marker = { uni: cal.universityId, term: st.id, at: cal.updatedAt };
    const idx = terms.findIndex((t) => (t.school?.uni === cal.universityId && t.school.term === st.id) || norm(t.name) === norm(st.name));
    if (idx >= 0) {
      const t = terms[idx];
      const manual = t.school === undefined || t.school === null;
      // Hand-entered dates win; an empty term (no dates yet) is filled.
      if (manual && (t.start || t.end)) continue;
      if (t.school && t.school.uni === marker.uni && t.school.term === marker.term && t.school.at === marker.at) continue;
      terms[idx] = {
        ...t,
        start: st.start,
        end: st.end,
        holidays: [...(t.holidays ?? []).filter((h) => !h.school), ...schoolHolidays(st)].slice(0, 60),
        school: marker,
      };
      changed = true;
    } else if (st.end >= today && terms.length < 20) {
      const term: Term = { id: newId(), name: st.name, start: st.start, end: st.end, holidays: schoolHolidays(st), school: marker };
      terms.push(term);
      changed = true;
    }
  }
  if (!changed) return { data, changed };
  if (terms.every((t) => t.start)) terms = [...terms].sort((a, b) => a.start!.localeCompare(b.start!));
  // The active term follows the calendar when the student is still on an empty placeholder term.
  let activeTermId = data.activeTermId;
  const active = terms.find((t) => t.id === activeTermId);
  if (active && !active.start && !data.courses.some((c) => c.termId === active.id)) {
    const running = terms.find((t) => t.start && t.end && t.start <= today && today <= t.end) ?? terms.find((t) => t.start && t.start >= today);
    if (running) activeTermId = running.id;
  }
  return { data: { ...data, terms, activeTermId }, changed: true };
}
