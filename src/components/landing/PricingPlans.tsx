'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { ACCOUNT_TYPE_LABEL, ACCOUNT_TYPES, clampSeats, formatTL, seatPrice, type AccountType, type PricingSettings } from '@/lib/pricing';

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
  const extra = student ? ['Ders takibi: devamsızlık, not, AGNO, sınav takvimi'] : corporate ? [`${seats} kişilik kullanım`] : [];
  const tabLabel = (t: AccountType) =>
    t === 'STUDENT' && pricing.studentDiscountPercent > 0
      ? `${ACCOUNT_TYPE_LABEL[t]} · %${pricing.studentDiscountPercent}`
      : ACCOUNT_TYPE_LABEL[t];

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg bg-surface border border-line p-1" role="group" aria-label="Hesap türü">
          {ACCOUNT_TYPES.map((value) => (
            <button
              key={value}
              type="button"
              aria-pressed={type === value}
              onClick={() => setType(value)}
              className={`h-9 px-3 sm:px-4 rounded-md text-[13px] transition-colors ${type === value ? 'bg-surface-3 text-fg' : 'text-subtle hover:text-fg'}`}
            >
              {tabLabel(value)}
            </button>
          ))}
        </div>
      </div>

      {corporate && (
        <div className="flex flex-wrap items-center justify-center gap-3 text-sm">
          <label htmlFor="landing-seats" className="text-subtle">
            Kişi sayısı
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
          <span className="text-xs text-muted">Kişi başı normal fiyatın %{pricing.corporatePercent}’i</span>
        </div>
      )}

      <div className="grid gap-4 md:grid-cols-2 max-w-4xl mx-auto">
        <Plan
          name="Aylık"
          price={seatPrice('Aylık', type, pricing) * (corporate ? seats : 1)}
          unit="/ ay"
          detail={corporate ? `${seats} × ${formatTL(seatPrice('Aylık', type, pricing))} kişi başı` : undefined}
          note="İstediğiniz zaman bırakabilirsiniz."
          features={[...COMMON, ...extra]}
          href={query('aylik')}
          cta="Aylık plan ile başla"
        />
        <Plan
          highlight
          name="Ömür boyu"
          price={seatPrice('Tek Seferlik', type, pricing) * (corporate ? seats : 1)}
          unit="tek seferlik"
          detail={corporate ? `${seats} × ${formatTL(seatPrice('Tek Seferlik', type, pricing))} kişi başı` : undefined}
          note="Bir kez ödeyin; sonraki güncellemeler dahil."
          features={[...COMMON, ...extra, 'Aylık ödeme yok']}
          href={query('omur')}
          cta="Ömür boyu erişim al"
        />
      </div>
      <p className="text-center text-xs text-muted">
        {student
          ? 'Öğrenci indirimi için kayıtta üniversite uzantılı e-posta adresiniz (ör. @ogr.universite.edu.tr) istenir.'
          : corporate
            ? `Kurumsal paketler ${pricing.corporateMinSeats}–${pricing.corporateMaxSeats} kişi arasıdır; kayıtta kurum adı istenir.`
            : 'Kayıt talebiniz onaylandığında ödeme ve hesap açılışı için e-posta ile iletişime geçilir.'}
      </p>
    </div>
  );
}

function Plan(props: {
  name: string;
  price: number;
  unit: string;
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
        <span className="absolute -top-3 left-6 text-[11px] font-medium px-2.5 py-0.5 rounded-full bg-brand text-white">En avantajlı</span>
      )}
      <div>
        <p className="text-sm font-medium text-body">{props.name}</p>
        <p className="mt-2 flex items-baseline gap-2">
          <span className="text-4xl font-semibold tracking-tight text-fg tabular-nums">{formatTL(props.price)}</span>
          <span className="text-xs text-muted">{props.unit}</span>
        </p>
        {props.detail && <p className="mt-1 text-xs text-subtle tabular-nums">{props.detail}</p>}
        <p className="mt-1 text-xs text-subtle">{props.note}</p>
      </div>
      <ul className="space-y-2.5 text-[13px] text-body flex-1">
        {props.features.map((f) => (
          <li key={f} className="flex gap-2.5">
            <Check className="w-4 h-4 mt-0.5 text-brand-light shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link
        href={props.href}
        className={`h-11 rounded-lg text-sm font-medium inline-flex items-center justify-center transition-colors ${
          props.highlight ? 'bg-brand hover:bg-brand-hover text-white' : 'bg-surface-3 hover:bg-surface-4 text-fg border border-line-strong'
        }`}
      >
        {props.cta}
      </Link>
    </div>
  );
}
