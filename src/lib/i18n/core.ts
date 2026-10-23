/**
 * Translation core, shared by the browser, server rendering, API routes and push / e-mail texts.
 *
 * The Turkish text in the code is the key: t('Not silindi') shows "Not silindi" in Turkish and looks
 * the text up in the English dictionary otherwise. A key may hold placeholders: t('{count} not', { count }).
 * Dictionary values may pick a plural form: "{count:note|notes}" (singular when count is 1).
 *
 * Texts built elsewhere (server messages, lib helpers) arrive as plain strings; translateMessage()
 * also matches them against the dictionary keys that contain placeholders ("{n} saat eksik").
 */

export type Locale = 'tr' | 'en';
export const LOCALES: Locale[] = ['tr', 'en'];
export const DEFAULT_LOCALE: Locale = 'tr';
/** Shown in the language pickers, each in its own language. */
export const LOCALE_LABEL: Record<Locale, string> = { tr: 'Türkçe', en: 'English' };
/** httpOnly cookie that carries the chosen language (so the server renders pages in it). */
export const LOCALE_COOKIE = 'lr_lang';

export function normalizeLocale(value: unknown): Locale {
  return value === 'en' ? 'en' : 'tr';
}

/** Intl locale for dates and numbers. */
export function intlLocaleOf(locale: Locale): string {
  return locale === 'en' ? 'en-US' : 'tr-TR';
}

export type Dict = Record<string, string>;
export type Vars = Record<string, string | number | boolean | null | undefined>;

type Pattern = { re: RegExp; names: string[]; value: string; anchor: string };
const dicts: Partial<Record<Locale, Dict>> = {};
const patterns: Partial<Record<Locale, Pattern[]>> = {};
const memo: Partial<Record<Locale, Map<string, string>>> = {};

export function registerDictionary(locale: Locale, dict: Dict) {
  if (dicts[locale] === dict) return;
  dicts[locale] = dict;
  delete patterns[locale];
  memo[locale] = new Map();
}

export function hasDictionary(locale: Locale): boolean {
  return locale === 'tr' || !!dicts[locale];
}

const PLACEHOLDER = /\{(\w+)(?::([^|{}]*)\|([^{}]*))?\}/g;

function escapeRe(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Keys with placeholders become patterns, longest literal part first (fewer wrong matches). */
function compile(locale: Locale): Pattern[] {
  const cached = patterns[locale];
  if (cached) return cached;
  const out: Pattern[] = [];
  for (const [key, value] of Object.entries(dicts[locale] ?? {})) {
    if (!key.includes('{')) continue;
    const names: string[] = [];
    let literal = '';
    let src = '';
    let last = 0;
    for (const m of key.matchAll(/\{(\w+)\}/g)) {
      const part = key.slice(last, m.index);
      src += escapeRe(part);
      literal += part;
      // One line at most (multi-line texts are translated line by line by the callers).
      src += '([^\\n]+?)';
      names.push(m[1]);
      last = m.index! + m[0].length;
    }
    const tail = key.slice(last);
    src += escapeRe(tail);
    literal += tail;
    // A key made only of placeholders ("{a} {b}") would match anything.
    if (literal.replace(/[\s.,:;·—–-]/g, '').length < 3) continue;
    const anchor = literal.split(/\s+/).sort((a, b) => b.length - a.length)[0] ?? '';
    out.push({ re: new RegExp(`^${src}$`), names, value, anchor });
  }
  out.sort((a, b) => b.anchor.length - a.anchor.length);
  patterns[locale] = out;
  return out;
}

function fill(locale: Locale, template: string, vars: Vars | undefined, depth: number): string {
  if (!vars) return template;
  return template.replace(PLACEHOLDER, (whole, name: string, one?: string, other?: string) => {
    if (!(name in vars)) return whole;
    const v = vars[name];
    if (one !== undefined) return Number(v) === 1 ? one : (other ?? '');
    if (v === null || v === undefined) return '';
    // Words that came from labels ("Kurumsal") are translated too; numbers and user text pass through.
    return typeof v === 'string' && depth < 3 ? translateMessage(locale, v, depth + 1) : String(v);
  });
}

/** A text written in the code (the key), with its placeholders filled in. */
export function translate(locale: Locale, text: string, vars?: Vars): string {
  if (locale === 'tr') return fill(locale, text, vars, 3);
  const hit = dicts[locale]?.[text];
  return fill(locale, hit ?? text, vars, 0);
}

/**
 * A text that came from elsewhere (server message, label constant, lib helper): the exact key, or a
 * key with placeholders that matches it. Anything unknown (user content) is returned unchanged.
 */
export function translateMessage(locale: Locale, text: string | null | undefined, depth = 0): string {
  if (text === null || text === undefined) return '';
  if (locale === 'tr' || !text) return text;
  const dict = dicts[locale];
  if (!dict) return text;
  const exact = dict[text];
  if (exact !== undefined) return exact;
  const trimmed = text.trim();
  if (trimmed !== text && dict[trimmed] !== undefined) return text.replace(trimmed, dict[trimmed]);
  // Long texts (notes, user content) are never matched: keeps the lazy patterns cheap (no slow regex).
  if (text.length > 300 || !/[A-Za-zÇĞİÖŞÜçğıöşü]/.test(text)) return text;
  const cache = (memo[locale] ??= new Map());
  const seen = cache.get(text);
  if (seen !== undefined) return seen;
  let result = text;
  for (const p of compile(locale)) {
    if (p.anchor && !text.includes(p.anchor)) continue;
    const m = p.re.exec(text);
    if (!m) continue;
    const vars: Vars = {};
    p.names.forEach((n, i) => (vars[n] = m[i + 1]));
    result = fill(locale, p.value, vars, depth);
    break;
  }
  if (cache.size > 5000) cache.clear();
  cache.set(text, result);
  return result;
}

/** public/i18n/<locale>.js wraps the JSON between the DICT_START and DICT_END markers. */
export const DICT_START = '/*DICT*/';
export const DICT_END = '/*END*/';

export function parseDictionaryScript(text: string): Dict {
  const start = text.indexOf(DICT_START);
  const end = text.lastIndexOf(DICT_END);
  if (start < 0 || end < start) return {};
  return JSON.parse(text.slice(start + DICT_START.length, end));
}
