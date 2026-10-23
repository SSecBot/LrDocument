'use client';

import { t, tx } from '@/lib/i18n';
import React, { useState } from 'react';
import { Check, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import { useAppStore } from '@/store/useAppStore';
import { addMonthsToDate, customerSummary, formatMonth, paymentSchedule } from '@/lib/customers';
import { formatCurrencyTRY, formatTurkishDate, toLocalDateString } from '@/lib/utils';
import type { Customer, CustomerPayment } from '@/types';
import { confirmDelete } from '@/components/ui/ConfirmDialog';

const fieldCls =
  'w-full h-10 bg-app border border-line rounded-md px-3 text-sm text-fg placeholder-muted focus:outline-none focus:border-line-strong disabled:opacity-60';
const labelCls = 'block text-xs font-medium text-subtle mb-1.5';

interface Props {
  /** null = new customer */
  customer: Customer | null;
  editable: boolean;
  onClose: () => void;
  onCreated: (id: string) => void;
}

type Draft = {
  name: string;
  contactName: string;
  phone: string;
  email: string;
  address: string;
  monthlyFee: string;
  paymentDay: string;
  startDate: string;
  endDate: string;
  notes: string;
};

function toDraft(c: Customer | null): Draft {
  const today = toLocalDateString(new Date());
  return {
    name: c?.name ?? '',
    contactName: c?.contactName ?? '',
    phone: c?.phone ?? '',
    email: c?.email ?? '',
    address: c?.address ?? '',
    monthlyFee: c ? String(c.monthlyFee) : '',
    paymentDay: String(c?.paymentDay ?? Number(today.slice(8, 10))),
    startDate: c?.startDate ?? today,
    // Default commitment: 12 months (last day before the same date a year later).
    endDate: c?.endDate ?? addMonthsToDate(today, 11),
    notes: c?.notes ?? '',
  };
}

export function CustomerModal({ customer, editable, onClose, onCreated }: Props) {
  const { addCustomer, updateCustomer, deleteCustomer, addToast, currentUser } = useAppStore();
  const [draft, setDraft] = useState<Draft>(() => toDraft(customer));
  const today = toLocalDateString(new Date());
  const set = (k: keyof Draft) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>) =>
    setDraft((d) => ({ ...d, [k]: e.target.value }));

  const save = (e: React.FormEvent) => {
    e.preventDefault();
    const fee = Number(draft.monthlyFee.replace(',', '.'));
    const day = Math.round(Number(draft.paymentDay));
    if (draft.name.trim().length < 2) return addToast({ type: 'error', title: t('Eksik bilgi'), message: t('Müşteri adı en az 2 karakter olmalı.') });
    if (!Number.isFinite(fee) || fee < 0) return addToast({ type: 'error', title: t('Geçersiz tutar'), message: t('Aylık ödeme 0 veya daha büyük bir sayı olmalı.') });
    if (!draft.startDate || !draft.endDate || draft.endDate < draft.startDate) {
      return addToast({ type: 'error', title: t('Geçersiz tarih'), message: t('Taahhüt bitişi başlangıçtan önce olamaz.') });
    }
    const data = {
      name: draft.name.trim(),
      contactName: draft.contactName.trim() || null,
      phone: draft.phone.trim() || null,
      email: draft.email.trim() || null,
      address: draft.address.trim() || null,
      monthlyFee: fee,
      paymentDay: Number.isFinite(day) ? Math.min(31, Math.max(1, day)) : 1,
      startDate: draft.startDate,
      endDate: draft.endDate,
      notes: draft.notes.trim() || null,
    };
    if (customer) {
      // Payments outside a shortened commitment are dropped.
      const months = new Set(paymentSchedule({ ...customer, ...data }, today).map((i) => i.month));
      updateCustomer(customer.id, { ...data, payments: customer.payments.filter((p) => months.has(p.month)) });
      addToast({ type: 'success', title: t('Kaydedildi'), message: t('{name} güncellendi.', { name: data.name }) });
    } else {
      const id = addCustomer({ ...data, payments: [] });
      if (id) {
        addToast({ type: 'success', title: t('Müşteri eklendi'), message: t('{name} için ödeme takibi başladı.', { name: data.name }) });
        onCreated(id);
      }
    }
  };

  const togglePaid = (month: string) => {
    if (!customer || !editable) return;
    const exists = customer.payments.some((p) => p.month === month);
    const payments: CustomerPayment[] = exists
      ? customer.payments.filter((p) => p.month !== month)
      : [...customer.payments, { month, paidAt: today, amount: customer.monthlyFee, ...(currentUser?.name ? { by: currentUser.name } : {}) }].sort((a, b) =>
          a.month.localeCompare(b.month)
        );
    updateCustomer(customer.id, { payments });
  };

  const schedule = customer ? paymentSchedule(customer, today) : [];
  const summary = customer ? customerSummary(customer, today) : null;

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={customer ? customer.name : t('Yeni müşteri')}
      subtitle={customer ? t('{v0} – {v1} taahhüt', { v0: formatTurkishDate(customer.startDate), v1: formatTurkishDate(customer.endDate) }) : t('İletişim, aylık ödeme ve taahhüt süresi')}
      maxWidth="max-w-3xl"
    >
      <div className="space-y-6">
        {summary && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
            <Mini label={t('Taahhüt tutarı')} value={formatCurrencyTRY(summary.contractValue)} />
            <Mini label={t('Tahsil edilen')} value={formatCurrencyTRY(summary.paidAmount)} />
            <Mini label={t('Geciken')} value={formatCurrencyTRY(summary.overdueAmount)} warn={summary.overdueAmount > 0} />
            <Mini label={t('Kalan')} value={formatCurrencyTRY(summary.remainingAmount)} />
          </div>
        )}

        {customer && (
          <section aria-label={t('Ödeme takibi')}>
            <div className="flex items-center justify-between mb-2">
              <h4 className="text-sm font-semibold text-fg">{t('Ödemeler')}</h4>
              <p className="text-[11px] text-muted">
                {editable ? t('Ödenen ayı işaretlemek için dokunun.') : t('Yalnızca görüntüleme.')}
              </p>
            </div>
            <ul className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
              {schedule.map((item) => (
                <li key={item.month}>
                  <button
                    type="button"
                    onClick={() => togglePaid(item.month)}
                    disabled={!editable}
                    aria-pressed={item.state === 'paid'}
                    className={`w-full text-left rounded-md border px-3 py-2 transition-colors disabled:cursor-default ${
                      item.state === 'paid'
                        ? 'bg-emerald-500/10 border-emerald-500/40'
                        : item.state === 'overdue'
                          ? 'bg-rose-500/10 border-rose-500/40 hover:border-rose-400'
                          : 'bg-surface-2 border-line hover:border-line-strong'
                    }`}
                  >
                    <span className="flex items-center justify-between text-xs font-medium text-fg">
                      {tx(formatMonth(item.month))}
                      {item.state === 'paid' && <Check className="w-3.5 h-3.5 text-emerald-300" />}
                    </span>
                    <span
                      className={`block text-[11px] mt-0.5 ${
                        item.state === 'paid' ? 'text-emerald-300' : item.state === 'overdue' ? 'text-rose-300' : 'text-muted'
                      }`}
                    >
                      {item.state === 'paid'
                        ? t('Ödendi · {v0}{v1}', { v0: formatTurkishDate(item.payment!.paidAt), v1: item.payment!.by ? ` · ${item.payment!.by}` : '' })
                        : item.state === 'overdue'
                          ? t('Gecikti · son gün {v0}', { v0: formatTurkishDate(item.due) })
                          : t('Son gün {v0}', { v0: formatTurkishDate(item.due) })}
                    </span>
                  </button>
                </li>
              ))}
            </ul>
          </section>
        )}

        <form onSubmit={save} className="space-y-4" aria-label={t('Müşteri bilgileri')}>
          {customer && <h4 className="text-sm font-semibold text-fg">{t('Bilgiler')}</h4>}
          <fieldset disabled={!editable} className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="c-name">{t('Müşteri / firma adı')}</label>
              <input id="c-name" className={fieldCls} value={draft.name} onChange={set('name')} maxLength={200} required />
            </div>
            <div>
              <label className={labelCls} htmlFor="c-contact">{t('Yetkili kişi')}</label>
              <input id="c-contact" className={fieldCls} value={draft.contactName} onChange={set('contactName')} maxLength={200} />
            </div>
            <div>
              <label className={labelCls} htmlFor="c-phone">{t('Telefon')}</label>
              <input id="c-phone" type="tel" className={fieldCls} value={draft.phone} onChange={set('phone')} maxLength={40} />
            </div>
            <div>
              <label className={labelCls} htmlFor="c-email">{t('E-posta')}</label>
              <input id="c-email" type="email" className={fieldCls} value={draft.email} onChange={set('email')} maxLength={254} />
            </div>
            <div>
              <label className={labelCls} htmlFor="c-address">{t('Adres')}</label>
              <input id="c-address" className={fieldCls} value={draft.address} onChange={set('address')} maxLength={1000} />
            </div>
            <div>
              <label className={labelCls} htmlFor="c-fee">{t('Aylık ödeme (TL)')}</label>
              <input id="c-fee" inputMode="decimal" className={fieldCls} value={draft.monthlyFee} onChange={set('monthlyFee')} required />
            </div>
            <div>
              <label className={labelCls} htmlFor="c-day">{t('Ödeme günü (ayın kaçı)')}</label>
              <input id="c-day" type="number" min={1} max={31} className={fieldCls} value={draft.paymentDay} onChange={set('paymentDay')} required />
            </div>
            <div>
              <label className={labelCls} htmlFor="c-start">{t('Taahhüt başlangıcı')}</label>
              <input id="c-start" type="date" className={fieldCls} value={draft.startDate} onChange={set('startDate')} required />
            </div>
            <div>
              <label className={labelCls} htmlFor="c-end">{t('Taahhüt bitişi')}</label>
              <input id="c-end" type="date" className={fieldCls} value={draft.endDate} min={draft.startDate} onChange={set('endDate')} required />
            </div>
            <div className="sm:col-span-2">
              <label className={labelCls} htmlFor="c-notes">{t('Not')}</label>
              <textarea
                id="c-notes"
                rows={3}
                className={`${fieldCls} h-auto py-2`}
                value={draft.notes}
                onChange={set('notes')}
                maxLength={5000}
              />
            </div>
          </fieldset>

          {editable && (
            <div className="modal-actions flex items-center justify-between gap-3">
              {customer ? (
                <button
                  type="button"
                  onClick={async () => {
                    if (!(await confirmDelete(t('"{name}" müşterisi', { name: customer.name }), t('Müşteri ve ödeme geçmişi silinir. Birkaç saniye içinde “Geri al” ile geri getirebilirsiniz.')))) return;
                    deleteCustomer(customer.id);
                    onClose();
                  }}
                  className="h-10 px-3 rounded-md text-sm text-rose-300 hover:bg-rose-500/10 inline-flex items-center gap-2"
                >
                  <Trash2 className="w-4 h-4" />{' '}{t('Sil')}
                </button>
              ) : (
                <span />
              )}
              <button type="submit" className="h-10 px-4 rounded-md bg-brand hover:bg-brand-hover text-white text-sm font-medium">
                {customer ? t('Bilgileri kaydet') : t('Müşteriyi ekle')}
              </button>
            </div>
          )}
        </form>
      </div>
    </Modal>
  );
}

function Mini({ label, value, warn }: { label: string; value: string; warn?: boolean }) {
  return (
    <div className="rounded-md bg-surface-2 border border-line px-3 py-2">
      <p className="text-[11px] text-muted">{tx(label)}</p>
      <p className={`text-sm font-semibold tabular-nums ${warn ? 'text-rose-300' : 'text-fg'}`}>{tx(value)}</p>
    </div>
  );
}
