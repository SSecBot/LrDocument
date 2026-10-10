'use client';

import React from 'react';
import { AlertCircle, Loader2, SlidersHorizontal } from 'lucide-react';
import { useAcademicData } from '@/components/academic/useAcademicData';
import { GradingSettingsTab } from '@/components/academic/GradingSettingsTab';
import { SaveIndicator } from '@/components/academic/ui';

/** Ders Takibi parameters (grading system, attendance rules, terms) inside Settings. */
export function AcademicSettingsCard() {
  const { data, profile, loadError, saveState, saveError, update, retrySave } = useAcademicData();

  return (
    <div id="ders-takibi-ayarlari" className="p-5 sm:p-6 rounded-xl bg-surface border border-line space-y-5 scroll-mt-4">
      <div className="flex flex-wrap items-start justify-between gap-2 border-b border-line pb-4">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
            <SlidersHorizontal className="w-5 h-5 text-emerald-400" />
            Ders Takibi Ayarları
          </h2>
          <p className="text-xs text-neutral-400 mt-1">
            Not sistemi, harf aralıkları, final barajı, devam şartları ve dönemler. Değişiklikler otomatik kaydedilir.
          </p>
        </div>
        <SaveIndicator state={saveState} error={saveError} onRetry={retrySave} />
      </div>

      {loadError ? (
        <p className="text-xs text-rose-400 flex items-center gap-2">
          <AlertCircle className="w-4 h-4" /> {loadError}
        </p>
      ) : !data ? (
        <div className="h-24 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-subtle animate-spin" />
        </div>
      ) : (
        <GradingSettingsTab data={data} update={update} university={profile?.university ?? ''} />
      )}
    </div>
  );
}
