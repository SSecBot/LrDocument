// Extracts term dates from the text of a university academic calendar ("akademik takvim").
// Input is one string per table row, in reading order (from the PDF text layer or OCR).
// Tuned for Turkish calendars such as KTÜ's: "21 Eylül 2026 | GÜZ YARIYILI DERSLERİNİN BAŞLAMASI".

import { fold } from './scheduleParser';

export interface DateRange {
  start: string;
  end: string;
}

export type TermKey = 'guz' | 'bahar' | 'yaz';

export interface ParsedCalendarTerm {
  key: TermKey;
  label: string;
  /** First day of classes */
  start?: string;
  /** Last day of classes */
  end?: string;
  /** Mid-term exam weeks: no classes */
  examWeeks: DateRange[];
  finals?: DateRange;
  makeup?: DateRange;
}

export interface ParsedCalendar {
  terms: ParsedCalendarTerm[];
}

const MONTHS = ['ocak', 'subat', 'mart', 'nisan', 'mayis', 'haziran', 'temmuz', 'agustos', 'eylul', 'ekim', 'kasim', 'aralik'];
export const TERM_LABEL: Record<TermKey, string> = { guz: 'Güz', bahar: 'Bahar', yaz: 'Yaz okulu' };

function levenshtein(a: string, b: string): number {
  const dp = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) dp[0][j] = j;
  for (let i = 1; i <= a.length; i++)
    for (let j = 1; j <= b.length; j++)
      dp[i][j] = Math.min(dp[i - 1][j] + 1, dp[i][j - 1] + 1, dp[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return dp[a.length][b.length];
}

/** Month number (1–12) for a folded word, tolerating one OCR error ("emmuz" → temmuz). */
function monthOf(word: string): number | null {
  const w = word.replace(/[^a-z]/g, '');
  if (w.length < 3) return null;
  const exact = MONTHS.indexOf(w);
  if (exact >= 0) return exact + 1;
  if (w.length < 4) return null;
  const close = MONTHS.map((m, i) => ({ i, d: levenshtein(w, m) })).filter((x) => x.d <= 1);
  return close.length === 1 ? close[0].i + 1 : null;
}

/** OCR often reads 0 as O/D and 1 as l/I in day numbers ("O4", "Ol"). */
function dayOf(token: string): number | null {
  const t = token.replace(/[OoDQ]/g, '0').replace(/[lIi|]/g, '1').replace(/S/g, '5');
  if (!/^\d{1,2}$/.test(t)) return null;
  const n = Number(t);
  return n >= 1 && n <= 31 ? n : null;
}

const iso = (y: number, m: number, d: number) => `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

const DAY = String.raw`([0-9OoDQlIi|S]{1,2})`;
const WORD = String.raw`([A-Za-zÇĞİÖŞÜçğıöşü]{3,})`;
const SEP = String.raw`\s*[-–—]\s*`;
const YEAR = String.raw`(\d{4})`;

/**
 * First date or date range at the start of a row. A missing year (wrapped onto the next line by
 * the table) is taken from `nextLine`, else from `contextYear` (the previous row's year).
 */
export function parseDateRange(text: string, nextLine = '', contextYear: number | null = null): DateRange | null {
  const t = text.trim();
  const yearFrom = (y: string | undefined) => {
    if (y) return Number(y);
    const m = nextLine.trim().match(/^(\d{4})\b/);
    return m ? Number(m[1]) : contextYear;
  };
  // 28 Eylül - 02 Ekim 2026
  let m = t.match(new RegExp(`^${DAY}\\s+${WORD}${SEP}${DAY}\\s+${WORD}(?:\\s+${YEAR})?`));
  if (m) {
    const [d1, m1, d2, m2] = [dayOf(m[1]), monthOf(fold(m[2])), dayOf(m[3]), monthOf(fold(m[4]))];
    const y2 = yearFrom(m[5]);
    if (d1 && m1 && d2 && m2 && y2) {
      const y1 = m1 > m2 ? y2 - 1 : y2;
      return { start: iso(y1, m1, d1), end: iso(y2, m2, d2) };
    }
  }
  // 16-22 Kasım 2026
  m = t.match(new RegExp(`^${DAY}${SEP}${DAY}\\s+${WORD}(?:\\s+${YEAR})?`));
  if (m) {
    const [d1, d2, mo] = [dayOf(m[1]), dayOf(m[2]), monthOf(fold(m[3]))];
    const y = yearFrom(m[4]);
    if (d1 && d2 && mo && y && d2 >= d1) return { start: iso(y, mo, d1), end: iso(y, mo, d2) };
  }
  // 21 Eylül 2026
  m = t.match(new RegExp(`^${DAY}\\s+${WORD}(?:\\s+${YEAR})?`));
  if (m) {
    const [d, mo] = [dayOf(m[1]), monthOf(fold(m[2]))];
    const y = yearFrom(m[3]);
    if (d && mo && y) return { start: iso(y, mo, d), end: iso(y, mo, d) };
  }
  return null;
}

function termKeyIn(f: string): TermKey | null {
  if (/\bguz\b/.test(f)) return 'guz';
  if (/\bbahar\b/.test(f)) return 'bahar';
  if (/\byaz (okulu|donemi)\b/.test(f)) return 'yaz';
  return null;
}

export function parseAcademicCalendar(rows: string[]): ParsedCalendar {
  const terms = new Map<TermKey, ParsedCalendarTerm>();
  const termFor = (key: TermKey) => {
    if (!terms.has(key)) terms.set(key, { key, label: TERM_LABEL[key], examWeeks: [] });
    return terms.get(key)!;
  };
  let section: TermKey | null = null;
  let contextYear: number | null = null;

  rows.forEach((row, i) => {
    const f = fold(row).replace(/\s+/g, ' ');
    const range = parseDateRange(row, rows[i + 1] ?? '', contextYear);
    if (range) contextYear = Number(range.end.slice(0, 4));
    // Section headings: "GÜZ YARIYILI" / "BAHAR YARIYILI" without a date.
    if (!range && /^(guz|bahar) yariyili\s*$/.test(f.trim())) {
      section = termKeyIn(f);
      return;
    }
    if (/yaz okulu/.test(f) && !range) section = 'yaz';
    // Only trust a date on the same row: an unreadable cell is better left empty than guessed.
    const date = range;
    if (!date) return;
    const key = termKeyIn(f) ?? section;
    if (!key) return;
    const t = termFor(key);

    if (/derslerin(in)? baslama/.test(f)) t.start = date.start;
    else if (/derslerin(in)? son gunu|derslerin sona ermesi/.test(f)) t.end = date.end;
    else if (/ara sinav/.test(f)) {
      if (!t.examWeeks.some((w) => w.start === date.start)) t.examWeeks.push(date);
    } else if (/yariyil sonu sinav|final sinav/.test(f)) t.finals = date;
    else if (/butunleme sinavlari/.test(f)) t.makeup = date;
  });

  return { terms: [...terms.values()].filter((t) => t.start || t.end || t.examWeeks.length > 0) };
}
