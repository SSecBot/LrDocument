'use client';

import React, { useState } from 'react';
import { ArrowRight, CalendarDays, GraduationCap } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { addDays, DAYS, dayPlan, formatDayPlanEmpty, nextClassDay, TOMORROW_FROM_HOUR, upcomingExams } from '@/lib/academic/grading';
import { toLocalDateString } from '@/lib/utils';
import { useAcademicData } from './useAcademicData';
import { ExamRow } from './ExamsTab';
import { WeekGrid } from './ScheduleTab';
import { Card, CardHeader, EmptyState, btnGhost } from './ui';
import { useNow } from './useNow';

/** Course schedule + exam countdown shown on the main dashboard for student accounts. */
export function StudentDashboardCard() {
  const { setActiveTab } = useAppStore();
  const { data } = useAcademicData();
  const now = useNow();
  // null = automatic: today until 17:00, tomorrow afterwards.
  const [view, setView] = useState<'today' | 'tomorrow' | 'week' | null>(null);

  if (!data) return null;
  const termId = data.activeTermId ?? data.terms[data.terms.length - 1]?.id;
  const courses = data.courses.filter((c) => c.termId === termId);
  const exams = upcomingExams(data.exams ?? []).slice(0, 4);
  if (courses.length === 0 && exams.length === 0) {
    return (
      <Card>
        <CardHeader title="Ders Takibi" icon={<GraduationCap className="w-4 h-4 text-emerald-400" />} />
        <EmptyState
          title="Ders programınızı ekleyin"
          text="Ders programı PDF’inizi yükleyin, sınav tarihlerinizi girin; bugünkü dersleriniz ve sınavlara kalan süre burada görünsün."
          action={
            <button className={btnGhost} onClick={() => setActiveTab('academic')}>
              Ders Takibi’ne git <ArrowRight className="w-3.5 h-3.5" />
            </button>
          }
        />
      </Card>
    );
  }

  const term = data.terms.find((t) => t.id === termId);
  const shown = view ?? (now.getHours() >= TOMORROW_FROM_HOUR ? 'tomorrow' : 'today');
  const tomorrow = shown === 'tomorrow';
  const todayIso = toLocalDateString(now);
  const plan = dayPlan(courses, term, tomorrow ? addDays(todayIso, 1) : todayIso);
  const empty = formatDayPlanEmpty(plan, tomorrow, term);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  // Used when the shown day has no classes.
  const next = empty ? nextClassDay(courses, term, plan.date) : null;
  const nextText = next
    ? `Sıradaki ders: ${next.date === addDays(todayIso, 1) ? 'Yarın' : DAYS[next.weekday]} ${next.sessions[0].session.start} • ${next.sessions[0].course.name}`
    : undefined;

  return (
    <div className="grid grid-cols-1 lg:grid-cols-5 gap-3">
      <Card className="lg:col-span-3 min-w-0">
        <CardHeader
          title="Ders programı"
          icon={<GraduationCap className="w-4 h-4 text-emerald-400" />}
          action={
            <div className="flex items-center gap-1">
              <div className="flex rounded-md bg-surface-2 border border-line p-0.5">
                {(
                  [
                    ['today', 'Bugün'],
                    ['tomorrow', 'Yarın'],
                    ['week', 'Hafta'],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    aria-pressed={shown === v}
                    className={`h-6 px-2 rounded text-[11px] ${shown === v ? 'bg-surface text-fg' : 'text-subtle hover:text-fg'}`}
                  >
                    {label}
                  </button>
                ))}
              </div>
              <button className={btnGhost} onClick={() => setActiveTab('academic')} aria-label="Ders Takibi’ni aç">
                <ArrowRight className="w-3.5 h-3.5" />
              </button>
            </div>
          }
        />
        {shown === 'week' ? (
          <WeekGrid courses={courses} />
        ) : empty ? (
          <EmptyState title={empty.title} text={nextText ?? empty.text} />
        ) : (
          <ul className="divide-y divide-line">
            <li className="px-4 py-1.5 text-[11px] text-muted">
              {tomorrow ? 'Yarın' : 'Bugün'} • {DAYS[plan.weekday]}
              {plan.halfHoliday ? ` • ${plan.halfHoliday.name}: 13:00 sonrası ders yok` : ''}
            </li>
            {plan.sessions.map(({ course, session }) => {
              const done = !tomorrow && toMin(session.end) <= nowMinutes;
              const live = !tomorrow && !done && toMin(session.start) <= nowMinutes;
              return (
                <li key={session.id} className={`px-4 py-2.5 flex items-center gap-3 ${done ? 'opacity-50' : ''}`}>
                  <span className="w-1 self-stretch rounded-full" style={{ backgroundColor: course.color }} />
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-fg truncate">{course.name}</p>
                    <p className="text-[11px] text-muted">
                      {session.start}–{session.end} • {session.kind === 'teori' ? 'Teorik' : 'Uygulama'}
                      {session.room ? ` • ${session.room}` : ''}
                    </p>
                  </div>
                  {live && <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 font-medium">Şu an</span>}
                </li>
              );
            })}
          </ul>
        )}
      </Card>

      <Card className="lg:col-span-2 min-w-0">
        <CardHeader title="Yaklaşan sınavlar" icon={<CalendarDays className="w-4 h-4 text-subtle" />} />
        {exams.length === 0 ? (
          <EmptyState title="Yaklaşan sınav yok" text="Sınav tarihlerinizi Ders Takibi › Sınavlar bölümünden ekleyin." />
        ) : (
          <div className="divide-y divide-line">
            {exams.map((e) => (
              <ExamRow key={e.id} exam={e} course={data.courses.find((c) => c.id === e.courseId)} />
            ))}
          </div>
        )}
      </Card>
    </div>
  );
}
