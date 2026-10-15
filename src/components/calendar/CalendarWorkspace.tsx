'use client';

import React, { useEffect, useRef, useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { CalendarEvent, FinanceTransaction } from '@/types';
import { EventModal } from './EventModal';
import { ExportSyncModal } from './ExportSyncModal';
import { TransactionModal } from '@/components/finance/TransactionModal';
import { parseICS } from '@/lib/icsParser';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  Upload,
  CalendarDays,
  Clock,
  Check,
  FileText,
  CheckSquare,
  X,
  Wallet,
  PanelRightClose,
  PanelRightOpen,
} from 'lucide-react';
import { formatTurkishDate, formatCurrencyTRY, toLocalDateString } from '@/lib/utils';
import { isTransactionActiveOnDate } from '@/lib/recurringFinance';

const MONTH_NAMES = ['Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran', 'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'];
const DAY_NAMES = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];
/** Months shown before / after the anchor month in the timeline. */
const MONTHS_BEFORE = 2;
const MONTHS_AFTER = 9;

const iso = (y: number, m: number, d: number) => `${y}-${String(m + 1).padStart(2, '0')}-${String(d).padStart(2, '0')}`;

/** Calendar: one continuous, scrollable timeline of months plus a day-detail panel. */
export const CalendarWorkspace: React.FC = () => {
  const {
    events,
    tasks,
    transactions,
    notes,
    rescheduleEvent,
    toggleTask,
    addEvent,
    addTask,
    addToast,
    setActiveTab,
    setActiveNoteId,
    preferences,
    setPreference,
    systemSettings,
  } = useAppStore();

  const today = toLocalDateString();
  const [anchor, setAnchor] = useState(() => {
    const d = new Date();
    return { year: d.getFullYear(), month: d.getMonth() };
  });
  const [selectedDay, setSelectedDay] = useState<string>(today);
  // Desktop: docked panel the user can collapse (saved per user). Phones: overlay opened by tapping a day.
  const panelCollapsed = preferences.calendarPanelCollapsed;
  const [mobilePanelOpen, setMobilePanelOpen] = useState(false);
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollRef = useRef<HTMLDivElement>(null);
  const monthRefs = useRef(new Map<string, HTMLElement>());
  const [scrollTarget, setScrollTarget] = useState<string | null>(() => `${anchor.year}-${anchor.month}`);

  const firstScroll = useRef(true);
  // Bring the requested month into view after it rendered (on open, "Bugün", or after an import).
  // The first jump is instant so the calendar opens on the current month.
  useEffect(() => {
    if (!scrollTarget) return;
    const el = monthRefs.current.get(scrollTarget);
    const box = scrollRef.current;
    if (!el || !box) return;
    const top = el.getBoundingClientRect().top - box.getBoundingClientRect().top + box.scrollTop - 8;
    box.scrollTo({ top, behavior: firstScroll.current ? 'auto' : 'smooth' });
    firstScroll.current = false;
  }, [scrollTarget, anchor]);

  const months = Array.from({ length: MONTHS_BEFORE + MONTHS_AFTER + 1 }, (_, i) => {
    const d = new Date(anchor.year, anchor.month - MONTHS_BEFORE + i, 1);
    const year = d.getFullYear();
    const month = d.getMonth();
    return { year, month, firstDay: (d.getDay() + 6) % 7, totalDays: new Date(year, month + 1, 0).getDate() };
  });

  const shiftMonths = (delta: number) => {
    const d = new Date(anchor.year, anchor.month + delta, 1);
    setAnchor({ year: d.getFullYear(), month: d.getMonth() });
    setScrollTarget(`${d.getFullYear()}-${d.getMonth()}`);
  };

  const goToDate = (date: string) => {
    const [y, m] = date.split('-').map(Number);
    setAnchor({ year: y, month: m - 1 });
    setScrollTarget(`${y}-${m - 1}`);
    setSelectedDay(date);
  };

  const eventsOn = (date: string) => events.filter((e) => e.date === date);
  const tasksOn = (date: string) => tasks.filter((t) => t.dueDate === date);
  const transactionsOn = (date: string) => transactions.filter((t) => isTransactionActiveOnDate(t, date));
  const notesOn = (date: string) => notes.filter((n) => n.updatedAt.startsWith(date) || n.createdAt.startsWith(date));

  const selectDay = (date: string) => {
    setSelectedDay(date);
    setMobilePanelOpen(true);
    if (panelCollapsed) setPreference('calendarPanelCollapsed', false);
  };

  const openNewEvent = () => {
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const openEvent = (ev: CalendarEvent, e?: React.MouseEvent) => {
    e?.stopPropagation();
    setEditingEvent(ev);
    setSelectedDay(ev.date);
    setIsEventModalOpen(true);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    e.target.value = '';
    if (!file) return;
    if (file.size > 5 * 1024 * 1024) {
      addToast({ type: 'error', title: 'Dosya çok büyük', message: '.ics dosyası en fazla 5 MB olabilir.' });
      return;
    }
    file
      .text()
      .then((text) => {
        const parsed = parseICS(text).slice(0, 2000);
        if (parsed.length === 0) {
          addToast({ type: 'warning', title: 'Etkinlik bulunamadı', message: 'Dosyada geçerli bir takvim etkinliği yok.' });
          return;
        }
        parsed.forEach((item) => addEvent(item));
        addToast({ type: 'success', title: 'Takvim içe aktarıldı', message: `${parsed.length} etkinlik eklendi.` });
        if (parsed[0]?.date) goToDate(parsed[0].date);
      })
      .catch(() => addToast({ type: 'error', title: 'İçe aktarılamadı', message: 'Geçerli bir .ics dosyası seçin.' }));
  };

  const handleDrop = (e: React.DragEvent, date: string) => {
    e.preventDefault();
    setDragOverDate(null);
    const id = e.dataTransfer.getData('text/plain');
    if (id) {
      rescheduleEvent(id, date);
      setSelectedDay(date);
    }
  };

  const isEventOverdue = (ev: CalendarEvent): boolean => {
    if (ev.date >= today) return false;
    if (ev.linkedTaskId) {
      const linked = tasks.find((t) => t.id === ev.linkedTaskId);
      if (linked) return !linked.completed;
    }
    return ev.status !== 'yayinlandi' && ev.status !== 'iptal';
  };

  const eventTone = (ev: CalendarEvent) => {
    if (isEventOverdue(ev)) return 'border-rose-500/60 bg-rose-500/10 text-rose-200';
    if (ev.eventType === 'gorev') return 'border-amber-500/40 bg-amber-500/10 text-amber-100';
    if (ev.eventType === 'ozel_gun') return 'border-emerald-500/40 bg-emerald-500/10 text-emerald-100';
    return 'border-line-strong bg-surface-3 text-body';
  };

  const dayEvents = eventsOn(selectedDay);
  const dayTasks = tasksOn(selectedDay);
  const dayTransactions = transactionsOn(selectedDay);
  const dayNotes = notesOn(selectedDay);

  const panel = (
    <>
      <div className="p-4 border-b border-line space-y-3">
        <div className="flex items-start justify-between gap-2">
          <div>
            <p className="text-[11px] text-muted">{selectedDay === today ? 'Bugün' : 'Seçili gün'}</p>
            <h3 className="text-base font-semibold text-fg tracking-tight">{formatTurkishDate(selectedDay)}</h3>
          </div>
          <button
            onClick={() => setMobilePanelOpen(false)}
            className="lg:hidden w-9 h-9 flex items-center justify-center rounded-md text-muted hover:text-fg hover:bg-surface-2"
            aria-label="Gün panelini kapat"
          >
            <X className="w-4 h-4" />
          </button>
          <button
            onClick={() => setPreference('calendarPanelCollapsed', true)}
            className="hidden lg:flex w-8 h-8 items-center justify-center rounded-md text-muted hover:text-fg hover:bg-surface-2"
            aria-label="Gün panelini gizle"
            title="Gün panelini gizle"
          >
            <PanelRightClose className="w-4 h-4" />
          </button>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={openNewEvent}
            className="flex-1 h-9 px-3 bg-brand hover:bg-brand-hover text-white text-xs font-medium rounded-md flex items-center justify-center gap-1.5"
          >
            <Plus className="w-4 h-4" /> Etkinlik
          </button>
          <button
            onClick={() => {
              addTask({ title: 'Yeni görev', dueDate: selectedDay, completed: false, priority: systemSettings.tasks.defaultPriority });
              addToast({ type: 'success', title: 'Görev eklendi', message: `${formatTurkishDate(selectedDay)} tarihine görev eklendi.` });
            }}
            className="h-9 px-3 bg-surface-2 hover:bg-surface-3 text-body hover:text-fg border border-line-strong text-xs font-medium rounded-md flex items-center gap-1.5"
          >
            <CheckSquare className="w-3.5 h-3.5" /> Görev
          </button>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 space-y-5">
        <PanelSection icon={CalendarDays} title="Etkinlikler" count={dayEvents.length} empty="Bu güne planlanmış etkinlik yok.">
          {dayEvents.map((ev) => (
            <button
              key={ev.id}
              onClick={() => openEvent(ev)}
              className="w-full text-left p-3 rounded-md bg-surface-2 hover:bg-surface-3 border border-line space-y-1"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-medium text-fg">{ev.title}</span>
                {isEventOverdue(ev) && <span className="text-[10px] text-rose-300 shrink-0">Gecikti</span>}
              </div>
              <span className="flex items-center gap-1.5 text-[11px] text-muted">
                <Clock className="w-3 h-3" /> {ev.time || '—'} · {ev.durationMinutes || systemSettings.calendar.defaultEventDurationMinutes} dk
              </span>
              {ev.description && <p className="text-[11px] text-subtle line-clamp-2">{ev.description}</p>}
            </button>
          ))}
        </PanelSection>

        <PanelSection icon={CheckSquare} title="Görevler" count={dayTasks.length} empty="Bu gün için görev yok.">
          {dayTasks.map((t) => (
            <div key={t.id} className="p-2.5 rounded-md bg-surface-2 border border-line flex items-center gap-2">
              <button
                onClick={() => toggleTask(t.id)}
                className={`w-4 h-4 rounded flex items-center justify-center border shrink-0 ${
                  t.completed ? 'bg-brand border-brand text-white' : 'border-line-strong'
                }`}
                aria-label={t.completed ? 'Tamamlanmadı olarak işaretle' : 'Tamamlandı olarak işaretle'}
              >
                {t.completed && <Check className="w-3 h-3" />}
              </button>
              <span className={`text-xs truncate ${t.completed ? 'line-through text-muted' : 'text-fg'}`}>{t.title}</span>
            </div>
          ))}
        </PanelSection>

        <PanelSection icon={Wallet} title="Finans" count={dayTransactions.length} empty="Bu tarihte finans kaydı yok.">
          {dayTransactions.map((tr) => (
            <button
              key={tr.id}
              onClick={() => {
                setEditingTransaction(tr);
                setIsFinanceModalOpen(true);
              }}
              className="w-full text-left p-2.5 rounded-md bg-surface-2 hover:bg-surface-3 border border-line flex items-center justify-between gap-2"
            >
              <span className="min-w-0">
                <span className="text-xs text-fg block truncate">{tr.title}</span>
                <span className="text-[10px] text-muted">{tr.isDebt ? 'Kredi / borç' : tr.category}</span>
              </span>
              <span className={`text-xs font-medium tabular-nums ${tr.type === 'gelir' ? 'text-emerald-400' : 'text-rose-400'}`}>
                {tr.type === 'gelir' ? '+' : '−'}
                {formatCurrencyTRY(tr.amount)}
              </span>
            </button>
          ))}
        </PanelSection>

        {dayNotes.length > 0 && (
          <PanelSection icon={FileText} title="Notlar" count={dayNotes.length} empty="">
            {dayNotes.map((n) => (
              <button
                key={n.id}
                onClick={() => {
                  setActiveNoteId(n.id);
                  setActiveTab('notes');
                }}
                className="w-full text-left p-2.5 rounded-md bg-surface-2 hover:bg-surface-3 border border-line text-xs text-fg truncate"
              >
                {n.title || 'Başlıksız not'}
              </button>
            ))}
          </PanelSection>
        )}
      </div>
    </>
  );

  return (
    <div className="flex-1 flex h-full bg-app overflow-hidden select-none">
      <input type="file" ref={fileInputRef} onChange={handleFileUpload} accept=".ics,text/calendar" className="sr-only" tabIndex={-1} aria-hidden="true" />

      <div className="flex-1 flex flex-col h-full min-w-0 overflow-hidden">
        {/* Toolbar */}
        <div className="px-4 sm:px-6 py-3 bg-surface border-b border-line flex items-center justify-between gap-2 flex-wrap shrink-0">
          <div className="flex items-center gap-1.5">
            <button
              onClick={() => shiftMonths(-1)}
              className="w-9 h-9 rounded-md flex items-center justify-center text-subtle hover:text-fg hover:bg-surface-2"
              aria-label="Bir ay geri"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="text-sm font-semibold text-fg min-w-[120px] text-center">
              {MONTH_NAMES[anchor.month]} {anchor.year}
            </span>
            <button
              onClick={() => shiftMonths(1)}
              className="w-9 h-9 rounded-md flex items-center justify-center text-subtle hover:text-fg hover:bg-surface-2"
              aria-label="Bir ay ileri"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
            <button
              onClick={() => goToDate(today)}
              className="h-9 px-3 ml-1 bg-surface-2 hover:bg-surface-3 border border-line-strong text-xs text-body hover:text-fg rounded-md"
            >
              Bugün
            </button>
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => fileInputRef.current?.click()}
              className="h-9 px-3 flex items-center gap-1.5 bg-surface-2 hover:bg-surface-3 border border-line-strong text-xs text-body hover:text-fg rounded-md"
              title=".ics takvim dosyasını içe aktar"
            >
              <Upload className="w-4 h-4" />
              <span className="hidden sm:inline">İçe aktar</span>
            </button>
            <button
              onClick={() => setIsExportModalOpen(true)}
              className="h-9 px-3 flex items-center gap-1.5 bg-surface-2 hover:bg-surface-3 border border-line-strong text-xs text-body hover:text-fg rounded-md"
              title="Dışa aktar / eşitle"
            >
              <Download className="w-4 h-4" />
              <span className="hidden sm:inline">Dışa aktar</span>
            </button>
            <button
              onClick={openNewEvent}
              className="h-9 px-3.5 flex items-center gap-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-medium rounded-md"
            >
              <Plus className="w-4 h-4" />
              <span>Etkinlik</span>
            </button>
            {panelCollapsed && (
              <button
                onClick={() => setPreference('calendarPanelCollapsed', false)}
                className="hidden lg:flex w-9 h-9 items-center justify-center rounded-md text-muted hover:text-fg hover:bg-surface-2"
                aria-label="Gün panelini göster"
                title="Gün panelini göster"
              >
                <PanelRightOpen className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>

        {/* Timeline */}
        <div ref={scrollRef} className="flex-1 overflow-y-auto px-3 sm:px-6 pb-6">
          {months.map((m) => {
            const key = `${m.year}-${m.month}`;
            return (
              <section
                key={key}
                ref={(el) => {
                  if (el) monthRefs.current.set(key, el);
                  else monthRefs.current.delete(key);
                }}
                className="pt-5"
                aria-label={`${MONTH_NAMES[m.month]} ${m.year}`}
              >
                <div className="sticky top-0 z-10 bg-app py-2 flex items-baseline justify-between border-b border-line mb-2">
                  <h3 className="text-sm font-semibold text-fg">
                    {MONTH_NAMES[m.month]} <span className="text-muted font-normal">{m.year}</span>
                  </h3>
                </div>
                <div className="grid grid-cols-7 gap-1 text-center text-[10px] text-muted mb-1">
                  {DAY_NAMES.map((d) => (
                    <span key={d}>{d}</span>
                  ))}
                </div>
                <div className="grid grid-cols-7 gap-1">
                  {Array.from({ length: m.firstDay }).map((_, i) => (
                    <div key={`pad-${i}`} />
                  ))}
                  {Array.from({ length: m.totalDays }).map((_, i) => {
                    const date = iso(m.year, m.month, i + 1);
                    const evs = eventsOn(date);
                    const hasTasks = tasksOn(date).length > 0;
                    const hasMoney = transactionsOn(date).length > 0;
                    const selected = selectedDay === date;
                    const isToday = date === today;
                    return (
                      <div
                        key={date}
                        role="button"
                        tabIndex={0}
                        onClick={() => selectDay(date)}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter' || e.key === ' ') {
                            e.preventDefault();
                            selectDay(date);
                          }
                        }}
                        onDragOver={(e) => {
                          e.preventDefault();
                          if (dragOverDate !== date) setDragOverDate(date);
                        }}
                        onDragLeave={() => dragOverDate === date && setDragOverDate(null)}
                        onDrop={(e) => handleDrop(e, date)}
                        aria-label={formatTurkishDate(date)}
                        aria-pressed={selected}
                        className={`min-h-[64px] sm:min-h-[84px] p-1.5 rounded-md border flex flex-col gap-1 cursor-pointer transition-colors ${
                          selected
                            ? 'border-brand bg-surface-2'
                            : dragOverDate === date
                              ? 'border-line-strong bg-surface-3'
                              : 'border-line bg-surface hover:bg-surface-2'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-[11px] tabular-nums w-5 h-5 rounded-full flex items-center justify-center ${
                              isToday ? 'bg-brand text-white font-semibold' : 'text-body'
                            }`}
                          >
                            {i + 1}
                          </span>
                          <span className="flex gap-0.5">
                            {hasTasks && <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title="Görev var" />}
                            {hasMoney && <span className="w-1.5 h-1.5 rounded-full bg-subtle" title="Finans kaydı var" />}
                          </span>
                        </div>
                        <div className="hidden sm:flex flex-col gap-0.5 min-w-0">
                          {evs.slice(0, 2).map((ev) => (
                            <span
                              key={ev.id}
                              draggable
                              onDragStart={(e) => {
                                e.dataTransfer.setData('text/plain', ev.id);
                                e.dataTransfer.effectAllowed = 'move';
                              }}
                              onClick={(e) => openEvent(ev, e)}
                              title={`${ev.time ?? ''} ${ev.title}`.trim()}
                              className={`text-[10px] px-1 py-px rounded border truncate ${eventTone(ev)}`}
                            >
                              {ev.title}
                            </span>
                          ))}
                          {evs.length > 2 && <span className="text-[9px] text-muted pl-1">+{evs.length - 2}</span>}
                        </div>
                        {evs.length > 0 && <span className="sm:hidden w-1.5 h-1.5 rounded-full bg-brand self-center" />}
                      </div>
                    );
                  })}
                </div>
              </section>
            );
          })}
          <div className="pt-4 text-center">
            <button
              onClick={() => shiftMonths(6)}
              className="h-9 px-4 text-xs text-subtle hover:text-fg bg-surface hover:bg-surface-2 border border-line rounded-md"
            >
              Sonraki aylar
            </button>
          </div>
        </div>
      </div>

      {/* Day panel: docked on large screens (collapsible), overlay on phones */}
      {!panelCollapsed && (
        <aside className="hidden lg:flex w-80 xl:w-96 shrink-0 border-l border-line bg-surface flex-col h-full">{panel}</aside>
      )}
      {mobilePanelOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex justify-end">
          <div className="absolute inset-0 bg-black/60" onClick={() => setMobilePanelOpen(false)} aria-hidden="true" />
          <aside className="relative w-full max-w-md h-full bg-surface border-l border-line flex flex-col safe-bottom animate-fade-in">{panel}</aside>
        </div>
      )}

      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        editEvent={editingEvent}
        initialDate={selectedDay}
      />
      <ExportSyncModal isOpen={isExportModalOpen} onClose={() => setIsExportModalOpen(false)} />
      <TransactionModal isOpen={isFinanceModalOpen} onClose={() => setIsFinanceModalOpen(false)} editTransaction={editingTransaction} />
    </div>
  );
};

function PanelSection({
  icon: Icon,
  title,
  count,
  empty,
  children,
}: {
  icon: React.ElementType;
  title: string;
  count: number;
  empty: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-2">
      <h4 className="text-[11px] font-medium text-subtle flex items-center justify-between">
        <span className="flex items-center gap-1.5">
          <Icon className="w-3.5 h-3.5 text-muted" />
          {title}
        </span>
        <span className="tabular-nums text-muted">{count}</span>
      </h4>
      {count === 0 ? <p className="text-xs text-muted">{empty}</p> : <div className="space-y-1.5">{children}</div>}
    </section>
  );
}
