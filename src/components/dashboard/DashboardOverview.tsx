'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { PlatformBadge } from '@/components/ui/Badge';
import { Modal } from '@/components/ui/Modal';
import { AlertBanner } from './AlertBanner';
import { VerificationBanner } from './VerificationBanner';
import { AcademicSummaryWidget, ExchangeWidget, FinanceSummaryWidget, MonthCalendarWidget, PinnedNotesWidget } from './ExtraWidgets';
import { StudentDashboardCard } from '@/components/academic/StudentDashboardCard';
import { hasStudentAccess } from '@/lib/access';
import { canEdit, canView, isCorporate } from '@/lib/corporate';
import { customerSummary } from '@/lib/customers';
import { isTransactionActiveOnDate } from '@/lib/recurringFinance';
import { moveId, type UserPreferences } from '@/lib/preferences';
import {
  FileText,
  GraduationCap,
  CheckSquare,
  Calendar,
  Wallet,
  Plus,
  ArrowRight,
  Clock,
  Star,
  Building2,
  Pin,
  LayoutGrid,
  ChevronUp,
  ChevronDown,
  Eye,
  EyeOff,
} from 'lucide-react';
import { ActiveTab, FinanceTransaction } from '@/types';
import { formatTurkishDate, getRelativeTimeTurkish, formatCurrencyTRY, toLocalDateString } from '@/lib/utils';

type WidgetSetting = UserPreferences['dashboardWidgets'][number];
type WidgetId = WidgetSetting['id'];

/** Genel bakış sections in their default order and visibility. */
const WIDGETS: { id: WidgetId; label: string; hint: string; wide?: boolean; visible: boolean }[] = [
  { id: 'student', label: 'Ders Takibi', hint: 'Bugünkü dersler, devamsızlık ve sınavlar', wide: true, visible: true },
  { id: 'stats', label: 'Özet kartları', hint: 'Not, görev, takvim ve bakiye sayıları', wide: true, visible: true },
  { id: 'notes', label: 'Son notlar', hint: 'En son düzenlenen notlar', visible: true },
  { id: 'events', label: 'Yaklaşan etkinlikler', hint: 'Takvimdeki sıradaki etkinlikler', visible: true },
  { id: 'tasks', label: 'Yaklaşan görevler', hint: 'Son tarihi yaklaşan veya geçen görevler', visible: false },
  { id: 'payments', label: 'Yaklaşan ödemeler', hint: '30 gün içindeki ödeme ve tahsilatlar', visible: false },
  { id: 'month', label: 'Aylık takvim', hint: 'Ayın etkinlik, görev, ödeme ve sınav günleri', visible: false },
  { id: 'financeSummary', label: 'Finans analizi', hint: 'Bu ayın gelir, gider, birikim oranı ve kategorileri', visible: false },
  { id: 'exchange', label: 'Döviz kurları', hint: 'Canlı dolar / euro kuru ve hızlı çevirici', visible: false },
  { id: 'academic', label: 'Akademik durum', hint: 'Ortalama, devamsızlık uyarıları, sıradaki sınav', visible: false },
  { id: 'pinned', label: 'Sabitlenmiş notlar', hint: 'İğnelediğiniz notlara hızlı erişim', visible: false },
];

/** Saved layout, completed with widgets it does not mention yet (in their default visibility). */
function resolveLayout(saved: WidgetSetting[]): WidgetSetting[] {
  const seen = new Set<string>();
  const out: WidgetSetting[] = [];
  for (const w of saved) {
    if (seen.has(w.id) || !WIDGETS.some((d) => d.id === w.id)) continue;
    seen.add(w.id);
    out.push(w);
  }
  for (const d of WIDGETS) if (!seen.has(d.id)) out.push({ id: d.id, visible: d.visible });
  return out;
}

function addDays(iso: string, n: number): string {
  const [y, m, d] = iso.split('-').map(Number);
  return toLocalDateString(new Date(y, m - 1, d + n));
}

/** Date a transaction is next due within `horizon` days; unpaid past ones keep their (overdue) date. */
function nextDue(t: FinanceTransaction, today: string, horizon: number): string | null {
  const last = addDays(today, horizon);
  if (t.isDebt) return t.amount > 0 && t.date <= last ? t.date : null;
  if (!t.isRecurring) return !t.isConfirmed && t.date <= last ? t.date : null;
  if (t.recurringFrequency === 'gunluk') return null;
  for (let i = 0; i <= horizon; i++) {
    const d = addDays(today, i);
    if (isTransactionActiveOnDate(t, d)) return d;
  }
  return null;
}

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

function WidgetHeader({ icon: Icon, title, action, onAction }: { icon: React.ElementType; title: string; action: string; onAction: () => void }) {
  return (
    <header className="flex items-center justify-between px-4 h-11 border-b border-line">
      <h2 className="text-sm font-semibold text-fg flex items-center gap-2">
        <Icon className="w-4 h-4 text-subtle" />
        {title}
      </h2>
      <button onClick={onAction} className="text-xs text-subtle hover:text-fg flex items-center gap-1 h-8">
        {action} <ArrowRight className="w-3 h-3" />
      </button>
    </header>
  );
}

export const DashboardOverview: React.FC = () => {
  const {
    currentUser,
    notes,
    tasks,
    events,
    transactions,
    customers,
    preferences,
    setActiveTab,
    setPreference,
    setActiveNoteId,
    addNote,
  } = useAppStore();
  const [editing, setEditing] = useState(false);

  const todayStr = toLocalDateString();
  const pendingTasks = tasks.filter((t) => !t.completed).length;
  const futureEvents = events.filter((e) => e.date >= todayStr && e.status !== 'iptal');

  const totalIncome = transactions.filter((t) => t.type === 'gelir').reduce((sum, t) => sum + t.amount, 0);
  // Debt balances (Kredi / borç) are not spending; their payments are recorded as expenses.
  const totalExpense = transactions.filter((t) => t.type === 'gider' && !t.isDebt).reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const recentNotes = [...notes]
    .sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime())
    .slice(0, 4);
  const upcomingEvents = [...futureEvents]
    .sort((a, b) => (a.date + (a.time || '')).localeCompare(b.date + (b.time || '')))
    .slice(0, 4);
  const upcomingTasks = tasks
    .filter((t) => !t.completed && t.dueDate)
    .sort((a, b) => a.dueDate!.localeCompare(b.dueDate!))
    .slice(0, 5);
  const upcomingPayments = transactions
    .map((t) => ({ t, due: nextDue(t, todayStr, 30) }))
    .filter((x): x is { t: FinanceTransaction; due: string } => !!x.due)
    .sort((a, b) => a.due.localeCompare(b.due))
    .slice(0, 5);

  const startNote = () => {
    const id = addNote();
    setActiveNoteId(id);
    setActiveTab('notes');
  };

  const corporate = isCorporate(currentUser);
  const overdueCustomers = customers.filter((c) => customerSummary(c, todayStr).overdueMonths > 0).length;

  const allStats: { key: string; tab: ActiveTab; label: string; value: React.ReactNode; hint: string; icon: React.ElementType }[] = [
    { key: 'notes', tab: 'notes', label: corporate ? 'Ortak notlar' : 'Notlar', value: notes.length, hint: 'toplam', icon: FileText },
    {
      key: 'customers',
      tab: 'customers',
      label: 'Müşteriler',
      value: customers.length,
      hint: overdueCustomers ? `${overdueCustomers} ödeme gecikti` : 'ödemeler güncel',
      icon: Building2,
    },
    { key: 'tasks', tab: 'tasks', label: 'Görevler', value: pendingTasks, hint: 'bekliyor', icon: CheckSquare },
    { key: 'calendar', tab: 'calendar', label: 'Takvim', value: futureEvents.length, hint: 'yaklaşan', icon: Calendar },
    {
      key: 'finance',
      tab: 'finance',
      label: 'Net bakiye',
      value: <span className={netBalance < 0 ? 'text-rose-400' : 'text-emerald-400'}>{formatCurrencyTRY(netBalance)}</span>,
      hint: 'gelir − gider',
      icon: Wallet,
    },
  ];
  // Kurumsal: only the modules this person may see.
  const MODULE_OF: Record<string, Parameters<typeof canView>[1]> = {
    notes: 'notes',
    customers: 'customers',
    tasks: 'work',
    calendar: 'calendar',
    finance: 'finance',
  };
  const stats = allStats.filter((s) => canView(currentUser, MODULE_OF[s.key]));

  const firstName = currentUser?.name?.split(' ')[0];
  const studentAccess = hasStudentAccess(currentUser);

  // Widgets this person can have (account type, kurumsal permissions), in the saved order.
  const available: Record<WidgetId, boolean> = {
    student: studentAccess,
    stats: stats.length > 0,
    notes: canView(currentUser, 'notes'),
    events: canView(currentUser, 'calendar'),
    tasks: canView(currentUser, 'work'),
    payments: canView(currentUser, 'finance'),
    month: true,
    financeSummary: canView(currentUser, 'finance'),
    exchange: true,
    academic: studentAccess,
    pinned: canView(currentUser, 'notes'),
  };
  const fullLayout = resolveLayout(preferences.dashboardWidgets);
  const layout = fullLayout.filter((w) => available[w.id]);
  const saveLayout = (next: WidgetSetting[]) => {
    // Widgets not available now keep their entry, so a later permission change does not lose their place.
    setPreference('dashboardWidgets', [...next, ...fullLayout.filter((w) => !available[w.id])]);
  };
  const moveWidget = (id: WidgetId, step: -1 | 1) => {
    const order = moveId(layout.map((w) => w.id), id, step);
    saveLayout(order.map((wid) => layout.find((w) => w.id === wid)!));
  };
  const toggleWidget = (id: WidgetId) => saveLayout(layout.map((w) => (w.id === id ? { ...w, visible: !w.visible } : w)));
  const dueLabel = (date: string) => (date === todayStr ? 'Bugün' : date < todayStr ? `Gecikti · ${formatTurkishDate(date)}` : formatTurkishDate(date));
  const dueCls = (date: string) => (date < todayStr ? 'text-rose-400' : date === todayStr ? 'text-amber-300' : 'text-muted');

  const statsWidget = (
    <div className={`grid grid-cols-2 gap-2 ${stats.length >= 5 ? 'sm:grid-cols-3 xl:grid-cols-5' : stats.length === 4 ? 'sm:grid-cols-4' : 'sm:grid-cols-3'}`}>
      {stats.map(({ key, tab, label, value, hint, icon: Icon }) => (
        <button
          key={key}
          onClick={() => {
            if (tab === 'tasks') setPreference('tasksView', 'liste');
            setActiveTab(tab);
          }}
          className="text-left bg-surface hover:bg-surface-2 border border-line hover:border-line-strong rounded-lg px-3 py-2.5 transition-colors group"
        >
          <div className="flex items-center justify-between text-muted">
            <span className="text-[11px] font-medium">{label}</span>
            <Icon className="w-3.5 h-3.5 group-hover:text-subtle transition-colors" />
          </div>
          <div className="mt-1 text-lg font-semibold text-fg tabular-nums truncate">{value}</div>
          <div className="text-[11px] text-muted">{hint}</div>
        </button>
      ))}
    </div>
  );

  const notesWidget = (
    <section className="bg-surface border border-line rounded-xl h-full">
      <WidgetHeader icon={FileText} title={corporate ? 'Son ortak notlar' : 'Son notlar'} action="Tümü" onAction={() => setActiveTab('notes')} />
      {recentNotes.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-muted space-y-2">
          <p>Henüz not yok.</p>
          {canEdit(currentUser, 'notes') && (
            <button onClick={startNote} className="text-emerald-400 hover:underline font-medium inline-flex items-center gap-1">
              <Plus className="w-3 h-3" /> İlk notunu oluştur
            </button>
          )}
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {recentNotes.map((note) => (
            <li key={note.id}>
              <button
                onClick={() => {
                  setActiveNoteId(note.id);
                  setActiveTab('notes');
                }}
                className="w-full text-left px-4 py-2.5 hover:bg-surface-2 transition-colors flex items-center gap-3"
              >
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="text-sm text-fg truncate">{note.title || 'Başlıksız not'}</span>
                    {note.isPinned && <Pin className="w-3 h-3 text-amber-400 shrink-0" />}
                    {note.isFavorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                  </div>
                  <p className="text-[11px] text-muted">{getRelativeTimeTurkish(note.updatedAt)}</p>
                </div>
                {note.tags[0] && (
                  <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-subtle shrink-0">#{note.tags[0]}</span>
                )}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const eventsWidget = (
    <section className="bg-surface border border-line rounded-xl h-full">
      <WidgetHeader icon={Calendar} title="Yaklaşan etkinlikler" action="Takvim" onAction={() => setActiveTab('calendar')} />
      {upcomingEvents.length === 0 ? (
        <div className="px-4 py-8 text-center text-xs text-muted space-y-2">
          <p>Yaklaşan etkinlik yok.</p>
          <button onClick={() => setActiveTab('calendar')} className="text-emerald-400 hover:underline font-medium inline-flex items-center gap-1">
            <Plus className="w-3 h-3" /> Etkinlik planla
          </button>
        </div>
      ) : (
        <ul className="divide-y divide-line">
          {upcomingEvents.map((ev) => (
            <li key={ev.id}>
              <button onClick={() => setActiveTab('calendar')} className="w-full text-left px-4 py-2.5 hover:bg-surface-2 transition-colors flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    {ev.platform && <PlatformBadge platform={ev.platform} size="sm" />}
                    <span className="text-sm text-fg truncate">{ev.title}</span>
                  </div>
                  <p className="text-[11px] text-muted flex items-center gap-1">
                    <Clock className="w-3 h-3" />
                    {ev.date === todayStr ? 'Bugün' : formatTurkishDate(ev.date)}
                    {ev.time ? ` • ${ev.time}` : ''}
                  </p>
                </div>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-subtle shrink-0">
                  {ev.eventType === 'yayin' ? 'Yayın' : ev.eventType === 'gorev' ? 'Görev' : 'Özel gün'}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const tasksWidget = (
    <section className="bg-surface border border-line rounded-xl h-full">
      <WidgetHeader
        icon={CheckSquare}
        title="Yaklaşan görevler"
        action="Görevler"
        onAction={() => {
          setPreference('tasksView', 'liste');
          setActiveTab('tasks');
        }}
      />
      {upcomingTasks.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-muted">Son tarihi olan bekleyen görev yok.</p>
      ) : (
        <ul className="divide-y divide-line">
          {upcomingTasks.map((t) => (
            <li key={t.id}>
              <button onClick={() => setActiveTab('tasks')} className="w-full text-left px-4 py-2.5 hover:bg-surface-2 transition-colors">
                <span className="block text-sm text-fg truncate">{t.title || 'Başlıksız görev'}</span>
                <span className={`text-[11px] flex items-center gap-1 ${dueCls(t.dueDate!)}`}>
                  <Clock className="w-3 h-3" /> {dueLabel(t.dueDate!)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const paymentsWidget = (
    <section className="bg-surface border border-line rounded-xl h-full">
      <WidgetHeader icon={Wallet} title="Yaklaşan ödemeler" action="Finans" onAction={() => setActiveTab('finance')} />
      {upcomingPayments.length === 0 ? (
        <p className="px-4 py-8 text-center text-xs text-muted">30 gün içinde bekleyen ödeme veya tahsilat yok.</p>
      ) : (
        <ul className="divide-y divide-line">
          {upcomingPayments.map(({ t, due }) => (
            <li key={t.id}>
              <button onClick={() => setActiveTab('finance')} className="w-full text-left px-4 py-2.5 hover:bg-surface-2 transition-colors flex items-center gap-3">
                <div className="flex-1 min-w-0">
                  <span className="block text-sm text-fg truncate">{t.title}</span>
                  <span className={`text-[11px] flex items-center gap-1 ${dueCls(due)}`}>
                    <Clock className="w-3 h-3" /> {dueLabel(due)}
                    {t.isDebt ? ' · kredi / borç' : t.isRecurring ? ' · tekrarlayan' : ''}
                  </span>
                </div>
                <span className={`text-xs tabular-nums shrink-0 ${t.type === 'gelir' ? 'text-emerald-400' : 'text-rose-300'}`}>
                  {t.type === 'gelir' ? '+' : '−'}
                  {formatCurrencyTRY(t.amount)}
                </span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );

  const widgetContent: Record<WidgetId, React.ReactNode> = {
    student: <StudentDashboardCard />,
    stats: statsWidget,
    notes: notesWidget,
    events: eventsWidget,
    tasks: tasksWidget,
    payments: paymentsWidget,
    month: <MonthCalendarWidget />,
    financeSummary: <FinanceSummaryWidget />,
    exchange: <ExchangeWidget />,
    academic: <AcademicSummaryWidget />,
    pinned: <PinnedNotesWidget />,
  };
  const shown = layout.filter((w) => w.visible);

  return (
    <div className="flex-1 overflow-y-auto bg-app p-4 sm:p-5 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
        <VerificationBanner />
        <AlertBanner />

        {/* Greeting + quick actions */}
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-3">
          <div>
            <p className="text-xs text-muted">{formatTurkishDate(todayStr)}</p>
            <h1 className="text-lg sm:text-xl font-semibold text-fg">
              {greeting()}
              {firstName ? `, ${firstName}` : ''}
            </h1>
          </div>
          <div className="flex items-center gap-2 overflow-x-auto no-scrollbar -mx-4 px-4 sm:mx-0 sm:px-0">
            {canEdit(currentUser, 'notes') && (
              <button
                onClick={startNote}
                className="shrink-0 h-9 px-3.5 bg-brand hover:bg-brand-hover active:bg-brand-active text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-4 h-4" />
                Yeni not
              </button>
            )}
            {studentAccess && (
              <button
                onClick={() => setActiveTab('academic')}
                className="shrink-0 h-9 px-3.5 bg-surface-2 hover:bg-surface-3 border border-line text-body text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <GraduationCap className="w-4 h-4 text-subtle" />
                Ders Takibi
              </button>
            )}
            {canView(currentUser, 'work') && (
              <button
                onClick={() => setActiveTab('tasks')}
                className="shrink-0 h-9 px-3.5 bg-surface-2 hover:bg-surface-3 border border-line text-body text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <CheckSquare className="w-4 h-4 text-subtle" />
                Görev
              </button>
            )}
            {canView(currentUser, 'finance') && (
              <button
                onClick={() => setActiveTab('finance')}
                className="shrink-0 h-9 px-3.5 bg-surface-2 hover:bg-surface-3 border border-line text-body text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Wallet className="w-4 h-4 text-subtle" />
                İşlem
              </button>
            )}
            <button
              onClick={() => setEditing(true)}
              className="shrink-0 h-9 px-3 bg-surface-2 hover:bg-surface-3 border border-line text-body text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
              title="Genel bakıştaki bölümleri seç ve sırala"
            >
              <LayoutGrid className="w-4 h-4 text-subtle" />
              Düzenle
            </button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3 sm:gap-4">
          {shown.map((w) => (
            <div key={w.id} className={`min-w-0 ${WIDGETS.find((d) => d.id === w.id)?.wide ? 'lg:col-span-2' : ''}`}>
              {widgetContent[w.id]}
            </div>
          ))}
          {shown.length === 0 && (
            <div className="lg:col-span-2 rounded-xl border border-dashed border-line px-4 py-10 text-center text-xs text-muted">
              Tüm bölümler gizli.{' '}
              <button onClick={() => setEditing(true)} className="text-emerald-400 hover:underline font-medium">
                Bölüm ekle
              </button>
            </div>
          )}
        </div>
      </div>

      <Modal isOpen={editing} onClose={() => setEditing(false)} title="Genel bakışı düzenle" subtitle="Bölümleri gösterin, gizleyin ve sıralayın." maxWidth="max-w-md">
        <ul className="divide-y divide-line rounded-lg border border-line">
          {layout.map((w, i) => {
            const def = WIDGETS.find((d) => d.id === w.id)!;
            return (
              <li key={w.id} className="flex items-center gap-2 px-3 py-2">
                <button
                  onClick={() => toggleWidget(w.id)}
                  aria-pressed={w.visible}
                  aria-label={`${def.label}: ${w.visible ? 'gizle' : 'göster'}`}
                  title={w.visible ? 'Gizle' : 'Göster'}
                  className={`w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-md border transition-colors ${
                    w.visible ? 'border-brand/50 text-emerald-400 bg-brand/10' : 'border-line text-muted hover:text-fg'
                  }`}
                >
                  {w.visible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                </button>
                <div className="flex-1 min-w-0">
                  <p className={`text-sm truncate ${w.visible ? 'text-fg' : 'text-muted'}`}>{def.label}</p>
                  <p className="text-[11px] text-muted truncate">{def.hint}</p>
                </div>
                <button
                  onClick={() => moveWidget(w.id, -1)}
                  disabled={i === 0}
                  aria-label={`${def.label} yukarı taşı`}
                  className="w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-md text-muted hover:text-fg hover:bg-surface-2 disabled:opacity-30"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  onClick={() => moveWidget(w.id, 1)}
                  disabled={i === layout.length - 1}
                  aria-label={`${def.label} aşağı taşı`}
                  className="w-9 h-9 shrink-0 inline-flex items-center justify-center rounded-md text-muted hover:text-fg hover:bg-surface-2 disabled:opacity-30"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </li>
            );
          })}
        </ul>
        <div className="modal-actions">
          <button
            onClick={() => setPreference('dashboardWidgets', [])}
            className="h-10 px-4 text-xs text-subtle hover:text-fg rounded-lg border border-line hover:bg-surface-2"
          >
            Varsayılana dön
          </button>
          <button onClick={() => setEditing(false)} className="h-10 px-4 text-xs font-semibold text-white bg-brand hover:bg-brand-hover rounded-lg">
            Tamam
          </button>
        </div>
      </Modal>
    </div>
  );
};
