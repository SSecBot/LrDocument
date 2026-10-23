'use client';

import { t as tl, tx } from '@/lib/i18n';
import React, { useState } from 'react';
import Link from 'next/link';
import { Check, Lock, RefreshCw } from 'lucide-react';
import { PaymentLogos } from './PaymentLogos';
import { ACCOUNT_TYPE_LABEL, ACCOUNT_TYPES, ONE_TIME_NOTE, RENEWAL_NOTE, clampSeats, formatTL, seatPrice, type AccountType, type PricingSettings } from '@/lib/pricing';

const COMMON = ['Tüm modüller: notlar, görevler, kanban, takvim, finans', 'Telefon, tablet ve bilgisayarda çalışır', 'Verileriniz şifreli ve yalnızca hesabınızda'];

export function PricingPlans({ pricing }: { pricing: PricingSettings }) {
  const [type, setType] = useState<AccountType>('STANDARD');
  const [seatsInput, setSeatsInput] = useState('10');
  const seats = clampSeats(seatsInput, pricing);
  const student = type === 'STUDENT';
  const corporate = type === 'CORPORATE';

  const query = (plan: string) => {
    const q = new URLSearchParams({ plan });
    if (student) q.set('ogrenci', '1');
    if (corporate) {
      q.set('tur', 'kurumsal');
      q.set('kisi', String(seats));
    }
    return `/register?${q.toString()}`;
  };
  const extra = student ? [tl('Ders takibi: devamsızlık, not, AGNO, sınav takvimi')] : corporate ? [tl('{seats} kişilik kullanım', { seats })] : [];
  const tabLabel = (t: AccountType) =>
    t === 'STUDENT' && pricing.studentDiscountPercent > 0
      ? `${tx(ACCOUNT_TYPE_LABEL[t])} · %${pricing.studentDiscountPercent}`
      : ACCOUNT_TYPE_LABEL[t];

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg bg-surface border border-line p-1" role="group" aria-label={tl('Hesap türü')}>
          {ACCOUNT_TYPES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={type === value}
              onClick={() => setType(value)}
              className={`h-9 px-3 sm:px-4 rounded-md text-[13px] transition-colors ${type === value ? 'bg-surface-3 text-fg' : 'text-subtle hover:text-fg'}`}
            >
              {tx(tabLabel(value))}
            </button>
          ))}
        </div>
      </div>

      {corporate && (
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
          <label htmlFor="landing-seats" className="text-subtle">
            {tl('Kişi sayısı')}
          </label>
          <input
            id="landing-seats"
            type="number"
            inputMode="numeric"
            min={pricing.corporateMinSeats}
            max={pricing.corporateMaxSeats}
            value={seatsInput}
            onChange={(e) => setSeatsInput(e.target.value)}
            onBlur={() => setSeatsInput(String(seats))}
            className="w-24 h-9 rounded-md bg-surface border border-line-strong px-3 text-fg tabular-nums focus:outline-none focus:border-brand"
          />
          <span className="text-xs text-muted">{tl('Kişi başı normal fiyatın %')}{pricing.corporatePercent}’i</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 max-w-4xl mx-auto">
        <Plan
          name="Aylık"
          price={seatPrice('Aylık', type, pricing) * (corporate ? seats : 1)}
          unit="/ ay"
          billing={RENEWAL_NOTE}
          detail={corporate ? tl('{seats} × {v1} kişi başı', { seats, v1: formatTL(seatPrice('Aylık', type, pricing)) }) : undefined}
          note={tl('Taahhüt yok; iptal edince dönem sonuna kadar kullanmaya devam edersiniz.')}
          features={[...COMMON, ...extra]}
          href={query('aylik')}
          cta={tl('Aylık plan ile başla')}
        />
        <Plan
          highlight
          name="Ömür boyu"
          price={seatPrice('Tek Seferlik', type, pricing) * (corporate ? seats : 1)}
          unit="tek seferlik"
          billing={ONE_TIME_NOTE}
          detail={corporate ? tl('{seats} × {v1} kişi başı', { seats, v1: formatTL(seatPrice('Tek Seferlik', type, pricing)) }) : undefined}
          note={tl('Bir kez ödeyin; sonraki güncellemeler dahil.')}
          features={[...COMMON, ...extra, tl('Aylık ödeme yok')]}
          href={query('omur')}
          cta={tl('Ömür boyu erişim al')}
        />
      </div>
      <p className="text-center text-xs text-muted">
        {student
          ? tl('Öğrenci indirimi için kayıtta üniversite uzantılı e-posta adresiniz (ör. @ogr.universite.edu.tr) istenir.')
          : corporate
            ? tl('Kurumsal paketler {corporateMinSeats}–{corporateMaxSeats} kişi arasıdır; kayıtta kurum adı istenir.', { corporateMinSeats: pricing.corporateMinSeats, corporateMaxSeats: pricing.corporateMaxSeats })
            : tl('Kayıt talebiniz onaylandığında ödeme ve hesap açılışı için e-posta ile iletişime geçilir.')}
      </p>
      <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 sm:gap-4 text-xs text-muted">
        <span className="inline-flex items-center gap-1.5">
          <Lock className="w-3.5 h-3.5" />{' '}{tl('iyzico ile güvenli ödeme · Visa ve Mastercard')}
        </span>
        <PaymentLogos />
        <span>
          <Link href="/mesafeli-satis" className="hover:text-fg underline underline-offset-2">{tl('Mesafeli satış')}</Link>
          {' · '}
          <Link href="/teslimat-ve-iade" className="hover:text-fg underline underline-offset-2">{tl('Teslimat ve iade')}</Link>
        </span>
      </div>
    </div>
  );
}

function Plan(props: {
  name: string;
  price: number;
  unit: string;
  /** Renewal terms, right under the price. */
  billing: string;
  detail?: string;
  note: string;
  features: string[];
  href: string;
  cta: string;
  highlight?: boolean;
}) {
  return (
    <div
      className={`relative rounded-2xl p-6 flex flex-col gap-5 border ${
        props.highlight ? 'bg-surface-2 border-brand-line ring-1 ring-brand/40' : 'bg-surface border-line'
      }`}
    >
      {props.highlight && (
        <span className="absolute -top-3 left-6 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-brand text-white">{tl('En avantajlı')}</span>
      )}
      <div>
        <p className="text-sm font-medium text-body">{tx(props.name)}</p>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="text-4xl font-semibold tracking-tight text-fg tabular-nums">{tx(formatTL(props.price))}</span>
          <span className="text-xs text-muted">{tx(props.unit)}</span>
        </p>
        <p className="mt-1.5 inline-flex items-center gap-1.5 text-xs font-medium text-body">
          <RefreshCw className="w-3.5 h-3.5 text-brand-light shrink-0" aria-hidden /> {tx(props.billing)}
        </p>
        {props.detail && <p className="mt-1 text-xs text-subtle tabular-nums">{tx(props.detail)}</p>}
        <p className="mt-1 text-xs text-subtle">{tx(props.note)}</p>
      </div>
      <ul className="space-y-2.5 text-[13px] text-body flex-1">
        {props.features.map((f) => (
          <li key={f} className="flex gap-2.5">
            <Check className="w-4 h-4 mt-0.5 text-brand-light shrink-0" />
            <span>{tx(f)}</span>
          </li>
        ))}
      </ul>
      <Link
        href={props.href}
        className={`h-11 rounded-lg text-sm font-medium inline-flex items-center justify-center transition-colors ${
          props.highlight ? 'bg-brand hover:bg-brand-hover text-white' : 'bg-surface-3 hover:bg-surface-4 text-fg border border-line-strong'
        }`}
      >
        {tx(props.cta)}
      </Link>
    </div>
  );
}
