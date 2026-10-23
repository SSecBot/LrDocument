/**
 * Server side of translation: the request's language (lr_lang cookie), the cookie itself, and a
 * translator for server components, push notifications and e-mails (which use the recipient's
 * User.locale, not the request's).
 */
import fs from 'node:fs';
import path from 'node:path';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { setServerLocale } from './index';
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  hasDictionary,
  normalizeLocale,
  parseDictionaryScript,
  registerDictionary,
  translate,
  translateMessage,
  type Locale,
  type Vars,
} from './core';

export * from './core';

function ensureDictionary(locale: Locale) {
  if (hasDictionary(locale)) return;
  try {
    registerDictionary(locale, parseDictionaryScript(fs.readFileSync(path.join(process.cwd(), 'public', 'i18n', `${locale}.js`), 'utf8')));
  } catch {
    registerDictionary(locale, {});
  }
}

/** Language of the current request (server components, route handlers). */
export async function requestLocale(): Promise<Locale> {
  try {
    return normalizeLocale((await cookies()).get(LOCALE_COOKIE)?.value);
  } catch {
    return DEFAULT_LOCALE;
  }
}

export type Translator = ((text: string, vars?: Vars) => string) & { locale: Locale; msg: (text: string | null | undefined) => string };

/** t() for one language (server components, pushes and e-mails to a given user). */
export function translatorFor(locale: Locale): Translator {
  ensureDictionary(locale);
  const fn = ((text: string, vars?: Vars) => translate(locale, text, vars)) as Translator;
  fn.locale = locale;
  fn.msg = (text) => translateMessage(locale, text);
  return fn;
}

export async function requestTranslator(): Promise<Translator> {
  return translatorFor(await requestLocale());
}

/** Remembers the language for a year (httpOnly: only the server reads it). */
export function setLocaleCookie(response: NextResponse, locale: Locale) {
  response.cookies.set({
    name: LOCALE_COOKIE,
    value: locale,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 365 * 24 * 60 * 60,
  });
}

/** Version of the dictionary file, for the cache-busting ?v= of its script tag. */
let version: string | null = null;
export function dictionaryVersion(locale: Locale): string {
  if (version !== null) return version;
  try {
    const stat = fs.statSync(path.join(process.cwd(), 'public', 'i18n', `${locale}.js`));
    version = String(Math.round(stat.mtimeMs));
  } catch {
    version = '0';
  }
  return version;
}

/** Language for rendering this request: the lr_lang cookie; Turkish until a language is chosen. */
export async function pageLocale(): Promise<Locale> {
  return requestLocale();
}

/** Call first in a server page (and its generateMetadata): t() in its server components then uses this language. */
export async function initRequestLocale(): Promise<Locale> {
  const locale = await requestLocale();
  setServerLocale(locale);
  ensureDictionary(locale);
  return locale;
}
