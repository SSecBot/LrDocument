'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Check } from 'lucide-react';
import { planPrice, type AccountType } from '@/lib/pricing';

const COMMON = ['Tüm modüller: notlar, görevler, kanban, takvim, medya, finans', 'Telefon, tablet ve bilgisayarda çalışır', 'Verileriniz yalnızca hesabınızda'];

export function PricingPlans() {
  const [type, setType] = useState<AccountType>('STANDARD');
  const student = type === 'STUDENT';
  const query = (plan: string) => `/register?plan=${plan}${student ? '&ogrenci=1' : ''}`;

  return (
    <div className="space-y-6">
      <div className="flex justify-center">
        <div className="inline-flex rounded-lg bg-surface border border-line p-1" role="group" aria-label="Hesap türü">
          {(
            [
              ['STANDARD', 'Standart'],
              ['STUDENT', 'Üniversite öğrencisi · %50'],
            ] as const
          ).map(([value, label]) => (
            <button
              key={value}
              type="button"
              aria-pressed={type === value}
              onClick={() => setType(value)}
              className={`h-9 px-4 rounded-md text-[13px] transition-colors ${type === value ? 'bg-surface-3 text-fg' : 'text-subtle hover:text-fg'}`}
            >
              {label}
            </button>
          ))}
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-2 max-w-4xl mx-auto">
        <Plan
          name="Aylık"
          price={planPrice('Aylık', type)}
          unit="/ ay"
          note="İstediğiniz zaman bırakabilirsiniz."
          features={[...COMMON, ...(student ? ['Ders takibi: devamsızlık, not, AGNO, sınav takvimi'] : [])]}
          href={query('aylik')}
          cta="Aylık plan ile başla"
        />
        <Plan
          highlight
          name="Ömür boyu"
          price={planPrice('Tek Seferlik', type)}
          unit="tek seferlik"
          note="Bir kez ödeyin; sonraki güncellemeler dahil."
          features={[...COMMON, ...(student ? ['Ders takibi: devamsızlık, not, AGNO, sınav takvimi'] : []), 'Aylık ödeme yok']}
          href={query('omur')}
          cta="Ömür boyu erişim al"
        />
      </div>
      <p className="text-center text-xs text-muted">
        {student
          ? 'Öğrenci indirimi için kayıtta üniversite uzantılı e-posta adresiniz (ör. @ogr.ktu.edu.tr) istenir.'
          : 'Kayıt talebiniz onaylandığında ödeme ve hesap açılışı için e-posta ile iletişime geçilir.'}
      </p>
    </div>
  );
}

function Plan(props: { name: string; price: number; unit: string; note: string; features: string[]; href: string; cta: string; highlight?: boolean }) {
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
          <span className="text-4xl font-semibold tracking-tight text-fg tabular-nums">{props.price} TL</span>
          <span className="text-xs text-muted">{props.unit}</span>
        </p>
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
