'use client';

import { t as tl, tx } from '@/lib/i18n';
import type { AcademicUpdate } from './useAcademicData';
import React, { useState } from 'react';
import { AlertTriangle, CalendarClock, CalendarDays, Check, Table2, Undo2, UserX } from 'lucide-react';
import type { AcademicData, Course, Term } from '@/lib/academic/types';
import {
  attendanceStatus,
  computeCourseGrade,
  DAYS,
  daysUntil,
  addDays,
  dayPlan,
  formatDayPlanEmpty,
  isAttendanceExempt,
  newId,
  sessionHours,
  summarizeAll,
  summarizeTerm,
  upcomingExams,
} from '@/lib/academic/grading';
import { toLocalDateString } from '@/lib/utils';
import { courseStudyStats, formatDuration } from '@/lib/academic/study';
import { Card, CardHeader, EmptyState, Stat, btnGhost, btnSecondary } from './ui';
import { ExamRow } from './ExamsTab';
import { WeekGrid } from './ScheduleTab';
import { useNow } from './useNow';
import { useAppStore } from '@/store/useAppStore';

interface Props {
  data: AcademicData;
  term: Term;
  courses: Course[];
  update: AcademicUpdate;
  onAddCourse: () => void;
  onOpenTab: (tab: 'program' | 'sinavlar') => void;
}

export function OverviewTab({ data, term, courses, update, onAddCourse, onOpenTab }: Props) {
  const exams = upcomingExams(data.exams ?? []).slice(0, 5);
  const nextExam = exams[0];
  const termSummary = summarizeTerm(data, term);
  const all = summarizeAll(data);
  const now = useNow();
  const { systemSettings } = useAppStore();
  const today = toLocalDateString(now);
  const basisLabel = data.grading.gpaBasis === 'ects' ? 'AKTS' : 'kredi';

  // From 17:00 the card looks ahead to tomorrow; the user can still switch back to mark absences.
  const [dayPick, setDayPick] = useState<'today' | 'tomorrow' | null>(null);
  const showTomorrow = (dayPick ?? (now.getHours() >= systemSettings.academic.tomorrowFromHour ? 'tomorrow' : 'today')) === 'tomorrow';
  const plan = dayPlan(courses, term, showTomorrow ? addDays(today, 1) : today);
  const empty = formatDayPlanEmpty(plan, showTomorrow, term);

  const attention = courses.flatMap((c) => {
    const items: { course: Course; text: string; severity: 'warn' | 'bad' }[] = [];
    for (const a of attendanceStatus(c, data.grading, term)) {
      const label = a.kind === 'teori' ? 'teorik' : 'uygulama';
      if (a.state === 'over') items.push({ course: c, text: tl('Devamsızlık sınırı aşıldı ({label})', { label }), severity: 'bad' });
      else if (a.state === 'warn') items.push({ course: c, text: tl('{label} için {remaining} saat devamsızlık hakkı kaldı', { label, remaining: a.remaining }), severity: 'warn' });
    }
    const g = computeCourseGrade(c, data.grading, {}, term);
    if (g.status === 'kaldi') items.push({ course: c, text: tl('Kaldı{v0}', { v0: g.reason ? ` — ${g.reason}` : '' }), severity: 'bad' });
    if (g.status === 'devam') {
      const pass = g.required[0];
      if (pass && pass.score === null) items.push({ course: c, text: tl('Kalan sınavlarla geçmek mümkün görünmüyor'), severity: 'bad' });
      else if (pass && pass.score !== null && pass.score >= 75)
        items.push({ course: c, text: tl('Geçmek için kalan sınavlardan en az {score} gerekli', { score: pass.score }), severity: 'warn' });
    }
    return items;
  });

  // Ders çalışma takvimi: more than %40 of the study time not studied.
  for (const s of courseStudyStats(data, term, courses, { date: today, minutes: now.getHours() * 60 + now.getMinutes() })) {
    if (s.warn) attention.push({ course: s.course, text: tl('Çalışmaların %{v0}’i yapılmadı — {v1} eksik, ileriki çalışmalara eklenmeli', { v0: Math.round(s.ratio * 100), v1: formatDuration(s.deficitMinutes) }), severity: 'bad' });
  }

  const absentToday = (course: Course, kind: string) => course.absences.find((a) => a.date === today && a.kind === kind);

  const toggleAbsence = (course: Course, hours: number, kind: 'teori' | 'uygulama') => {
    update((d) => ({
      ...d,
      courses: d.courses.map((c) => {
        if (c.id !== course.id) return c;
        const existing = c.absences.find((a) => a.date === today && a.kind === kind);
        return existing
          ? { ...c, absences: c.absences.filter((a) => a.id !== existing.id) }
          : { ...c, absences: [...c.absences, { id: newId(), date: today, hours, kind }] };
      }),
    }));
  };

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Stat label={tl('Dönem ortalaması ({name})', { name: term.name })} value={termSummary.gpa?.toFixed(2) ?? '—'} hint={tl('{gradedWeight} {basisLabel} notlandı', { gradedWeight: termSummary.gradedWeight, basisLabel })} tone={gpaTone(termSummary.gpa)} />
        <Stat label={tl('Genel ortalama (AGNO)')} value={all.gpa?.toFixed(2) ?? '—'} hint={tl('{earnedWeight} {basisLabel} tamamlandı', { earnedWeight: all.earnedWeight, basisLabel })} tone={gpaTone(all.gpa)} />
        <Stat
          label={tl('Sıradaki sınav')}
          value={nextExam ? (daysUntil(nextExam.date) <= 0 ? tl('Bugün') : tl('{days} gün', { days: daysUntil(nextExam.date) })) : '—'}
          hint={nextExam ? nextExam.title : tl('{count} ders • {weight} {basisLabel}', { count: courses.length, weight: termSummary.totalWeight, basisLabel })}
          tone={nextExam ? (daysUntil(nextExam.date) <= 2 ? 'bad' : daysUntil(nextExam.date) <= 7 ? 'warn' : undefined) : undefined}
        />
        <Stat
          label={tl('Uyarılar')}
          value={attention.length}
          hint={attention.length ? tl('aşağıda listelendi') : tl('her şey yolunda')}
          tone={attention.some((a) => a.severity === 'bad') ? 'bad' : attention.length ? 'warn' : 'good'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader
            title={`${showTomorrow ? tl('Yarın') : tl('Bugün')} — ${tx(DAYS[plan.weekday])}`}
            icon={<CalendarClock className="w-4 h-4 text-subtle" />}
            action={<DayToggle tomorrow={showTomorrow} onChange={(t) => setDayPick(t ? 'tomorrow' : 'today')} />}
          />
          {courses.length === 0 ? (
            <EmptyState title={tl('Bu dönem için ders yok')} text={tl('Ders programını oluşturarak başlayın.')} action={<button className={btnSecondary} onClick={onAddCourse}>{tl('Ders ekle')}</button>} />
          ) : empty ? (
            <EmptyState title={tx(empty.title)} text={tx(empty.text)} />
          ) : (
            <ul className="divide-y divide-line">
              {plan.halfHoliday && (
                <li className="px-4 py-2 text-[11px] text-amber-300 bg-amber-500/5">{tx(plan.halfHoliday.name)}{' '}{tl('— 13:00’ten sonraki dersler yapılmaz.')}</li>
              )}
              {plan.sessions.map(({ course, session }) => {
                const absent = absentToday(course, session.kind);
                const hours = sessionHours(session);
                return (
                  <li key={session.id} className="px-4 py-2.5 flex items-center gap-3">
                    <span className="w-1 self-stretch rounded-full" style={{ backgroundColor: course.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-fg truncate">{tx(course.name)}</p>
                      <p className="text-[11px] text-muted">
                        {tx(session.start)}–{tx(session.end)} • {session.kind === 'teori' ? tl('Teorik') : tl('Uygulama')}
                        {session.room ? ` • ${session.room}` : ''}
                      </p>
                    </div>
                    {showTomorrow ? null : isAttendanceExempt(course) ? (
                      <span className="text-[11px] text-muted whitespace-nowrap" title={tl('Alttan alınan ders, nottan kalınmış')}>
                        {tl('Devam muaf')}
                      </span>
                    ) : (
                    <button
                      onClick={() => toggleAbsence(course, hours, session.kind)}
                      className={`h-8 px-2.5 rounded-lg text-xs inline-flex items-center gap-1.5 border transition-colors ${
                        absent
                          ? 'border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                          : 'border-line text-subtle hover:text-fg hover:bg-surface-2'
                      }`}
                      title={absent ? tl('Devamsızlığı geri al') : tl('{hours} saat devamsızlık işle', { hours })}
                    >
                      {absent ? <Undo2 className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                      {absent ? tl('Geri al') : tl('Gitmedim')}
                    </button>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card>
          <CardHeader
            title={tl('Yaklaşan sınavlar')}
            icon={<CalendarDays className="w-4 h-4 text-subtle" />}
            action={<button className={btnGhost} onClick={() => onOpenTab('sinavlar')}>{tl('Tümü')}</button>}
          />
          {exams.length === 0 ? (
            <EmptyState
              title={tl('Yaklaşan sınav yok')}
              action={<button className={btnSecondary} onClick={() => onOpenTab('sinavlar')}>{tl('Sınav takvimi ekle')}</button>}
            />
          ) : (
            <div className="divide-y divide-line">
              {exams.map((e) => (
                <ExamRow key={e.id} exam={e} course={data.courses.find((c) => c.id === e.courseId)} />
              ))}
            </div>
          )}
        </Card>
      </div>

      {courses.some((c) => c.sessions.length > 0) && (
        <Card>
          <CardHeader
            title={tl('Haftalık ders programı')}
            icon={<Table2 className="w-4 h-4 text-subtle" />}
            action={<button className={btnGhost} onClick={() => onOpenTab('program')}>{tl('Düzenle')}</button>}
          />
          <WeekGrid courses={courses} />
        </Card>
      )}

      <div>
        <Card>
          <CardHeader title={tl('Dikkat gerektirenler')} icon={<AlertTriangle className="w-4 h-4 text-subtle" />} />
          {attention.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-muted flex flex-col items-center gap-2">
              <Check className="w-5 h-5 text-emerald-400" />
              {tl('Devamsızlık ve notlarda risk görünmüyor.')}
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {attention.map((a, i) => (
                <li key={i} className="px-4 py-2.5 flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${a.severity === 'bad' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                  <div className="min-w-0">
                    <p className="text-sm text-fg truncate">{tx(a.course.name)}</p>
                    <p className="text-[11px] text-muted">{tx(a.text)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </div>
  );
}

/** Small "Bugün / Yarın" switch for day-schedule cards. */
export function DayToggle({ tomorrow, onChange }: { tomorrow: boolean; onChange: (tomorrow: boolean) => void }) {
  return (
    <div className="flex rounded-md bg-surface-2 border border-line p-0.5" role="group" aria-label={tl('Gün seçimi')}>
      {(
        [
          [false, tl('Bugün')],
          [true, tl('Yarın')],
        ] as const
      ).map(([value, label]) => (
        <button
          key={label}
          type="button"
          aria-pressed={tomorrow === value}
          onClick={() => onChange(value)}
          className={`h-6 px-2 rounded text-[11px] ${tomorrow === value ? 'bg-surface text-fg' : 'text-subtle hover:text-fg'}`}
        >
          {tx(label)}
        </button>
      ))}
    </div>
  );
}

export function gpaTone(gpa: number | null): 'good' | 'warn' | 'bad' | undefined {
  if (gpa === null) return undefined;
  if (gpa >= 2.5) return 'good';
  if (gpa >= 2.0) return 'warn';
  return 'bad';
}
