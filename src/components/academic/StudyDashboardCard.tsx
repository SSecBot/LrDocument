'use client';

import { t as tl, tx } from '@/lib/i18n';
import React, { useState } from 'react';
import { AlertTriangle, ArrowRight, BookOpenCheck, Check, X } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { addDays, DAYS } from '@/lib/academic/grading';
import type { StudyLog, StudySession } from '@/lib/academic/types';
import { courseStudyStats, formatDuration, occursOn, slotMinutes, studySessionsOf, studyWarning, toMinutes } from '@/lib/academic/study';
import { toLocalDateString } from '@/lib/utils';
import { useAcademicData } from './useAcademicData';
import { StudyWeek } from './StudyTab';
import { Card, CardHeader, EmptyState, btnGhost } from './ui';
import { useNow } from './useNow';

const STATUS: Record<StudyLog['status'], { label: string; cls: string }> = {
  done: { label: 'Çalışıldı', cls: 'bg-emerald-500/15 text-emerald-300' },
  partial: { label: 'Kısmen', cls: 'bg-amber-500/15 text-amber-300' },
  missed: { label: 'Yapılmadı', cls: 'bg-rose-500/15 text-rose-300' },
  makeup: { label: 'Takvim dışı', cls: 'bg-emerald-500/15 text-emerald-300' },
};

/**
 * Genel bakış widget of the ders çalışma takvimi, like the ders programı card: today's study slots
 * (the next day's once today's are over) or the week, with quick marking of the slots that ended.
 */
export function StudyDashboardCard() {
  const { setActiveTab } = useAppStore();
  const { data, update } = useAcademicData();
  const now = useNow(30_000);
  // null = automatic: today until its last study slot is over, then the next day with study.
  const [view, setView] = useState<'today' | 'tomorrow' | 'week' | null>(null);

  if (!data) return null;
  const termId = data.activeTermId ?? data.terms[data.terms.length - 1]?.id;
  const term = data.terms.find((x) => x.id === termId);
  const courses = data.courses.filter((c) => c.termId === termId);
  const sessions = termId ? studySessionsOf(data, termId) : [];
  const open = (
    <button className={btnGhost} onClick={() => setActiveTab('academic')} aria-label={tl('Ders Takibi’ni aç')}>
      <ArrowRight className="w-3.5 h-3.5" />
    </button>
  );

  if (sessions.length === 0) {
    return (
      <Card>
        <CardHeader title={tl('Çalışma takvimi')} icon={<BookOpenCheck className="w-4 h-4 text-emerald-400" />} action={open} />
        <EmptyState
          title={tl('Çalışma takviminizi oluşturun')}
          text={tl('Ders Takibi › Çalışma takvimi bölümünden her ders için haftalık çalışma saatlerinizi seçin; bugünkü çalışmalarınız burada görünsün.')}
        />
      </Card>
    );
  }

  const today = toLocalDateString(now);
  const nowMinutes = now.getHours() * 60 + now.getMinutes();
  const courseOf = (id: string) => courses.find((c) => c.id === id);
  const slotsOn = (date: string) => sessions.filter((s) => occursOn(s, term, date)).sort((a, b) => a.start.localeCompare(b.start));
  const todaySlots = slotsOn(today);
  const auto = todaySlots.some((s) => toMinutes(s.end) > nowMinutes) ? 'today' : 'tomorrow';
  const shown = view ?? auto;
  let date = shown === 'today' ? today : addDays(today, 1);
  // Looking ahead on its own: the next day that has study, not an empty one.
  if (!view && shown === 'tomorrow' && slotsOn(date).length === 0) {
    for (let i = 2; i <= 7; i++) {
      if (slotsOn(addDays(today, i)).length) {
        date = addDays(today, i);
        break;
      }
    }
  }
  const slots = slotsOn(date);
  const weekday = (new Date(`${date}T12:00:00`).getDay() + 6) % 7;
  const logs = data.study?.logs ?? [];
  const logOf = (s: StudySession) => logs.find((l) => l.sessionId === s.id && l.date === date);
  const mark = (s: StudySession, status: 'done' | 'missed') =>
    update((d) => {
      const study = d.study ?? { sessions: [], logs: [] };
      return { ...d, study: { ...study, logs: [...study.logs.filter((l) => !(l.sessionId === s.id && l.date === date)), { sessionId: s.id, courseId: s.courseId, date, status }] } };
    });
  const warning = courseStudyStats(data, term, courses, { date: today, minutes: nowMinutes }).find((s) => s.warn);

  return (
    <Card className="min-w-0">
      <CardHeader
        title={tl('Çalışma takvimi')}
        icon={<BookOpenCheck className="w-4 h-4 text-emerald-400" />}
        action={
          <div className="flex items-center gap-1">
            <div className="flex rounded-md bg-surface-2 border border-line p-0.5">
              {(
                [
                  ['today', tl('Bugün')],
                  ['tomorrow', tl('Yarın')],
                  ['week', tl('Hafta')],
                ] as const
              ).map(([v, label]) => (
                <button
                  key={v}
                  onClick={() => setView(v)}
                  aria-pressed={shown === v}
                  className={`h-6 px-2 rounded text-[11px] ${shown === v ? 'bg-surface text-fg' : 'text-subtle hover:text-fg'}`}
                >
                  {tx(label)}
                </button>
              ))}
            </div>
            {open}
          </div>
        }
      />
      {shown === 'week' ? (
        <StudyWeek sessions={sessions} courseOf={courseOf} today={today} nowMinutes={nowMinutes} />
      ) : slots.length === 0 ? (
        <EmptyState title={shown === 'today' ? tl('Bugün çalışma saatiniz yok') : tl('Yarın çalışma saatiniz yok')} />
      ) : (
        <ul className="divide-y divide-line">
          <li className="px-4 py-1.5 text-[11px] text-muted">
            {date === today ? tl('Bugün') : date === addDays(today, 1) ? tl('Yarın') : tl('Sıradaki çalışma günü')} • {tx(DAYS[weekday])}
          </li>
          {slots.map((s) => {
            const course = courseOf(s.courseId);
            const ended = date < today || (date === today && toMinutes(s.end) <= nowMinutes);
            const live = date === today && !ended && toMinutes(s.start) <= nowMinutes;
            const log = logOf(s);
            return (
              <li key={s.id} className="px-4 py-2.5 flex items-center gap-3">
                <span className="w-1 self-stretch rounded-full" style={{ backgroundColor: course?.color }} />
                <div className="min-w-0 flex-1">
                  <p className="text-sm text-fg truncate">{course ? tx(course.name) : tl('Silinmiş ders')}</p>
                  <p className="text-[11px] text-muted tabular-nums">
                    {tx(s.start)}–{tx(s.end)} • {tx(formatDuration(slotMinutes(s)))}
                  </p>
                </div>
                {live && <span className="text-[11px] px-2 py-0.5 rounded-md bg-emerald-500/15 text-emerald-300 font-medium">{tl('Şu an')}</span>}
                {ended && log && <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium ${STATUS[log.status].cls}`}>{tx(STATUS[log.status].label)}</span>}
                {ended && !log && (
                  <div className="flex items-center gap-1 shrink-0">
                    <button className="h-8 px-2 rounded-md text-xs inline-flex items-center gap-1 border border-line bg-surface-2 text-body hover:bg-surface-3" onClick={() => mark(s, 'done')}>
                      <Check className="w-3.5 h-3.5 text-emerald-400" />{' '}{tl('Çalıştım')}
                    </button>
                    <button className="h-8 w-8 rounded-md inline-flex items-center justify-center border border-line bg-surface-2 text-muted hover:text-rose-300" onClick={() => mark(s, 'missed')} aria-label={tl('Çalışmadım')} title={tl('Çalışmadım')}>
                      <X className="w-3.5 h-3.5" />
                    </button>
                  </div>
                )}
              </li>
            );
          })}
        </ul>
      )}
      {warning && (
        <p className="px-4 py-2.5 border-t border-line text-[11px] text-rose-300 flex items-start gap-1.5">
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-px" />
          <span>{tx(studyWarning(warning))}</span>
        </p>
      )}
    </Card>
  );
}
