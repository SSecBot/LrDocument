'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { PlatformBadge } from '@/components/ui/Badge';
import { AlertBanner } from './AlertBanner';
import { StudentDashboardCard } from '@/components/academic/StudentDashboardCard';
import {
  FileText,
  Video,
  CheckSquare,
  Calendar,
  Image as ImageIcon,
  Wallet,
  Plus,
  ArrowRight,
  Clock,
  Star,
  Kanban,
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
    scripts,
    tasks,
    kanbanCards,
    events,
    mediaItems,
    transactions,
    setActiveTab,
    setActiveNoteId,
    setActiveScriptId,
    addNote,
    addScript,
  } = useAppStore();

  const todayStr = toLocalDateString();
  const readyScripts = scripts.filter((s) => s.status === 'yayina_hazir' || s.status === 'senaryo_hazir').length;
  const pendingTasks = tasks.filter((t) => !t.completed).length;
  const inProgressKanban = kanbanCards.filter((c) => c.columnId === 'devam_ediyor' || c.columnId === 'yapilacak').length;
  const futureEvents = events.filter((e) => e.date >= todayStr && e.status !== 'iptal');

  const totalIncome = transactions.filter((t) => t.type === 'gelir').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter((t) => t.type === 'gider').reduce((sum, t) => sum + t.amount, 0);
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
  const startScript = () => {
    const id = addScript();
    setActiveScriptId(id);
    setActiveTab('scripts');
  };

  const stats: { tab: ActiveTab; label: string; value: React.ReactNode; hint: string; icon: React.ElementType }[] = [
    { tab: 'notes', label: 'Notlar', value: notes.length, hint: 'toplam', icon: FileText },
    { tab: 'scripts', label: 'Senaryolar', value: scripts.length, hint: `${readyScripts} hazır`, icon: Video },
    { tab: 'tasks', label: 'Görevler', value: pendingTasks, hint: 'bekliyor', icon: CheckSquare },
    { tab: 'kanban', label: 'Kanban', value: kanbanCards.length, hint: `${inProgressKanban} aktif`, icon: Kanban },
    { tab: 'calendar', label: 'Takvim', value: futureEvents.length, hint: 'yaklaşan', icon: Calendar },
    { tab: 'media', label: 'Medya', value: mediaItems.length, hint: 'öğe', icon: ImageIcon },
    {
      tab: 'finance',
      label: 'Net bakiye',
      value: <span className={netBalance < 0 ? 'text-rose-400' : 'text-emerald-400'}>{formatCurrencyTRY(netBalance)}</span>,
      hint: 'gelir − gider',
      icon: Wallet,
    },
  ];

  const firstName = currentUser?.name?.split(' ')[0];

  return (
    <div className="flex-1 overflow-y-auto bg-app p-4 sm:p-5 lg:p-6">
      <div className="max-w-6xl mx-auto space-y-4">
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
            <button
              onClick={startNote}
              className="shrink-0 h-9 px-3.5 bg-brand hover:bg-brand-hover active:bg-brand-active text-white text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-4 h-4" />
              Yeni not
            </button>
            <button
              onClick={startScript}
              className="shrink-0 h-9 px-3.5 bg-surface-2 hover:bg-surface-3 border border-line text-body text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Video className="w-4 h-4 text-subtle" />
              Senaryo
            </button>
            <button
              onClick={() => setActiveTab('tasks')}
              className="shrink-0 h-9 px-3.5 bg-surface-2 hover:bg-surface-3 border border-line text-body text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <CheckSquare className="w-4 h-4 text-subtle" />
              Görev
            </button>
            <button
              onClick={() => setActiveTab('finance')}
              className="shrink-0 h-9 px-3.5 bg-surface-2 hover:bg-surface-3 border border-line text-body text-xs font-medium rounded-lg flex items-center gap-1.5 transition-colors"
            >
              <Wallet className="w-4 h-4 text-subtle" />
              İşlem
            </button>
          </div>
        </div>

        {currentUser?.accountType === 'STUDENT' && <StudentDashboardCard />}

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-2">
          {stats.map(({ tab, label, value, hint, icon: Icon }) => (
            <button
              key={tab}
              onClick={() => setActiveTab(tab)}
              className={`text-left bg-surface hover:bg-surface-2 border border-line hover:border-line-strong rounded-lg px-3 py-2.5 transition-colors group ${
                tab === 'finance' ? 'col-span-2 sm:col-span-1' : ''
              }`}
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
          <section className="bg-surface border border-line rounded-xl">
            <header className="flex items-center justify-between px-4 h-11 border-b border-line">
              <h2 className="text-sm font-semibold text-fg flex items-center gap-2">
                <FileText className="w-4 h-4 text-subtle" />
                Son notlar
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
                <button onClick={startNote} className="text-emerald-400 hover:underline font-medium inline-flex items-center gap-1">
                  <Plus className="w-3 h-3" /> İlk notunu oluştur
                </button>
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
        </div>
      </div>
    </div>
  );
};
