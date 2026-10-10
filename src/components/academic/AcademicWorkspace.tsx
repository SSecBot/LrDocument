'use client';

import React, { useState } from 'react';
import { AlertCircle, GraduationCap, Loader2, Plus, Settings2 } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import type { Course } from '@/lib/academic/types';
import { classYearLabel } from '@/lib/studentProfile';
import { useAcademicData } from './useAcademicData';
import { CourseModal } from './CourseModal';
import { OverviewTab } from './OverviewTab';
import { ScheduleTab } from './ScheduleTab';
import { AttendanceTab } from './AttendanceTab';
import { GradesTab } from './GradesTab';
import { AnalysisTab } from './AnalysisTab';
import { ExamsTab } from './ExamsTab';
import { ScheduleImportModal } from './ScheduleImportModal';
import { SaveIndicator, btnPrimary, btnSecondary, inputCls } from './ui';

type Tab = 'ozet' | 'program' | 'sinavlar' | 'devam' | 'notlar' | 'analiz';

const TABS: { id: Tab; label: string }[] = [
  { id: 'ozet', label: 'Özet' },
  { id: 'program', label: 'Program' },
  { id: 'sinavlar', label: 'Sınavlar' },
  { id: 'devam', label: 'Devamsızlık' },
  { id: 'notlar', label: 'Notlar' },
  { id: 'analiz', label: 'Akademik durum' },
];

export function AcademicWorkspace() {
  const { setActiveTab } = useAppStore();
  const { data, profile, loadError, saveState, saveError, update, retrySave } = useAcademicData();
  const [tab, setTab] = useState<Tab>('ozet');
  const [modal, setModal] = useState<{ open: boolean; course: Course | null }>({ open: false, course: null });
  const [importOpen, setImportOpen] = useState(false);

  if (loadError) {
    return (
      <div className="flex-1 flex items-center justify-center p-6">
        <div className="text-center space-y-2">
          <AlertCircle className="w-6 h-6 text-rose-400 mx-auto" />
          <p className="text-sm text-body">{loadError}</p>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-subtle animate-spin" />
      </div>
    );
  }

  const term = data.terms.find((t) => t.id === data.activeTermId) ?? data.terms[data.terms.length - 1];
  const courses = data.courses.filter((c) => c.termId === term.id);

  const openNew = () => setModal({ open: true, course: null });
  const openEdit = (course: Course) => setModal({ open: true, course });

  const saveCourse = (course: Course) =>
    update((d) => ({
      ...d,
      courses: d.courses.some((c) => c.id === course.id) ? d.courses.map((c) => (c.id === course.id ? course : c)) : [...d.courses, course],
    }));

  const deleteCourse = (id: string) =>
    update((d) => ({ ...d, courses: d.courses.filter((c) => c.id !== id), exams: (d.exams ?? []).filter((e) => e.courseId !== id) }));

  return (
    <div className="flex-1 overflow-y-auto bg-app">
      <div className="max-w-6xl mx-auto p-4 sm:p-5 lg:p-6 space-y-4">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-9 h-9 rounded-lg bg-surface-3 flex items-center justify-center shrink-0">
              <GraduationCap className="w-5 h-5 text-emerald-400" />
            </div>
            <div className="min-w-0">
              <h1 className="text-lg font-semibold text-fg">Ders Takibi</h1>
              <p className="text-xs text-muted truncate">
                {profile && profile.university ? (
                  <>
                    {profile.university} • {profile.department} • {classYearLabel(profile.classYear)}{' '}
                    <button className="text-subtle hover:text-fg underline-offset-2 hover:underline" onClick={() => setActiveTab('settings')}>
                      düzenle
                    </button>
                  </>
                ) : (
                  'Devamsızlık, notlar ve ortalama takibi'
                )}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <SaveIndicator state={saveState} error={saveError} onRetry={retrySave} />
            <select
              className={`${inputCls} w-auto min-w-[150px]`}
              value={term.id}
              onChange={(e) => update((d) => ({ ...d, activeTermId: e.target.value }))}
              aria-label="Dönem"
            >
              {data.terms.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
            <button className={btnPrimary} onClick={openNew}>
              <Plus className="w-4 h-4" />
              <span className="hidden sm:inline">Ders ekle</span>
            </button>
            <button
              className={btnSecondary}
              onClick={() => {
                setActiveTab('settings');
                setTimeout(() => document.getElementById('ders-takibi-ayarlari')?.scrollIntoView({ behavior: 'smooth' }), 150);
              }}
              title="Not sistemi, devam şartları ve dönemler"
              aria-label="Ders takibi ayarları"
            >
              <Settings2 className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div className="flex gap-1 overflow-x-auto no-scrollbar border-b border-line -mx-4 px-4 sm:mx-0 sm:px-0">
          {TABS.map((t) => (
            <button
              key={t.id}
              onClick={() => setTab(t.id)}
              className={`shrink-0 h-9 px-3 text-sm border-b-2 -mb-px transition-colors ${
                tab === t.id ? 'border-emerald-400 text-fg font-medium' : 'border-transparent text-subtle hover:text-fg'
              }`}
            >
              {t.label}
            </button>
          ))}
        </div>

        {tab === 'ozet' && <OverviewTab data={data} term={term} courses={courses} update={update} onAddCourse={openNew} onOpenTab={setTab} />}
        {tab === 'program' && (
          <ScheduleTab courses={courses} onAddCourse={openNew} onEditCourse={openEdit} onImport={() => setImportOpen(true)} />
        )}
        {tab === 'sinavlar' && <ExamsTab data={data} term={term} courses={courses} update={update} />}
        {tab === 'devam' && <AttendanceTab data={data} courses={courses} update={update} onEditCourse={openEdit} />}
        {tab === 'notlar' && <GradesTab data={data} term={term} courses={courses} update={update} onEditCourse={openEdit} />}
        {tab === 'analiz' && <AnalysisTab data={data} update={update} />}
      </div>

      <CourseModal
        isOpen={modal.open}
        onClose={() => setModal({ open: false, course: null })}
        course={modal.course}
        termId={term.id}
        grading={data.grading}
        onSave={saveCourse}
        onDelete={deleteCourse}
        colorIndex={courses.length}
        otherCourses={data.courses.filter((c) => c.termId !== term.id)}
      />
      <ScheduleImportModal
        isOpen={importOpen}
        onClose={() => setImportOpen(false)}
        termId={term.id}
        courses={courses}
        classYear={profile?.classYear ?? null}
        update={update}
      />
    </div>
  );
}
