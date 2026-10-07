import { FinanceTransaction, ExchangeRates } from '@/types';
import { convertCurrencyToTRY } from './exchangeRates';
import { toLocalDateString } from '@/lib/utils';

/**
 * Calculates the projected date for a monthly recurring transaction for a given target year and month.
 * Target day pinning: if start date is day 2 (e.g. 2026-08-02), it maps to day 2 (2026-09-02).
 * Month-end edge-case handling: if start date is day 31, in a 30-day month it falls back to day 30, and in Feb to 28/29.
 *
 * @param originalDateStr YYYY-MM-DD
 * @param targetYear e.g. 2026
 * @param targetMonth 0-indexed month (0 = Jan, 7 = Aug, 8 = Sep)
 */
export function getProjectedDateForMonth(
  originalDateStr: string,
  targetYear: number,
  targetMonth: number
): string {
  const parts = originalDateStr.split('-');
  if (parts.length < 3) return originalDateStr;

  const originalDay = parseInt(parts[2], 10);
  const daysInTargetMonth = new Date(targetYear, targetMonth + 1, 0).getDate();
  const pinnedDay = Math.min(originalDay, daysInTargetMonth);

  const yStr = String(targetYear);
  const mStr = String(targetMonth + 1).padStart(2, '0');
  const dStr = String(pinnedDay).padStart(2, '0');

  return `${yStr}-${mStr}-${dStr}`;
}

/**
 * Checks if a transaction (recurring or single) is active on a specific date (YYYY-MM-DD).
 */
export function isTransactionActiveOnDate(
  trans: FinanceTransaction,
  dateStr: string
): boolean {
  if (!trans.isRecurring) {
    return trans.date === dateStr;
  }

  if (dateStr < trans.date) {
    return false;
  }

  // If recurring transaction has an end date, it cannot be active after that date
  if (trans.endDate && dateStr > trans.endDate) {
    return false;
  }

  const [targetYearStr, targetMonthStr] = dateStr.split('-');
  const targetYear = parseInt(targetYearStr, 10);
  const targetMonth = parseInt(targetMonthStr, 10) - 1; // 0-indexed

  const freq = trans.recurringFrequency || 'aylik';

  switch (freq) {
    case 'aylik': {
      const projectedDate = getProjectedDateForMonth(trans.date, targetYear, targetMonth);
      if (trans.endDate && projectedDate > trans.endDate) return false;
      return projectedDate === dateStr;
    }
    case 'haftalik': {
      const startMs = new Date(trans.date).getTime();
      const targetMs = new Date(dateStr).getTime();
      const diffDays = Math.round((targetMs - startMs) / (1000 * 60 * 60 * 24));
      return diffDays >= 0 && diffDays % 7 === 0;
    }
    case 'gunluk': {
      return true;
    }
    default:
      return trans.date === dateStr;
  }
}

/**
 * Returns all transactions applicable for a given month, projecting recurring entries onto their pinned day.
 */
export function getTransactionsForMonth(
  transactions: FinanceTransaction[],
  targetYear: number,
  targetMonth: number
): {
  projectedTransactions: FinanceTransaction[];
  recurringIncomeCount: number;
  recurringExpenseCount: number;
} {
  const result: FinanceTransaction[] = [];
  let recurringIncomeCount = 0;
  let recurringExpenseCount = 0;

  const targetPeriodKey = `${targetYear}-${String(targetMonth + 1).padStart(2, '0')}`;
  const daysInMonth = new Date(targetYear, targetMonth + 1, 0).getDate();

  for (const trans of transactions) {
    if (!trans.isRecurring) {
      if (trans.date.startsWith(targetPeriodKey)) {
        result.push(trans);
      }
      continue;
    }

    // It is a recurring transaction
    const transPeriodKey = trans.date.slice(0, 7);
    if (transPeriodKey > targetPeriodKey) {
      // Created in the future relative to target period
      continue;
    }

    // If transaction has an endDate and target month is entirely past that endDate
    if (trans.endDate && trans.endDate.slice(0, 7) < targetPeriodKey) {
      continue;
    }

    const freq = trans.recurringFrequency || 'aylik';

    if (trans.type === 'gelir') recurringIncomeCount++;
    if (trans.type === 'gider') recurringExpenseCount++;

    if (freq === 'aylik') {
      const projectedDate = getProjectedDateForMonth(trans.date, targetYear, targetMonth);
      if (!trans.endDate || projectedDate <= trans.endDate) {
        result.push({
          ...trans,
          id: trans.date.startsWith(targetPeriodKey) ? trans.id : `${trans.id}-proj-${targetPeriodKey}`,
          date: projectedDate,
        });
      }
    } else if (freq === 'haftalik') {
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${targetPeriodKey}-${String(d).padStart(2, '0')}`;
        if (isTransactionActiveOnDate(trans, dateStr)) {
          result.push({
            ...trans,
            id: `${trans.id}-proj-${dateStr}`,
            date: dateStr,
          });
        }
      }
    } else if (freq === 'gunluk') {
      for (let d = 1; d <= daysInMonth; d++) {
        const dateStr = `${targetPeriodKey}-${String(d).padStart(2, '0')}`;
        if (dateStr >= trans.date && (!trans.endDate || dateStr <= trans.endDate)) {
          result.push({
            ...trans,
            id: `${trans.id}-proj-${dateStr}`,
            date: dateStr,
          });
        }
      }
    }
  }

  // Sort by date descending
  result.sort((a, b) => b.date.localeCompare(a.date));

  return {
    projectedTransactions: result,
    recurringIncomeCount,
    recurringExpenseCount,
  };
}

/**
 * Calculates accurate Monthly Recurring Revenue (MRR) normalized to TRY.
 */
export function calculateMRRSummary(
  transactions: FinanceTransaction[],
  rates: ExchangeRates
): {
  monthlyRecurringIncomeTRY: number;
  monthlyRecurringExpenseTRY: number;
  monthlyRecurringNetTRY: number;
  activeRecurringIncomeCount: number;
  activeRecurringExpenseCount: number;
} {
  let monthlyRecurringIncomeTRY = 0;
  let monthlyRecurringExpenseTRY = 0;
  let activeRecurringIncomeCount = 0;
  let activeRecurringExpenseCount = 0;

  const todayStr = toLocalDateString();

  for (const t of transactions) {
    if (!t.isRecurring) continue;

    // If an end date is set and has passed, do not include in active MRR
    if (t.endDate && t.endDate < todayStr) {
      continue;
    }

    const amountTRY =
      t.currency && t.currency !== 'TRY' && t.originalAmount !== undefined
        ? convertCurrencyToTRY(t.originalAmount, t.currency, rates, t.markupTRY).baseAmountTRY
        : t.amount;

    const freq = t.recurringFrequency || 'aylik';
    let monthlyAmount = amountTRY;

    if (freq === 'haftalik') {
      monthlyAmount = Math.round(amountTRY * 4.33);
    } else if (freq === 'gunluk') {
      monthlyAmount = Math.round(amountTRY * 30);
    }

    if (t.type === 'gelir') {
      monthlyRecurringIncomeTRY += monthlyAmount;
      activeRecurringIncomeCount++;
    } else {
      monthlyRecurringExpenseTRY += monthlyAmount;
      activeRecurringExpenseCount++;
    }
  }

  return {
    monthlyRecurringIncomeTRY,
    monthlyRecurringExpenseTRY,
    monthlyRecurringNetTRY: monthlyRecurringIncomeTRY - monthlyRecurringExpenseTRY,
    activeRecurringIncomeCount,
    activeRecurringExpenseCount,
  };
}
