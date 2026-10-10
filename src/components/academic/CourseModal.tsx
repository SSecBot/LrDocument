'use client';

import React, { useState } from 'react';
import { Plus, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import type { Assessment, AssessmentType, Course, CourseSession, GradingSystem } from '@/lib/academic/types';
import { ASSESSMENT_LABEL, DAYS, computeCourseGrade, defaultAssessments, newId, weeklyHoursFromSessions } from '@/lib/academic/grading';
import { btnGhost, btnPrimary, btnSecondary, COURSE_COLORS, inputCls, labelCls } from './ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  course: Course | null;
  termId: string;
  grading: GradingSystem;
  onSave: (course: Course) => void;
  onDelete?: (id: string) => void;
  /** Used to pick a different default colour for each new course */
  colorIndex?: number;
  /** Courses of other terms, used to spot a course being retaken (alttan) */
  otherCourses?: Course[];
}

const sameCourse = (a: Pick<Course, 'code' | 'name'>, b: Pick<Course, 'code' | 'name'>) => {
  const code = (c: string) => c.trim().toLocaleUpperCase('tr-TR');
  if (code(a.code) && code(b.code)) return code(a.code) === code(b.code);
  return a.name.trim().toLocaleLowerCase('tr-TR') === b.name.trim().toLocaleLowerCase('tr-TR') && !!a.name.trim();
};

export function emptyCourse(termId: string, grading: GradingSystem, colorIndex: number): Course {
  return {
    id: newId(),
    termId,
    code: '',
    name: '',
    credit: 3,
    ects: 5,
    instructor: '',
    color: COURSE_COLORS[colorIndex % COURSE_COLORS.length],
    theoryHours: 0,
    practiceHours: 0,
    sessions: [],
    absences: [],
    assessments: defaultAssessments(grading),
    manualLetter: null,
    excludeFromGpa: false,
  };
}

export function CourseModal({ isOpen, onClose, course, termId, grading, onSave, onDelete, colorIndex = 0, otherCourses = [] }: Props) {
  const [draft, setDraft] = useState<Course>(() => course ?? emptyCourse(termId, grading, colorIndex));
  const [autoHours, setAutoHours] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [retakeOn, setRetakeOn] = useState(!!course?.retake);

  // Reset the form whenever the dialog opens for a different course.
  const resetKey = `${isOpen}:${course?.id ?? 'new'}:${termId}`;
  const [prevKey, setPrevKey] = useState(resetKey);
  if (resetKey !== prevKey) {
    setPrevKey(resetKey);
    setDraft(course ? structuredClone(course) : emptyCourse(termId, grading, colorIndex));
    setAutoHours(!course || (course.theoryHours === 0 && course.practiceHours === 0) || matchesSessions(course));
    setRetakeOn(!!course?.retake);
    setError(null);
  }

  const set = <K extends keyof Course>(key: K, value: Course[K]) => setDraft((d) => ({ ...d, [key]: value }));

  const setSessions = (sessions: CourseSession[]) =>
    setDraft((d) => {
      const next = { ...d, sessions };
      if (autoHours) {
        const h = weeklyHoursFromSessions(sessions);
        next.theoryHours = h.theory;
        next.practiceHours = h.practice;
      }
      return next;
    });

  const setAssessment = (id: string, patch: Partial<Assessment>) =>
    set('assessments', draft.assessments.map((a) => (a.id === id ? { ...a, ...patch } : a)));

  const weightTotal = draft.assessments.filter((a) => a.type !== 'butunleme').reduce((s, a) => s + a.weight, 0);

  const handleSave = () => {
    if (!draft.name.trim()) return setError('Ders adını giriniz.');
    if (retakeOn && !draft.retake) return setError('Alttan aldığınız bu dersten daha önce neden kaldığınızı seçin.');
    for (const s of draft.sessions) {
      if (s.end <= s.start) return setError(`${DAYS[s.day]} oturumunda bitiş saati başlangıçtan sonra olmalı.`);
    }
    if (!draft.manualLetter && draft.assessments.length > 0 && Math.abs(weightTotal - 100) > 0.01) {
      return setError(`Değerlendirme ağırlıklarının toplamı %100 olmalı (şu an %${weightTotal}).`);
    }
    onSave({
      ...draft,
      retake: retakeOn ? draft.retake : null,
      name: draft.name.trim(),
      code: draft.code.trim().toLocaleUpperCase('tr-TR'),
    });
    onClose();
  };

  const letters = grading.letters.map((l) => l.letter);

  // A failed attempt of the same course in another term suggests this is an alttan ders.
  const previousFail = otherCourses
    .filter((c) => c.id !== draft.id && sameCourse(c, draft))
    .map((c) => ({ c, status: computeCourseGrade(c, grading).status }))
    .find((x) => x.status === 'kaldi' || x.status === 'devamsiz');

  return (
    <Modal isOpen={isOpen} onClose={onClose} title={course ? 'Dersi düzenle' : 'Yeni ders'} maxWidth="max-w-2xl">
      <div className="space-y-5">
        {/* Basics */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          <div className="col-span-2 sm:col-span-3">
            <label className={labelCls}>Ders adı *</label>
            <input className={inputCls} value={draft.name} onChange={(e) => set('name', e.target.value)} placeholder="Ör. Matematik I" />
          </div>
          <div>
            <label className={labelCls}>Ders kodu</label>
            <input className={inputCls} value={draft.code} onChange={(e) => set('code', e.target.value)} placeholder="MAT1001" />
          </div>
          <div>
            <label className={labelCls}>Kredi</label>
            <input type="number" min={0} step="0.5" className={inputCls} value={draft.credit} onChange={(e) => set('credit', Number(e.target.value) || 0)} />
          </div>
          <div>
            <label className={labelCls}>AKTS</label>
            <input type="number" min={0} step="0.5" className={inputCls} value={draft.ects} onChange={(e) => set('ects', Number(e.target.value) || 0)} />
          </div>
          <div className="col-span-2">
            <label className={labelCls}>Öğretim elemanı</label>
            <input className={inputCls} value={draft.instructor ?? ''} onChange={(e) => set('instructor', e.target.value)} placeholder="İsteğe bağlı" />
          </div>
        </div>

        <div>
          <label className={labelCls}>Renk</label>
          <div className="flex gap-2">
            {COURSE_COLORS.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => set('color', c)}
                aria-label={`Renk ${c}`}
                className={`w-7 h-7 rounded-full border-2 ${draft.color === c ? 'border-white' : 'border-transparent'}`}
                style={{ backgroundColor: c }}
              />
            ))}
          </div>
        </div>

        {/* Schedule */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-body">Haftalık program</h4>
            <button
              type="button"
              className={btnGhost}
              onClick={() =>
                setSessions([...draft.sessions, { id: newId(), day: 0, start: '09:00', end: '10:50', kind: 'teori', room: '' }])
              }
            >
              <Plus className="w-3.5 h-3.5" /> Oturum ekle
            </button>
          </div>
          {draft.sessions.length === 0 && <p className="text-xs text-muted">Ders saatlerini ekleyin; devamsızlık sınırı buna göre hesaplanır.</p>}
          {draft.sessions.map((s) => (
            <div key={s.id} className="grid grid-cols-[1fr_auto_auto_auto] sm:grid-cols-[1.2fr_0.8fr_0.8fr_1fr_1fr_auto] gap-2 items-center">
              <select className={inputCls} value={s.day} onChange={(e) => setSessions(draft.sessions.map((x) => (x.id === s.id ? { ...x, day: Number(e.target.value) } : x)))}>
                {DAYS.map((d, i) => (
                  <option key={d} value={i}>{d}</option>
                ))}
              </select>
              <input type="time" className={`${inputCls} w-[92px]`} value={s.start} onChange={(e) => setSessions(draft.sessions.map((x) => (x.id === s.id ? { ...x, start: e.target.value } : x)))} />
              <input type="time" className={`${inputCls} w-[92px]`} value={s.end} onChange={(e) => setSessions(draft.sessions.map((x) => (x.id === s.id ? { ...x, end: e.target.value } : x)))} />
              <button type="button" onClick={() => setSessions(draft.sessions.filter((x) => x.id !== s.id))} className="sm:hidden w-9 h-9 flex items-center justify-center text-muted hover:text-rose-400" aria-label="Oturumu sil">
                <Trash2 className="w-4 h-4" />
              </button>
              <select className={`${inputCls} col-span-2 sm:col-span-1`} value={s.kind} onChange={(e) => setSessions(draft.sessions.map((x) => (x.id === s.id ? { ...x, kind: e.target.value as CourseSession['kind'] } : x)))}>
                <option value="teori">Teorik</option>
                <option value="uygulama">Uygulama / Lab</option>
              </select>
              <input className={`${inputCls} col-span-2 sm:col-span-1`} value={s.room ?? ''} placeholder="Derslik" onChange={(e) => setSessions(draft.sessions.map((x) => (x.id === s.id ? { ...x, room: e.target.value } : x)))} />
              <button type="button" onClick={() => setSessions(draft.sessions.filter((x) => x.id !== s.id))} className="hidden sm:flex w-9 h-9 items-center justify-center text-muted hover:text-rose-400" aria-label="Oturumu sil">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}

          <div className="grid grid-cols-2 gap-3 pt-1">
            <div>
              <label className={labelCls}>Haftalık teorik saat</label>
              <input type="number" min={0} className={inputCls} value={draft.theoryHours} disabled={autoHours} onChange={(e) => set('theoryHours', Math.max(0, Math.round(Number(e.target.value) || 0)))} />
            </div>
            <div>
              <label className={labelCls}>Haftalık uygulama saati</label>
              <input type="number" min={0} className={inputCls} value={draft.practiceHours} disabled={autoHours} onChange={(e) => set('practiceHours', Math.max(0, Math.round(Number(e.target.value) || 0)))} />
            </div>
          </div>
          <label className="flex items-center gap-2 text-xs text-subtle">
            <input
              type="checkbox"
              checked={autoHours}
              onChange={(e) => {
                setAutoHours(e.target.checked);
                if (e.target.checked) {
                  const h = weeklyHoursFromSessions(draft.sessions);
                  setDraft((d) => ({ ...d, theoryHours: h.theory, practiceHours: h.practice }));
                }
              }}
            />
            Saatleri programdan otomatik hesapla
          </label>
        </section>

        {/* Assessments */}
        <section className="space-y-2">
          <div className="flex items-center justify-between">
            <h4 className="text-xs font-semibold text-body">
              Değerlendirme{' '}
              <span className={Math.abs(weightTotal - 100) > 0.01 ? 'text-amber-400' : 'text-muted'}>(toplam %{weightTotal})</span>
            </h4>
            <button
              type="button"
              className={btnGhost}
              onClick={() => set('assessments', [...draft.assessments, { id: newId(), name: 'Quiz', type: 'quiz', weight: 0, score: null }])}
            >
              <Plus className="w-3.5 h-3.5" /> Ekle
            </button>
          </div>
          {draft.assessments.map((a) => (
            <div key={a.id} className="grid grid-cols-[1fr_1fr_80px_auto] gap-2 items-center">
              <input className={inputCls} value={a.name} onChange={(e) => setAssessment(a.id, { name: e.target.value })} />
              <select className={inputCls} value={a.type} onChange={(e) => setAssessment(a.id, { type: e.target.value as AssessmentType })}>
                {Object.entries(ASSESSMENT_LABEL).map(([k, v]) => (
                  <option key={k} value={k}>{v}</option>
                ))}
              </select>
              {a.type === 'butunleme' ? (
                <span className="text-[11px] text-muted text-center">finalin yerine</span>
              ) : (
                <div className="relative">
                  <input type="number" min={0} max={100} className={`${inputCls} pr-6`} value={a.weight} onChange={(e) => setAssessment(a.id, { weight: Math.min(100, Math.max(0, Number(e.target.value) || 0)) })} />
                  <span className="absolute right-2 top-1/2 -translate-y-1/2 text-xs text-muted">%</span>
                </div>
              )}
              <button type="button" onClick={() => set('assessments', draft.assessments.filter((x) => x.id !== a.id))} className="w-9 h-9 flex items-center justify-center text-muted hover:text-rose-400" aria-label="Değerlendirmeyi sil">
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ))}
        </section>

        {/* Retake (alttan) */}
        <section className="space-y-2 rounded-lg border border-line p-3">
          <label className="flex items-center gap-2 text-xs text-body">
            <input
              type="checkbox"
              checked={retakeOn}
              onChange={(e) => {
                setRetakeOn(e.target.checked);
                if (!e.target.checked) set('retake', null);
              }}
            />
            Alttan alınan ders (daha önce kalındı)
          </label>
          {!retakeOn && previousFail && (
            <p className="text-[11px] text-amber-300/90">
              Bu dersten önceki bir dönemde {previousFail.status === 'devamsiz' ? 'devamsızlıktan' : 'kalmış'} görünüyorsunuz. Alttan
              alıyorsanız işaretleyin.
            </p>
          )}
          {retakeOn && (
            <div className="space-y-1.5">
              <p className="text-[11px] text-subtle">Bu dersten daha önce neden kaldınız?</p>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                {(
                  [
                    ['not', 'Nottan kaldım', 'Devam şartını sağlamıştım; devamsızlık takip edilmez.'],
                    ['devamsizlik', 'Devamsızlıktan kaldım', 'Derse devam zorunlu; devamsızlık takip edilir.'],
                  ] as const
                ).map(([value, title, text]) => (
                  <button
                    key={value}
                    type="button"
                    onClick={() => set('retake', { reason: value })}
                    className={`text-left rounded-lg border px-3 py-2 transition-colors ${
                      draft.retake?.reason === value ? 'border-emerald-500/60 bg-emerald-500/10' : 'border-line hover:bg-surface-2'
                    }`}
                  >
                    <span className="block text-xs font-medium text-fg">{title}</span>
                    <span className="block text-[11px] text-muted">{text}</span>
                  </button>
                ))}
              </div>
            </div>
          )}
        </section>

        {/* Completed course */}
        <section className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className={labelCls}>Transkript harf notu (tamamlanmış ders)</label>
            <select className={inputCls} value={draft.manualLetter ?? ''} onChange={(e) => set('manualLetter', e.target.value || null)}>
              <option value="">Notlardan hesapla</option>
              {[...letters, 'G', 'K'].map((l) => (
                <option key={l} value={l}>{l}</option>
              ))}
            </select>
          </div>
          <label className="flex items-center gap-2 text-xs text-subtle sm:pt-6">
            <input type="checkbox" checked={!!draft.excludeFromGpa} onChange={(e) => set('excludeFromGpa', e.target.checked)} />
            Ortalamaya katılmasın (kredisiz / seçmeli dışı)
          </label>
        </section>

        {error && <p className="text-xs text-rose-400">{error}</p>}

        <div className="flex items-center justify-between gap-2 pt-1">
          {course && onDelete ? (
            <button
              type="button"
              className="h-9 px-3 text-xs text-rose-400 hover:bg-rose-500/10 rounded-lg inline-flex items-center gap-1.5"
              onClick={() => {
                if (confirm(`"${course.name}" dersi ve tüm devamsızlık/not kayıtları silinsin mi?`)) {
                  onDelete(course.id);
                  onClose();
                }
              }}
            >
              <Trash2 className="w-4 h-4" /> Dersi sil
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

function matchesSessions(course: Course): boolean {
  const h = weeklyHoursFromSessions(course.sessions);
  return h.theory === course.theoryHours && h.practice === course.practiceHours;
}
