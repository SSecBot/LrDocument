/**
 * Translation for the app UI (client components, the store). See ./core.ts for how keys work.
 *
 * Which language: in the browser, <html lang> set by the root layout (from the lr_lang cookie). While a
 * client component is rendered on the server, the request's language comes from LocaleContext, so
 * two visitors with different languages never share a module-level setting. Outside of rendering on
 * the server (API routes) texts stay Turkish; those reach the browser and are translated there.
 *
 * The English dictionary is public/i18n/en.js (built by scripts/build-i18n.mjs from
 * src/lib/i18n/en/*.json). Browsers load it with a script tag only when the language is English.
 */
import * as React from 'react';
import {
  DEFAULT_LOCALE,
  hasDictionary,
  parseDictionaryScript,
  intlLocaleOf,
  normalizeLocale,
  registerDictionary,
  translate,
  translateMessage,
  type Dict,
  type Locale,
  type Vars,
} from './core';

export * from './core';

declare global {
  interface Window {
    __LR_DICT?: Partial<Record<Locale, Dict>>;
  }
}

// React's server build (route handlers) has no createContext; the context is only needed while rendering.
export const LocaleContext: React.Context<Locale> | null =
  typeof React.createContext === 'function' ? React.createContext<Locale>(DEFAULT_LOCALE) : null;

// Server components (React's server build, no context): one box per request, filled by
// initRequestLocale() in src/lib/i18n/server.ts at the top of each server page.
const requestBox: (() => { locale: Locale }) | null =
  !LocaleContext && typeof React.cache === 'function' ? React.cache(() => ({ locale: DEFAULT_LOCALE as Locale })) : null;

/** Server components: the language of this request (see initRequestLocale). */
export function setServerLocale(locale: Locale) {
  if (!requestBox) return;
  requestBox().locale = locale;
  if (locale !== DEFAULT_LOCALE) ensureServerDictionary(locale);
}

let browserLocale: Locale = DEFAULT_LOCALE;
if (typeof document !== 'undefined') {
  browserLocale = normalizeLocale(document.documentElement.lang);
  const loaded = window.__LR_DICT;
  if (loaded) for (const [l, d] of Object.entries(loaded)) if (d) registerDictionary(l as Locale, d);
}

/** Server rendering: dictionaries are read from public/i18n once per process. */
function ensureServerDictionary(locale: Locale) {
  if (hasDictionary(locale)) return;
  try {
    const proc = process as NodeJS.Process & { getBuiltinModule?: (id: string) => unknown };
    const fs = proc.getBuiltinModule?.('node:fs') as typeof import('node:fs') | undefined;
    const path = proc.getBuiltinModule?.('node:path') as typeof import('node:path') | undefined;
    if (!fs || !path) return;
    const text = fs.readFileSync(path.join(process.cwd(), 'public', 'i18n', `${locale}.js`), 'utf8');
    registerDictionary(locale, parseDictionaryScript(text));
  } catch {
    registerDictionary(locale, {});
  }
}

/** The language of the current render (server) or of this page (browser). */
export function getLocale(): Locale {
  if (typeof window !== 'undefined') return browserLocale;
  if (!LocaleContext) {
    try {
      return requestBox ? requestBox().locale : DEFAULT_LOCALE;
    } catch {
      return DEFAULT_LOCALE;
    }
  }
  try {
    // React.use(context) may be called from any function while a component renders (it takes no hook
    // slot); outside of rendering it throws. Aliased because t() is not a hook in the lint's sense.
    const readContext = React.use;
    const locale = readContext(LocaleContext);
    if (locale !== DEFAULT_LOCALE) ensureServerDictionary(locale);
    return locale;
  } catch {
    return DEFAULT_LOCALE;
  }
}

/** Sets the page language in the browser (LocaleProvider, before anything is rendered). */
export function setBrowserLocale(locale: Locale) {
  if (typeof window !== 'undefined') browserLocale = locale;
}

/** A text written in the code. */
export function t(text: string, vars?: Vars): string {
  return translate(getLocale(), text, vars);
}

/** A text that came from somewhere else (server message, label constant). Unknown text is unchanged. */
export function tx(text: string | null | undefined): string {
  return translateMessage(getLocale(), text);
}

/** "tr-TR" or "en-US" for toLocaleDateString / Intl. */
export function intlLocale(): string {
  return intlLocaleOf(getLocale());
}
