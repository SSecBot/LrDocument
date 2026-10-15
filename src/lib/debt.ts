// Kredi / borç arithmetic. Rates are monthly percentages (e.g. 3.75 = %3,75 per month).

const round2 = (n: number) => Math.round(n * 100) / 100;

export function monthlyInterest(balance: number, monthlyRatePct: number): number {
  return round2(Math.max(0, balance) * Math.max(0, monthlyRatePct) / 100);
}

/**
 * Minimum payment for the month: the given share of the balance, but never less than the interest
 * (otherwise the debt would grow) and never more than balance + interest.
 */
export function minimumPayment(balance: number, monthlyRatePct: number, minRatePct: number): number {
  const interest = monthlyInterest(balance, monthlyRatePct);
  const share = round2(Math.max(0, balance) * Math.max(0, minRatePct) / 100);
  return round2(Math.min(Math.max(0, balance) + interest, Math.max(share, interest)));
}

/** Balance after one month with the given payment (interest is added first). */
export function balanceAfterPayment(balance: number, monthlyRatePct: number, payment: number): number {
  return round2(Math.max(0, balance + monthlyInterest(balance, monthlyRatePct) - Math.max(0, payment)));
}

/**
 * Months needed to repay `balance` with a fixed monthly `payment`, and the total interest paid.
 * Returns null when the payment does not even cover the interest (the debt never closes).
 */
export function payoffPlan(balance: number, monthlyRatePct: number, payment: number): { months: number; totalInterest: number } | null {
  if (balance <= 0) return { months: 0, totalInterest: 0 };
  if (payment <= monthlyInterest(balance, monthlyRatePct)) return null;
  let left = balance;
  let interest = 0;
  let months = 0;
  while (left > 0.005 && months < 1200) {
    const i = monthlyInterest(left, monthlyRatePct);
    interest += i;
    left = left + i - Math.min(payment, left + i);
    months++;
  }
  return { months, totalInterest: round2(interest) };
}

export function addMonths(date: string, n: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const target = new Date(y, m - 1 + n, 1);
  const lastDay = new Date(target.getFullYear(), target.getMonth() + 1, 0).getDate();
  target.setDate(Math.min(d, lastDay));
  return `${target.getFullYear()}-${String(target.getMonth() + 1).padStart(2, '0')}-${String(target.getDate()).padStart(2, '0')}`;
}
