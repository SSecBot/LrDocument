// Heuristic timetable extraction from the text layer of a schedule PDF.
// Works on positioned text items only (no OCR), so scanned PDFs are not supported.
// Handles the common layouts of Turkish university timetables:
//  - grid with days as columns and hours as rows (most faculty programs)
//  - transposed grid with days as rows and hours as columns
//  - list/table rows such as "MAT1001 Matematik I  Pazartesi 08:15-10:00 D-201"

import type { SessionKind } from './types';

export interface PdfTextItem {
  str: string;
  /** Left edge, top-down page coordinates (pt) */
  x: number;
  /** Baseline, top-down page coordinates (pt) */
  y: number;
  w: number;
  h: number;
  page: number;
}

export interface ParsedSession {
  day: number;
  start: string;
  end: string;
  kind: SessionKind;
  room?: string;
}

export interface ParsedCourse {
  code: string;
  name: string;
  instructor?: string;
  sessions: ParsedSession[];
}

export interface ParseResult {
  courses: ParsedCourse[];
  layout: 'grid' | 'transposed' | 'list' | 'none';
  warnings: string[];
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

export function fold(s: string): string {
  return s
    .replace(/İ/g, 'i')
    .replace(/I/g, 'ı')
    .toLocaleLowerCase('tr-TR')
    .replace(/ı/g, 'i')
    .replace(/ç/g, 'c')
    .replace(/ğ/g, 'g')
    .replace(/ö/g, 'o')
    .replace(/ş/g, 's')
    .replace(/ü/g, 'u')
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '');
}

const DAY_FULL: [string, number][] = [
  ['pazartesi', 0],
  ['sali', 1],
  ['carsamba', 2],
  ['persembe', 3],
  ['cumartesi', 5],
  ['cuma', 4],
  ['pazar', 6],
  ['monday', 0],
  ['tuesday', 1],
  ['wednesday', 2],
  ['thursday', 3],
  ['friday', 4],
  ['saturday', 5],
  ['sunday', 6],
];

const DAY_ABBR: Record<string, number> = {
  pzt: 0, pts: 0, pt: 0, sal: 1, sl: 1, car: 2, crs: 2, crsb: 2, per: 3, prs: 3, prsb: 3, cum: 4, cm: 4,
  cmt: 5, cts: 5, paz: 6, pz: 6, mon: 0, tue: 1, wed: 2, thu: 3, fri: 4, sat: 5, sun: 6,
};

/** Day index when the whole string is a day name or abbreviation (header cells). */
export function dayOfLabel(str: string): number | null {
  const f = fold(str).replace(/[^a-z]/g, '');
  if (!f) return null;
  for (const [name, idx] of DAY_FULL) if (f === name) return idx;
  return f in DAY_ABBR ? DAY_ABBR[f] : null;
}

/** First full day name appearing anywhere in the string. */
export function dayInText(str: string): number | null {
  const f = ` ${fold(str).replace(/[^a-z]+/g, ' ')} `;
  let best: { idx: number; day: number } | null = null;
  for (const [name, day] of DAY_FULL) {
    const idx = f.indexOf(` ${name} `);
    if (idx >= 0 && (!best || idx < best.idx)) best = { idx, day };
  }
  return best?.day ?? null;
}

const TIME_RE = /(?<![\d])([01]?\d|2[0-3])[:.]([0-5]\d)(?![\d])/g;

export function timesIn(str: string): string[] {
  const out: string[] = [];
  for (const m of str.matchAll(TIME_RE)) out.push(`${m[1].padStart(2, '0')}:${m[2]}`);
  return out;
}

const CODE_RE = /(?<![A-Za-zÇĞİÖŞÜçğıöşü0-9])([A-ZÇĞİÖŞÜ]{2,6})[\s-]?(\d{3,4}[A-Z]?)(?![0-9])/g;

export function codesIn(str: string): string[] {
  const out: string[] = [];
  for (const m of str.matchAll(CODE_RE)) {
    const code = `${m[1]}${m[2]}`;
    if (!out.includes(code)) out.push(code);
  }
  return out;
}

function stripCodes(str: string): string {
  return str.replace(CODE_RE, ' ');
}

const INSTRUCTOR_RE = /\b(prof|doc|dr|ogr|ars|gor|okt|uzm|instructor|lecturer)\b\.?/;
const ROOM_RE = /^(?:[A-ZÇĞİÖŞÜ]{1,4}[-\s.]?\d{1,4}[A-Z]?(?:[-.]\d{1,3})?|(?:AMF[İI]?|AMPH[İI]|LAB|DERSL[İI]K|SALON|SINIF|D)\s?[-.]?\s?[\w-]{0,6})$/i;
const KIND_U_RE = /(\(u\)|\buyg|\buygulama|\blab\b|\blaboratuvar|\bpratik)/;
const KIND_T_RE = /(\(t\)|\bteori)/;

function minutes(t: string): number {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
}

function hhmm(total: number): string {
  const h = Math.floor(total / 60) % 24;
  const m = total % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

function cleanSegment(s: string): string {
  return s
    .replace(/\s+/g, ' ')
    .replace(/^[\s\-–—|/,;:.()[\]]+|[\s\-–—|/,;:([\]]+$/g, '')
    .trim();
}

interface Segments {
  name?: string;
  instructor?: string;
  room?: string;
}

/** Splits cell or line text into course name / instructor / room guesses. */
function classifySegments(segments: string[]): Segments {
  const result: Segments = {};
  let bestName = '';
  for (const raw of segments) {
    for (const part of raw.split(/\s{2,}|\s[|/]\s|\n/)) {
      let s = cleanSegment(stripCodes(part).replace(TIME_RE, ' ').replace(/[-–—]\s*$/, ''));
      if (!s) continue;
      const f = fold(s);
      if (dayOfLabel(s) !== null) continue;
      if (/^\(?[tu]\)?$/.test(f) || /^(teori|uygulama|uyg\.?|lab\.?)$/.test(f)) continue;
      if (INSTRUCTOR_RE.test(f)) {
        if (!result.instructor) result.instructor = s.slice(0, 80);
        continue;
      }
      if (s.length <= 14 && ROOM_RE.test(s)) {
        if (!result.room) result.room = s.slice(0, 40);
        continue;
      }
      s = s.replace(/\((?:t|u|teori|uygulama|uyg\.?|lab)\)/gi, '').trim();
      const letters = (s.match(/[A-Za-zÇĞİÖŞÜçğıöşü]/g) || []).length;
      if (letters < 3) continue;
      if (letters > (bestName.match(/[A-Za-zÇĞİÖŞÜçğıöşü]/g) || []).length) bestName = s;
    }
  }
  if (bestName) result.name = bestName.slice(0, 120);
  return result;
}

function kindOf(text: string): SessionKind {
  const f = fold(text);
  if (KIND_U_RE.test(f) && !KIND_T_RE.test(f)) return 'uygulama';
  return 'teori';
}

// ---------------------------------------------------------------------------
// Geometry helpers
// ---------------------------------------------------------------------------

const cx = (i: PdfTextItem) => i.x + i.w / 2;
const cy = (i: PdfTextItem) => i.y - i.h / 2;

function median(values: number[]): number {
  if (values.length === 0) return 0;
  const s = [...values].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
}

interface Line {
  y: number;
  items: PdfTextItem[];
  text: string;
}

function groupLines(items: PdfTextItem[]): Line[] {
  const sorted = [...items].sort((a, b) => a.y - b.y || a.x - b.x);
  const lines: { y: number; items: PdfTextItem[] }[] = [];
  for (const it of sorted) {
    const tol = Math.max(2, it.h * 0.45);
    const line = lines.find((l) => Math.abs(l.y - it.y) <= tol);
    if (line) line.items.push(it);
    else lines.push({ y: it.y, items: [it] });
  }
  return lines
    .map((l) => {
      const its = l.items.sort((a, b) => a.x - b.x);
      // Join with a double space where there is a visible gap, so columns stay separable.
      let text = '';
      its.forEach((it, i) => {
        if (i > 0) {
          const prev = its[i - 1];
          const gap = it.x - (prev.x + prev.w);
          text += gap > Math.max(6, it.h * 0.9) ? '  ' : gap > 0.5 ? ' ' : '';
        }
        text += it.str;
      });
      return { y: l.y, items: its, text: text.trim() };
    })
    .sort((a, b) => a.y - b.y);
}

/** Bands between consecutive centers: [lo, hi] for each center. */
function bands(centers: number[]): [number, number][] {
  return centers.map((c, i) => {
    const prev = centers[i - 1];
    const next = centers[i + 1];
    const lo = prev !== undefined ? (prev + c) / 2 : next !== undefined ? c - (next - c) / 2 : c - 20;
    const hi = next !== undefined ? (c + next) / 2 : prev !== undefined ? c + (c - prev) / 2 : c + 20;
    return [lo, hi];
  });
}

function bandIndex(value: number, b: [number, number][]): number {
  return b.findIndex(([lo, hi]) => value >= lo && value < hi);
}

// ---------------------------------------------------------------------------
// Grid layouts
// ---------------------------------------------------------------------------

interface Slot {
  center: number;
  start: string;
  end: string | null;
}

interface Run {
  key: string;
  code: string;
  day: number;
  first: number;
  last: number;
  texts: string[];
}

function buildSlots(timeItems: PdfTextItem[], axis: (i: PdfTextItem) => number): Slot[] {
  const sorted = [...timeItems].sort((a, b) => axis(a) - axis(b));
  const groups: { center: number; items: PdfTextItem[] }[] = [];
  for (const it of sorted) {
    const g = groups[groups.length - 1];
    if (g && Math.abs(axis(it) - g.center) <= Math.max(4, it.h * 1.6) && timesIn(g.items.map((x) => x.str).join(' ')).length < 2) {
      g.items.push(it);
      g.center = g.items.reduce((s, x) => s + axis(x), 0) / g.items.length;
    } else {
      groups.push({ center: axis(it), items: [it] });
    }
  }
  const slots: Slot[] = [];
  for (const g of groups) {
    const t = timesIn(g.items.sort((a, b) => a.y - b.y || a.x - b.x).map((x) => x.str).join(' '));
    if (t.length === 0) continue;
    slots.push({ center: g.center, start: t[0], end: t.length > 1 && minutes(t[1]) > minutes(t[0]) ? t[1] : null });
  }
  // Fill missing end times from the next slot (or assume a 50-minute class hour).
  slots.forEach((s, i) => {
    if (s.end) return;
    const next = slots[i + 1];
    const gap = next ? minutes(next.start) - minutes(s.start) : 0;
    s.end = gap > 0 && gap <= 70 ? next!.start : hhmm(minutes(s.start) + 50);
  });
  // Drop slots that are out of order (e.g. stray times in a legend).
  return slots.filter((s, i) => i === 0 || minutes(s.start) > minutes(slots[i - 1].start));
}

function parseGrid(
  items: PdfTextItem[],
  dayItems: PdfTextItem[],
  transposed: boolean,
  warnings: string[]
): { runs: Run[]; slots: Slot[]; used: PdfTextItem[] } {
  // Day axis: x for the normal layout (days are columns), y for the transposed one.
  const dayPos = transposed ? cy : cx;
  const slotPos = transposed ? cx : cy;
  const byDay = new Map<number, number>();
  for (const it of dayItems) {
    const d = dayOfLabel(it.str)!;
    if (!byDay.has(d)) byDay.set(d, dayPos(it));
  }
  const dayList = [...byDay.entries()].sort((a, b) => a[1] - b[1]);
  const dayBands = bands(dayList.map(([, p]) => p));
  const headerEdge = transposed ? Math.max(...dayItems.map((i) => i.x + i.w)) : Math.max(...dayItems.map((i) => i.y));
  const firstDayLo = dayBands[0][0];

  // Time labels live outside the day bands: left of the first column, or above the first row.
  const timeItems = items.filter((it) => {
    if (timesIn(it.str).length === 0) return false;
    return transposed ? cy(it) < firstDayLo && cx(it) > headerEdge - 2 : cx(it) < firstDayLo && it.y > headerEdge;
  });
  const slots = buildSlots(timeItems, slotPos);
  if (slots.length < 2) {
    warnings.push('Tabloda saat satırları bulunamadı.');
    return { runs: [], slots: [], used: [] };
  }
  const slotBands = bands(slots.map((s) => s.center));
  const timeSet = new Set(timeItems);
  const daySet = new Set(dayItems);

  // Bucket every remaining item into (day, slot) cells.
  const cells = new Map<string, PdfTextItem[]>();
  for (const it of items) {
    if (timeSet.has(it) || daySet.has(it) || !it.str.trim()) continue;
    const di = bandIndex(dayPos(it), dayBands);
    if (di < 0) continue;
    if (transposed ? it.x + it.w <= headerEdge : it.y <= headerEdge) continue;
    // A text item covers the slots its extent overlaps substantially (merged multi-hour cells).
    const lo = transposed ? it.x : it.y - it.h;
    const hi = transposed ? it.x + it.w : it.y;
    const covered: number[] = [];
    slotBands.forEach(([a, b], k) => {
      const overlap = Math.min(hi, b) - Math.max(lo, a);
      if (overlap > 0 && overlap >= (hi - lo) * 0.3) covered.push(k);
    });
    if (covered.length === 0) {
      const k = bandIndex(slotPos(it), slotBands);
      if (k >= 0) covered.push(k);
    }
    for (const k of covered) {
      const key = `${dayList[di][0]}:${k}`;
      if (!cells.has(key)) cells.set(key, []);
      cells.get(key)!.push(it);
    }
  }

  const cellText = (list: PdfTextItem[]) => groupLines(list).map((l) => l.text).join('\n');
  const allTexts = [...cells.values()].map(cellText);
  const useCodes = allTexts.filter((t) => codesIn(t).length > 0).length >= 2;

  const runs: Run[] = [];
  for (const [day] of dayList) {
    const active = new Map<string, Run>();
    for (let k = 0; k < slots.length; k++) {
      const list = cells.get(`${day}:${k}`);
      const text = list ? cellText(list) : '';
      if (!text.trim()) {
        active.clear();
        continue;
      }
      let keys: { key: string; code: string }[];
      if (useCodes) {
        const codes = codesIn(text);
        if (codes.length === 0) {
          // Text without a code right below a coded cell: rest of a merged multi-hour cell.
          if (active.size > 0) {
            for (const run of active.values()) {
              run.last = k;
              run.texts.push(text);
            }
          }
          continue;
        }
        keys = codes.map((c) => ({ key: c, code: c }));
      } else {
        const first = fold(text.split('\n')[0]).replace(/[^a-z0-9]+/g, ' ').trim();
        if (!first) continue;
        keys = [{ key: first, code: '' }];
      }
      const next = new Map<string, Run>();
      for (const { key, code } of keys) {
        const existing = active.get(key);
        if (existing && existing.last === k - 1) {
          existing.last = k;
          existing.texts.push(text);
          next.set(key, existing);
        } else {
          const run: Run = { key, code, day, first: k, last: k, texts: [text] };
          runs.push(run);
          next.set(key, run);
        }
      }
      active.clear();
      next.forEach((v, key) => active.set(key, v));
    }
  }

  const used = [...timeItems, ...dayItems, ...[...cells.values()].flat()];
  return { runs, slots, used };
}

// ---------------------------------------------------------------------------
// List layout
// ---------------------------------------------------------------------------

interface ListEntry {
  key: string;
  code: string;
  day: number;
  start: string;
  end: string;
  text: string;
}

function parseList(lines: Line[]): ListEntry[] {
  const entries: ListEntry[] = [];
  let currentDay: number | null = null;
  for (const line of lines) {
    const header = dayOfLabel(line.text);
    if (header !== null) {
      currentDay = header;
      continue;
    }
    const times = timesIn(line.text);
    const day = dayInText(line.text) ?? currentDay;
    if (day === null || times.length < 1) continue;
    const start = times[0];
    let end = times[1] && minutes(times[1]) > minutes(start) ? times[1] : null;
    if (!end) end = hhmm(minutes(start) + 50);
    const code = codesIn(line.text)[0] ?? '';
    const seg = classifySegments(line.items.map((i) => i.str).concat(line.text.split(/\s{2,}/)));
    const key = code || (seg.name ? fold(seg.name) : '');
    if (!key) continue;
    entries.push({ key, code, day, start, end, text: line.text });
  }
  return entries;
}

// ---------------------------------------------------------------------------
// Legend: "MAT1001  Matematik I  3  0  3  5  Dr. ..." lines outside the grid
// ---------------------------------------------------------------------------

function legendNames(lines: Line[]): Map<string, Segments> {
  const map = new Map<string, Segments>();
  for (const line of lines) {
    const codes = codesIn(line.text);
    if (codes.length !== 1 || timesIn(line.text).length > 0 || dayInText(line.text) !== null) continue;
    // Legend rows start with the course code.
    if (codesIn(line.items[0]?.str ?? '')[0] !== codes[0]) continue;
    const seg = classifySegments(line.text.split(/\s{2,}/));
    if (seg.name && !map.has(codes[0])) map.set(codes[0], seg);
  }
  return map;
}

// ---------------------------------------------------------------------------
// Entry point
// ---------------------------------------------------------------------------

function mergeSessions(sessions: ParsedSession[]): ParsedSession[] {
  const sorted = [...sessions].sort((a, b) => a.day - b.day || a.start.localeCompare(b.start));
  const out: ParsedSession[] = [];
  for (const s of sorted) {
    const prev = out[out.length - 1];
    if (
      prev &&
      prev.day === s.day &&
      prev.kind === s.kind &&
      minutes(s.start) >= minutes(prev.start) &&
      minutes(s.start) - minutes(prev.end) <= 20 &&
      (!prev.room || !s.room || prev.room === s.room)
    ) {
      if (minutes(s.end) > minutes(prev.end)) prev.end = s.end;
      prev.room = prev.room || s.room;
    } else {
      out.push({ ...s });
    }
  }
  return out;
}

function findDayHeader(items: PdfTextItem[]): { items: PdfTextItem[]; transposed: boolean } | null {
  const dayItems = items.filter((i) => dayOfLabel(i.str) !== null);
  if (dayItems.length < 3) return null;
  // Horizontal header: ≥3 distinct days on (roughly) the same baseline.
  const lines = groupLines(dayItems);
  const best = lines
    .map((l) => ({ l, days: new Set(l.items.map((i) => dayOfLabel(i.str))) }))
    .sort((a, b) => b.days.size - a.days.size)[0];
  if (best && best.days.size >= 3) {
    const seen = new Set<number>();
    return {
      items: best.l.items.filter((i) => {
        const d = dayOfLabel(i.str)!;
        if (seen.has(d)) return false;
        seen.add(d);
        return true;
      }),
      transposed: false,
    };
  }
  // Vertical header: ≥3 distinct days stacked in the same column.
  const leftMost = median(dayItems.map((i) => i.x));
  const column = dayItems.filter((i) => Math.abs(i.x - leftMost) < 25 || Math.abs(cx(i) - median(dayItems.map(cx))) < 25);
  const seen = new Set<number>();
  const unique = column
    .sort((a, b) => a.y - b.y)
    .filter((i) => {
      const d = dayOfLabel(i.str)!;
      if (seen.has(d)) return false;
      seen.add(d);
      return true;
    });
  return unique.length >= 3 ? { items: unique, transposed: true } : null;
}

export function parseSchedule(allItems: PdfTextItem[]): ParseResult {
  const warnings: string[] = [];
  const items = allItems.filter((i) => i.str.trim().length > 0);
  if (items.length === 0) {
    return { courses: [], layout: 'none', warnings: ['PDF’te okunabilir metin yok (taranmış görüntü olabilir).'] };
  }

  const pages = [...new Set(items.map((i) => i.page))].sort((a, b) => a - b);
  const used = new Set<PdfTextItem>();
  const gridWarnings: string[] = [];

  type Collected = { code: string; key: string; session: ParsedSession; texts: string[] };
  const collected: Collected[] = [];
  let layout: ParseResult['layout'] = 'none';

  for (const page of pages) {
    const pageItems = items.filter((i) => i.page === page);
    const header = findDayHeader(pageItems);
    if (header) {
      const grid = parseGrid(pageItems, header.items, header.transposed, gridWarnings);
      const { runs, slots } = grid;
      if (runs.length > 0) {
        grid.used.forEach((i) => used.add(i));
        layout = header.transposed ? 'transposed' : 'grid';
        for (const r of runs) {
          const text = r.texts.join('\n');
          collected.push({
            code: r.code,
            key: r.key,
            texts: r.texts,
            session: {
              day: r.day,
              start: slots[r.first].start,
              end: slots[r.last].end!,
              kind: kindOf(text),
              room: classifySegments(text.split('\n')).room,
            },
          });
        }
        continue;
      }
    }
    const entries = parseList(groupLines(pageItems));
    if (entries.length > 0 && layout === 'none') layout = 'list';
    for (const e of entries) {
      collected.push({
        code: e.code,
        key: e.key,
        texts: [e.text],
        session: { day: e.day, start: e.start, end: e.end, kind: kindOf(e.text), room: classifySegments(e.text.split(/\s{2,}/)).room },
      });
    }
  }

  if (collected.length === 0) warnings.push(...new Set(gridWarnings));

  // Course names from a legend table outside the timetable grid.
  const legend = legendNames(pages.flatMap((p) => groupLines(items.filter((i) => i.page === p && !used.has(i)))));

  // Group sessions into courses.
  const byKey = new Map<string, Collected[]>();
  for (const c of collected) {
    if (!byKey.has(c.key)) byKey.set(c.key, []);
    byKey.get(c.key)!.push(c);
  }

  const courses: ParsedCourse[] = [];
  for (const [, list] of byKey) {
    const code = list[0].code;
    const fromLegend = code ? legend.get(code) : undefined;
    const fromCells = classifySegments(list.flatMap((c) => c.texts.flatMap((t) => t.split('\n'))));
    const name = fromLegend?.name || fromCells.name || code || 'Ders';
    courses.push({
      code,
      name,
      instructor: fromLegend?.instructor || fromCells.instructor,
      sessions: mergeSessions(list.map((c) => c.session)),
    });
  }
  courses.sort((a, b) => {
    const sa = a.sessions[0];
    const sb = b.sessions[0];
    return sa.day - sb.day || sa.start.localeCompare(sb.start);
  });

  if (courses.length === 0 && warnings.length === 0) {
    warnings.push('PDF’te gün ve saat bilgisi içeren bir ders programı bulunamadı.');
  }
  return { courses, layout, warnings };
}
