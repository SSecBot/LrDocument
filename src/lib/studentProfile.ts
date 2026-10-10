import { z } from 'zod';

export const CLASS_YEARS = [
  { value: 0, label: 'Hazırlık' },
  { value: 1, label: '1. sınıf' },
  { value: 2, label: '2. sınıf' },
  { value: 3, label: '3. sınıf' },
  { value: 4, label: '4. sınıf' },
  { value: 5, label: '5. sınıf' },
  { value: 6, label: '6. sınıf' },
  { value: 7, label: 'Uzatma' },
];

export function classYearLabel(year: number): string {
  return CLASS_YEARS.find((c) => c.value === year)?.label ?? `${year}. sınıf`;
}

/** Turkish university addresses end with .edu.tr (e.g. 123456@ogr.ktu.edu.tr); foreign ones with .edu. */
export function isAcademicEmail(email: string): boolean {
  return /^[^\s@]+@([a-z0-9-]+\.)+edu(\.[a-z]{2})?$/i.test(email.trim());
}

export const studentProfileSchema = z.object({
  university: z.string().trim().min(2, 'Üniversite adı en az 2 karakter olmalıdır.').max(120),
  studentEmail: z
    .string()
    .trim()
    .toLowerCase()
    .max(254)
    .refine(isAcademicEmail, 'Öğrenci e-postası üniversite uzantılı olmalıdır (ör. ad@ogr.ktu.edu.tr).'),
  department: z.string().trim().min(2, 'Bölüm adı en az 2 karakter olmalıdır.').max(120),
  classYear: z.coerce.number().int().min(0).max(7),
  studentNo: z
    .string()
    .trim()
    .max(30)
    .optional()
    .transform((v) => (v ? v : null)),
});

export type StudentProfileInput = z.infer<typeof studentProfileSchema>;

/** Admins use the student pages too; their e-mail does not have to be an academic address. */
export const adminStudentProfileSchema = studentProfileSchema.extend({
  studentEmail: z.string().trim().toLowerCase().max(254).email('Geçerli bir e-posta adresi girin.'),
});
