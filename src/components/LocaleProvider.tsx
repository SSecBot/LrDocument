'use client';

import { LocaleContext, setBrowserLocale, type Locale } from '@/lib/i18n';

/** Gives every client component the request's language (also while it is rendered on the server). */
export function LocaleProvider({ locale, children }: { locale: Locale; children: React.ReactNode }) {
  setBrowserLocale(locale);
  if (!LocaleContext) return children;
  return <LocaleContext value={locale}>{children}</LocaleContext>;
}
