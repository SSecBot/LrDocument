'use client';

import React, { useState } from 'react';
import {
  ArrowRight,
  ArrowRightLeft,
  CalendarDays,
  ChevronLeft,
  ChevronRight,
  GraduationCap,
  Pin,
  RefreshCw,
  TrendingDown,
  TrendingUp,
  Wallet,
  type LucideIcon,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { canView } from '@/lib/corporate';
import { hasStudentAccess } from '@/lib/access';
import { buildCalendarFeed } from '@/lib/calendarFeed';
import { getTransactionsForMonth, isTransactionActiveOnDate } from '@/lib/recurringFinance';
import { attendanceStatus, countdownLabel, summarizeAll, summarizeTerm, upcomingExams } from '@/lib/academic/grading';
import { useAcademicSnapshot } from '@/components/academic/useAcademicSnapshot';
import { useSwipe } from '@/lib/shortcuts';
import { formatCurrencyTRY, getRelativeTimeTurkish, toLocalDateString } from '@/lib/utils';

// ---------------------------------------------------------------------------
// Genel bakış widgets: aylık takvim, döviz kurları, akademik durum, finans analizi, sabit notlar.
// ---------------------------------------------------------------------------

export function WidgetCard({
  icon: Icon,
  title,
  action,
  onAction,
  children,
}: {
  icon: LucideIcon;
  title: string;
  action?: string;
  onAction?: () => void;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-surface border border-line rounded-xl h-full flex flex-col">
      <header className="flex items-center justify-between px-4 h-11 border-b border-line shrink-0">
        <h2 className="text-sm font-semibold text-fg flex items-center gap-2">
          <Icon className="w-4 h-4 text-subtle" />
          {title}
        </h2>
        {action && onAction && (
          <button onClick={onAction} className="text-xs text-subtle hover:text-fg flex items-center gap-1 h-8">
            {action} <ArrowRight className="w-3 h-3" />
          </button>
        )}
      </header>
      <div className="flex-1 min-h-0">{children}</div>
    </section>
  );
}

const WEEKDAYS = ['Pt', 'Sa', 'Ça', 'Pe', 'Cu', 'Ct', 'Pz'];
const MONTHS = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

type DayItem = { kind: 'event' | 'task' | 'finance' | 'school'; title: string; time?: string };
const KIND_DOT: Record<DayItem['kind'], string> = {
  event: 'bg-sky-400',
  task: 'bg-amber-400',
  finance: 'bg-emerald-400',
  school: 'bg-violet-400',
};
const KIND_LABEL: Record<DayItem['kind'], string> = { event: 'Etkinlik', task: 'Görev', finance: 'Ödeme', school: 'Okul' };

/** Aylık takvim: dots for events, task deadlines, payment days and (students) exams / holidays. */
export function MonthCalendarWidget() {
  const { events, tasks, transactions, currentUser, setActiveTab, preferences } = useAppStore();
  const today = toLocalDateString();
  const [cursor, setCursor] = useState(() => ({ y: Number(today.slice(0, 4)), m: Number(today.slice(5, 7)) - 1 }));
  const [selected, setSelected] = useState(today);
  const academic = useAcademicSnapshot(hasStudentAccess(currentUser));

  const days = new Date(cursor.y, cursor.m + 1, 0).getDate();
  const lead = (new Date(cursor.y, cursor.m, 1).getDay() + 6) % 7;
  const start = iso(cursor.y, cursor.m, 1);
  const end = iso(cursor.y, cursor.m, days);

  const byDate = new Map<string, DayItem[]>();
  const add = (date: string, item: DayItem) => {
    if (date < start || date > end) return;
    byDate.set(date, [...(byDate.get(date) ?? []), item]);
  };
  if (canView(currentUser, 'calendar')) {
    for (const e of events) if (e.status !== 'iptal') add(e.date, { kind: 'event', title: e.title, time: e.time });
  }
  if (canView(currentUser, 'work')) {
    for (const t of tasks) if (!t.completed && t.dueDate) add(t.dueDate, { kind: 'task', title: t.title });
  }
  if (canView(currentUser, 'finance')) {
    for (const t of transactions) {
      if (t.isRecurring) {
        if (t.recurringFrequency === 'gunluk') continue;
        for (let d = 1; d <= days; d++) if (isTransactionActiveOnDate(t, iso(cursor.y, cursor.m, d))) add(iso(cursor.y, cursor.m, d), { kind: 'finance', title: t.title });
      } else if (!t.isConfirmed || t.isDebt) add(t.date, { kind: 'finance', title: t.title });
    }
  }
  const feed = buildCalendarFeed({ start, end, today, academic });
  for (const [date, items] of feed) {
    for (const f of items) if (f.layer === 'sinav' || f.layer === 'resmi' || (f.layer === 'akademik' && f.dayLabel)) add(date, { kind: 'school', title: f.title, time: f.time });
  }

  const move = (step: number) =>
    setCursor((c) => {
      const d = new Date(c.y, c.m + step, 1);
      return { y: d.getFullYear(), m: d.getMonth() };
    });
  const list = byDate.get(selected) ?? [];
  const swipe = useSwipe<HTMLDivElement>({ onLeft: () => move(1), onRight: () => move(-1), enabled: preferences.touchGestures });

  return (
    <WidgetCard icon={CalendarDays} title="Aylık takvim" action="Takvim" onAction={() => setActiveTab('calendar')}>
      <div ref={swipe} className="p-3 space-y-2">
        <div className="flex items-center justify-between">
          <button onClick={() => move(-1)} className="w-9 h-9 rounded-md inline-flex items-center justify-center text-subtle hover:bg-surface-2" aria-label="Önceki ay">
            <ChevronLeft className="w-4 h-4" />
          </button>
          <span className="text-sm font-medium text-fg">
            {MONTHS[cursor.m]} {cursor.y}
          </span>
          <button onClick={() => move(1)} className="w-9 h-9 rounded-md inline-flex items-center justify-center text-subtle hover:bg-surface-2" aria-label="Sonraki ay">
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>
        <div className="grid grid-cols-7 gap-0.5 text-center" role="grid" aria-label={`${MONTHS[cursor.m]} ${cursor.y}`}>
          {WEEKDAYS.map((w) => (
            <span key={w} className="text-[10px] text-muted py-1">
              {w}
            </span>
          ))}
          {Array.from({ length: lead }, (_, i) => (
            <span key={`e${i}`} />
          ))}
          {Array.from({ length: days }, (_, i) => {
            const date = iso(cursor.y, cursor.m, i + 1);
            const items = byDate.get(date) ?? [];
            const kinds = [...new Set(items.map((x) => x.kind))];
            return (
              <button
                key={date}
                onClick={() => setSelected(date)}
                aria-label={`${i + 1} ${MONTHS[cursor.m]}${items.length ? `, ${items.length} kayıt` : ''}`}
                aria-pressed={selected === date}
                className={`h-10 rounded-md flex flex-col items-center justify-center gap-0.5 text-xs transition-colors ${
                  selected === date ? 'bg-brand/20 text-fg ring-1 ring-brand' : date === today ? 'bg-surface-3 text-fg font-semibold' : 'text-body hover:bg-surface-2'
                }`}
              >
                {i + 1}
                <span className="flex gap-0.5 h-1.5">
                  {kinds.slice(0, 4).map((k) => (
                    <span key={k} className={`w-1.5 h-1.5 rounded-full ${KIND_DOT[k]}`} />
                  ))}
                </span>
              </button>
            );
          })}
        </div>
        <div className="border-t border-line pt-2 min-h-[3rem]">
          {list.length === 0 ? (
            <p className="text-[11px] text-muted px-1">Bu günde kayıt yok.</p>
          ) : (
            <ul className="space-y-1 max-h-32 overflow-y-auto">
              {list.map((x, i) => (
                <li key={i} className="flex items-center gap-2 text-xs px-1">
                  <span className={`w-1.5 h-1.5 rounded-full shrink-0 ${KIND_DOT[x.kind]}`} />
                  <span className="text-muted shrink-0 w-14">{x.time || KIND_LABEL[x.kind]}</span>
                  <span className="text-body truncate">{x.title}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </WidgetCard>
  );
}

/** Döviz kurları: live USD / EUR with a quick converter. */
export function ExchangeWidget() {
  const { exchangeRates, fetchExchangeRates } = useAppStore();
  const [amount, setAmount] = useState('100');
  const [cur, setCur] = useState<'USD' | 'EUR'>('USD');
  const [busy, setBusy] = useState(false);
  const rate = exchangeRates[cur] + (exchangeRates.markupTRY || 0);
  const n = Number(amount.replace(',', '.')) || 0;
  const refresh = async () => {
    setBusy(true);
    await fetchExchangeRates().catch(() => {});
    setBusy(false);
  };
  return (
    <WidgetCard icon={ArrowRightLeft} title="Döviz kurları">
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-2 gap-2">
          {(['USD', 'EUR'] as const).map((c) => (
            <div key={c} className="rounded-lg bg-surface-2 border border-line px-3 py-2">
              <p className="text-[11px] text-muted">{c === 'USD' ? '1 Dolar' : '1 Euro'}</p>
              <p className="text-lg font-semibold text-fg tabular-nums">{exchangeRates[c].toLocaleString('tr-TR', { minimumFractionDigits: 2, maximumFractionDigits: 4 })} ₺</p>
            </div>
          ))}
        </div>
        <div className="flex items-center gap-2">
          <input
            inputMode="decimal"
            value={amount}
            onChange={(e) => setAmount(e.target.value.replace(/[^\d.,]/g, '').slice(0, 14))}
            className="w-24 min-w-0 flex-1 h-10 bg-surface-2 border border-line rounded-lg px-3 text-sm text-fg focus:outline-none focus:border-brand"
            aria-label="Tutar"
          />
          <select
            value={cur}
            onChange={(e) => setCur(e.target.value as 'USD' | 'EUR')}
            className="h-10 bg-surface-2 border border-line rounded-lg px-2 text-sm text-fg"
            aria-label="Para birimi"
          >
            <option value="USD">USD</option>
            <option value="EUR">EUR</option>
          </select>
          <span className="text-sm text-muted">=</span>
          <span className="text-sm font-semibold text-fg tabular-nums truncate">{formatCurrencyTRY(n * rate)}</span>
        </div>
        <div className="flex items-center justify-between text-[11px] text-muted">
          <span>
            {exchangeRates.isLive ? 'Canlı kur' : 'Kayıtlı kur'} · {getRelativeTimeTurkish(exchangeRates.lastUpdated)}
            {exchangeRates.markupTRY > 0 ? ` · +${exchangeRates.markupTRY} ₺ marj` : ''}
          </span>
          <button onClick={refresh} disabled={busy} className="h-8 px-2 rounded-md inline-flex items-center gap-1 hover:text-fg hover:bg-surface-2" aria-label="Kurları yenile">
            <RefreshCw className={`w-3.5 h-3.5 ${busy ? 'animate-spin' : ''}`} /> Yenile
          </button>
        </div>
      </div>
    </WidgetCard>
  );
}

/** Akademik durum: term and cumulative GPA, attendance warnings, the next exam. */
export function AcademicSummaryWidget() {
  const { setActiveTab } = useAppStore();
  const data = useAcademicSnapshot(true);
  if (!data) {
    return (
      <WidgetCard icon={GraduationCap} title="Akademik durum">
        <p className="px-4 py-8 text-center text-xs text-muted">Yükleniyor…</p>
      </WidgetCard>
    );
  }
  const term = data.terms.find((t) => t.id === data.activeTermId) ?? data.terms[data.terms.length - 1];
  const termSum = term ? summarizeTerm(data, term) : null;
  const all = summarizeAll(data);
  const courses = term ? data.courses.filter((c) => c.termId === term.id) : [];
  const risky = courses
    .map((c) => ({ c, worst: attendanceStatus(c, data.grading, term).reduce<'ok' | 'warn' | 'over'>((w, s) => (s.state === 'over' ? 'over' : s.state === 'warn' && w !== 'over' ? 'warn' : w), 'ok') }))
    .filter((x) => x.worst !== 'ok');
  const next = upcomingExams(data.exams ?? [])[0];
  const gpa = (v: number | null | undefined) => (v === null || v === undefined ? '—' : v.toFixed(2));
  return (
    <WidgetCard icon={GraduationCap} title="Akademik durum" action="Ders Takibi" onAction={() => setActiveTab('academic')}>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Dönem ortalaması" value={gpa(termSum?.gpa)} />
          <Stat label="Genel ortalama" value={gpa(all.gpa)} />
          <Stat label="Bu dönem ders" value={String(courses.length)} />
        </div>
        {risky.length > 0 ? (
          <ul className="space-y-1">
            {risky.slice(0, 3).map(({ c, worst }) => (
              <li key={c.id} className={`text-xs flex items-center gap-2 ${worst === 'over' ? 'text-rose-300' : 'text-amber-300'}`}>
                <span className="w-1.5 h-1.5 rounded-full bg-current shrink-0" />
                <span className="truncate">
                  {c.name}: {worst === 'over' ? 'devamsızlık sınırı aşıldı' : 'devamsızlık sınırına yakın'}
                </span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-emerald-300">Devamsızlık durumu iyi.</p>
        )}
        {next && (
          <p className="text-xs text-subtle border-t border-line pt-2">
            Sıradaki sınav: <span className="text-fg">{next.title}</span> · {countdownLabel(next)}
          </p>
        )}
      </div>
    </WidgetCard>
  );
}

function Stat({ label, value, tone }: { label: string; value: string; tone?: string }) {
  return (
    <div className="rounded-lg bg-surface-2 border border-line px-2.5 py-2 min-w-0">
      <p className="text-[10px] text-muted truncate">{label}</p>
      <p className={`text-base font-semibold tabular-nums truncate ${tone ?? 'text-fg'}`}>{value}</p>
    </div>
  );
}

/** Finans analizi: this month vs last month, savings rate and the biggest expense categories. */
export function FinanceSummaryWidget() {
  const { transactions, setActiveTab } = useAppStore();
  const now = new Date();
  const month = (offset: number) => {
    const d = new Date(now.getFullYear(), now.getMonth() + offset, 1);
    const list = getTransactionsForMonth(transactions.filter((t) => !t.isDebt), d.getFullYear(), d.getMonth()).projectedTransactions;
    const income = list.filter((t) => t.type === 'gelir').reduce((s, t) => s + t.amount, 0);
    const expense = list.filter((t) => t.type === 'gider').reduce((s, t) => s + t.amount, 0);
    return { list, income, expense, net: income - expense };
  };
  const cur = month(0);
  const prev = month(-1);
  const change = prev.expense > 0 ? Math.round(((cur.expense - prev.expense) / prev.expense) * 100) : null;
  const savings = cur.income > 0 ? Math.round((cur.net / cur.income) * 100) : null;
  const byCat = new Map<string, number>();
  for (const t of cur.list) if (t.type === 'gider') byCat.set(t.category, (byCat.get(t.category) ?? 0) + t.amount);
  const top = [...byCat.entries()].sort((a, b) => b[1] - a[1]).slice(0, 4);
  const max = top[0]?.[1] ?? 1;
  return (
    <WidgetCard icon={Wallet} title="Finans analizi (bu ay)" action="Finans" onAction={() => setActiveTab('finance')}>
      <div className="p-4 space-y-3">
        <div className="grid grid-cols-3 gap-2">
          <Stat label="Gelir" value={formatCurrencyTRY(cur.income)} tone="text-emerald-400" />
          <Stat label="Gider" value={formatCurrencyTRY(cur.expense)} tone="text-rose-300" />
          <Stat label="Net" value={formatCurrencyTRY(cur.net)} tone={cur.net < 0 ? 'text-rose-400' : 'text-fg'} />
        </div>
        <div className="flex flex-wrap gap-x-4 gap-y-1 text-[11px] text-subtle">
          {change !== null && (
            <span className="inline-flex items-center gap-1">
              {change > 0 ? <TrendingUp className="w-3.5 h-3.5 text-rose-300" /> : <TrendingDown className="w-3.5 h-3.5 text-emerald-400" />}
              Gider geçen aya göre %{Math.abs(change)} {change > 0 ? 'fazla' : 'az'}
            </span>
          )}
          {savings !== null && <span>Birikim oranı: %{savings}</span>}
        </div>
        {top.length > 0 ? (
          <ul className="space-y-1.5" aria-label="En büyük gider kategorileri">
            {top.map(([cat, v]) => (
              <li key={cat} className="text-xs">
                <div className="flex justify-between gap-2">
                  <span className="text-body truncate">{cat}</span>
                  <span className="text-muted tabular-nums shrink-0">{formatCurrencyTRY(v)}</span>
                </div>
                <div className="h-1.5 rounded-full bg-surface-3 mt-1 overflow-hidden">
                  <div className="h-full rounded-full bg-rose-400/70" style={{ width: `${Math.max(4, (v / max) * 100)}%` }} />
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-xs text-muted">Bu ay gider kaydı yok.</p>
        )}
      </div>
    </WidgetCard>
  );
}

/** Sabitlenmiş notlar: quick access to pinned notes. */
export function PinnedNotesWidget() {
  const { notes, setActiveNoteId, setActiveTab } = useAppStore();
  const pinned = notes.filter((n) => n.isPinned).slice(0, 6);
  return (
    <WidgetCard icon={Pin} title="Sabitlenmiş notlar" action="Notlar" onAction={() => setActiveTab('notes')}>
      {pinned.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-muted">Not düzenleyicideki iğne simgesiyle notları buraya sabitleyin.</p>
      ) : (
        <ul className="divide-y divide-line">
          {pinned.map((n) => (
            <li key={n.id}>
              <button
                onClick={() => {
                  setActiveNoteId(n.id);
                  setActiveTab('notes');
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-surface-2 transition-colors"
              >
                <span className="block text-sm text-fg truncate">{n.title || 'Başlıksız not'}</span>
                <span className="block text-[11px] text-muted truncate">{n.kind === 'table' ? 'Tablo' : n.kind === 'pdf' ? 'PDF' : n.content.replace(/[#*`$\n]/g, ' ').trim().slice(0, 80) || 'Boş not'}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </WidgetCard>
  );
}
