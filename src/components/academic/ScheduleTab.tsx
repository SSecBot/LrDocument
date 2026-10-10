'use client';

import React from 'react';
import { Plus } from 'lucide-react';
import type { Course } from '@/lib/academic/types';
import { DAYS, DAYS_SHORT } from '@/lib/academic/grading';
import { Card, CardHeader, EmptyState, btnPrimary, btnGhost } from './ui';

interface Props {
  courses: Course[];
  onAddCourse: () => void;
  onEditCourse: (course: Course) => void;
}

export function ScheduleTab({ courses, onAddCourse, onEditCourse }: Props) {
  const entries = courses.flatMap((c) => c.sessions.map((s) => ({ course: c, session: s })));
  const usedDays = new Set(entries.map((e) => e.session.day));
  const days = [0, 1, 2, 3, 4, ...(usedDays.has(5) ? [5] : []), ...(usedDays.has(6) ? [6] : [])];
  const todayIndex = (new Date().getDay() + 6) % 7;

  const byDay = (day: number) =>
    entries.filter((e) => e.session.day === day).sort((a, b) => a.session.start.localeCompare(b.session.start));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader
          title="Haftalık ders programı"
          action={
            <button className={btnPrimary} onClick={onAddCourse}>
              <Plus className="w-4 h-4" /> Ders ekle
            </button>
          }
        />
        {entries.length === 0 ? (
          <EmptyState
            title="Program boş"
            text="Ders ekleyip gün ve saatlerini girin. Devamsızlık hakları bu saatlere göre hesaplanır."
          />
        ) : (
          <div
            className="grid grid-cols-1 md:gap-px md:bg-line md:[grid-template-columns:repeat(var(--days),minmax(0,1fr))]"
            style={{ ['--days' as string]: days.length }}
          >
            {days.map((day) => (
              <div key={day} className="bg-surface min-w-0">
                <div className={`px-3 py-2 text-xs font-semibold border-b border-line md:text-center ${day === todayIndex ? 'text-emerald-400' : 'text-subtle'}`}>
                  <span className="md:hidden">{DAYS[day]}</span>
                  <span className="hidden md:inline">{DAYS_SHORT[day]}</span>
                </div>
                <div className="p-2 space-y-1.5 md:min-h-[120px]">
                  {byDay(day).length === 0 ? (
                    <p className="text-[11px] text-muted px-1 py-1 md:text-center">—</p>
                  ) : (
                    byDay(day).map(({ course, session }) => (
                      <button
                        key={session.id}
                        onClick={() => onEditCourse(course)}
                        className="w-full text-left rounded-lg bg-surface-2 hover:bg-surface-3 border-l-[3px] px-2.5 py-1.5 transition-colors"
                        style={{ borderLeftColor: course.color }}
                      >
                        <p className="text-[11px] text-muted tabular-nums">
                          {session.start}–{session.end}
                        </p>
                        <p className="text-xs font-medium text-fg truncate">{course.code || course.name}</p>
                        <p className="text-[11px] text-muted truncate">
                          {session.kind === 'uygulama' ? 'Uyg.' : 'Teo.'}
                          {session.room ? ` • ${session.room}` : ''}
                        </p>
                      </button>
                    ))
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </Card>

      <Card>
        <CardHeader title={`Dersler (${courses.length})`} />
        {courses.length === 0 ? (
          <EmptyState title="Henüz ders eklenmedi" />
        ) : (
          <ul className="divide-y divide-line">
            {courses.map((c) => (
              <li key={c.id} className="px-4 py-2.5 flex items-center gap-3">
                <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: c.color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-fg truncate">
                    {c.code && <span className="text-muted mr-1.5">{c.code}</span>}
                    {c.name}
                  </p>
                  <p className="text-[11px] text-muted">
                    {c.credit} kredi • {c.ects} AKTS • haftada {c.theoryHours} teorik
                    {c.practiceHours ? ` + ${c.practiceHours} uygulama` : ''} saat
                    {c.instructor ? ` • ${c.instructor}` : ''}
                  </p>
                </div>
                <button className={btnGhost} onClick={() => onEditCourse(c)}>Düzenle</button>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </div>
  );
}
