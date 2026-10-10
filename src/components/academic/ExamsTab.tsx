'use client';

import React, { useState } from 'react';
import { CalendarDays, MapPin, Pencil, Plus } from 'lucide-react';
import type { AcademicData, Course, Exam, Term } from '@/lib/academic/types';
import { countdownLabel, daysUntil, EXAM_TYPE_LABEL, isExamPast, sortExams } from '@/lib/academic/grading';
import { fold } from '@/lib/academic/scheduleParser';
import { ExamModal } from './ExamModal';
import { Card, CardHeader, EmptyState, ScoreInput, btnGhost, btnPrimary } from './ui';

interface Props {
  data: AcademicData;
  term: Term;
  courses: Course[];
  update: (fn: (d: AcademicData) => AcademicData) => void;
}

export function formatExamDate(exam: Exam): string {
  const [y, m, d] = exam.date.split('-').map(Number);
  const date = new Date(y, m - 1, d).toLocaleDateString('tr-TR', { day: 'numeric', month: 'long', weekday: 'short' });
  const time = exam.start ? ` • ${exam.start}${exam.end ? `–${exam.end}` : ''}` : '';
  return date + time;
}

export function CountdownChip({ exam }: { exam: Exam }) {
  const days = daysUntil(exam.date);
  const past = isExamPast(exam);
  const cls = past
    ? 'bg-surface-3 text-muted'
    : days <= 2
      ? 'bg-rose-500/15 text-rose-300'
      : days <= 7
        ? 'bg-amber-500/15 text-amber-300'
        : 'bg-emerald-500/10 text-emerald-300';
  return <span className={`text-[11px] px-2 py-0.5 rounded-md font-medium whitespace-nowrap tabular-nums ${cls}`}>{countdownLabel(exam)}</span>;
}

/** Compact exam row shared by the exams tab and overview cards. */
export function ExamRow({ exam, course, action }: { exam: Exam; course?: Course; action?: React.ReactNode }) {
  return (
    <div className="px-4 py-2.5 flex items-center gap-3">
      <span className="w-1 self-stretch rounded-full shrink-0" style={{ backgroundColor: course?.color ?? '#64748b' }} />
      <div className="min-w-0 flex-1">
        <p className="text-sm text-fg truncate">
          {exam.title}
          {!fold(exam.title).includes(fold(EXAM_TYPE_LABEL[exam.type])) && (
            <span className="text-[11px] text-muted ml-1.5">{EXAM_TYPE_LABEL[exam.type]}</span>
          )}
        </p>
        <p className="text-[11px] text-muted truncate">
          {formatExamDate(exam)}
          {exam.room && (
            <>
              {' '}• <MapPin className="w-3 h-3 inline -mt-0.5" /> {exam.room}
            </>
          )}
          {exam.note ? ` • ${exam.note}` : ''}
        </p>
      </div>
      <CountdownChip exam={exam} />
      {action}
    </div>
  );
}

export function ExamsTab({ data, term, courses, update }: Props) {
  const [modal, setModal] = useState<{ open: boolean; exam: Exam | null }>({ open: false, exam: null });
  const [showAllPast, setShowAllPast] = useState(false);

  const exams = sortExams((data.exams ?? []).filter((e) => e.termId === term.id));
  const upcoming = exams.filter((e) => !isExamPast(e));
  const past = exams.filter((e) => isExamPast(e)).reverse();
  const courseOf = (e: Exam) => data.courses.find((c) => c.id === e.courseId);

  const saveExam = (exam: Exam) =>
    update((d) => {
      const list = d.exams ?? [];
      return { ...d, exams: list.some((e) => e.id === exam.id) ? list.map((e) => (e.id === exam.id ? exam : e)) : [...list, exam] };
    });
  const deleteExam = (id: string) => update((d) => ({ ...d, exams: (d.exams ?? []).filter((e) => e.id !== id) }));

  const setScore = (exam: Exam, score: number | null) =>
    update((d) => ({
      ...d,
      courses: d.courses.map((c) =>
        c.id === exam.courseId
          ? { ...c, assessments: c.assessments.map((a) => (a.id === exam.assessmentId ? { ...a, score } : a)) }
          : c
      ),
    }));

  const editBtn = (exam: Exam) => (
    <button className={btnGhost} onClick={() => setModal({ open: true, exam })} aria-label="Sınavı düzenle">
      <Pencil className="w-3.5 h-3.5" />
    </button>
  );

  const next = upcoming[0];

  return (
    <div className="space-y-4">
      {next && (
        <div className="rounded-xl border border-line bg-surface p-4 flex flex-col sm:flex-row sm:items-center gap-3">
          <div className="text-center sm:text-left sm:pr-4 sm:border-r border-line">
            <p className="text-3xl font-semibold text-fg tabular-nums leading-none">{Math.max(0, daysUntil(next.date))}</p>
            <p className="text-[11px] text-muted mt-1">gün</p>
          </div>
          <div className="min-w-0 flex-1 text-center sm:text-left">
            <p className="text-[11px] text-muted">Sıradaki sınav</p>
            <p className="text-sm font-semibold text-fg truncate">{next.title}</p>
            <p className="text-xs text-subtle">{formatExamDate(next)}{next.room ? ` • ${next.room}` : ''}</p>
          </div>
          <CountdownChip exam={next} />
        </div>
      )}

      <Card>
        <CardHeader
          title={`Yaklaşan sınavlar (${upcoming.length})`}
          icon={<CalendarDays className="w-4 h-4 text-subtle" />}
          action={
            <button className={btnPrimary} onClick={() => setModal({ open: true, exam: null })}>
              <Plus className="w-4 h-4" /> Sınav ekle
            </button>
          }
        />
        {upcoming.length === 0 ? (
          <EmptyState
            title="Yaklaşan sınav yok"
            text="Vize, final ve quiz tarihlerinizi ekleyin; kalan günleri burada ve genel bakışta görürsünüz."
          />
        ) : (
          <div className="divide-y divide-line">
            {upcoming.map((e) => (
              <ExamRow key={e.id} exam={e} course={courseOf(e)} action={editBtn(e)} />
            ))}
          </div>
        )}
      </Card>

      {past.length > 0 && (
        <Card>
          <CardHeader title={`Geçmiş sınavlar (${past.length})`} />
          <div className="divide-y divide-line">
            {(showAllPast ? past : past.slice(0, 5)).map((e) => {
              const course = courseOf(e);
              const assessment = course?.assessments.find((a) => a.id === e.assessmentId);
              return (
                <ExamRow
                  key={e.id}
                  exam={e}
                  course={course}
                  action={
                    <>
                      {assessment && (
                        <ScoreInput value={assessment.score} onChange={(v) => setScore(e, v)} placeholder="Not" className="w-16" />
                      )}
                      {editBtn(e)}
                    </>
                  }
                />
              );
            })}
          </div>
          {past.length > 5 && (
            <button className="w-full h-9 text-xs text-subtle hover:text-fg border-t border-line" onClick={() => setShowAllPast((v) => !v)}>
              {showAllPast ? 'Daha az göster' : `Tümünü göster (${past.length})`}
            </button>
          )}
        </Card>
      )}

      <ExamModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, exam: null })}
        exam={modal.exam}
        termId={term.id}
        courses={courses}
        onSave={saveExam}
        onDelete={deleteExam}
      />
    </div>
  );
}
