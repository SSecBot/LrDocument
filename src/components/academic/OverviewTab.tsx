'use client';

import React from 'react';
import { AlertTriangle, CalendarClock, CalendarDays, Check, Table2, Undo2, UserX } from 'lucide-react';
import type { AcademicData, Course, Term } from '@/lib/academic/types';
import {
  attendanceStatus,
  computeCourseGrade,
  DAYS,
  daysUntil,
  isAttendanceExempt,
  isHoliday,
  newId,
  sessionHours,
  summarizeAll,
  summarizeTerm,
  upcomingExams,
} from '@/lib/academic/grading';
import { toLocalDateString } from '@/lib/utils';
import { Card, CardHeader, EmptyState, Stat, btnGhost, btnSecondary } from './ui';
import { ExamRow } from './ExamsTab';
import { WeekGrid } from './ScheduleTab';

interface Props {
  data: AcademicData;
  term: Term;
  courses: Course[];
  update: (fn: (d: AcademicData) => AcademicData) => void;
  onAddCourse: () => void;
  onOpenTab: (tab: 'program' | 'sinavlar') => void;
}

export function OverviewTab({ data, term, courses, update, onAddCourse, onOpenTab }: Props) {
  const exams = upcomingExams(data.exams ?? []).slice(0, 5);
  const nextExam = exams[0];
  const termSummary = summarizeTerm(data, term);
  const all = summarizeAll(data);
  const today = toLocalDateString();
  const todayIndex = (new Date().getDay() + 6) % 7;
  const basisLabel = data.grading.gpaBasis === 'ects' ? 'AKTS' : 'kredi';

  const holidayToday = isHoliday(today, term);
  const todaySessions = courses
    .flatMap((c) => c.sessions.filter((s) => s.day === todayIndex).map((s) => ({ course: c, session: s })))
    .sort((a, b) => a.session.start.localeCompare(b.session.start));

  const attention = courses.flatMap((c) => {
    const items: { course: Course; text: string; severity: 'warn' | 'bad' }[] = [];
    for (const a of attendanceStatus(c, data.grading, term)) {
      const label = a.kind === 'teori' ? 'teorik' : 'uygulama';
      if (a.state === 'over') items.push({ course: c, text: `Devamsızlık sınırı aşıldı (${label})`, severity: 'bad' });
      else if (a.state === 'warn') items.push({ course: c, text: `${label} için ${a.remaining} saat devamsızlık hakkı kaldı`, severity: 'warn' });
    }
    const g = computeCourseGrade(c, data.grading, {}, term);
    if (g.status === 'kaldi') items.push({ course: c, text: `Kaldı${g.reason ? ` — ${g.reason}` : ''}`, severity: 'bad' });
    if (g.status === 'devam') {
      const pass = g.required[0];
      if (pass && pass.score === null) items.push({ course: c, text: 'Kalan sınavlarla geçmek mümkün görünmüyor', severity: 'bad' });
      else if (pass && pass.score !== null && pass.score >= 75)
        items.push({ course: c, text: `Geçmek için kalan sınavlardan en az ${pass.score} gerekli`, severity: 'warn' });
    }
    return items;
  });

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
        <Stat label={`Dönem ortalaması (${term.name})`} value={termSummary.gpa?.toFixed(2) ?? '—'} hint={`${termSummary.gradedWeight} ${basisLabel} notlandı`} tone={gpaTone(termSummary.gpa)} />
        <Stat label="Genel ortalama (AGNO)" value={all.gpa?.toFixed(2) ?? '—'} hint={`${all.earnedWeight} ${basisLabel} tamamlandı`} tone={gpaTone(all.gpa)} />
        <Stat
          label="Sıradaki sınav"
          value={nextExam ? (daysUntil(nextExam.date) <= 0 ? 'Bugün' : `${daysUntil(nextExam.date)} gün`) : '—'}
          hint={nextExam ? nextExam.title : `${courses.length} ders • ${termSummary.totalWeight} ${basisLabel}`}
          tone={nextExam ? (daysUntil(nextExam.date) <= 2 ? 'bad' : daysUntil(nextExam.date) <= 7 ? 'warn' : undefined) : undefined}
        />
        <Stat
          label="Uyarılar"
          value={attention.length}
          hint={attention.length ? 'aşağıda listelendi' : 'her şey yolunda'}
          tone={attention.some((a) => a.severity === 'bad') ? 'bad' : attention.length ? 'warn' : 'good'}
        />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader title={`Bugün — ${DAYS[todayIndex]}`} icon={<CalendarClock className="w-4 h-4 text-subtle" />} />
          {courses.length === 0 ? (
            <EmptyState title="Bu dönem için ders yok" text="Ders programını oluşturarak başlayın." action={<button className={btnSecondary} onClick={onAddCourse}>Ders ekle</button>} />
          ) : holidayToday ? (
            <EmptyState title={`Bugün tatil — ${holidayToday.name}`} text="Akademik takvime göre bugün ders yok; devamsızlık sayılmaz." />
          ) : todaySessions.length === 0 ? (
            <EmptyState title="Bugün dersiniz yok" />
          ) : (
            <ul className="divide-y divide-line">
              {todaySessions.map(({ course, session }) => {
                const absent = absentToday(course, session.kind);
                const hours = sessionHours(session);
                return (
                  <li key={session.id} className="px-4 py-2.5 flex items-center gap-3">
                    <span className="w-1 self-stretch rounded-full" style={{ backgroundColor: course.color }} />
                    <div className="min-w-0 flex-1">
                      <p className="text-sm text-fg truncate">{course.name}</p>
                      <p className="text-[11px] text-muted">
                        {session.start}–{session.end} • {session.kind === 'teori' ? 'Teorik' : 'Uygulama'}
                        {session.room ? ` • ${session.room}` : ''}
                      </p>
                    </div>
                    {isAttendanceExempt(course) ? (
                      <span className="text-[11px] text-muted whitespace-nowrap" title="Alttan alınan ders, nottan kalınmış">
                        Devam muaf
                      </span>
                    ) : (
                    <button
                      onClick={() => toggleAbsence(course, hours, session.kind)}
                      className={`h-8 px-2.5 rounded-lg text-xs inline-flex items-center gap-1.5 border transition-colors ${
                        absent
                          ? 'border-rose-500/40 bg-rose-500/10 text-rose-300 hover:bg-rose-500/20'
                          : 'border-line text-subtle hover:text-fg hover:bg-surface-2'
                      }`}
                      title={absent ? 'Devamsızlığı geri al' : `${hours} saat devamsızlık işle`}
                    >
                      {absent ? <Undo2 className="w-3.5 h-3.5" /> : <UserX className="w-3.5 h-3.5" />}
                      {absent ? 'Geri al' : 'Gitmedim'}
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
            title="Yaklaşan sınavlar"
            icon={<CalendarDays className="w-4 h-4 text-subtle" />}
            action={<button className={btnGhost} onClick={() => onOpenTab('sinavlar')}>Tümü</button>}
          />
          {exams.length === 0 ? (
            <EmptyState
              title="Yaklaşan sınav yok"
              action={<button className={btnSecondary} onClick={() => onOpenTab('sinavlar')}>Sınav takvimi ekle</button>}
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
            title="Haftalık ders programı"
            icon={<Table2 className="w-4 h-4 text-subtle" />}
            action={<button className={btnGhost} onClick={() => onOpenTab('program')}>Düzenle</button>}
          />
          <WeekGrid courses={courses} />
        </Card>
      )}

      <div>
        <Card>
          <CardHeader title="Dikkat gerektirenler" icon={<AlertTriangle className="w-4 h-4 text-subtle" />} />
          {attention.length === 0 ? (
            <div className="px-4 py-10 text-center text-xs text-muted flex flex-col items-center gap-2">
              <Check className="w-5 h-5 text-emerald-400" />
              Devamsızlık ve notlarda risk görünmüyor.
            </div>
          ) : (
            <ul className="divide-y divide-line">
              {attention.map((a, i) => (
                <li key={i} className="px-4 py-2.5 flex items-center gap-3">
                  <span className={`w-2 h-2 rounded-full shrink-0 ${a.severity === 'bad' ? 'bg-rose-500' : 'bg-amber-500'}`} />
                  <div className="min-w-0">
                    <p className="text-sm text-fg truncate">{a.course.name}</p>
                    <p className="text-[11px] text-muted">{a.text}</p>
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

export function gpaTone(gpa: number | null): 'good' | 'warn' | 'bad' | undefined {
  if (gpa === null) return undefined;
  if (gpa >= 2.5) return 'good';
  if (gpa >= 2.0) return 'warn';
  return 'bad';
}
