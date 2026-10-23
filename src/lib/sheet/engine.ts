import { intlLocale } from '@/lib/i18n';
// ---------------------------------------------------------------------------
// Tablo notları: the spreadsheet model (stored as JSON in Note.content) and its formula engine.
// Formulas use the Excel syntax (=A1+B2, =SUM(A1:A9), =Sayfa2!B3, =IF(A1>0;"+";"-")) with English
// and Turkish function names (TOPLA, ORTALAMA, EĞER, DÜŞEYARA…). Arguments may be separated with
// ";" (Turkish Excel) or ",". Nothing is evaluated with eval: a small parser builds a tree.
// ---------------------------------------------------------------------------

export type NumberFormat = 'genel' | 'sayi' | 'tamsayi' | 'para' | 'yuzde' | 'tarih' | 'metin';

export interface CellStyle {
  b?: boolean;
  i?: boolean;
  u?: boolean;
  al?: 'l' | 'c' | 'r';
  /** text colour */
  fg?: string;
  /** fill colour */
  bg?: string;
  nf?: NumberFormat;
}

export interface Cell {
  /** What the user typed: a value or a formula starting with "=" */
  v: string;
  s?: CellStyle;
}

export interface Sheet {
  name: string;
  rows: number;
  cols: number;
  cells: Record<string, Cell>;
  /** column index → width in px */
  widths?: Record<number, number>;
}

export interface SheetDoc {
  v: 1;
  sheets: Sheet[];
  active: number;
}

export const MAX_ROWS = 5000;
export const MAX_COLS = 104; // A … CZ
export const DEFAULT_ROWS = 50;
export const DEFAULT_COLS = 12;

export function newSheet(name = 'Sayfa1', rows = DEFAULT_ROWS, cols = DEFAULT_COLS): Sheet {
  return { name, rows, cols, cells: {} };
}

export function newDoc(): SheetDoc {
  return { v: 1, sheets: [newSheet()], active: 0 };
}

const COLOR = /^#[0-9a-f]{6}$/i;
const NF: NumberFormat[] = ['genel', 'sayi', 'tamsayi', 'para', 'yuzde', 'tarih', 'metin'];

/** Reads a stored document defensively (any malformed part is dropped). */
export function parseDoc(json: string): SheetDoc {
  let raw: unknown;
  try {
    raw = JSON.parse(json || '{}');
  } catch {
    return newDoc();
  }
  const r = raw as Partial<SheetDoc>;
  if (!r || !Array.isArray(r.sheets) || !r.sheets.length) return newDoc();
  const sheets: Sheet[] = r.sheets.slice(0, 50).map((s, i) => {
    const sh = (s ?? {}) as Partial<Sheet>;
    const cells: Record<string, Cell> = {};
    for (const [k, c] of Object.entries(sh.cells ?? {})) {
      if (!/^[A-Z]{1,2}[1-9]\d{0,4}$/.test(k) || !c || typeof (c as Cell).v !== 'string') continue;
      const st = (c as Cell).s;
      const style: CellStyle = {};
      if (st && typeof st === 'object') {
        if (st.b) style.b = true;
        if (st.i) style.i = true;
        if (st.u) style.u = true;
        if (st.al === 'l' || st.al === 'c' || st.al === 'r') style.al = st.al;
        if (typeof st.fg === 'string' && COLOR.test(st.fg)) style.fg = st.fg;
        if (typeof st.bg === 'string' && COLOR.test(st.bg)) style.bg = st.bg;
        if (st.nf && NF.includes(st.nf)) style.nf = st.nf;
      }
      cells[k] = Object.keys(style).length ? { v: (c as Cell).v.slice(0, 5000), s: style } : { v: (c as Cell).v.slice(0, 5000) };
    }
    const widths: Record<number, number> = {};
    for (const [k, w] of Object.entries(sh.widths ?? {})) {
      const n = Number(k);
      if (Number.isInteger(n) && n >= 0 && n < MAX_COLS && typeof w === 'number') widths[n] = Math.min(600, Math.max(40, Math.round(w)));
    }
    return {
      name: typeof sh.name === 'string' && sh.name.trim() ? sh.name.slice(0, 31) : `Sayfa${i + 1}`,
      rows: clampInt(sh.rows, DEFAULT_ROWS, 1, MAX_ROWS),
      cols: clampInt(sh.cols, DEFAULT_COLS, 1, MAX_COLS),
      cells,
      widths,
    };
  });
  return { v: 1, sheets, active: clampInt(r.active, 0, 0, sheets.length - 1) };
}

function clampInt(v: unknown, fallback: number, min: number, max: number): number {
  const n = Math.round(Number(v));
  return Number.isFinite(n) ? Math.min(max, Math.max(min, n)) : fallback;
}

// ---------------------------------------------------------------------------
// Addresses
// ---------------------------------------------------------------------------

export function colName(c: number): string {
  let s = '';
  let n = c + 1;
  while (n > 0) {
    const m = (n - 1) % 26;
    s = String.fromCharCode(65 + m) + s;
    n = Math.floor((n - 1) / 26);
  }
  return s;
}

export function colIndex(name: string): number {
  let n = 0;
  for (const ch of name.toUpperCase()) n = n * 26 + (ch.charCodeAt(0) - 64);
  return n - 1;
}

export const addr = (r: number, c: number) => `${colName(c)}${r + 1}`;

export function parseAddr(a: string): { r: number; c: number } | null {
  const m = /^\$?([A-Za-z]{1,2})\$?(\d{1,5})$/.exec(a);
  if (!m) return null;
  return { r: Number(m[2]) - 1, c: colIndex(m[1]) };
}

// ---------------------------------------------------------------------------
// Values
// ---------------------------------------------------------------------------

export class SheetError {
  constructor(public readonly code: '#DIV/0!' | '#REF!' | '#NAME?' | '#VALUE!' | '#N/A' | '#CYCLE!' | '#NUM!') {}
  toString() {
    return this.code;
  }
}

export type Scalar = number | string | boolean | null | SheetError;
type Value = Scalar | Scalar[][];

/** "1.234,5" / "1234,5" / "1234.5" / "%15" / "15%" → number (Turkish and English writing). */
export function parseNumber(text: string): number | null {
  let t = text.trim().replace(/\s/g, '').replace(/[₺$€]|TL$/gi, '');
  let pct = false;
  if (/^%/.test(t) || /%$/.test(t)) {
    pct = true;
    t = t.replace(/%/g, '');
  }
  if (!t) return null;
  let n: number;
  if (/^[-+]?\d{1,3}(\.\d{3})+(,\d+)?$/.test(t)) n = Number(t.replace(/\./g, '').replace(',', '.'));
  else if (/^[-+]?\d+,\d+$/.test(t)) n = Number(t.replace(',', '.'));
  else if (/^[-+]?(\d+\.?\d*|\.\d+)(e[-+]?\d+)?$/i.test(t)) n = Number(t);
  else if (/^[-+]?\d{1,3}(,\d{3})+(\.\d+)?$/.test(t)) n = Number(t.replace(/,/g, ''));
  else return null;
  return Number.isFinite(n) ? (pct ? n / 100 : n) : null;
}

/** A typed (non-formula) cell's value. */
export function literal(raw: string): Scalar {
  if (raw === '') return null;
  if (raw.startsWith("'")) return raw.slice(1);
  const n = parseNumber(raw);
  if (n !== null) return n;
  const up = raw.trim().toLocaleUpperCase('tr');
  if (up === 'DOĞRU' || up === 'TRUE') return true;
  if (up === 'YANLIŞ' || up === 'FALSE') return false;
  // Dates as day numbers (Excel serial) so they can be added / compared.
  const d = /^(\d{1,2})[./](\d{1,2})[./](\d{4})$/.exec(raw.trim());
  if (d) return dateSerial(Number(d[3]), Number(d[2]), Number(d[1]));
  return raw;
}

const EPOCH = Date.UTC(1899, 11, 30);
export function dateSerial(y: number, m: number, d: number): number {
  return Math.round((Date.UTC(y, m - 1, d) - EPOCH) / 86_400_000);
}
export function serialToDate(n: number): Date {
  return new Date(EPOCH + Math.round(n) * 86_400_000);
}

// ---------------------------------------------------------------------------
// Parser
// ---------------------------------------------------------------------------

type Node =
  | { t: 'num'; v: number }
  | { t: 'str'; v: string }
  | { t: 'bool'; v: boolean }
  | { t: 'ref'; sheet?: string; r: number; c: number }
  | { t: 'range'; sheet?: string; r1: number; c1: number; r2: number; c2: number }
  | { t: 'fn'; name: string; args: Node[] }
  | { t: 'un'; op: string; a: Node }
  | { t: 'bin'; op: string; a: Node; b: Node }
  | { t: 'err'; e: SheetError };

type Tok = { k: 'num' | 'str' | 'id' | 'op' | 'sep' | '(' | ')' | 'ref'; v: string };

function tokenize(src: string): Tok[] {
  const out: Tok[] = [];
  let i = 0;
  while (i < src.length) {
    const ch = src[i];
    if (/\s/.test(ch)) {
      i++;
      continue;
    }
    if (ch === '"') {
      let j = i + 1;
      let s = '';
      while (j < src.length) {
        if (src[j] === '"' && src[j + 1] === '"') {
          s += '"';
          j += 2;
        } else if (src[j] === '"') break;
        else s += src[j++];
      }
      out.push({ k: 'str', v: s });
      i = j + 1;
      continue;
    }
    if (ch === "'") {
      // 'Sayfa adı'!A1
      const j = src.indexOf("'", i + 1);
      if (j < 0) throw new Error('quote');
      out.push({ k: 'id', v: src.slice(i + 1, j) });
      i = j + 1;
      continue;
    }
    const num = /^(\d+\.?\d*|\.\d+)(e[-+]?\d+)?/i.exec(src.slice(i));
    if (num && !/[A-Za-z]/.test(src[i - 1] ?? '')) {
      // "1,5" is not a decimal here (comma separates arguments); decimals in formulas use "."
      out.push({ k: 'num', v: num[0] });
      i += num[0].length;
      continue;
    }
    const id = /^[A-Za-zÇĞİÖŞÜçğıöşü_$][A-Za-z0-9ÇĞİÖŞÜçğıöşü_.$]*/.exec(src.slice(i));
    if (id) {
      out.push({ k: 'id', v: id[0] });
      i += id[0].length;
      continue;
    }
    const two = src.slice(i, i + 2);
    if (two === '<=' || two === '>=' || two === '<>') {
      out.push({ k: 'op', v: two });
      i += 2;
      continue;
    }
    if ('+-*/^&=<>%!:'.includes(ch)) {
      out.push({ k: 'op', v: ch });
      i++;
      continue;
    }
    if (ch === ',' || ch === ';') {
      out.push({ k: 'sep', v: ch });
      i++;
      continue;
    }
    if (ch === '(' || ch === ')') {
      out.push({ k: ch, v: ch });
      i++;
      continue;
    }
    throw new Error(`char ${ch}`);
  }
  return out;
}

const PREC: Record<string, number> = { '=': 1, '<>': 1, '<': 1, '>': 1, '<=': 1, '>=': 1, '&': 2, '+': 3, '-': 3, '*': 4, '/': 4, '^': 5 };

export function parseFormula(src: string): Node {
  let toks: Tok[];
  try {
    toks = tokenize(src);
  } catch {
    return { t: 'err', e: new SheetError('#NAME?') };
  }
  let p = 0;
  const peek = () => toks[p];
  const next = () => toks[p++];

  const refOf = (sheet: string | undefined, a: string): Node | null => {
    const at = parseAddr(a);
    if (!at) return null;
    if (p < toks.length && toks[p].k === 'op' && toks[p].v === ':' && toks[p + 1]?.k === 'id') {
      const b = parseAddr(toks[p + 1].v);
      if (b) {
        p += 2;
        return { t: 'range', sheet, r1: Math.min(at.r, b.r), c1: Math.min(at.c, b.c), r2: Math.max(at.r, b.r), c2: Math.max(at.c, b.c) };
      }
    }
    return { t: 'ref', sheet, r: at.r, c: at.c };
  };

  const primary = (): Node => {
    const tk = next();
    if (!tk) throw new Error('end');
    if (tk.k === 'num') return { t: 'num', v: Number(tk.v) };
    if (tk.k === 'str') return { t: 'str', v: tk.v };
    if (tk.k === '(') {
      const e = expr(0);
      if (next()?.k !== ')') throw new Error(')');
      return e;
    }
    if (tk.k === 'op' && (tk.v === '-' || tk.v === '+')) return { t: 'un', op: tk.v, a: unary() };
    if (tk.k === 'id') {
      // Sheet reference: Sayfa2!A1 or 'Sayfa adı'!A1
      if (peek()?.k === 'op' && peek().v === '!') {
        next();
        const a = next();
        const r = a?.k === 'id' ? refOf(tk.v, a.v) : null;
        if (!r) return { t: 'err', e: new SheetError('#REF!') };
        return r;
      }
      if (peek()?.k === '(') {
        next();
        const args: Node[] = [];
        if (peek()?.k !== ')') {
          for (;;) {
            if (peek()?.k === 'sep' || peek()?.k === ')') args.push({ t: 'str', v: '' });
            else args.push(expr(0));
            if (peek()?.k === 'sep') {
              next();
              continue;
            }
            break;
          }
        }
        if (next()?.k !== ')') throw new Error(')');
        return { t: 'fn', name: tk.v.toLocaleUpperCase('tr').replace(/İ/g, 'I'), args };
      }
      const up = tk.v.toLocaleUpperCase('tr');
      if (up === 'TRUE' || up === 'DOĞRU') return { t: 'bool', v: true };
      if (up === 'FALSE' || up === 'YANLIŞ') return { t: 'bool', v: false };
      const r = refOf(undefined, tk.v);
      if (r) return r;
      return { t: 'err', e: new SheetError('#NAME?') };
    }
    throw new Error('token');
  };
  const unary = (): Node => {
    let n = primary();
    while (peek()?.k === 'op' && peek().v === '%') {
      next();
      n = { t: 'bin', op: '/', a: n, b: { t: 'num', v: 100 } };
    }
    return n;
  };
  const expr = (minPrec: number): Node => {
    let left = unary();
    for (;;) {
      const tk = peek();
      if (!tk || tk.k !== 'op' || !(tk.v in PREC)) break;
      const prec = PREC[tk.v];
      if (prec < minPrec) break;
      next();
      const right = expr(tk.v === '^' ? prec : prec + 1);
      left = { t: 'bin', op: tk.v, a: left, b: right };
    }
    return left;
  };
  try {
    const n = expr(0);
    if (p < toks.length) return { t: 'err', e: new SheetError('#NAME?') };
    return n;
  } catch {
    return { t: 'err', e: new SheetError('#NAME?') };
  }
}

// ---------------------------------------------------------------------------
// Evaluation
// ---------------------------------------------------------------------------

const isErr = (v: unknown): v is SheetError => v instanceof SheetError;

function toNum(v: Scalar): number | SheetError {
  if (isErr(v)) return v;
  if (v === null || v === '') return 0;
  if (typeof v === 'number') return v;
  if (typeof v === 'boolean') return v ? 1 : 0;
  const n = parseNumber(v);
  return n === null ? new SheetError('#VALUE!') : n;
}
function toStr(v: Scalar): string {
  if (v === null) return '';
  if (typeof v === 'boolean') return v ? 'DOĞRU' : 'YANLIŞ';
  if (typeof v === 'number') return String(Math.round(v * 1e10) / 1e10).replace('.', ',');
  return String(v);
}
function toBool(v: Scalar): boolean | SheetError {
  if (isErr(v)) return v;
  if (typeof v === 'boolean') return v;
  if (typeof v === 'number') return v !== 0;
  if (v === null || v === '') return false;
  const up = v.toLocaleUpperCase('tr');
  if (up === 'DOĞRU' || up === 'TRUE') return true;
  if (up === 'YANLIŞ' || up === 'FALSE') return false;
  return new SheetError('#VALUE!');
}
const flat = (vals: Value[]): Scalar[] => vals.flatMap((v) => (Array.isArray(v) ? v.flat() : [v]));
/** Numbers of the arguments: ranges skip text and blanks (like Excel), direct values are converted. */
function nums(vals: Value[]): number[] | SheetError {
  const out: number[] = [];
  for (const v of vals) {
    if (Array.isArray(v)) {
      for (const x of v.flat()) {
        if (isErr(x)) return x;
        if (typeof x === 'number') out.push(x);
      }
    } else {
      const n = toNum(v);
      if (isErr(n)) return n;
      out.push(n);
    }
  }
  return out;
}

/** "> 5", "<>x", "metin", 7 → predicate (SUMIF / COUNTIF). */
function criterion(c: Scalar): (v: Scalar) => boolean {
  if (typeof c === 'number') return (v) => typeof v === 'number' && v === c;
  const s = toStr(c);
  const m = /^(<=|>=|<>|<|>|=)?(.*)$/.exec(s)!;
  const op = m[1] ?? '=';
  const rhsNum = parseNumber(m[2]);
  const rhs = m[2].toLocaleLowerCase('tr');
  return (v) => {
    if (rhsNum !== null && (typeof v === 'number' || (typeof v === 'string' && parseNumber(v) !== null))) {
      const n = typeof v === 'number' ? v : parseNumber(v as string)!;
      switch (op) {
        case '<': return n < rhsNum;
        case '>': return n > rhsNum;
        case '<=': return n <= rhsNum;
        case '>=': return n >= rhsNum;
        case '<>': return n !== rhsNum;
        default: return n === rhsNum;
      }
    }
    const t = toStr(v).toLocaleLowerCase('tr');
    const pattern = new RegExp(`^${rhs.replace(/[.+^${}()|[\]\\]/g, '\\$&').replace(/\*/g, '.*').replace(/\?/g, '.')}$`, 'u');
    return op === '<>' ? !pattern.test(t) : op === '=' ? pattern.test(t) : false;
  };
}

type Fn = (args: Value[]) => Value;
const num1 = (f: (n: number) => number): Fn => ([a]) => {
  const n = toNum(flat([a])[0] ?? null);
  if (isErr(n)) return n;
  const r = f(n);
  return Number.isFinite(r) ? r : new SheetError('#NUM!');
};

const FUNCTIONS: Record<string, Fn> = {
  SUM: (a) => { const n = nums(a); return isErr(n) ? n : n.reduce((s, x) => s + x, 0); },
  AVERAGE: (a) => { const n = nums(a); return isErr(n) ? n : n.length ? n.reduce((s, x) => s + x, 0) / n.length : new SheetError('#DIV/0!'); },
  MIN: (a) => { const n = nums(a); return isErr(n) ? n : n.length ? Math.min(...n) : 0; },
  MAX: (a) => { const n = nums(a); return isErr(n) ? n : n.length ? Math.max(...n) : 0; },
  COUNT: (a) => flat(a).filter((x) => typeof x === 'number').length,
  COUNTA: (a) => flat(a).filter((x) => x !== null && x !== '').length,
  COUNTBLANK: (a) => flat(a).filter((x) => x === null || x === '').length,
  PRODUCT: (a) => { const n = nums(a); return isErr(n) ? n : n.reduce((s, x) => s * x, 1); },
  MEDIAN: (a) => {
    const n = nums(a);
    if (isErr(n)) return n;
    if (!n.length) return new SheetError('#NUM!');
    const s = [...n].sort((x, y) => x - y);
    const m = Math.floor(s.length / 2);
    return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2;
  },
  ROUND: ([a, d]) => { const n = toNum(flat([a])[0]); const k = toNum(flat([d ?? 0])[0]); if (isErr(n)) return n; if (isErr(k)) return k; const f = 10 ** k; return Math.round(n * f) / f; },
  ROUNDUP: ([a, d]) => { const n = toNum(flat([a])[0]); const k = toNum(flat([d ?? 0])[0]); if (isErr(n)) return n; if (isErr(k)) return k; const f = 10 ** k; return Math.sign(n) * Math.ceil(Math.abs(n) * f) / f; },
  ROUNDDOWN: ([a, d]) => { const n = toNum(flat([a])[0]); const k = toNum(flat([d ?? 0])[0]); if (isErr(n)) return n; if (isErr(k)) return k; const f = 10 ** k; return Math.sign(n) * Math.floor(Math.abs(n) * f) / f; },
  ABS: num1(Math.abs),
  SQRT: num1((n) => (n < 0 ? NaN : Math.sqrt(n))),
  INT: num1(Math.floor),
  LN: num1(Math.log),
  LOG10: num1(Math.log10),
  EXP: num1(Math.exp),
  POWER: ([a, b]) => { const x = toNum(flat([a])[0]); const y = toNum(flat([b])[0]); if (isErr(x)) return x; if (isErr(y)) return y; const r = x ** y; return Number.isFinite(r) ? r : new SheetError('#NUM!'); },
  MOD: ([a, b]) => { const x = toNum(flat([a])[0]); const y = toNum(flat([b])[0]); if (isErr(x)) return x; if (isErr(y)) return y; return y === 0 ? new SheetError('#DIV/0!') : x - y * Math.floor(x / y); },
  PI: () => Math.PI,
  IF: ([c, t, f]) => { const b = toBool(flat([c])[0]); if (isErr(b)) return b; return b ? (t ?? true) : (f ?? false); },
  IFERROR: ([v, alt]) => (isErr(flat([v])[0]) ? (alt ?? '') : v),
  AND: (a) => { for (const x of flat(a)) { const b = toBool(x); if (isErr(b)) return b; if (!b) return false; } return true; },
  OR: (a) => { for (const x of flat(a)) { const b = toBool(x); if (isErr(b)) return b; if (b) return true; } return false; },
  NOT: ([a]) => { const b = toBool(flat([a])[0]); return isErr(b) ? b : !b; },
  CONCAT: (a) => flat(a).map(toStr).join(''),
  CONCATENATE: (a) => flat(a).map(toStr).join(''),
  LEN: ([a]) => toStr(flat([a])[0]).length,
  UPPER: ([a]) => toStr(flat([a])[0]).toLocaleUpperCase('tr'),
  LOWER: ([a]) => toStr(flat([a])[0]).toLocaleLowerCase('tr'),
  TRIM: ([a]) => toStr(flat([a])[0]).trim().replace(/\s+/g, ' '),
  LEFT: ([a, n]) => { const k = toNum(flat([n ?? 1])[0]); return isErr(k) ? k : toStr(flat([a])[0]).slice(0, k); },
  RIGHT: ([a, n]) => { const k = toNum(flat([n ?? 1])[0]); return isErr(k) ? k : k <= 0 ? '' : toStr(flat([a])[0]).slice(-k); },
  MID: ([a, s, n]) => { const st = toNum(flat([s])[0]); const k = toNum(flat([n])[0]); if (isErr(st)) return st; if (isErr(k)) return k; return toStr(flat([a])[0]).substr(st - 1, k); },
  TODAY: () => { const d = new Date(); return dateSerial(d.getFullYear(), d.getMonth() + 1, d.getDate()); },
  NOW: () => { const d = new Date(); return dateSerial(d.getFullYear(), d.getMonth() + 1, d.getDate()) + (d.getHours() * 60 + d.getMinutes()) / 1440; },
  DATE: ([y, m, d]) => { const a = [y, m, d].map((x) => toNum(flat([x])[0])); const e = a.find(isErr); if (e) return e; const [Y, M, D] = a as number[]; return dateSerial(Y, M, D); },
  YEAR: ([a]) => { const n = toNum(flat([a])[0]); return isErr(n) ? n : serialToDate(n).getUTCFullYear(); },
  MONTH: ([a]) => { const n = toNum(flat([a])[0]); return isErr(n) ? n : serialToDate(n).getUTCMonth() + 1; },
  DAY: ([a]) => { const n = toNum(flat([a])[0]); return isErr(n) ? n : serialToDate(n).getUTCDate(); },
  SUMIF: ([range, crit, sumRange]) => {
    const r = Array.isArray(range) ? range : [[range as Scalar]];
    const s = Array.isArray(sumRange) ? sumRange : sumRange === undefined ? r : [[sumRange as Scalar]];
    const ok = criterion(flat([crit])[0]);
    let total = 0;
    r.forEach((row, i) => row.forEach((v, j) => { if (ok(v)) { const x = s[i]?.[j]; if (typeof x === 'number') total += x; } }));
    return total;
  },
  COUNTIF: ([range, crit]) => { const ok = criterion(flat([crit])[0]); return flat([range]).filter(ok).length; },
  AVERAGEIF: ([range, crit, avgRange]) => {
    const r = Array.isArray(range) ? range : [[range as Scalar]];
    const s = Array.isArray(avgRange) ? avgRange : r;
    const ok = criterion(flat([crit])[0]);
    const picked: number[] = [];
    r.forEach((row, i) => row.forEach((v, j) => { if (ok(v)) { const x = s[i]?.[j]; if (typeof x === 'number') picked.push(x); } }));
    return picked.length ? picked.reduce((a, b) => a + b, 0) / picked.length : new SheetError('#DIV/0!');
  },
  VLOOKUP: ([key, table, col, approx]) => {
    if (!Array.isArray(table)) return new SheetError('#REF!');
    const k = flat([key])[0];
    const c = toNum(flat([col])[0]);
    if (isErr(c)) return c;
    if (c < 1 || c > (table[0]?.length ?? 0)) return new SheetError('#REF!');
    const exact = approx === undefined ? false : !toBool(flat([approx])[0]);
    const same = (a: Scalar, b: Scalar) => (typeof a === 'number' && typeof b === 'number' ? a === b : toStr(a).toLocaleLowerCase('tr') === toStr(b).toLocaleLowerCase('tr'));
    if (exact || typeof k !== 'number') {
      const row = table.find((r) => same(r[0], k));
      return row ? row[c - 1] : new SheetError('#N/A');
    }
    let found: Scalar[] | null = null;
    for (const r of table) if (typeof r[0] === 'number' && r[0] <= k) found = r;
    return found ? found[c - 1] : new SheetError('#N/A');
  },
};

// Turkish Excel names
export const ALIASES: Record<string, string> = {
  TOPLA: 'SUM', ORTALAMA: 'AVERAGE', MIN: 'MIN', MAK: 'MAX', BAĞ_DEĞ_SAY: 'COUNT', BAG_DEG_SAY: 'COUNT', BAĞ_DEĞ_DOLU_SAY: 'COUNTA',
  BOŞLUKSAY: 'COUNTBLANK', ÇARPIM: 'PRODUCT', ORTANCA: 'MEDIAN', YUVARLA: 'ROUND', YUKARIYUVARLA: 'ROUNDUP', AŞAĞIYUVARLA: 'ROUNDDOWN',
  MUTLAK: 'ABS', KAREKÖK: 'SQRT', TAMSAYI: 'INT', ÜS: 'POWER', KUVVET: 'POWER', MOD: 'MOD', EĞER: 'IF', EĞERHATA: 'IFERROR',
  VE: 'AND', YADA: 'OR', DEĞİL: 'NOT', BİRLEŞTİR: 'CONCATENATE', UZUNLUK: 'LEN', BÜYÜKHARF: 'UPPER', KÜÇÜKHARF: 'LOWER',
  KIRP: 'TRIM', SOLDAN: 'LEFT', SAĞDAN: 'RIGHT', PARÇAAL: 'MID', BUGÜN: 'TODAY', ŞİMDİ: 'NOW', TARİH: 'DATE', YIL: 'YEAR',
  AY: 'MONTH', GÜN: 'DAY', ETOPLA: 'SUMIF', EĞERSAY: 'COUNTIF', EĞERORTALAMA: 'AVERAGEIF', DÜŞEYARA: 'VLOOKUP',
};

/** Functions offered in the formula help (English name → Turkish name). */
export const FUNCTION_LIST: [string, string, string][] = [
  ['SUM', 'TOPLA', 'Toplam'],
  ['AVERAGE', 'ORTALAMA', 'Ortalama'],
  ['MIN', 'MİN', 'En küçük'],
  ['MAX', 'MAK', 'En büyük'],
  ['COUNT', 'BAĞ_DEĞ_SAY', 'Sayı içeren hücreler'],
  ['COUNTA', 'BAĞ_DEĞ_DOLU_SAY', 'Dolu hücreler'],
  ['IF', 'EĞER', 'Koşul'],
  ['SUMIF', 'ETOPLA', 'Koşullu toplam'],
  ['COUNTIF', 'EĞERSAY', 'Koşullu sayma'],
  ['VLOOKUP', 'DÜŞEYARA', 'Tabloda arama'],
  ['ROUND', 'YUVARLA', 'Yuvarlama'],
  ['TODAY', 'BUGÜN', 'Bugünün tarihi'],
];

export type Computed = Scalar;

/** Evaluates every formula of a document; results are cached per call. */
export class Evaluator {
  private cache = new Map<string, Scalar>();
  private visiting = new Set<string>();
  private parsed = new Map<string, Node>();

  constructor(private doc: SheetDoc) {}

  private sheetIndex(name: string | undefined, current: number): number {
    if (!name) return current;
    const i = this.doc.sheets.findIndex((s) => s.name.toLocaleLowerCase('tr') === name.toLocaleLowerCase('tr'));
    return i;
  }

  value(sheet: number, r: number, c: number): Scalar {
    const sh = this.doc.sheets[sheet];
    if (!sh) return new SheetError('#REF!');
    const key = `${sheet}:${r}:${c}`;
    if (this.cache.has(key)) return this.cache.get(key)!;
    const raw = sh.cells[addr(r, c)]?.v ?? '';
    if (!raw.startsWith('=') || raw.length < 2) {
      const v = sh.cells[addr(r, c)]?.s?.nf === 'metin' ? raw || null : literal(raw);
      this.cache.set(key, v);
      return v;
    }
    if (this.visiting.has(key)) return new SheetError('#CYCLE!');
    this.visiting.add(key);
    let node = this.parsed.get(raw);
    if (!node) {
      node = parseFormula(raw.slice(1));
      this.parsed.set(raw, node);
    }
    let out = this.eval(node, sheet);
    if (Array.isArray(out)) out = out[0]?.[0] ?? null;
    this.visiting.delete(key);
    this.cache.set(key, out);
    return out;
  }

  private eval(n: Node, sheet: number): Value {
    switch (n.t) {
      case 'num':
        return n.v;
      case 'str':
        return n.v;
      case 'bool':
        return n.v;
      case 'err':
        return n.e;
      case 'ref': {
        const s = this.sheetIndex(n.sheet, sheet);
        if (s < 0) return new SheetError('#REF!');
        return this.value(s, n.r, n.c);
      }
      case 'range': {
        const s = this.sheetIndex(n.sheet, sheet);
        if (s < 0) return new SheetError('#REF!');
        const sh = this.doc.sheets[s];
        const r2 = Math.min(n.r2, sh.rows - 1);
        const c2 = Math.min(n.c2, sh.cols - 1);
        if ((r2 - n.r1 + 1) * (c2 - n.c1 + 1) > 200_000) return new SheetError('#VALUE!');
        const rows: Scalar[][] = [];
        for (let r = n.r1; r <= r2; r++) {
          const row: Scalar[] = [];
          for (let c = n.c1; c <= c2; c++) row.push(this.value(s, r, c));
          rows.push(row);
        }
        return rows;
      }
      case 'un': {
        const v = toNum(this.scalar(n.a, sheet));
        if (isErr(v)) return v;
        return n.op === '-' ? -v : v;
      }
      case 'bin': {
        const a = this.scalar(n.a, sheet);
        const b = this.scalar(n.b, sheet);
        if (isErr(a)) return a;
        if (isErr(b)) return b;
        if (n.op === '&') return toStr(a) + toStr(b);
        if (['=', '<>', '<', '>', '<=', '>='].includes(n.op)) {
          const both = typeof a === 'number' && typeof b === 'number';
          const x = both ? (a as number) : toStr(a).toLocaleLowerCase('tr');
          const y = both ? (b as number) : toStr(b).toLocaleLowerCase('tr');
          switch (n.op) {
            case '=': return x === y;
            case '<>': return x !== y;
            case '<': return x < y;
            case '>': return x > y;
            case '<=': return x <= y;
            default: return x >= y;
          }
        }
        const x = toNum(a);
        const y = toNum(b);
        if (isErr(x)) return x;
        if (isErr(y)) return y;
        let r: number;
        switch (n.op) {
          case '+': r = x + y; break;
          case '-': r = x - y; break;
          case '*': r = x * y; break;
          case '/':
            if (y === 0) return new SheetError('#DIV/0!');
            r = x / y;
            break;
          default: r = x ** y;
        }
        return Number.isFinite(r) ? r : new SheetError('#NUM!');
      }
      case 'fn': {
        const name = ALIASES[n.name] ?? ALIASES[n.name.replace(/I/g, 'İ')] ?? n.name;
        const fn = FUNCTIONS[name];
        if (!fn) return new SheetError('#NAME?');
        const args = n.args.map((a) => this.eval(a, sheet));
        // IFERROR / IF decide on errors themselves; every other function passes the first error on.
        if (name !== 'IFERROR' && name !== 'IF' && name !== 'COUNT' && name !== 'COUNTA') {
          const e = args.find((a) => isErr(a));
          if (e) return e;
        }
        try {
          return fn(args);
        } catch {
          return new SheetError('#VALUE!');
        }
      }
    }
  }

  private scalar(n: Node, sheet: number): Scalar {
    const v = this.eval(n, sheet);
    return Array.isArray(v) ? (v[0]?.[0] ?? null) : v;
  }
}

// ---------------------------------------------------------------------------
// Display
// ---------------------------------------------------------------------------

export function formatValue(v: Scalar, nf: NumberFormat = 'genel'): string {
  if (v === null) return '';
  if (isErr(v)) return v.code;
  if (typeof v === 'boolean') return v ? 'DOĞRU' : 'YANLIŞ';
  if (typeof v === 'string') return v;
  switch (nf) {
    case 'sayi':
      return v.toLocaleString(intlLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 });
    case 'tamsayi':
      return Math.round(v).toLocaleString(intlLocale());
    case 'para':
      return `${v.toLocaleString(intlLocale(), { minimumFractionDigits: 2, maximumFractionDigits: 2 })} ₺`;
    case 'yuzde':
      return `%${(v * 100).toLocaleString(intlLocale(), { maximumFractionDigits: 2 })}`;
    case 'tarih':
      return serialToDate(v).toLocaleDateString(intlLocale(), { timeZone: 'UTC' });
    default:
      return Math.abs(v) >= 1e15 || (Math.abs(v) < 1e-9 && v !== 0) ? v.toExponential(4) : v.toLocaleString(intlLocale(), { maximumFractionDigits: 10 });
  }
}

/** Shift the relative references of a formula (copy / paste, fill down). */
export function shiftFormula(raw: string, dr: number, dc: number): string {
  if (!raw.startsWith('=')) return raw;
  return raw.replace(/(\$?)([A-Z]{1,2})(\$?)(\d{1,5})(?![\w(!])/g, (m, ca: string, col: string, ra: string, row: string, offset: number, all: string) => {
    // Inside a string literal: leave it.
    const before = all.slice(0, offset);
    if ((before.match(/"/g)?.length ?? 0) % 2 === 1) return m;
    const c = ca ? colIndex(col) : colIndex(col) + dc;
    const r = ra ? Number(row) - 1 : Number(row) - 1 + dr;
    if (c < 0 || r < 0) return '#REF!';
    return `${ca}${colName(c)}${ra}${r + 1}`;
  });
}
