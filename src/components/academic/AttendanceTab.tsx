'use client';

import { t as tl, tx } from '@/lib/i18n';
import type { AcademicUpdate } from './useAcademicData';
import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { AcademicData, Course, SessionKind } from '@/lib/academic/types';
import { attendanceStatus, calendarWeeks, hasCalendar, isAttendanceExempt, newId } from '@/lib/academic/grading';
import { formatTurkishDate, toLocalDateString } from '@/lib/utils';
import { Card, CardHeader, EmptyState, Progress, btnGhost, btnPrimary, inputCls } from './ui';
import { confirmDelete } from '@/components/ui/ConfirmDialog';

interface Props {
  data: AcademicData;
  courses: Course[];
  update: AcademicUpdate;
  onEditCourse: (course: Course) => void;
}

export function AttendanceTab({ data, courses, update, onEditCourse }: Props) {
  const g = data.grading;
  const term = data.terms.find((t) => t.id === courses[0]?.termId);
  if (courses.length === 0) {
    return (
      <Card>
        <EmptyState title={tl('Bu dönem için ders yok')} text={tl('Önce Program sekmesinden ders ekleyin.')} />
      </Card>
    );
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        {tl('Devam zorunluluğu: teorik derslerde %')}{g.attendanceTheory}, uygulamalarda %{g.attendancePractice} •{' '}
        {hasCalendar(term)
          ? tl('akademik takvime göre {v0} haftalık dönem; bayram, tatil ve sınav haftalarına denk gelen dersler sayılmaz', { v0: calendarWeeks(term) })
          : tl('{weeksPerTerm} haftalık dönem (akademik takvimi Ayarlar › Ders Takibi Ayarları’ndan ekleyebilirsiniz)', { weeksPerTerm: g.weeksPerTerm })}
        {tl('. Sınırı aşan derste final sınavına girilemez ve ders devamsızlıktan (D) kalınır.')}
      </p>
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        {courses.map((c) => (
          <AttendanceCard key={c.id} course={c} data={data} update={update} onEditCourse={onEditCourse} />
        ))}
      </div>
    </div>
  );
}

function AttendanceCard({
  course,
  data,
  update,
  onEditCourse,
}: {
  course: Course;
  data: AcademicData;
  update: Props['update'];
  onEditCourse: (c: Course) => void;
}) {
  const term = data.terms.find((t) => t.id === course.termId);
  const statuses = attendanceStatus(course, data.grading, term);
  const exempt = isAttendanceExempt(course);
  const [adding, setAdding] = useState(false);
  const [date, setDate] = useState(toLocalDateString());
  const [kind, setKind] = useState<SessionKind>(course.theoryHours > 0 || course.practiceHours === 0 ? 'teori' : 'uygulama');
  const [hours, setHours] = useState(2);
  const [showAll, setShowAll] = useState(false);

  const mutate = (fn: (c: Course) => Course, undo?: { title: string; message?: string }) =>
    update((d) => ({ ...d, courses: d.courses.map((c) => (c.id === course.id ? fn(c) : c)) }), undo);

  const history = [...course.absences].sort((a, b) => b.date.localeCompare(a.date));
  const visible = showAll ? history : history.slice(0, 3);

  return (
    <Card>
      <CardHeader
        title={
          <span className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: course.color }} />
            <span className="truncate">{tx(course.name)}</span>
          </span>
        }
        action={
          !exempt && (
            <button className={btnGhost} onClick={() => setAdding((v) => !v)}>
              <Plus className="w-3.5 h-3.5" /> Devamsızlık
            </button>
          )
        }
      />
      <div className="p-4 space-y-3">
        {exempt ? (
          <p className="text-xs text-muted">
            {tl('Alttan alınan ders (daha önce nottan kalındı): devam zorunluluğu yok, devamsızlık takip edilmez.')}
          </p>
        ) : statuses.length === 0 ? (
          <p className="text-xs text-muted">
            {tl('Haftalık ders saati girilmemiş.')}{' '}
            <button className="text-emerald-400 hover:underline" onClick={() => onEditCourse(course)}>
              {tl('Programı düzenle')}
            </button>
          </p>
        ) : (
          statuses.map((s) => (
            <div key={s.kind} className="space-y-1.5">
              <div className="flex items-baseline justify-between text-xs">
                <span className="text-body">
                  {s.kind === 'teori' ? tl('Teorik') : tl('Uygulama')}{' '}
                  <span className="text-muted">
                    ({s.weeklyHours}{' '}{tl('saat/hafta • dönemde')}{' '}{s.totalHours} saat{s.basis === 'takvim' ? tl(', takvime göre') : ''})
                  </span>
                </span>
                <span className="tabular-nums text-subtle">
                  {s.used} / {s.allowed} saat
                </span>
              </div>
              <Progress value={s.used} max={s.allowed} state={s.state} />
              <p className={`text-[11px] ${s.state === 'over' ? 'text-rose-400' : s.state === 'warn' ? 'text-amber-400' : 'text-muted'}`}>
                {s.state === 'over'
                  ? tl('Sınır {v0} saat aşıldı — devamsızlıktan kalma durumu', { v0: -s.remaining })
                  : tl('{remaining} saat hakkın kaldı{v1}', { remaining: s.remaining, v1: s.remainingWeeks > 0 ? ` (≈ ${s.remainingWeeks} hafta)` : '' })}
              </p>
            </div>
          ))
        )}

        {adding && (
          <div className="grid grid-cols-2 sm:grid-cols-[1fr_1fr_70px_auto] gap-2 items-end pt-1">
            <input type="date" className={inputCls} value={date} max={toLocalDateString()} onChange={(e) => setDate(e.target.value)} />
            <select className={inputCls} value={kind} onChange={(e) => setKind(e.target.value as SessionKind)}>
              <option value="teori">{tl('Teorik')}</option>
              <option value="uygulama">{tl('Uygulama')}</option>
            </select>
            <input
              type="number"
              min={1}
              max={12}
              className={inputCls}
              value={hours}
              onChange={(e) => setHours(Math.min(12, Math.max(1, Math.round(Number(e.target.value) || 1))))}
              aria-label={tl('Saat')}
            />
            <button
              className={btnPrimary}
              onClick={() => {
                if (!date) return;
                mutate((c) => ({ ...c, absences: [...c.absences, { id: newId(), date, hours, kind }] }));
                setAdding(false);
              }}
            >
              {tl('Ekle')}
            </button>
          </div>
        )}

        {history.length > 0 && (
          <div className="pt-1">
            <ul className="space-y-1">
              {visible.map((a) => (
                <li key={a.id} className="flex items-center justify-between text-xs text-subtle">
                  <span>
                    {tx(formatTurkishDate(a.date))} • {a.hours} saat {a.kind === 'teori' ? 'teorik' : 'uygulama'}
                  </span>
                  <button
                    className="w-7 h-7 flex items-center justify-center text-muted hover:text-rose-400"
                    onClick={async () => (await confirmDelete(tl('Devamsızlık kaydı'))) && mutate((c) => ({ ...c, absences: c.absences.filter((x) => x.id !== a.id) }), { title: tl('Devamsızlık silindi'), message: course.name })}
                    aria-label={tl('Devamsızlığı sil')}
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
            {history.length > 3 && (
              <button className="text-[11px] text-subtle hover:text-fg mt-1" onClick={() => setShowAll((v) => !v)}>
                {showAll ? tl('Daha az göster') : tl('Tümünü göster ({length})', { length: history.length })}
              </button>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
