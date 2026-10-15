'use client';

import { useEffect, useState } from 'react';
import type { AcademicData } from '@/lib/academic/types';

/** Read-only copy of the student's course data (for the calendar); null until loaded or when disabled. */
export function useAcademicSnapshot(enabled: boolean): AcademicData | null {
  const [data, setData] = useState<AcademicData | null>(null);
  useEffect(() => {
    if (!enabled) return;
    const ctrl = new AbortController();
    fetch('/api/student', { cache: 'no-store', signal: ctrl.signal })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.data) setData({ ...json.data, exams: json.data.exams ?? [] });
      })
      .catch(() => {});
    return () => ctrl.abort();
  }, [enabled]);
  return enabled ? data : null;
}
