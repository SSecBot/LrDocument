'use client';

import React, { useState } from 'react';
import { Globe, Loader2 } from 'lucide-react';
import { LOCALES, LOCALE_LABEL, getLocale, t, type Locale } from '@/lib/i18n';
import { thrownError } from '@/lib/errors';

/** Saves the language (cookie, and the account when signed in) and reloads the page in it. */
export async function changeLocale(locale: Locale): Promise<string | null> {
  try {
    const res = await fetch('/api/locale', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ locale }) });
    if (!res.ok) return t('Dil değiştirilemedi.');
  } catch (err) {
    return thrownError(err, t('Dil değiştirilemedi.'));
  }
  window.location.reload();
  return null;
}

/**
 * Türkçe / English buttons. `compact` is the small pill for page headers; otherwise a labelled
 * group for forms (kayıt) and Ayarlar.
 */
export function LanguageSwitcher({ compact = false, className = '' }: { compact?: boolean; className?: string }) {
  const current = getLocale();
  const [busy, setBusy] = useState<Locale | null>(null);
  const [error, setError] = useState<string | null>(null);

  const pick = async (locale: Locale) => {
    if (locale === current || busy) return;
    setBusy(locale);
    setError(null);
    const err = await changeLocale(locale);
    if (err) {
      setError(err);
      setBusy(null);
    }
  };

  return (
    <div className={className}>
      <div
        role="group"
        aria-label={t('Dil')}
        className={`inline-flex items-center rounded-lg border border-line bg-surface p-0.5 ${compact ? 'text-xs' : 'text-sm'}`}
      >
        <Globe className={`${compact ? 'w-3.5 h-3.5 mx-1.5' : 'w-4 h-4 mx-2'} text-muted shrink-0`} aria-hidden />
        {LOCALES.map((l) => (
          <button
            key={l}
            type="button"
            lang={l}
            aria-pressed={l === current}
            disabled={!!busy}
            onClick={() => pick(l)}
            className={`${compact ? 'h-7 px-2' : 'h-9 px-3'} rounded-md inline-flex items-center gap-1.5 transition-colors ${
              l === current ? 'bg-surface-3 text-fg font-medium' : 'text-subtle hover:text-fg'
            }`}
          >
            {busy === l && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            {LOCALE_LABEL[l]}
          </button>
        ))}
      </div>
      {error && <p className="mt-1 text-xs text-rose-400">{error}</p>}
    </div>
  );
}
