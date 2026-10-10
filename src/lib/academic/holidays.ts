// Official holidays in Türkiye (milli ve dinî bayramlar). Classes are not held on these days;
// on an arife day classes stop at noon.

export interface OfficialHoliday {
  date: string;
  name: string;
  /** Only the afternoon is off (arife) */
  half?: boolean;
  /** Religious holiday computed from the tabular Hijri calendar (not yet in the verified table) */
  estimated?: boolean;
}

const FIXED: [string, string, boolean?][] = [
  ['01-01', 'Yılbaşı'],
  ['04-23', 'Ulusal Egemenlik ve Çocuk Bayramı'],
  ['05-01', 'Emek ve Dayanışma Günü'],
  ['05-19', 'Atatürk’ü Anma, Gençlik ve Spor Bayramı'],
  ['07-15', 'Demokrasi ve Millî Birlik Günü'],
  ['08-30', 'Zafer Bayramı'],
  ['10-28', 'Cumhuriyet Bayramı arifesi', true],
  ['10-29', 'Cumhuriyet Bayramı'],
];

/** First day of Ramazan Bayramı and Kurban Bayramı per Diyanet's calendar. */
const VERIFIED_RELIGIOUS: Record<number, { ramazan: string; kurban: string }> = {
  2025: { ramazan: '2025-03-30', kurban: '2025-06-06' },
  2026: { ramazan: '2026-03-20', kurban: '2026-05-27' },
  2027: { ramazan: '2027-03-09', kurban: '2027-05-16' },
};

const DAY_MS = 86_400_000;

function toIso(d: Date): string {
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}-${String(d.getUTCDate()).padStart(2, '0')}`;
}

function addDays(isoDate: string, days: number): string {
  const [y, m, d] = isoDate.split('-').map(Number);
  return toIso(new Date(Date.UTC(y, m - 1, d) + days * DAY_MS));
}

/** Tabular Islamic calendar → Gregorian (ISO date). Accurate to about ±1 day. */
export function hijriToIso(year: number, month: number, day: number): string {
  const jd = day + Math.ceil(29.5 * (month - 1)) + (year - 1) * 354 + Math.floor((3 + 11 * year) / 30) + 1948439.5 - 1;
  // Julian day → Unix ms (JD 2440587.5 = 1970-01-01T00:00Z)
  return toIso(new Date(Math.round((jd - 2440587.5) * DAY_MS)));
}

function religiousStarts(year: number): { ramazan: string; kurban: string; estimated: boolean } {
  const verified = VERIFIED_RELIGIOUS[year];
  if (verified) return { ...verified, estimated: false };
  // The Hijri year that starts closest to the Gregorian year: find Shawwal 1 / Dhu al-Hijjah 10 inside it.
  const hy = Math.round((year - 622) * (33 / 32));
  const pick = (month: number, day: number) =>
    [hy - 1, hy, hy + 1].map((h) => hijriToIso(h, month, day)).find((d) => d.startsWith(`${year}-`))!;
  return { ramazan: pick(10, 1), kurban: pick(12, 10), estimated: true };
}

export function officialHolidaysForYear(year: number): OfficialHoliday[] {
  const out: OfficialHoliday[] = FIXED.map(([md, name, half]) => ({ date: `${year}-${md}`, name, ...(half ? { half } : {}) }));
  const r = religiousStarts(year);
  const est = r.estimated ? { estimated: true } : {};
  out.push({ date: addDays(r.ramazan, -1), name: 'Ramazan Bayramı arifesi', half: true, ...est });
  for (let i = 0; i < 3; i++) out.push({ date: addDays(r.ramazan, i), name: `Ramazan Bayramı ${i + 1}. gün`, ...est });
  out.push({ date: addDays(r.kurban, -1), name: 'Kurban Bayramı arifesi', half: true, ...est });
  for (let i = 0; i < 4; i++) out.push({ date: addDays(r.kurban, i), name: `Kurban Bayramı ${i + 1}. gün`, ...est });
  return out.sort((a, b) => a.date.localeCompare(b.date));
}

/** Official holidays between two ISO dates (inclusive). A full day wins over an arife on the same date. */
export function officialHolidays(start: string, end: string): OfficialHoliday[] {
  const y1 = Number(start.slice(0, 4));
  const y2 = Math.min(Number(end.slice(0, 4)), y1 + 2);
  const byDate = new Map<string, OfficialHoliday>();
  for (let y = y1; y <= y2; y++) {
    for (const h of officialHolidaysForYear(y)) {
      if (h.date < start || h.date > end) continue;
      const existing = byDate.get(h.date);
      if (!existing || (existing.half && !h.half)) byDate.set(h.date, h);
    }
  }
  return [...byDate.values()].sort((a, b) => a.date.localeCompare(b.date));
}
