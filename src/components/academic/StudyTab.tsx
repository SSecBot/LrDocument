'use client';

import React, { useState } from 'react';
import { AlertTriangle, Bell, BellOff, Check, Clock, Minus, Plus, Trash2, X } from 'lucide-react';
import type { AcademicData, Course, StudyLog, StudySession, Term } from '@/lib/academic/types';
import { DAYS, DAYS_SHORT, hasCalendar, newId } from '@/lib/academic/grading';
import {
  STUDY_WARN_RATIO,
  courseStudyStats,
  formatDuration,
  overlaps,
  pastOccurrences,
  slotMinutes,
  studySessionsOf,
  studyWarning,
  toMinutes,
} from '@/lib/academic/study';
import { formatTurkishDate, toLocalDateString } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { confirmDelete } from '@/components/ui/ConfirmDialog';
import { Card, CardHeader, EmptyState, Progress, Stat, btnGhost, btnPrimary, btnSecondary, inputCls, labelCls } from './ui';
import { useNow } from './useNow';

interface Props {
  data: AcademicData;
  term: Term;
  courses: Course[];
  update: (fn: (d: AcademicData) => AcademicData) => void;
}

type Mark = 'done' | 'partial' | 'missed';

/**
 * Ders Takibi › Çalışma takvimi: the student picks weekly study slots for each course of the term
 * (the courses come from the ders programı). Each slot sends a notification when it starts and when
 * it ends; afterwards the student marks it. More than %40 of the study time missed → a warning with
 * the hours to add to later sessions.
 */
export function StudyTab({ data, term, courses, update }: Props) {
  const now = useNow(30_000);
  const today = toLocalDateString(now);
  const nowInfo = { date: today, minutes: now.getHours() * 60 + now.getMinutes() };
  const sessions = studySessionsOf(data, term.id);
  const stats = courseStudyStats(data, term, courses, nowInfo);
  const reminders = data.study?.reminders !== false;
  const [adding, setAdding] = useState<string | null>(null);
  const [partial, setPartial] = useState<{ session: StudySession; date: string } | null>(null);
  const [makeup, setMakeup] = useState<Course | null>(null);

  const setStudy = (fn: (s: NonNullable<AcademicData['study']>) => NonNullable<AcademicData['study']>) =>
    update((d) => ({ ...d, study: fn(d.study ?? { sessions: [], logs: [] }) }));

  const mark = (session: StudySession, date: string, status: Mark, minutes?: number) =>
    setStudy((s) => ({
      ...s,
      logs: [
        ...s.logs.filter((l) => !(l.sessionId === session.id && l.date === date)),
        { sessionId: session.id, courseId: session.courseId, date, status, ...(status === 'partial' ? { minutes } : {}) },
      ],
    }));

  const removeSession = async (session: StudySession, course: Course) => {
    if (!(await confirmDelete(`${course.code || course.name} ${DAYS[session.day]} ${session.start}–${session.end} çalışması`, 'Bu saatin geçmiş kayıtları da silinir.'))) return;
    setStudy((s) => ({ ...s, sessions: s.sessions.filter((x) => x.id !== session.id), logs: s.logs.filter((l) => l.sessionId !== session.id) }));
  };

  const totals = stats.reduce(
    (acc, s) => ({
      weekly: acc.weekly + s.weeklyMinutes,
      planned: acc.planned + s.plannedMinutes,
      studied: acc.studied + s.studiedMinutes,
      deficit: acc.deficit + s.deficitMinutes,
    }),
    { weekly: 0, planned: 0, studied: 0, deficit: 0 }
  );
  const warnings = stats.filter((s) => s.warn);
  const unmarked = stats.flatMap((s) => s.unmarked.map((u) => ({ ...u, course: s.course }))).sort((a, b) => b.date.localeCompare(a.date) || b.session.start.localeCompare(a.session.start));
  const courseOf = (id: string) => courses.find((c) => c.id === id);

  if (courses.length === 0) {
    return (
      <Card>
        <CardHeader title="Ders çalışma takvimi" />
        <EmptyState title="Bu dönemde ders yok" text="Önce Program sekmesinden derslerinizi ekleyin; dersler buraya kendiliğinden gelir, siz de her ders için çalışma gün ve saatlerini seçersiniz." />
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2.5">
        <Stat label="Haftalık plan" value={formatDuration(totals.weekly)} hint={`${sessions.length} çalışma saati`} />
        <Stat label="Bu dönem çalışılan" value={formatDuration(totals.studied)} hint={totals.planned ? `planlanan ${formatDuration(totals.planned)}` : 'henüz çalışma geçmedi'} tone={totals.studied ? 'good' : undefined} />
        <Stat label="Eksik" value={formatDuration(totals.deficit)} hint="ileriki çalışmalara eklenmeli" tone={totals.deficit ? 'warn' : undefined} />
        <Stat label="Uyarı" value={warnings.length} hint={`%${Math.round(STUDY_WARN_RATIO * 100)} sınırını aşan ders`} tone={warnings.length ? 'bad' : 'good'} />
      </div>

      {warnings.length > 0 && (
        <div className="rounded-xl border border-rose-800/60 bg-rose-950/40 p-3.5 space-y-2" role="alert">
          {warnings.map((w) => (
            <div key={w.course.id} className="flex flex-col sm:flex-row sm:items-center gap-2">
              <p className="text-xs text-rose-200 flex items-start gap-2 flex-1">
                <AlertTriangle className="w-4 h-4 text-rose-400 shrink-0 mt-px" />
                <span>{studyWarning(w)}</span>
              </p>
              <button className={`${btnSecondary} self-start sm:self-auto`} onClick={() => setMakeup(w.course)}>
                <Plus className="w-3.5 h-3.5" /> Telafi çalışması ekle
              </button>
            </div>
          ))}
        </div>
      )}

      {unmarked.length > 0 && (
        <Card>
          <CardHeader title={`İşaretlenmeyen çalışmalar (${unmarked.length})`} icon={<Clock className="w-4 h-4 text-amber-400" />} />
          <p className="px-4 pt-3 text-[11px] text-muted">İşaretlenmeyen çalışma “yapılmadı” sayılır. Çalıştıysanız işaretleyin.</p>
          <ul className="divide-y divide-line">
            {unmarked.slice(0, 12).map(({ session, date, course }) => (
              <li key={`${session.id}-${date}`} className="px-4 py-2.5 flex flex-col sm:flex-row sm:items-center gap-2">
                <div className="flex items-center gap-2.5 min-w-0 flex-1">
                  <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: course.color }} />
                  <p className="text-sm text-fg truncate">
                    {course.code || course.name}
                    <span className="text-[11px] text-muted ml-2 tabular-nums">
                      {date === today ? 'Bugün' : formatTurkishDate(date)} · {session.start}–{session.end}
                    </span>
                  </p>
                </div>
                <MarkButtons onMark={(m) => (m === 'partial' ? setPartial({ session, date }) : mark(session, date, m))} />
              </li>
            ))}
          </ul>
          {unmarked.length > 12 && <p className="px-4 pb-3 text-[11px] text-muted">ve {unmarked.length - 12} çalışma daha (ders listesinden işaretleyebilirsiniz).</p>}
        </Card>
      )}

      <Card>
        <CardHeader
          title="Haftalık çalışma programı"
          action={
            <button
              className={btnGhost}
              onClick={() => setStudy((s) => ({ ...s, reminders: !reminders }))}
              aria-pressed={reminders}
              title="Çalışma başlarken ve biterken bildirim"
            >
              {reminders ? <Bell className="w-4 h-4 text-emerald-400" /> : <BellOff className="w-4 h-4" />}
              <span className="hidden sm:inline">{reminders ? 'Bildirimler açık' : 'Bildirimler kapalı'}</span>
            </button>
          }
        />
        {sessions.length === 0 ? (
          <EmptyState title="Henüz çalışma saati yok" text="Aşağıdaki derslerden “Çalışma saati ekle” ile her hafta aynı gün ve saatte tekrarlanan çalışmalarınızı belirleyin." />
        ) : (
          <StudyWeek sessions={sessions} courseOf={courseOf} today={today} nowMinutes={nowInfo.minutes} />
        )}
        <p className="px-4 py-2.5 border-t border-line text-[11px] text-muted">
          {reminders
            ? 'Çalışma vakti geldiğinde ve bittiğinde telefonunuza / bilgisayarınıza bildirim gelir (Ayarlar › Bildirimler’den bu cihazda bildirimleri açın).'
            : 'Çalışma bildirimleri kapalı.'}
          {hasCalendar(term) ? ` Dönem: ${formatTurkishDate(term.start)} – ${formatTurkishDate(term.end)}.` : ''}
        </p>
      </Card>

      <Card>
        <CardHeader title={`Dersler (${courses.length})`} />
        <ul className="divide-y divide-line">
          {stats.map((s) => (
            <li key={s.course.id} className="px-4 py-3 space-y-2.5">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: s.course.color }} />
                <p className="text-sm text-fg truncate flex-1 min-w-0">
                  {s.course.code && <span className="text-muted mr-1.5">{s.course.code}</span>}
                  {s.course.name}
                </p>
                <span className="text-[11px] text-muted whitespace-nowrap">haftada {formatDuration(s.weeklyMinutes)}</span>
              </div>

              {s.plannedMinutes > 0 && (
                <div className="space-y-1">
                  <Progress value={s.studiedMinutes} max={s.plannedMinutes} state={s.warn ? 'over' : s.ratio > STUDY_WARN_RATIO / 2 ? 'warn' : 'ok'} />
                  <p className={`text-[11px] ${s.warn ? 'text-rose-300' : 'text-muted'}`}>
                    {formatDuration(s.studiedMinutes)} / {formatDuration(s.plannedMinutes)} çalışıldı
                    {s.deficitMinutes > 0 ? ` · ${formatDuration(s.deficitMinutes)} eksik (%${Math.round(s.ratio * 100)})` : ''}
                    {s.makeupMinutes > 0 ? ` · ${formatDuration(s.makeupMinutes)} telafi` : ''}
                  </p>
                </div>
              )}

              <div className="flex flex-wrap items-center gap-1.5">
                {s.sessions
                  .slice()
                  .sort((a, b) => a.day - b.day || a.start.localeCompare(b.start))
                  .map((session) => (
                    <span key={session.id} className="inline-flex items-center gap-1 h-8 pl-2.5 pr-1 rounded-md bg-surface-2 border border-line text-xs text-body tabular-nums">
                      {DAYS_SHORT[session.day]} {session.start}–{session.end}
                      <button onClick={() => removeSession(session, s.course)} className="w-6 h-6 rounded inline-flex items-center justify-center text-muted hover:text-rose-400" aria-label={`${DAYS[session.day]} ${session.start} çalışmasını sil`}>
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </span>
                  ))}
                {adding === s.course.id ? null : (
                  <button className={btnGhost} onClick={() => setAdding(s.course.id)}>
                    <Plus className="w-3.5 h-3.5" /> Çalışma saati ekle
                  </button>
                )}
                {s.plannedMinutes > 0 && (
                  <button className={btnGhost} onClick={() => setMakeup(s.course)} title="Eksik kalan saatleri telafi ettiğiniz çalışmayı ekleyin">
                    Telafi ekle
                  </button>
                )}
              </div>

              {adding === s.course.id && (
                <AddSlot
                  course={s.course}
                  existing={sessions}
                  courses={courses}
                  onCancel={() => setAdding(null)}
                  onAdd={(slot) => {
                    setStudy((st) => ({ ...st, sessions: [...st.sessions, { ...slot, id: newId(), termId: term.id, courseId: s.course.id, since: today }] }));
                    setAdding(null);
                  }}
                />
              )}

              {s.sessions.length > 0 && <History stats={s} term={term} now={nowInfo} logs={data.study?.logs ?? []} onMark={(session, date, m) => (m === 'partial' ? setPartial({ session, date }) : mark(session, date, m))} />}
            </li>
          ))}
        </ul>
      </Card>

      <PartialModal
        target={partial}
        onClose={() => setPartial(null)}
        onSave={(minutes) => {
          if (partial) mark(partial.session, partial.date, minutes >= slotMinutes(partial.session) ? 'done' : 'partial', minutes);
          setPartial(null);
        }}
      />
      <MakeupModal
        course={makeup}
        deficit={stats.find((s) => s.course.id === makeup?.id)?.deficitMinutes ?? 0}
        today={today}
        onClose={() => setMakeup(null)}
        onSave={(log) => {
          setStudy((st) => ({ ...st, logs: [...st.logs, log] }));
          setMakeup(null);
        }}
      />
    </div>
  );
}

function MarkButtons({ onMark, current }: { onMark: (m: Mark) => void; current?: StudyLog['status'] }) {
  const cls = (on: boolean, tone: string) => `h-8 px-2.5 rounded-md text-xs inline-flex items-center gap-1 border transition-colors ${on ? tone : 'border-line bg-surface-2 text-body hover:bg-surface-3'}`;
  return (
    <div className="flex items-center gap-1 shrink-0">
      <button className={cls(current === 'done', 'border-emerald-600 bg-emerald-500/15 text-emerald-300')} onClick={() => onMark('done')}>
        <Check className="w-3.5 h-3.5" /> Çalıştım
      </button>
      <button className={cls(current === 'partial', 'border-amber-600 bg-amber-500/15 text-amber-300')} onClick={() => onMark('partial')}>
        <Minus className="w-3.5 h-3.5" /> Kısmen
      </button>
      <button className={cls(current === 'missed', 'border-rose-700 bg-rose-500/15 text-rose-300')} onClick={() => onMark('missed')}>
        <X className="w-3.5 h-3.5" /> Çalışmadım
      </button>
    </div>
  );
}

/** Weekly view of the study slots (like the ders programı). */
function StudyWeek({ sessions, courseOf, today, nowMinutes }: { sessions: StudySession[]; courseOf: (id: string) => Course | undefined; today: string; nowMinutes: number }) {
  const used = new Set(sessions.map((s) => s.day));
  const days = [0, 1, 2, 3, 4, ...(used.has(5) ? [5] : []), ...(used.has(6) ? [6] : [])];
  const todayIndex = (new Date(`${today}T12:00:00`).getDay() + 6) % 7;
  const byDay = (day: number) => sessions.filter((s) => s.day === day).sort((a, b) => a.start.localeCompare(b.start));
  return (
    <div className="grid grid-cols-1 md:gap-px md:bg-line md:[grid-template-columns:repeat(var(--days),minmax(0,1fr))]" style={{ ['--days' as string]: days.length }}>
      {days.map((day) => (
        <div key={day} className={`bg-surface min-w-0 ${byDay(day).length === 0 ? 'hidden md:block' : ''}`}>
          <div className={`px-3 py-2 text-xs font-semibold border-b border-line md:text-center ${day === todayIndex ? 'text-emerald-400' : 'text-subtle'}`}>
            <span className="md:hidden">{DAYS[day]}</span>
            <span className="hidden md:inline">{DAYS_SHORT[day]}</span>
          </div>
          <div className="p-2 space-y-1.5 md:min-h-[100px]">
            {byDay(day).length === 0 ? (
              <p className="text-[11px] text-muted px-1 py-1 md:text-center">—</p>
            ) : (
              byDay(day).map((s) => {
                const course = courseOf(s.courseId);
                const live = day === todayIndex && nowMinutes >= toMinutes(s.start) && nowMinutes < toMinutes(s.end);
                return (
                  <div key={s.id} className={`rounded-lg bg-surface-2 border-l-[3px] px-2.5 py-1.5 ${live ? 'ring-1 ring-emerald-500/60' : ''}`} style={{ borderLeftColor: course?.color }}>
                    <p className="text-[11px] text-muted tabular-nums">
                      {s.start}–{s.end} {live && <span className="text-emerald-400 font-medium">· şimdi</span>}
                    </p>
                    <p className="text-xs font-medium text-fg truncate">{course ? course.code || course.name : 'Silinmiş ders'}</p>
                    <p className="text-[11px] text-muted">{formatDuration(slotMinutes(s))}</p>
                  </div>
                );
              })
            )}
          </div>
        </div>
      ))}
    </div>
  );
}

function AddSlot({
  course,
  existing,
  courses,
  onAdd,
  onCancel,
}: {
  course: Course;
  existing: StudySession[];
  courses: Course[];
  onAdd: (slot: { day: number; start: string; end: string }) => void;
  onCancel: () => void;
}) {
  const [day, setDay] = useState(() => (new Date().getDay() + 6) % 7);
  const [start, setStart] = useState('19:00');
  const [end, setEnd] = useState('20:30');
  const slot = { day, start, end };
  const clash = existing.find((s) => overlaps(s, slot));
  const classClash = courses.flatMap((c) => c.sessions.map((s) => ({ c, s }))).find(({ s }) => overlaps(s, slot));
  const error = !start || !end ? 'Saatleri girin.' : end <= start ? 'Bitiş saati başlangıçtan sonra olmalı.' : clash ? 'Bu saat başka bir çalışmayla çakışıyor.' : null;
  return (
    <form
      className="rounded-lg border border-line bg-surface-2/50 p-3 space-y-2"
      onSubmit={(e) => {
        e.preventDefault();
        if (!error) onAdd(slot);
      }}
    >
      <p className="text-xs text-subtle">
        <span className="text-fg font-medium">{course.code || course.name}</span> için her hafta tekrarlanan çalışma saati
      </p>
      <div className="grid grid-cols-1 sm:grid-cols-[1.4fr_1fr_1fr_auto] gap-2 items-end">
        <label>
          <span className={labelCls}>Gün</span>
          <select className={inputCls} value={day} onChange={(e) => setDay(Number(e.target.value))}>
            {DAYS.map((d, i) => (
              <option key={d} value={i}>{d}</option>
            ))}
          </select>
        </label>
        <label>
          <span className={labelCls}>Başlangıç</span>
          <input type="time" className={inputCls} value={start} onChange={(e) => setStart(e.target.value)} required />
        </label>
        <label>
          <span className={labelCls}>Bitiş</span>
          <input type="time" className={inputCls} value={end} onChange={(e) => setEnd(e.target.value)} required />
        </label>
        <div className="flex gap-1.5">
          <button type="submit" className={btnPrimary} disabled={!!error}>Ekle</button>
          <button type="button" className={btnSecondary} onClick={onCancel}>Vazgeç</button>
        </div>
      </div>
      {error ? (
        <p className="text-[11px] text-rose-300">{error}</p>
      ) : classClash ? (
        <p className="text-[11px] text-amber-300">
          Not: {DAYS[day]} {classClash.s.start}–{classClash.s.end} saatinde {classClash.c.code || classClash.c.name} dersiniz var.
        </p>
      ) : (
        <p className="text-[11px] text-muted">Süre: {formatDuration(toMinutes(end) - toMinutes(start))}</p>
      )}
    </form>
  );
}

/** Last occurrences of a course's slots with their marks (changeable). */
function History({
  stats,
  term,
  now,
  logs,
  onMark,
}: {
  stats: ReturnType<typeof courseStudyStats>[number];
  term: Term;
  now: { date: string; minutes: number };
  logs: StudyLog[];
  onMark: (session: StudySession, date: string, m: Mark) => void;
}) {
  const [open, setOpen] = useState(false);
  const items = stats.sessions
    .flatMap((session) => pastOccurrences(session, term, now).map((date) => ({ session, date })))
    .sort((a, b) => b.date.localeCompare(a.date) || b.session.start.localeCompare(a.session.start));
  if (!items.length) return null;
  const logOf = (sessionId: string, date: string) => logs.find((l) => l.sessionId === sessionId && l.date === date);
  return (
    <div>
      <button className="text-[11px] text-subtle hover:text-fg" onClick={() => setOpen((o) => !o)} aria-expanded={open}>
        {open ? 'Geçmişi gizle' : `Geçmiş (${items.length})`}
      </button>
      {open && (
        <ul className="mt-1.5 space-y-1">
          {items.slice(0, 20).map(({ session, date }) => {
            const log = logOf(session.id, date);
            return (
              <li key={`${session.id}-${date}`} className="flex flex-col sm:flex-row sm:items-center gap-1.5 text-xs">
                <span className="text-muted tabular-nums flex-1">
                  {formatTurkishDate(date)} · {session.start}–{session.end}
                  {log?.status === 'partial' && log.minutes !== undefined ? ` · ${formatDuration(log.minutes)}` : ''}
                  {!log && <span className="text-amber-300"> · işaretlenmedi</span>}
                </span>
                <MarkButtons current={log?.status} onMark={(m) => onMark(session, date, m)} />
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}

function PartialModal({ target, onClose, onSave }: { target: { session: StudySession; date: string } | null; onClose: () => void; onSave: (minutes: number) => void }) {
  const length = target ? slotMinutes(target.session) : 0;
  const [minutes, setMinutes] = useState('');
  const value = Number(minutes);
  const valid = minutes !== '' && Number.isFinite(value) && value >= 0 && value <= length;
  return (
    <Modal isOpen={!!target} onClose={onClose} title="Kısmen çalıştım" subtitle={target ? `${formatTurkishDate(target.date)} · ${target.session.start}–${target.session.end} (${formatDuration(length)})` : ''} maxWidth="max-w-sm">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (valid) {
            onSave(Math.round(value));
            setMinutes('');
          }
        }}
      >
        <label className="block">
          <span className={labelCls}>Kaç dakika çalıştınız?</span>
          <input type="number" inputMode="numeric" min={0} max={length} className={inputCls} value={minutes} onChange={(e) => setMinutes(e.target.value)} autoFocus />
        </label>
        <div className="modal-actions flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Vazgeç</button>
          <button type="submit" className={btnPrimary} disabled={!valid}>Kaydet</button>
        </div>
      </form>
    </Modal>
  );
}

function MakeupModal({ course, deficit, today, onClose, onSave }: { course: Course | null; deficit: number; today: string; onClose: () => void; onSave: (log: StudyLog) => void }) {
  const [minutes, setMinutes] = useState('');
  const [date, setDate] = useState(today);
  const value = Number(minutes);
  const valid = minutes !== '' && Number.isFinite(value) && value > 0 && value <= 24 * 60 && !!date && date <= today;
  return (
    <Modal isOpen={!!course} onClose={onClose} title="Telafi çalışması" subtitle={course ? `${course.code || course.name}${deficit ? ` · ${formatDuration(deficit)} eksik` : ''}` : ''} maxWidth="max-w-sm">
      <form
        className="space-y-3"
        onSubmit={(e) => {
          e.preventDefault();
          if (!valid || !course) return;
          onSave({ sessionId: null, courseId: course.id, date, status: 'makeup', minutes: Math.round(value) });
          setMinutes('');
        }}
      >
        <p className="text-xs text-muted">Kaçırdığınız saatleri başka bir zaman çalıştıysanız ekleyin; eksik süreden düşülür.</p>
        <div className="grid grid-cols-2 gap-2">
          <label className="block">
            <span className={labelCls}>Süre (dakika)</span>
            <input type="number" inputMode="numeric" min={1} max={1440} className={inputCls} value={minutes} onChange={(e) => setMinutes(e.target.value)} placeholder={deficit ? String(deficit) : '60'} />
          </label>
          <label className="block">
            <span className={labelCls}>Tarih</span>
            <input type="date" className={inputCls} value={date} max={today} onChange={(e) => setDate(e.target.value)} />
          </label>
        </div>
        <div className="modal-actions flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Vazgeç</button>
          <button type="submit" className={btnPrimary} disabled={!valid}>Ekle</button>
        </div>
      </form>
    </Modal>
  );
}
