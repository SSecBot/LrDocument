'use client';

import { t } from '@/lib/i18n';
import { ERR, responseError, thrownError } from '@/lib/errors';
import { useCallback, useEffect, useRef, useState } from 'react';
import type { AcademicData } from '@/lib/academic/types';
import { offerUndo, showToast } from '@/store/useAppStore';

/**
 * Changes the academic data. With `undo` (deletions), a toast offers "Geri al" for a few seconds,
 * which puts the data back as it was before this change.
 */
export type AcademicUpdate = (fn: (d: AcademicData) => AcademicData, undo?: { title: string; message?: string }) => void;
import type { University } from '@/lib/universities';

export interface StudentProfileView {
  university: string;
  universityId?: string | null;
  studentEmail: string;
  department: string;
  classYear: number;
  studentNo?: string | null;
}

/** The student's university from the catalog, with the calendar an admin published (if any). */
export interface SchoolInfo extends University {
  calendar: { updatedAt: string; sourceUrl: string | null; terms: string[] } | null;
}

export type SaveState = 'idle' | 'saving' | 'saved' | 'error';

const SAVE_DELAY_MS = 700;

async function putData(data: AcademicData, keepalive = false): Promise<string | null> {
  try {
    const body = JSON.stringify({ data });
    const res = await fetch('/api/student/data', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive: keepalive && body.length < 60_000,
    });
    if (res.ok) return null;
    const json = await res.json().catch(() => ({}));
    return responseError(res, json, t('Değişiklikler kaydedilemedi.'));
  } catch {
    return ERR.network;
  }
}

/** Loads the student's academic data and saves every change automatically (debounced). */
export function useAcademicData() {
  const [data, setData] = useState<AcademicData | null>(null);
  const [profile, setProfile] = useState<StudentProfileView | null>(null);
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [saveState, setSaveState] = useState<SaveState>('idle');
  const [saveError, setSaveError] = useState<string | null>(null);

  const pending = useRef<AcademicData | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const flush = useCallback(async (keepalive = false) => {
    if (timer.current) clearTimeout(timer.current);
    timer.current = null;
    const toSave = pending.current;
    if (!toSave) return;
    pending.current = null;
    setSaveState('saving');
    const error = await putData(toSave, keepalive);
    // Keep the unsaved snapshot so "Tekrar dene" can resend it.
    if (error && !pending.current) pending.current = toSave;
    setSaveError(error);
    setSaveState(error ? 'error' : 'saved');
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/student', { cache: 'no-store' })
      .then(async (res) => {
        const json = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(responseError(res, json, t('Ders bilgileri yüklenemedi.')));
        return json;
      })
      .then((json) => {
        if (cancelled) return;
        setData({ ...json.data, exams: json.data.exams ?? [] });
        setProfile(json.profile);
        setSchool(json.school ?? null);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(thrownError(err));
      });

    const onHide = () => {
      if (pending.current) flush(true);
    };
    window.addEventListener('pagehide', onHide);
    return () => {
      cancelled = true;
      window.removeEventListener('pagehide', onHide);
      if (pending.current) flush(true);
    };
  }, [flush]);

  const apply = useCallback(
    (fn: (prev: AcademicData) => AcademicData) => {
      setData((prev) => {
        if (!prev) return prev;
        const next = fn(prev);
        pending.current = next;
        if (timer.current) clearTimeout(timer.current);
        timer.current = setTimeout(() => flush(), SAVE_DELAY_MS);
        return next;
      });
      setSaveState('saving');
    },
    [flush]
  );

  const update: AcademicUpdate = useCallback(
    (fn, undo) => {
      if (!undo) return apply(fn);
      // React may call an updater twice (StrictMode); both calls must yield the same object.
      let before: AcademicData | null = null;
      let after: AcademicData | null = null;
      apply((prev) => {
        if (before !== prev) {
          before = prev;
          after = fn(prev);
        }
        return after!;
      });
      offerUndo({
        title: undo.title,
        message: undo.message,
        undo: () =>
          apply((cur) => {
            if (cur === after && before) return before;
            // Something else changed meanwhile: keep it rather than overwrite it.
            showToast({ type: 'warning', title: t('Geri alınamadı'), message: t('Silmeden sonra başka bir değişiklik yapıldı. Silinen kaydı yeniden ekleyebilirsiniz.') });
            return cur;
          }),
      });
    },
    [apply]
  );

  return { data, profile, school, loadError, saveState, saveError, update, retrySave: () => flush() };
}
