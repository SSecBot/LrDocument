'use client';

import { t as tl, tx, intlLocale } from '@/lib/i18n';
import React from 'react';
import { Landmark, Pencil, Trash2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { FinanceTransaction } from '@/types';
import { addMonths, balanceAfterPayment, minimumPayment, monthlyInterest } from '@/lib/debt';
import { formatCurrencyTRY, formatTurkishDate, toLocalDateString } from '@/lib/utils';
import { askConfirm, confirmDelete } from '@/components/ui/ConfirmDialog';

const pct = (n: number) => n.toLocaleString(intlLocale(), { maximumFractionDigits: 2 });

interface Props {
  onEdit: (debt: FinanceTransaction) => void;
  onAdd: () => void;
}

/** Kredi / borç list: balance, this month's interest and minimum payment, one-click payment record. */
export function DebtsCard({ onEdit, onAdd }: Props) {
  const { transactions, addTransaction, updateTransaction, deleteTransaction, addToast, systemSettings } = useAppStore();
  const debts = transactions.filter((t) => t.isDebt && t.amount > 0);
  const rateOf = (d: FinanceTransaction) => d.monthlyInterestRate ?? systemSettings.finance.loanMonthlyInterestRate;
  const minRateOf = (d: FinanceTransaction) => d.minPaymentRate ?? systemSettings.finance.loanMinPaymentRate;

  const totalBalance = debts.reduce((s, d) => s + d.amount, 0);
  const totalInterest = debts.reduce((s, d) => s + monthlyInterest(d.amount, rateOf(d)), 0);
  const totalMinimum = debts.reduce((s, d) => s + minimumPayment(d.amount, rateOf(d), minRateOf(d)), 0);

  /** Records the minimum payment as a paid expense and rolls the debt one month forward. */
  const payMinimum = async (d: FinanceTransaction) => {
    const payment = minimumPayment(d.amount, rateOf(d), minRateOf(d));
    const ok = await askConfirm({
      title: tl('Asgari ödeme kaydedilsin mi?'),
      message: tl('{title}: {v1} gider olarak kaydedilecek ve sonraki ödeme tarihi bir ay ileri alınacak.', { title: d.title, v1: formatCurrencyTRY(payment) }),
      confirmText: tl('Kaydet'),
      danger: false,
    });
    if (!ok) return;
    addTransaction({
      title: tl('{title} — ödeme', { title: d.title }),
      amount: payment,
      currency: 'TRY',
      type: 'gider',
      category: 'Kredi / Borç',
      date: toLocalDateString(),
      isConfirmed: true,
      priority: 'orta',
      description: tl('Faiz: {v0}', { v0: formatCurrencyTRY(monthlyInterest(d.amount, rateOf(d))) }),
    });
    const left = balanceAfterPayment(d.amount, rateOf(d), payment);
    updateTransaction(d.id, { amount: left, originalAmount: left, currency: 'TRY', date: addMonths(d.date, 1) });
    addToast({
      type: 'success',
      title: tl('Ödeme kaydedildi'),
      message: left > 0 ? tl('Kalan borç {v0}.', { v0: formatCurrencyTRY(left) }) : tl('Borç kapandı.'),
    });
  };

  return (
    <section className="bg-surface border border-line rounded-lg">
      <div className="px-4 py-3 border-b border-line flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-fg flex items-center gap-2">
          <Landmark className="w-4 h-4 text-muted" />{' '}{tl('Krediler ve borçlar')}
        </h2>
        <button onClick={onAdd} className="h-9 sm:h-8 px-3 text-xs text-body hover:text-fg bg-surface-2 hover:bg-surface-3 border border-line rounded-md whitespace-nowrap">
          {tl('Kredi / borç ekle')}
        </button>
      </div>
      {debts.length === 0 ? (
        <p className="px-4 py-6 text-xs text-muted">
          {tl('Kredi kartı, kredi veya borçlarınızı “Gider › Kredi / borç” olarak ekleyin; aylık faiz ve asgari ödeme burada hesaplanır.')}
        </p>
      ) : (
        <>
          <dl className="grid grid-cols-1 sm:grid-cols-3 divide-y sm:divide-y-0 sm:divide-x divide-line border-b border-line">
            {[
              [tl('Toplam borç'), totalBalance],
              [tl('Bu ayki faiz'), totalInterest],
              [tl('Asgari ödemeler'), totalMinimum],
            ].map(([label, value]) => (
              <div key={label as string} className="px-4 py-2.5 sm:py-3 flex sm:block items-baseline justify-between gap-3 min-w-0">
                <dt className="text-[11px] text-muted">{label}</dt>
                <dd className="text-sm sm:text-base font-semibold text-fg tabular-nums truncate">{tx(formatCurrencyTRY(value as number))}</dd>
              </div>
            ))}
          </dl>
          <ul className="divide-y divide-line">
            {debts.map((d) => {
              const interest = monthlyInterest(d.amount, rateOf(d));
              const minimum = minimumPayment(d.amount, rateOf(d), minRateOf(d));
              const overdue = d.date < toLocalDateString();
              return (
                <li key={d.id} className="px-4 py-3 flex flex-col sm:flex-row sm:flex-wrap sm:items-center gap-x-4 gap-y-2">
                  <div className="min-w-0 sm:flex-1">
                    <p className="text-sm text-fg truncate">{tx(d.title)}</p>
                    <p className="text-[11px] text-muted">
                      {tl('Faiz %')}{tx(pct(rateOf(d)))} / ay · asgari %{tx(pct(minRateOf(d)))} ·{' '}
                      <span className={overdue ? 'text-rose-300' : ''}>
                        {overdue ? tl('ödeme tarihi geçti: ') : tl('son ödeme: ')}
                        {tx(formatTurkishDate(d.date))}
                      </span>
                    </p>
                  </div>
                  <div className="flex items-baseline justify-between gap-3 sm:block sm:text-right">
                    <p className="text-sm font-semibold text-fg tabular-nums">{tx(formatCurrencyTRY(d.amount))}</p>
                    <p className="text-[11px] text-muted tabular-nums">
                      faiz {tx(formatCurrencyTRY(interest))} · asgari {tx(formatCurrencyTRY(minimum))}
                    </p>
                  </div>
                  <div className="flex items-center gap-1">
                    <button onClick={() => payMinimum(d)} className="h-10 sm:h-8 flex-1 sm:flex-none px-3 text-xs text-white bg-brand hover:bg-brand-hover rounded-md">
                      {tl('Asgariyi öde')}
                    </button>
                    <button
                      onClick={() => onEdit(d)}
                      className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-md text-muted hover:text-fg hover:bg-surface-2"
                      aria-label={tl('{title} düzenle', { title: d.title })}
                    >
                      <Pencil className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={async () => (await confirmDelete(`"${d.title}" kredisi`)) && deleteTransaction(d.id)}
                      className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-md text-muted hover:text-rose-300 hover:bg-surface-2"
                      aria-label={`${d.title} sil`}
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </>
      )}
    </section>
  );
}
