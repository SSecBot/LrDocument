import { intlLocale, t } from '@/lib/i18n';
import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function generateId(): string {
  return Math.random().toString(36).substring(2, 9) + Date.now().toString(36);
}

export function formatTurkishDate(dateString: string): string {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return dateString;

    // "5 Ocak 2026" / "January 5, 2026"
    return date.toLocaleDateString(intlLocale(), { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return dateString;
  }
}

export function getRelativeTimeTurkish(dateString: string): string {
  if (!dateString) return '';
  try {
    const target = new Date(dateString);
    const now = new Date();
    target.setHours(0, 0, 0, 0);
    now.setHours(0, 0, 0, 0);

    const diffTime = target.getTime() - now.getTime();
    const diffDays = Math.round(diffTime / (1000 * 60 * 60 * 24));

    if (diffDays === 0) return t('Bugün');
    if (diffDays === 1) return t('Yarın');
    if (diffDays === 2) return t('2 gün sonra');
    if (diffDays === -1) return t('Dün');
    if (diffDays < -1) return t('{days} gün önce', { days: Math.abs(diffDays) });
    if (diffDays > 2) return t('{days} gün kaldı', { days: diffDays });

    return formatTurkishDate(dateString);
  } catch {
    return dateString;
  }
}

export function formatCurrencyTRY(amount: number): string {
  return new Intl.NumberFormat(intlLocale(), {
    style: 'currency',
    currency: 'TRY',
    maximumFractionDigits: 0,
  }).format(amount);
}

/**
 * Returns YYYY-MM-DD in the user's local time zone.
 * (`toISOString()` is UTC and yields yesterday's date in Türkiye between 00:00 and 03:00.)
 */
export function toLocalDateString(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

/** Builds a safe ASCII file name from a (possibly Turkish) title, e.g. "Türev Notları" -> "turev-notlari". */
export function slugifyFilename(title: string, fallback = 'dosya'): string {
  const map: Record<string, string> = { ç: 'c', ğ: 'g', ı: 'i', ö: 'o', ş: 's', ü: 'u', â: 'a', î: 'i', û: 'u' };
  const slug = title
    .toLocaleLowerCase('tr-TR')
    .replace(/[çğıöşüâîû]/g, (ch) => map[ch] || ch)
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 80);
  return slug || fallback;
}
