'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { AcademicData } from '@/lib/academic/types';

export interface StudentProfileView {
  university: string;
  studentEmail: string;
  department: string;
  classYear: number;
  studentNo?: string | null;
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
    return json.error || 'Değişiklikler kaydedilemedi.';
  } catch {
    return 'Sunucuya ulaşılamadı.';
  }
}

/** Loads the student's academic data and saves every change automatically (debounced). */
export function useAcademicData() {
  const [data, setData] = useState<AcademicData | null>(null);
  const [profile, setProfile] = useState<StudentProfileView | null>(null);
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
        if (!res.ok) throw new Error(json.error || 'Ders bilgileri yüklenemedi.');
        return json;
      })
      .then((json) => {
        if (cancelled) return;
        setData(json.data);
        setProfile(json.profile);
      })
      .catch((err: Error) => {
        if (!cancelled) setLoadError(err.message);
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

  const update = useCallback(
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

  return { data, profile, loadError, saveState, saveError, update, retrySave: () => flush() };
}
