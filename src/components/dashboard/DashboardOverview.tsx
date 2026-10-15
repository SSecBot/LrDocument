'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { PlatformBadge } from '@/components/ui/Badge';
import { AlertBanner } from './AlertBanner';
import { VerificationBanner } from './VerificationBanner';
import { StudentDashboardCard } from '@/components/academic/StudentDashboardCard';
import { hasStudentAccess } from '@/lib/access';
import { canEdit, canView, isCorporate } from '@/lib/corporate';
import { customerSummary } from '@/lib/customers';
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
} from 'lucide-react';
import { ActiveTab } from '@/types';
import { formatTurkishDate, getRelativeTimeTurkish, formatCurrencyTRY, toLocalDateString } from '@/lib/utils';

function greeting(): string {
  const h = new Date().getHours();
  if (h < 6) return 'İyi geceler';
  if (h < 12) return 'Günaydın';
  if (h < 18) return 'İyi günler';
  return 'İyi akşamlar';
}

export const DashboardOverview: React.FC = () => {
  const {
    currentUser,
    notes,
    tasks,
    events,
    transactions,
    customers,
    setActiveTab,
    setPreference,
    setActiveNoteId,
    addNote,
  } = useAppStore();

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
          </div>
        </div>

        {studentAccess && <StudentDashboardCard />}

        {/* Stats */}
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

        {/* Lists */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
          {canView(currentUser, 'notes') && (
          <section className="bg-surface border border-line rounded-xl">
            <header className="flex items-center justify-between px-4 h-11 border-b border-line">
              <h2 className="text-sm font-semibold text-fg flex items-center gap-2">
                <FileText className="w-4 h-4 text-subtle" />
                {corporate ? 'Son ortak notlar' : 'Son notlar'}
              </h2>
              <button
                onClick={() => setActiveTab('notes')}
                className="text-xs text-subtle hover:text-fg flex items-center gap-1 h-8"
              >
                Tümü <ArrowRight className="w-3 h-3" />
              </button>
            </header>
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
                        <span className="hidden sm:inline text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-subtle shrink-0">
                          #{note.tags[0]}
                        </span>
                      )}
                    </button>
                  </li>
                ))}
              </ul>
            )}
          </section>
          )}

          {canView(currentUser, 'calendar') && (
          <section className="bg-surface border border-line rounded-xl">
            <header className="flex items-center justify-between px-4 h-11 border-b border-line">
              <h2 className="text-sm font-semibold text-fg flex items-center gap-2">
                <Calendar className="w-4 h-4 text-subtle" />
                Yaklaşan etkinlikler
              </h2>
              <button
                onClick={() => setActiveTab('calendar')}
                className="text-xs text-subtle hover:text-fg flex items-center gap-1 h-8"
              >
                Takvim <ArrowRight className="w-3 h-3" />
              </button>
            </header>
            {upcomingEvents.length === 0 ? (
              <div className="px-4 py-8 text-center text-xs text-muted space-y-2">
                <p>Yaklaşan etkinlik yok.</p>
                <button
                  onClick={() => setActiveTab('calendar')}
                  className="text-emerald-400 hover:underline font-medium inline-flex items-center gap-1"
                >
                  <Plus className="w-3 h-3" /> Etkinlik planla
                </button>
              </div>
            ) : (
              <ul className="divide-y divide-line">
                {upcomingEvents.map((ev) => (
                  <li key={ev.id}>
                    <button
                      onClick={() => setActiveTab('calendar')}
                      className="w-full text-left px-4 py-2.5 hover:bg-surface-2 transition-colors flex items-center gap-3"
                    >
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
          )}
        </div>
      </div>
    </div>
  );
};
