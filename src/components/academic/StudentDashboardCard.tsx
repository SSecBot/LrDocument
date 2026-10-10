'use client';

import React, { useState } from 'react';
import { ArrowRight, CalendarDays, GraduationCap } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { DAYS, isHoliday, upcomingExams } from '@/lib/academic/grading';
import { toLocalDateString } from '@/lib/utils';
import { useAcademicData } from './useAcademicData';
import { ExamRow } from './ExamsTab';
import { WeekGrid } from './ScheduleTab';
import { Card, CardHeader, EmptyState, btnGhost } from './ui';

/** Course schedule + exam countdown shown on the main dashboard for student accounts. */
export function StudentDashboardCard() {
  const { setActiveTab } = useAppStore();
  const { data } = useAcademicData();
  const [view, setView] = useState<'today' | 'week'>('today');

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

  const todayIndex = (new Date().getDay() + 6) % 7;
  const term = data.terms.find((t) => t.id === termId);
  const holidayToday = term ? isHoliday(toLocalDateString(), term) : undefined;
  const nowMinutes = new Date().getHours() * 60 + new Date().getMinutes();
  const today = courses
    .flatMap((c) => c.sessions.filter((s) => s.day === todayIndex).map((s) => ({ course: c, session: s })))
    .filter(({ session }) => !holidayToday?.half || session.start < '13:00')
    .sort((a, b) => a.session.start.localeCompare(b.session.start));
  const toMin = (t: string) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));
  // First session on the following days, used when there is no class today.
  const nextClass = [1, 2, 3, 4, 5, 6]
    .map((offset) => (todayIndex + offset) % 7)
    .map((day) =>
      courses
        .flatMap((c) => c.sessions.filter((s) => s.day === day).map((s) => ({ course: c, session: s })))
        .sort((a, b) => a.session.start.localeCompare(b.session.start))[0]
    )
    .find(Boolean);

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
                    ['week', 'Hafta'],
                  ] as const
                ).map(([v, label]) => (
                  <button
                    key={v}
                    onClick={() => setView(v)}
                    className={`h-6 px-2 rounded text-[11px] ${view === v ? 'bg-surface text-fg' : 'text-subtle hover:text-fg'}`}
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
        {view === 'week' ? (
          <WeekGrid courses={courses} />
        ) : holidayToday && !holidayToday.half ? (
          <EmptyState title={holidayToday.kind === 'sinav' ? `Sınav dönemi — ${holidayToday.name}` : `Bugün tatil — ${holidayToday.name}`} />
        ) : today.length === 0 ? (
          <EmptyState
            title={`${DAYS[todayIndex]} — bugün dersiniz yok`}
            text={nextClass ? `Sıradaki ders: ${DAYS[nextClass.session.day]} ${nextClass.session.start} • ${nextClass.course.name}` : undefined}
          />
        ) : (
          <ul className="divide-y divide-line">
            {today.map(({ course, session }) => {
              const done = toMin(session.end) <= nowMinutes;
              const live = !done && toMin(session.start) <= nowMinutes;
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
