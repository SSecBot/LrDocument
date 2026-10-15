import type { Customer, CustomerPayment } from '@/types';

// ---------------------------------------------------------------------------
// Kurumsal › Müşteriler: payment schedule over the commitment (taahhüt) period.
// One payment is due every month from the start month to the end month, on `paymentDay`
// (clamped to the length of the month).
// ---------------------------------------------------------------------------

export type PaymentState = 'paid' | 'overdue' | 'upcoming';

export interface ScheduleItem {
  month: string; // YYYY-MM
  due: string; // YYYY-MM-DD
  state: PaymentState;
  payment?: CustomerPayment;
}

const MAX_MONTHS = 600;

const pad = (n: number) => String(n).padStart(2, '0');

export function commitmentMonths(startDate: string, endDate: string): string[] {
  const [sy, sm] = startDate.split('-').map(Number);
  const [ey, em] = endDate.split('-').map(Number);
  if (!sy || !sm || !ey || !em) return [];
  const out: string[] = [];
  let y = sy;
  let m = sm;
  while ((y < ey || (y === ey && m <= em)) && out.length < MAX_MONTHS) {
    out.push(`${y}-${pad(m)}`);
    m++;
    if (m > 12) {
      m = 1;
      y++;
    }
  }
  return out;
}

export function dueDateOf(month: string, paymentDay: number): string {
  const [y, m] = month.split('-').map(Number);
  const last = new Date(y, m, 0).getDate();
  return `${month}-${pad(Math.min(Math.max(1, paymentDay), last))}`;
}

export function paymentSchedule(c: Pick<Customer, 'startDate' | 'endDate' | 'paymentDay' | 'payments'>, today: string): ScheduleItem[] {
  const paid = new Map(c.payments.map((p) => [p.month, p]));
  return commitmentMonths(c.startDate, c.endDate).map((month) => {
    const due = dueDateOf(month, c.paymentDay);
    const payment = paid.get(month);
    return { month, due, payment, state: payment ? 'paid' : due < today ? 'overdue' : 'upcoming' };
  });
}

export interface CustomerSummary {
  totalMonths: number;
  paidMonths: number;
  paidAmount: number;
  overdueMonths: number;
  overdueAmount: number;
  /** Still to be collected until the end of the commitment (overdue included). */
  remainingAmount: number;
  /** Total value of the commitment. */
  contractValue: number;
  nextDue: ScheduleItem | null;
  /** Today is within the commitment period. */
  active: boolean;
  ended: boolean;
}

export function customerSummary(c: Customer, today: string): CustomerSummary {
  const items = paymentSchedule(c, today);
  const paid = items.filter((i) => i.state === 'paid');
  const overdue = items.filter((i) => i.state === 'overdue');
  const open = items.filter((i) => i.state !== 'paid');
  return {
    totalMonths: items.length,
    paidMonths: paid.length,
    paidAmount: paid.reduce((s, i) => s + (i.payment?.amount ?? 0), 0),
    overdueMonths: overdue.length,
    overdueAmount: overdue.length * c.monthlyFee,
    remainingAmount: open.length * c.monthlyFee,
    contractValue: items.length * c.monthlyFee,
    nextDue: items.find((i) => i.state === 'upcoming') ?? null,
    active: c.startDate <= today && today <= c.endDate,
    ended: c.endDate < today,
  };
}

const MONTHS = ['Oca', 'Şub', 'Mar', 'Nis', 'May', 'Haz', 'Tem', 'Ağu', 'Eyl', 'Eki', 'Kas', 'Ara'];

export function formatMonth(month: string): string {
  const [y, m] = month.split('-').map(Number);
  return `${MONTHS[m - 1] ?? '?'} ${y}`;
}

/** Same day `months` later, clamped to the month's length (for a default commitment end). */
export function addMonthsToDate(date: string, months: number): string {
  const [y, m, d] = date.split('-').map(Number);
  const total = y * 12 + (m - 1) + months;
  const ny = Math.floor(total / 12);
  const nm = (total % 12) + 1;
  const last = new Date(ny, nm, 0).getDate();
  return `${ny}-${pad(nm)}-${pad(Math.min(d, last))}`;
}
