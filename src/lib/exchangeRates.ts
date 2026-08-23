import { CurrencyCode, ExchangeRates } from '@/types';

export const DEFAULT_EXCHANGE_RATES: ExchangeRates = {
  USD: 34.25,
  EUR: 37.15,
  lastUpdated: new Date().toISOString(),
  markupTRY: 2.50,
  isLive: false,
};

export async function fetchLiveExchangeRates(currentMarkup: number = 2.50): Promise<ExchangeRates> {
  try {
    const apiUrl = process.env.NEXT_PUBLIC_EXCHANGE_RATE_API_URL || 'https://open.er-api.com/v6/latest/USD';
    const res = await fetch(apiUrl, {
      cache: 'no-cache',
    });

    if (!res.ok) {
      throw new Error(`API error: ${res.statusText}`);
    }

    const data = await res.json();
    const tryRate = data.rates?.TRY;
    const eurRate = data.rates?.EUR;

    if (tryRate && typeof tryRate === 'number') {
      const usdTry = Number(tryRate.toFixed(2));
      // EUR/TRY = (USD/TRY) / (USD/EUR)
      const eurTry = eurRate ? Number((tryRate / eurRate).toFixed(2)) : 37.15;

      return {
        USD: usdTry,
        EUR: eurTry,
        lastUpdated: new Date().toISOString(),
        markupTRY: currentMarkup,
        isLive: true,
      };
    }
  } catch (err) {
    console.warn('Live exchange rate fetch failed, using realistic fallback rates:', err);
  }

  return {
    ...DEFAULT_EXCHANGE_RATES,
    lastUpdated: new Date().toISOString(),
    markupTRY: currentMarkup,
    isLive: false,
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
  const markup = customMarkup !== undefined ? customMarkup : (rates.markupTRY || 2.50);

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
