import { z } from 'zod';

// Validation messages in Turkish (custom messages in the schemas still take precedence).
z.config(z.locales.tr());

// ---------------------------------------------------------------------------
// System-wide default values. Admins edit them in Yönetici Paneli › Varsayılanlar; the stored
// JSON is merged over these built-in values, so a newly added setting always has a default.
// Everything here is public (prices, rates, defaults) — never put secrets in this object.
// ---------------------------------------------------------------------------

const pct = z.number().min(0).max(100);
const gradingPreset = z.object({
  finalWeight: pct,
  minFinal: pct,
  failBelowAverage: pct,
  attendanceTheory: pct,
  attendancePractice: pct,
  weeksPerTerm: z.number().int().min(1).max(30),
});

export const systemSettingsSchema = z.object({
  pricing: z.object({
    monthly: z.number().int().min(0).max(1_000_000),
    lifetime: z.number().int().min(0).max(1_000_000),
    studentDiscountPercent: pct,
    /** Kurumsal: price per seat as a percentage of the normal price. */
    corporatePercent: pct,
    corporateMinSeats: z.number().int().min(1).max(10_000),
    corporateMaxSeats: z.number().int().min(1).max(10_000),
  }).refine((p) => p.corporateMaxSeats >= p.corporateMinSeats, { message: 'En fazla kişi sayısı en azdan küçük olamaz.', path: ['corporateMaxSeats'] }),
  finance: z.object({
    /** Monthly contractual interest of a loan / credit-card debt, in percent. */
    loanMonthlyInterestRate: z.number().min(0).max(50),
    /** Minimum payment as a percentage of the outstanding balance. */
    loanMinPaymentRate: pct,
    exchangeMarkupTRY: z.number().min(0).max(1000),
    defaultCurrency: z.enum(['TRY', 'USD', 'EUR']),
  }),
  academic: z.object({
    /** From this hour on the overview shows tomorrow's classes. */
    tomorrowFromHour: z.number().int().min(0).max(23),
    defaultCredit: z.number().min(0).max(30),
    defaultEcts: z.number().min(0).max(60),
    ktu: gradingPreset,
    genel: gradingPreset,
  }),
  calendar: z.object({
    defaultEventDurationMinutes: z.number().int().min(5).max(24 * 60),
    defaultEventTime: z.string().regex(/^([01]\d|2[0-3]):[0-5]\d$/),
  }),
  tasks: z.object({
    defaultPriority: z.enum(['yuksek', 'orta', 'dusuk']),
  }),
  security: z.object({
    passwordMinLength: z.number().int().min(8).max(64),
    sessionDays: z.number().int().min(1).max(90),
    /** Accounts must confirm their e-mail with a code before signing in (admins exempt). */
    requireEmailVerification: z.boolean(),
  }),
});

export type SystemSettings = z.infer<typeof systemSettingsSchema>;

export const DEFAULT_SYSTEM_SETTINGS: SystemSettings = {
  pricing: { monthly: 100, lifetime: 1999, studentDiscountPercent: 50, corporatePercent: 75, corporateMinSeats: 2, corporateMaxSeats: 500 },
  finance: { loanMonthlyInterestRate: 3.75, loanMinPaymentRate: 20, exchangeMarkupTRY: 2.5, defaultCurrency: 'TRY' },
  academic: {
    tomorrowFromHour: 17,
    defaultCredit: 3,
    defaultEcts: 5,
    ktu: { finalWeight: 50, minFinal: 45, failBelowAverage: 30, attendanceTheory: 70, attendancePractice: 80, weeksPerTerm: 14 },
    genel: { finalWeight: 60, minFinal: 50, failBelowAverage: 0, attendanceTheory: 70, attendancePractice: 80, weeksPerTerm: 14 },
  },
  calendar: { defaultEventDurationMinutes: 30, defaultEventTime: '10:00' },
  tasks: { defaultPriority: 'orta' },
  security: { passwordMinLength: 8, sessionDays: 30, requireEmailVerification: true },
};

type Plain = Record<string, unknown>;
const isPlain = (v: unknown): v is Plain => !!v && typeof v === 'object' && !Array.isArray(v);

function deepMerge(base: Plain, over: unknown): Plain {
  if (!isPlain(over)) return base;
  const out: Plain = { ...base };
  for (const key of Object.keys(base)) {
    if (!(key in over)) continue;
    out[key] = isPlain(base[key]) ? deepMerge(base[key] as Plain, over[key]) : over[key];
  }
  return out;
}

/**
 * Built-in defaults overlaid with stored values. Invalid stored values fall back group by group,
 * so one bad field never breaks the whole app.
 */
export function resolveSystemSettings(stored: unknown): SystemSettings {
  const merged = deepMerge(DEFAULT_SYSTEM_SETTINGS as unknown as Plain, stored);
  const parsed = systemSettingsSchema.safeParse(merged);
  if (parsed.success) return parsed.data;
  const result = { ...DEFAULT_SYSTEM_SETTINGS } as Plain;
  for (const key of Object.keys(systemSettingsSchema.shape) as (keyof SystemSettings)[]) {
    const group = systemSettingsSchema.shape[key].safeParse(merged[key]);
    if (group.success) result[key] = group.data;
  }
  return result as SystemSettings;
}
