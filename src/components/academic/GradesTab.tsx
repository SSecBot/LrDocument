'use client';

import React, { useState } from 'react';
import { FlaskConical, Plus, RotateCcw, Settings2 } from 'lucide-react';
import type { AcademicData, Course, GradingSystem, Term } from '@/lib/academic/types';
import { computeCourseGrade, newId, summarizeTerm } from '@/lib/academic/grading';
import { Card, CardHeader, EmptyState, LetterBadge, ScoreInput, StatusBadge, btnGhost } from './ui';

interface Props {
  data: AcademicData;
  term: Term;
  courses: Course[];
  update: (fn: (d: AcademicData) => AcademicData) => void;
  onEditCourse: (course: Course) => void;
}

export function GradesTab({ data, term, courses, update, onEditCourse }: Props) {
  const g = data.grading;
  if (courses.length === 0) {
    return (
      <Card>
        <EmptyState title="Bu dönem için ders yok" text="Önce Program sekmesinden ders ekleyin." />
      </Card>
    );
  }

  const termSummary = summarizeTerm(data, term);
  const finalStatus = new Map(termSummary.courses.map((c) => [c.course.id, c.finalStatus]));

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted">
        Final barajı {g.minFinal}
        {g.failBelowAverage > 0 ? ` • ${g.failBelowAverage} altı ortalama FF` : ''} •{' '}
        {g.conditionalLetters.length > 0 && `${g.conditionalLetters.join(', ')} dönem ortalaması ${g.conditionalGpa.toFixed(2)} ve üzeriyse geçer • `}
        Notları girdikçe harf notu otomatik hesaplanır. “Test et” ile kaydetmeden farklı notları deneyebilirsiniz.
      </p>
      {g.relativeNote && <p className="text-[11px] text-amber-300/80 bg-amber-500/5 border border-amber-500/20 rounded-lg px-3 py-2">{g.relativeNote}</p>}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-3">
        {courses.map((c) => (
          <GradeCard
            key={c.id}
            course={c}
            grading={g}
            resolvedStatus={finalStatus.get(c.id)}
            update={update}
            onEditCourse={onEditCourse}
          />
        ))}
      </div>
    </div>
  );
}

function GradeCard({
  course,
  grading,
  resolvedStatus,
  update,
  onEditCourse,
}: {
  course: Course;
  grading: GradingSystem;
  resolvedStatus?: ReturnType<typeof computeCourseGrade>['status'];
  update: Props['update'];
  onEditCourse: (c: Course) => void;
}) {
  const [simulate, setSimulate] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, number | null>>({});

  const saved = computeCourseGrade(course, grading);
  const shown = simulate ? computeCourseGrade(course, grading, overrides) : saved;
  const status = !simulate && resolvedStatus ? resolvedStatus : shown.status;

  const setScore = (id: string, score: number | null) =>
    update((d) => ({
      ...d,
      courses: d.courses.map((c) =>
        c.id === course.id ? { ...c, assessments: c.assessments.map((a) => (a.id === id ? { ...a, score } : a)) } : c
      ),
    }));

  const addButunleme = () =>
    update((d) => ({
      ...d,
      courses: d.courses.map((c) =>
        c.id === course.id
          ? { ...c, assessments: [...c.assessments, { id: newId(), name: 'Bütünleme', type: 'butunleme', weight: 0, score: null }] }
          : c
      ),
    }));

  const hasButunleme = course.assessments.some((a) => a.type === 'butunleme');
  const failing = shown.letter ? grading.failingLetters.includes(shown.letter) || shown.letter === 'D' : false;
  const conditional = shown.letter ? grading.conditionalLetters.includes(shown.letter) : false;

  return (
    <Card className={simulate ? 'ring-1 ring-sky-500/40' : ''}>
      <CardHeader
        title={
          <span className="flex items-center gap-2 min-w-0">
            <span className="w-2.5 h-2.5 rounded-full shrink-0" style={{ backgroundColor: course.color }} />
            <span className="truncate">{course.name}</span>
          </span>
        }
        action={
          <div className="flex items-center gap-1 shrink-0">
            <button
              className={`${btnGhost} ${simulate ? 'text-sky-300 bg-sky-500/10' : ''}`}
              onClick={() => {
                setSimulate((v) => !v);
                setOverrides({});
              }}
              title="Kaydetmeden farklı notları dene"
            >
              <FlaskConical className="w-3.5 h-3.5" /> Test et
            </button>
            <button className={btnGhost} onClick={() => onEditCourse(course)} aria-label="Dersi düzenle" title="Değerlendirme ağırlıklarını düzenle">
              <Settings2 className="w-3.5 h-3.5" />
            </button>
          </div>
        }
      />

      <div className="p-4 space-y-3">
        {course.manualLetter ? (
          <p className="text-xs text-subtle">Transkript notu girilmiş: harf notu {course.manualLetter}.</p>
        ) : course.assessments.length === 0 ? (
          <p className="text-xs text-muted">
            Değerlendirme yok.{' '}
            <button className="text-emerald-400 hover:underline" onClick={() => onEditCourse(course)}>
              Vize/final ekle
            </button>
          </p>
        ) : (
          <table className="w-full text-sm">
            <tbody className="divide-y divide-line">
              {course.assessments.map((a) => {
                const value = simulate ? (a.id in overrides ? overrides[a.id] : a.score) : a.score;
                return (
                  <tr key={a.id}>
                    <td className="py-1.5 pr-2">
                      <span className="text-body">{a.name}</span>
                      <span className="text-[11px] text-muted ml-1.5">
                        {a.type === 'butunleme' ? 'finalin yerine' : `%${a.weight}`}
                      </span>
                    </td>
                    <td className="py-1.5 text-right">
                      <ScoreInput
                        value={value ?? null}
                        onChange={(v) => (simulate ? setOverrides((o) => ({ ...o, [a.id]: v })) : setScore(a.id, v))}
                        className={simulate ? 'border-sky-500/40' : ''}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        )}

        <div className="flex items-center justify-between gap-3 pt-1">
          <div className="text-xs text-subtle">
            {shown.average !== null ? (
              <>
                Ortalama <span className="text-fg font-semibold tabular-nums">{shown.average.toFixed(2)}</span>
                {shown.missingWeight > 0 && <span className="text-muted"> (girilen %{shown.totalWeight - shown.missingWeight} üzerinden)</span>}
              </>
            ) : (
              <span className="text-muted">Henüz not girilmedi</span>
            )}
            {!shown.weightsValid && <span className="text-amber-400"> • ağırlık toplamı %{shown.totalWeight}</span>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <LetterBadge letter={shown.letter} failing={failing} conditional={conditional} />
            <StatusBadge status={status} />
          </div>
        </div>
        {shown.reason && <p className="text-[11px] text-rose-400">{shown.reason}</p>}

        {shown.status === 'devam' && shown.required.length > 0 && (
          <div className="rounded-lg bg-surface-2 border border-line p-3">
            <p className="text-[11px] text-subtle mb-2">
              Kalan değerlendirmelerden (%{shown.missingWeight}) almanız gereken ortalama:
            </p>
            <div className="flex flex-wrap gap-1.5">
              {shown.required.map((r) => (
                <span
                  key={r.letter}
                  className={`text-[11px] px-2 py-1 rounded-md border tabular-nums ${
                    r.score === null ? 'border-line text-muted line-through' : 'border-line-strong text-body'
                  }`}
                  title={r.score === null ? 'Ulaşılamaz' : undefined}
                >
                  {r.letter}: {r.score === null ? '—' : r.score}
                </span>
              ))}
            </div>
          </div>
        )}

        <div className="flex items-center gap-2">
          {simulate && (
            <button className={btnGhost} onClick={() => setOverrides({})}>
              <RotateCcw className="w-3.5 h-3.5" /> Sıfırla
            </button>
          )}
          {!simulate && !hasButunleme && !course.manualLetter && saved.status === 'kaldi' && (
            <button className={btnGhost} onClick={addButunleme}>
              <Plus className="w-3.5 h-3.5" /> Bütünleme notu ekle
            </button>
          )}
        </div>
      </div>
    </Card>
  );
}
