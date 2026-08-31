import { CurrencyCode, ExchangeRates } from '@/types';

export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  USD: 36.50,
  EUR: 39.20,
  lastUpdated: new Date().toISOString(),
  markupTRY: 2.50,
  isLive: false,
};

// In-memory session cache to preserve last successfully fetched rates
let sessionCachedRates: ExchangeRates | null = null;

/**
 * Multi-tiered resilient exchange rate fetcher:
 * 1. Primary: open.er-api.com
 * 2. Secondary Fallback: api.frankfurter.dev
 * 3. Tertiary Fallback: jsdelivr currency-api
 * 4. Memory Session Cache
 * 5. Realistic Default Fallback
 */
export async function fetchLiveExchangeRates(currentMarkup: number = 2.50): Promise<ExchangeRates> {
  const markup = typeof currentMarkup === 'number' && !isNaN(currentMarkup) ? currentMarkup : 2.50;

  // 1. Try Primary Provider (open.er-api.com)
  try {
    const primaryUrl = `https://open.er-api.com/v6/latest/USD?_t=${Date.now()}`;
    const res = await fetch(primaryUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
        'Pragma': 'no-cache',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (res.ok) {
      const data = await res.json();
      const tryRate = data?.rates?.TRY;
      const eurRate = data?.rates?.EUR;

      if (typeof tryRate === 'number' && tryRate > 0) {
        const usdTry = Number(tryRate.toFixed(2));
        const eurTry = typeof eurRate === 'number' && eurRate > 0
          ? Number((tryRate / eurRate).toFixed(2))
          : Number((usdTry * 1.08).toFixed(2));

        const result: ExchangeRates = {
          USD: usdTry,
          EUR: eurTry,
          lastUpdated: new Date().toISOString(),
          markupTRY: markup,
          isLive: true,
        };

        sessionCachedRates = result;
        return result;
      }
    }
  } catch (err) {
    console.warn('[ExchangeRates] Primary API failed, trying secondary provider:', err);
  }

  // 2. Try Secondary Provider (Frankfurter API)
  try {
    const secondaryUrl = `https://api.frankfurter.dev/v1/latest?base=USD&symbols=TRY,EUR&_t=${Date.now()}`;
    const res = await fetch(secondaryUrl, {
      cache: 'no-store',
      headers: {
        'Cache-Control': 'no-cache, no-store, must-revalidate',
      },
      signal: AbortSignal.timeout(4500),
    });

    if (res.ok) {
      const data = await res.json();
      const tryRate = data?.rates?.TRY;
      const eurRate = data?.rates?.EUR;

      if (typeof tryRate === 'number' && tryRate > 0) {
        const usdTry = Number(tryRate.toFixed(2));
        const eurTry = typeof eurRate === 'number' && eurRate > 0
          ? Number((tryRate / eurRate).toFixed(2))
          : Number((usdTry * 1.08).toFixed(2));

        const result: ExchangeRates = {
          USD: usdTry,
          EUR: eurTry,
          lastUpdated: new Date().toISOString(),
          markupTRY: markup,
          isLive: true,
        };

        sessionCachedRates = result;
        return result;
      }
    }
  } catch (err) {
    console.warn('[ExchangeRates] Secondary API failed, trying tertiary provider:', err);
  }

  // 3. Try Tertiary Provider (Currency API on jsDelivr)
  try {
    const tertiaryUrl = `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/usd.json?_t=${Date.now()}`;
    const res = await fetch(tertiaryUrl, {
      cache: 'no-store',
      signal: AbortSignal.timeout(4500),
    });

    if (res.ok) {
      const data = await res.json();
      const tryRate = data?.usd?.try;
      const eurRate = data?.usd?.eur;

      if (typeof tryRate === 'number' && tryRate > 0) {
        const usdTry = Number(tryRate.toFixed(2));
        const eurTry = typeof eurRate === 'number' && eurRate > 0
          ? Number((tryRate / eurRate).toFixed(2))
          : Number((usdTry * 1.08).toFixed(2));

        const result: ExchangeRates = {
          USD: usdTry,
          EUR: eurTry,
          lastUpdated: new Date().toISOString(),
          markupTRY: markup,
          isLive: true,
        };

        sessionCachedRates = result;
        return result;
      }
    }
  } catch (err) {
    console.warn('[ExchangeRates] Tertiary API failed, falling back to session cache / defaults:', err);
  }

  // 4. Fallback to Memory Session Cache (if available from earlier in the session)
  if (sessionCachedRates) {
    return {
      ...sessionCachedRates,
      markupTRY: markup,
      lastUpdated: sessionCachedRates.lastUpdated,
    };
  }

  // 5. Fallback to Static Realistic Defaults
  return {
    ...DEFAULT_EXCHANGE_RATES,
    markupTRY: markup,
    lastUpdated: new Date().toISOString(),
  };
}

export function convertCurrencyToTRY(
  amount: number,
  currency: CurrencyCode,
  rates: ExchangeRates,
  customMarkup?: number
): {
  baseAmountTRY: number;
  effectiveRate: number;
  liveRate: number;
  markup: number;
  originalAmount: number;
  currency: CurrencyCode;
} {
  const markup = customMarkup !== undefined && !isNaN(customMarkup) ? customMarkup : (rates.markupTRY || 2.50);

  if (currency === 'TRY') {
    return {
      baseAmountTRY: amount,
      effectiveRate: 1,
      liveRate: 1,
      markup: 0,
      originalAmount: amount,
      currency: 'TRY',
    };
  }

  const liveRate = currency === 'USD' ? rates.USD : rates.EUR;
  const effectiveRate = Number((liveRate + markup).toFixed(2));
  const baseAmountTRY = Math.round(amount * effectiveRate);

  return {
    baseAmountTRY,
    effectiveRate,
    liveRate,
    markup,
    originalAmount: amount,
    currency,
  };
}

export function formatCurrencyWithCode(amount: number, currency: CurrencyCode = 'TRY'): string {
  switch (currency) {
    case 'USD':
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    case 'EUR':
      return new Intl.NumberFormat('de-DE', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
    default:
      return new Intl.NumberFormat('tr-TR', {
        style: 'currency',
        currency: 'TRY',
        maximumFractionDigits: 0,
      }).format(amount);
  }
}
