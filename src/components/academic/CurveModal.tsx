'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import type { Course, CourseCurve, CurveBoundary, CurveMode, GradingSystem, Term } from '@/lib/academic/types';
import { computeCourseGrade, defaultCurve, gradeScale, tTableForMean, T_SCORE_TABLE } from '@/lib/academic/grading';
import { btnPrimary, btnSecondary, inputCls, labelCls } from './ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  grading: GradingSystem;
  term?: Term | null;
  onSave: (courseId: string, curve: CourseCurve | null) => void;
}

const parseNum = (v: string): number | null => {
  if (v.trim() === '') return null;
  const n = Number(v.replace(',', '.'));
  return Number.isFinite(n) ? n : null;
};

/** Edits the instructor's bell curve (bağıl değerlendirme) for a single course. */
export function CurveModal({ isOpen, onClose, course, grading, term, onSave }: Props) {
  const initial = () => (course?.curve ? structuredClone(course.curve) : defaultCurve(grading));
  const [draft, setDraft] = useState<CourseCurve>(initial);
  const [error, setError] = useState<string | null>(null);

  const resetKey = `${isOpen}:${course?.id ?? ''}`;
  const [prevKey, setPrevKey] = useState(resetKey);
  if (resetKey !== prevKey) {
    setPrevKey(resetKey);
    setDraft(initial());
    setError(null);
  }

  if (!course) return null;

  const set = (patch: Partial<CourseCurve>) => setDraft((d) => ({ ...d, ...patch }));

  const setMode = (mode: CurveMode) => {
    if (mode === draft.mode) return;
    // Seed sensible boundaries for the chosen mode.
    const boundaries: CurveBoundary[] =
      mode === 'tscore'
        ? tTableForMean(draft.mean ?? 50).boundaries
        : defaultCurve(grading).boundaries;
    set({ mode, boundaries });
  };

  const setBoundary = (letter: string, min: number | null) =>
    set({ boundaries: draft.boundaries.map((b) => (b.letter === letter ? { ...b, min: min ?? 0 } : b)) });

  const preview = { ...course, curve: { ...draft, enabled: true } };
  const scale = gradeScale(preview, grading);
  const grade = computeCourseGrade(preview, grading, {}, term);

  // Boundaries shown in the table: the standard T table follows the class average.
  const shownBoundaries: CurveBoundary[] =
    draft.mode === 'tscore' && draft.autoTable ? tTableForMean(draft.mean ?? 50).boundaries : draft.boundaries;

  const handleSave = () => {
    if (draft.mode === 'tscore' && (draft.mean === null || draft.stdDev === null || draft.stdDev <= 0)) {
      return setError('Sınıf ortalamasını ve sıfırdan büyük standart sapmayı giriniz.');
    }
    const sorted = [...draft.boundaries].sort((a, b) => b.min - a.min);
    const curve: CourseCurve = { ...draft, enabled: true, boundaries: draft.autoTable && draft.mode === 'tscore' ? shownBoundaries : sorted };
    onSave(course.id, curve);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Çan eğrisi" subtitle={course.name} maxWidth="max-w-xl">
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-1 p-1 rounded-lg bg-surface-2 border border-line">
          {(
            [
              ['tscore', 'Ortalama + std. sapma'],
              ['raw', 'Hocanın not aralıkları'],
            ] as const
          ).map(([m, label]) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`h-8 rounded-md text-xs font-medium transition-colors ${
                draft.mode === m ? 'bg-surface text-fg shadow-sm' : 'text-subtle hover:text-fg'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        {draft.mode === 'tscore' ? (
          <>
            <p className="text-[11px] text-muted leading-relaxed">
              Hocanın açıkladığı sınıf ortalaması ve standart sapmayı girin. Notunuz T = 50 + 10 × (not − ortalama) / std. sapma ile
              T-skoruna çevrilir ve harf notu T-skoru tablosundan belirlenir.
            </p>
            <div className="grid grid-cols-3 gap-3">
              <div>
                <label className={labelCls}>Sınıf ortalaması</label>
                <DecimalInput key={prevKey} value={draft.mean} onChange={(v) => set({ mean: v })} placeholder="Ör. 48,5" />
              </div>
              <div>
                <label className={labelCls}>Standart sapma</label>
                <DecimalInput key={prevKey} value={draft.stdDev} onChange={(v) => set({ stdDev: v })} placeholder="Ör. 14" />
              </div>
              <div>
                <label className={labelCls}>Mutlak sistem eşiği</label>
                <DecimalInput
                  key={prevKey}
                  value={draft.absoluteAbove}
                  onChange={(v) => set({ absoluteAbove: Math.min(100, Math.max(0, v ?? 0)) })}
                  title="Sınıf ortalaması bunun üzerindeyse mutlak değerlendirme uygulanır (0 = hiçbir zaman)"
                />
              </div>
            </div>
            <label className="flex items-center gap-2 text-xs text-body">
              <input type="checkbox" checked={draft.autoTable} onChange={(e) => set({ autoTable: e.target.checked, boundaries: shownBoundaries })} />
              Standart T-skoru tablosunu kullan (sınıf ortalamasına göre otomatik)
            </label>
          </>
        ) : (
          <p className="text-[11px] text-muted leading-relaxed">
            Hocanın açıkladığı harf notu alt sınırlarını (ham not) girin. Ör. “AA: 78 ve üzeri, BA: 70 ve üzeri…”
          </p>
        )}

        <div className="rounded-lg border border-line overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-surface-2 text-[11px] text-muted">
              <tr>
                <th className="text-left font-medium px-3 py-1.5">Harf</th>
                {draft.mode === 'tscore' && <th className="text-right font-medium px-3 py-1.5">Min. T-skoru</th>}
                <th className="text-right font-medium px-3 py-1.5">{draft.mode === 'tscore' ? 'Gereken not' : 'Min. not'}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {shownBoundaries.map((b) => {
                const raw = scale.letters.find((l) => l.letter === b.letter)?.min;
                const editable = draft.mode === 'raw' || !draft.autoTable;
                return (
                  <tr key={b.letter} className={grade.letter === b.letter ? 'bg-emerald-500/5' : ''}>
                    <td className="px-3 py-1 font-medium text-fg">{b.letter}</td>
                    {draft.mode === 'tscore' && (
                      <td className="px-3 py-1 text-right tabular-nums text-body">
                        {editable ? (
                          <NumberCell key={`${draft.mode}:${draft.autoTable}:${b.letter}`} value={b.min} onChange={(v) => setBoundary(b.letter, v)} />
                        ) : (
                          b.min
                        )}
                      </td>
                    )}
                    <td className="px-3 py-1 text-right tabular-nums text-body">
                      {draft.mode === 'raw' ? (
                        <NumberCell key={`${draft.mode}:${draft.autoTable}:${b.letter}`} value={b.min} onChange={(v) => setBoundary(b.letter, v)} />
                      ) : raw !== undefined && scale.curved ? (
                        raw > 100 ? <span className="text-muted">100+</span> : raw.toFixed(2)
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>

        <div className="rounded-lg bg-surface-2 border border-line px-3 py-2 text-xs text-subtle space-y-0.5">
          {scale.note ? (
            <p className="text-amber-300/90">{scale.note}</p>
          ) : (
            scale.tableLabel && <p>Sınıf düzeyi: <span className="text-body">{scale.tableLabel}</span></p>
          )}
          {grade.average !== null ? (
            <p>
              Mevcut ortalamanız <span className="text-fg font-semibold tabular-nums">{grade.average.toFixed(2)}</span>
              {grade.tScore !== null && <> • T-skoru <span className="text-fg tabular-nums">{grade.tScore.toFixed(1)}</span></>}
              {grade.letter ? <> → <span className="text-fg font-semibold">{grade.letter}</span></> : grade.missingWeight > 0 && ' (notlar tamamlanınca harf belli olur)'}
            </p>
          ) : (
            <p>Not girdikçe bu derse ait harf notu çan eğrisine göre hesaplanır.</p>
          )}
          <p className="text-muted">Final barajı ve devamsızlık kuralları çan eğrisinden önce uygulanır.</p>
        </div>

        {error && <p className="text-xs text-rose-400">{error}</p>}

        <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
          {course.curve ? (
            <button
              type="button"
              className="text-xs text-rose-400 hover:underline"
              onClick={() => {
                onSave(course.id, null);
                onClose();
              }}
            >
              Çan eğrisini kaldır
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className={btnSecondary} onClick={onClose}>Vazgeç</button>
            <button type="button" className={btnPrimary} onClick={handleSave}>Uygula</button>
          </div>
        </div>
        <details className="text-[11px] text-muted">
          <summary className="cursor-pointer hover:text-subtle">Standart T-skoru tablosu</summary>
          <div className="mt-2 overflow-x-auto">
            <table className="w-full tabular-nums">
              <thead>
                <tr className="text-left">
                  <th className="pr-2 font-medium">Sınıf ort.</th>
                  {['AA', 'BA', 'BB', 'CB', 'CC', 'DC', 'DD', 'FD'].map((l) => (
                    <th key={l} className="px-1 font-medium text-right">{l}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {T_SCORE_TABLE.map((r) => (
                  <tr key={r.label}>
                    <td className="pr-2 whitespace-nowrap">{r.label}</td>
                    {r.mins.map((m, i) => (
                      <td key={i} className="px-1 text-right">{m}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
            <p className="mt-1">Tablo üniversiteden üniversiteye küçük farklar gösterebilir; gerekirse otomatik tabloyu kapatıp düzenleyin.</p>
          </div>
        </details>
      </div>
    </Modal>
  );
}

function NumberCell({ value, onChange }: { value: number; onChange: (v: number | null) => void }) {
  return (
    <input
      inputMode="decimal"
      className="h-7 w-20 bg-surface-2 border border-line rounded-md px-2 text-sm text-fg text-right tabular-nums focus:outline-none focus:border-line-strong"
      defaultValue={value}
      onBlur={(e) => onChange(parseNum(e.target.value))}
      onKeyDown={(e) => {
        if (e.key === 'Enter') (e.target as HTMLInputElement).blur();
      }}
    />
  );
}

/** Text input for decimals that accepts both "48,5" and "48.5" while typing. */
function DecimalInput({
  value,
  onChange,
  placeholder,
  title,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  title?: string;
}) {
  const [text, setText] = useState(value === null ? '' : String(value).replace('.', ','));
  return (
    <input
      className={inputCls}
      inputMode="decimal"
      value={text}
      placeholder={placeholder}
      title={title}
      onChange={(e) => {
        const next = e.target.value.replace(/[^0-9.,]/g, '').slice(0, 7);
        setText(next);
        onChange(parseNum(next));
      }}
    />
  );
}
