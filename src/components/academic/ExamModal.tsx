'use client';

import React, { useState } from 'react';
import { Modal } from '@/components/ui/Modal';
import type { Course, Exam, ExamType } from '@/lib/academic/types';
import { EXAM_TYPE_LABEL, newId } from '@/lib/academic/grading';
import { toLocalDateString } from '@/lib/utils';
import { btnPrimary, btnSecondary, inputCls, labelCls } from './ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  exam: Exam | null;
  termId: string;
  courses: Course[];
  onSave: (exam: Exam) => void;
  onDelete: (id: string) => void;
}

const EXAM_TYPES = Object.keys(EXAM_TYPE_LABEL) as ExamType[];

/** Picks the course assessment an exam of this type most likely belongs to. */
export function matchAssessment(course: Course | undefined, type: ExamType): string | null {
  if (!course) return null;
  const map: Partial<Record<ExamType, string[]>> = {
    vize: ['vize'],
    final: ['final'],
    butunleme: ['butunleme'],
    quiz: ['quiz'],
    proje: ['proje', 'odev'],
  };
  const types = map[type];
  if (!types) return null;
  const candidates = course.assessments.filter((a) => types.includes(a.type));
  return (candidates.find((a) => a.score === null) ?? candidates[0])?.id ?? null;
}

function emptyExam(termId: string, courses: Course[]): Exam {
  const course = courses[0];
  return {
    id: newId(),
    termId,
    courseId: course?.id ?? null,
    title: '',
    type: 'vize',
    date: toLocalDateString(),
    start: '10:00',
    end: '',
    room: '',
    note: '',
    assessmentId: matchAssessment(course, 'vize'),
  };
}

export function ExamModal({ isOpen, onClose, exam, termId, courses, onSave, onDelete }: Props) {
  const [draft, setDraft] = useState<Exam>(() => exam ?? emptyExam(termId, courses));
  const [error, setError] = useState<string | null>(null);

  const resetKey = `${isOpen}:${exam?.id ?? 'new'}:${termId}`;
  const [prevKey, setPrevKey] = useState(resetKey);
  if (resetKey !== prevKey) {
    setPrevKey(resetKey);
    setDraft(exam ? { ...exam } : emptyExam(termId, courses));
    setError(null);
  }

  const course = courses.find((c) => c.id === draft.courseId);
  const set = (patch: Partial<Exam>) => setDraft((d) => ({ ...d, ...patch }));

  const handleSave = () => {
    if (!/^\d{4}-\d{2}-\d{2}$/.test(draft.date)) return setError('Sınav tarihini seçiniz.');
    if (draft.start && draft.end && draft.end <= draft.start) return setError('Bitiş saati başlangıçtan sonra olmalı.');
    const title = draft.title.trim() || (course ? `${course.code || course.name} ${EXAM_TYPE_LABEL[draft.type]}` : EXAM_TYPE_LABEL[draft.type]);
    onSave({
      ...draft,
      title: title.slice(0, 120),
      start: draft.start || undefined,
      end: draft.end || undefined,
      room: draft.room?.trim() || undefined,
      note: draft.note?.trim() || undefined,
      assessmentId: draft.assessmentId || null,
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={exam ? 'Sınavı düzenle' : 'Sınav ekle'}>
      <div className="space-y-4">
        <div className="grid grid-cols-2 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>Ders</label>
            <select
              className={inputCls}
              value={draft.courseId ?? ''}
              onChange={(e) => {
                const id = e.target.value || null;
                set({ courseId: id, assessmentId: matchAssessment(courses.find((c) => c.id === id), draft.type) });
              }}
            >
              {courses.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.code ? `${c.code} — ` : ''}
                  {c.name}
                </option>
              ))}
              <option value="">Ders dışı</option>
            </select>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>Tür</label>
            <select
              className={inputCls}
              value={draft.type}
              onChange={(e) => {
                const type = e.target.value as ExamType;
                set({ type, assessmentId: matchAssessment(course, type) });
              }}
            >
              {EXAM_TYPES.map((t) => (
                <option key={t} value={t}>{EXAM_TYPE_LABEL[t]}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Başlık</label>
            <input
              className={inputCls}
              value={draft.title}
              maxLength={120}
              onChange={(e) => set({ title: e.target.value })}
              placeholder={course ? `${course.code || course.name} ${EXAM_TYPE_LABEL[draft.type]}` : 'Ör. YDS deneme'}
            />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>Tarih *</label>
            <input type="date" className={inputCls} value={draft.date} onChange={(e) => set({ date: e.target.value })} />
          </div>
          <div className="grid grid-cols-2 gap-2 col-span-2 sm:col-span-1">
            <div>
              <label className={labelCls}>Başlangıç</label>
              <input type="time" className={inputCls} value={draft.start ?? ''} onChange={(e) => set({ start: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Bitiş</label>
              <input type="time" className={inputCls} value={draft.end ?? ''} onChange={(e) => set({ end: e.target.value })} />
            </div>
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>Yer / derslik</label>
            <input className={inputCls} value={draft.room ?? ''} maxLength={60} onChange={(e) => set({ room: e.target.value })} placeholder="Ör. D-201" />
          </div>
          <div className="col-span-2 sm:col-span-1">
            <label className={labelCls}>Not girişi</label>
            <select
              className={inputCls}
              value={draft.assessmentId ?? ''}
              onChange={(e) => set({ assessmentId: e.target.value || null })}
              disabled={!course || course.assessments.length === 0}
              title="Sınav sonrası notu buradan girilen değerlendirmeye yazılır"
            >
              <option value="">Bağlama</option>
              {course?.assessments.map((a) => (
                <option key={a.id} value={a.id}>{a.name}</option>
              ))}
            </select>
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Not</label>
            <input
              className={inputCls}
              value={draft.note ?? ''}
              maxLength={300}
              onChange={(e) => set({ note: e.target.value })}
              placeholder="Konular, getirilecekler…"
            />
          </div>
        </div>

        {error && <p className="text-xs text-rose-400">{error}</p>}

        <div className="flex items-center justify-between gap-2">
          {exam ? (
            <button
              type="button"
              className="text-xs text-rose-400 hover:underline"
              onClick={() => {
                if (!confirm('Sınav silinsin mi?')) return;
                onDelete(exam.id);
                onClose();
              }}
            >
              Sınavı sil
            </button>
          ) : (
            <span />
          )}
          <div className="flex gap-2">
            <button type="button" className={btnSecondary} onClick={onClose}>Vazgeç</button>
            <button type="button" className={btnPrimary} onClick={handleSave}>Kaydet</button>
          </div>
        </div>
      </div>
    </Modal>
  );
}
