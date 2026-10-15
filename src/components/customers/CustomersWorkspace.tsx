'use client';

import React, { useMemo, useState } from 'react';
import { AlertTriangle, Building2, Mail, Phone, Plus, Search, User } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { canEdit } from '@/lib/corporate';
import { customerSummary, formatMonth } from '@/lib/customers';
import { formatCurrencyTRY, formatTurkishDate, toLocalDateString } from '@/lib/utils';
import type { Customer } from '@/types';
import { CustomerModal } from './CustomerModal';

type Filter = 'all' | 'overdue' | 'active' | 'ended';

const FILTERS: { id: Filter; label: string }[] = [
  { id: 'all', label: 'Tümü' },
  { id: 'overdue', label: 'Ödemesi gecikenler' },
  { id: 'active', label: 'Taahhüdü sürenler' },
  { id: 'ended', label: 'Taahhüdü bitenler' },
];

/** Kurumsal › Müşteriler: monthly fee, contact and commitment; payments tracked month by month. */
export function CustomersWorkspace() {
  const { customers, currentUser } = useAppStore();
  const editable = canEdit(currentUser, 'customers');
  const today = toLocalDateString(new Date());
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('all');
  const [openId, setOpenId] = useState<string | 'new' | null>(null);

  const rows = useMemo(
    () =>
      customers
        .map((c) => ({ c, s: customerSummary(c, today) }))
        .sort((a, b) => b.s.overdueMonths - a.s.overdueMonths || a.c.name.localeCompare(b.c.name, 'tr')),
    [customers, today]
  );

  const thisMonth = today.slice(0, 7);
  const totals = useMemo(() => {
    let expected = 0;
    let collected = 0;
    let overdue = 0;
    let overdueCount = 0;
    let active = 0;
    for (const { c, s } of rows) {
      if (s.active) {
        active++;
        expected += c.monthlyFee;
      }
      collected += c.payments.filter((p) => p.paidAt.slice(0, 7) === thisMonth).reduce((sum, p) => sum + p.amount, 0);
      overdue += s.overdueAmount;
      if (s.overdueMonths > 0) overdueCount++;
    }
    return { expected, collected, overdue, overdueCount, active };
  }, [rows, thisMonth]);

  const q = query.trim().toLocaleLowerCase('tr-TR');
  const visible = rows.filter(({ c, s }) => {
    if (filter === 'overdue' && s.overdueMonths === 0) return false;
    if (filter === 'active' && !s.active) return false;
    if (filter === 'ended' && !s.ended) return false;
    if (!q) return true;
    return [c.name, c.contactName, c.phone, c.email].some((v) => v?.toLocaleLowerCase('tr-TR').includes(q));
  });

  const open: Customer | null = openId && openId !== 'new' ? customers.find((c) => c.id === openId) ?? null : null;

  return (
    <div className="flex-1 overflow-y-auto bg-app p-4 sm:p-5">
      <div className="max-w-6xl mx-auto space-y-5">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-10 h-10 rounded-lg bg-brand flex items-center justify-center shrink-0">
              <Building2 className="w-5 h-5 text-white" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg sm:text-xl font-semibold text-fg tracking-tight">Müşteriler</h1>
              <p className="text-xs text-muted">Aylık ödeme, iletişim ve taahhüt süresi; ödemeler ay ay takip edilir.</p>
            </div>
          </div>
          {editable && (
            <button
              onClick={() => setOpenId('new')}
              className="h-10 px-4 rounded-md bg-brand hover:bg-brand-hover text-white text-sm font-medium inline-flex items-center gap-2"
            >
              <Plus className="w-4 h-4" /> Yeni müşteri
            </button>
          )}
        </div>

        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          <Stat label="Taahhüdü süren" value={String(totals.active)} />
          <Stat label="Aylık beklenen" value={formatCurrencyTRY(totals.expected)} />
          <Stat label={`${formatMonth(thisMonth)} tahsilatı`} value={formatCurrencyTRY(totals.collected)} />
          <Stat
            label="Geciken ödeme"
            value={formatCurrencyTRY(totals.overdue)}
            hint={totals.overdueCount ? `${totals.overdueCount} müşteri` : undefined}
            warn={totals.overdue > 0}
          />
        </div>

        <div className="flex flex-col sm:flex-row gap-2 sm:items-center">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-muted" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Müşteri, yetkili, telefon veya e-posta ara…"
              aria-label="Müşteri ara"
              className="w-full h-10 bg-surface border border-line rounded-md pl-9 pr-3 text-sm text-fg placeholder-muted focus:outline-none focus:border-line-strong"
            />
          </div>
          <div className="flex gap-1 overflow-x-auto no-scrollbar" role="tablist" aria-label="Filtre">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                role="tab"
                aria-selected={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={`h-9 px-3 rounded-md text-xs whitespace-nowrap border transition-colors ${
                  filter === f.id ? 'bg-surface-3 border-line-strong text-fg' : 'border-line text-subtle hover:text-fg hover:bg-surface-2'
                }`}
              >
                {f.label}
              </button>
            ))}
          </div>
        </div>

        {visible.length === 0 ? (
          <div className="rounded-lg border border-dashed border-line p-10 text-center text-sm text-muted">
            {customers.length === 0
              ? editable
                ? 'Henüz müşteri yok. “Yeni müşteri” ile ilk kaydı ekleyin.'
                : 'Henüz müşteri eklenmemiş.'
              : 'Bu filtreye uyan müşteri yok.'}
          </div>
        ) : (
          <ul className="grid gap-3 md:grid-cols-2">
            {visible.map(({ c, s }) => {
              const progress = s.totalMonths ? Math.round((s.paidMonths / s.totalMonths) * 100) : 0;
              return (
                <li key={c.id}>
                  <button
                    onClick={() => setOpenId(c.id)}
                    className="w-full text-left rounded-lg bg-surface border border-line hover:border-line-strong p-4 space-y-3 transition-colors"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-fg truncate">{c.name}</p>
                        <p className="text-xs text-muted mt-0.5 flex flex-wrap gap-x-3 gap-y-1">
                          {c.contactName && (
                            <span className="inline-flex items-center gap-1">
                              <User className="w-3 h-3" /> {c.contactName}
                            </span>
                          )}
                          {c.phone && (
                            <span className="inline-flex items-center gap-1">
                              <Phone className="w-3 h-3" /> {c.phone}
                            </span>
                          )}
                          {c.email && (
                            <span className="inline-flex items-center gap-1 min-w-0">
                              <Mail className="w-3 h-3" /> <span className="truncate">{c.email}</span>
                            </span>
                          )}
                        </p>
                      </div>
                      <div className="text-right shrink-0">
                        <p className="text-sm font-semibold text-fg tabular-nums">{formatCurrencyTRY(c.monthlyFee)}</p>
                        <p className="text-[11px] text-muted">aylık · her ayın {c.paymentDay}. günü</p>
                      </div>
                    </div>

                    <div>
                      <div className="flex justify-between text-[11px] text-muted mb-1">
                        <span>
                          {formatTurkishDate(c.startDate)} – {formatTurkishDate(c.endDate)}
                        </span>
                        <span className="tabular-nums">
                          {s.paidMonths}/{s.totalMonths} ay ödendi
                        </span>
                      </div>
                      <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden" aria-hidden="true">
                        <div className="h-full bg-brand" style={{ width: `${progress}%` }} />
                      </div>
                    </div>

                    <div className="flex flex-wrap items-center gap-2 text-[11px]">
                      {s.overdueMonths > 0 ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-rose-500/10 text-rose-300 border border-rose-500/30">
                          <AlertTriangle className="w-3 h-3" /> {s.overdueMonths} ay gecikti · {formatCurrencyTRY(s.overdueAmount)}
                        </span>
                      ) : s.ended ? (
                        <span className="px-2 py-0.5 rounded-full bg-surface-3 text-subtle">Taahhüt bitti</span>
                      ) : (
                        <span className="px-2 py-0.5 rounded-full bg-emerald-500/10 text-emerald-300 border border-emerald-500/30">Ödemeler güncel</span>
                      )}
                      {s.nextDue && <span className="text-muted">Sonraki: {formatTurkishDate(s.nextDue.due)}</span>}
                    </div>
                  </button>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      {openId && (
        <CustomerModal
          key={openId}
          customer={open}
          editable={editable}
          onClose={() => setOpenId(null)}
          onCreated={(id) => setOpenId(id)}
        />
      )}
    </div>
  );
}

function Stat({ label, value, hint, warn }: { label: string; value: string; hint?: string; warn?: boolean }) {
  return (
    <div className="rounded-lg bg-surface border border-line p-3.5">
      <p className="text-[11px] text-muted">{label}</p>
      <p className={`text-base sm:text-lg font-semibold tabular-nums mt-1 ${warn ? 'text-rose-300' : 'text-fg'}`}>{value}</p>
      {hint && <p className="text-[11px] text-muted mt-0.5">{hint}</p>}
    </div>
  );
}
