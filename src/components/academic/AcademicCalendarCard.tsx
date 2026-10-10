'use client';

import React, { useState } from 'react';
import { CalendarRange, FileUp, Plus, Trash2 } from 'lucide-react';
import type { AcademicData, Holiday, Term } from '@/lib/academic/types';
import { DAYS_SHORT, calendarWeeks, hasCalendar, meetingsPerWeekday, newId, termHolidays } from '@/lib/academic/grading';
import { formatTurkishDate } from '@/lib/utils';
import { CalendarImportModal } from './CalendarImportModal';
import { Card, CardHeader, btnSecondary, inputCls, labelCls } from './ui';

interface Props {
  data: AcademicData;
  update: (fn: (d: AcademicData) => AcademicData) => void;
}

const fmt = (h: Pick<Holiday, 'start' | 'end'>) =>
  h.start === h.end ? formatTurkishDate(h.start) : `${formatTurkishDate(h.start)} – ${formatTurkishDate(h.end)}`;

/**
 * Academic calendar per term: first/last day of classes, exam weeks and holidays. Attendance limits
 * are computed from the real class days instead of a fixed number of weeks.
 */
export function AcademicCalendarCard({ data, update }: Props) {
  const [termId, setTermId] = useState(data.activeTermId ?? data.terms[data.terms.length - 1].id);
  const term = data.terms.find((t) => t.id === termId) ?? data.terms[data.terms.length - 1];
  const [draft, setDraft] = useState<Omit<Holiday, 'id'>>({ name: '', start: '', end: '' });
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);

  const setTerm = (patch: Partial<Term>) =>
    update((d) => ({ ...d, terms: d.terms.map((t) => (t.id === term.id ? { ...t, ...patch } : t)) }));

  const holidays = termHolidays(term);
  const meetings = meetingsPerWeekday(term);
  const weeks = calendarWeeks(term);
  const auto = term.autoHolidays !== false;
  const estimated = holidays.some((h) => h.estimated);

  const addHoliday = () => {
    setError(null);
    const start = draft.start;
    const end = draft.end || draft.start;
    if (!start) return setError('Başlangıç tarihini seçin.');
    if (end < start) return setError('Bitiş tarihi başlangıçtan önce olamaz.');
    setTerm({
      holidays: [...(term.holidays ?? []), { id: newId(), name: (draft.name.trim() || 'Tatil').slice(0, 80), start, end, kind: 'tatil' as const }].slice(0, 60),
    });
    setDraft({ name: '', start: '', end: '' });
  };

  const badge = (h: Holiday) => {
    if (h.kind === 'sinav') return <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 whitespace-nowrap">sınav · ders yok</span>;
    if (h.half) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 whitespace-nowrap">öğleden sonra</span>;
    if (h.auto) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-muted whitespace-nowrap">{h.estimated ? 'otomatik · tahmini' : 'otomatik'}</span>;
    return null;
  };

  return (
    <Card>
      <CardHeader
        title="Akademik takvim"
        icon={<CalendarRange className="w-4 h-4 text-subtle" />}
        action={
          data.terms.length > 1 && (
            <select className={`${inputCls} w-auto h-8 text-xs`} value={term.id} onChange={(e) => setTermId(e.target.value)} aria-label="Dönem">
              {data.terms.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )
        }
      />
      <div className="p-4 space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-dashed border-line p-3">
          <p className="text-[11px] text-muted flex-1">
            Üniversitenizin akademik takvim PDF’ini yükleyin: derslerin başlangıç ve bitiş tarihleri ile sınav haftaları otomatik girilir. Sınav
            haftalarında ders yapılmadığı varsayılır.
          </p>
          <button className={btnSecondary} onClick={() => setImportOpen(true)}>
            <FileUp className="w-4 h-4" /> Takvim PDF’i yükle
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-md">
          <div>
            <label className={labelCls}>Derslerin başlangıcı</label>
            <input type="date" className={inputCls} value={term.start ?? ''} onChange={(e) => setTerm({ start: e.target.value || undefined })} />
          </div>
          <div>
            <label className={labelCls}>Derslerin bitişi</label>
            <input type="date" className={inputCls} value={term.end ?? ''} min={term.start} onChange={(e) => setTerm({ end: e.target.value || undefined })} />
          </div>
        </div>

        {hasCalendar(term) && meetings ? (
          <div className="rounded-lg bg-surface-2 border border-line px-3 py-2 text-xs text-subtle">
            <p>
              <span className="text-fg font-medium">{weeks} hafta</span> • tatil ve sınav günleri çıkarıldıktan sonra ders günü sayısı:
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {meetings.slice(0, 6).map((n, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-surface-3 tabular-nums">
                  {DAYS_SHORT[i]} {n}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-muted">
            Takvim girilmezse {data.grading.weeksPerTerm} haftalık dönem varsayılır.
            {(term.start || term.end) && <span className="text-amber-400"> Başlangıç ve bitiş tarihlerinin ikisini de girin.</span>}
          </p>
        )}

        <label className="flex items-start gap-2 text-xs text-body">
          <input type="checkbox" className="mt-0.5" checked={auto} onChange={(e) => setTerm({ autoHolidays: e.target.checked })} />
          <span>
            Milli ve dinî bayramları otomatik ekle
            <span className="block text-[11px] text-muted">
              Resmî tatiller, Ramazan ve Kurban Bayramı; arife günleri ile 28 Ekim’de öğleden sonraki dersler sayılmaz.
            </span>
          </span>
        </label>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-body">Ders yapılmayan günler</h4>
          {holidays.length === 0 ? (
            <p className="text-[11px] text-muted">{hasCalendar(term) ? 'Bu dönemde tatil yok.' : 'Dönem tarihleri girilince bayramlar burada listelenir.'}</p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line max-h-72 overflow-y-auto">
              {holidays.map((h) => (
                <li key={h.id} className="px-3 py-1.5 flex items-center gap-2 text-xs">
                  <span className="text-body flex-1 min-w-0 truncate">{h.name}</span>
                  {badge(h)}
                  <span className="text-muted whitespace-nowrap">{fmt(h)}</span>
                  {h.auto ? (
                    <span className="w-7" />
                  ) : (
                    <button
                      className="w-7 h-7 flex items-center justify-center text-muted hover:text-rose-400"
                      onClick={() => setTerm({ holidays: (term.holidays ?? []).filter((x) => x.id !== h.id) })}
                      aria-label="Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  )}
                </li>
              ))}
            </ul>
          )}
          {estimated && (
            <p className="text-[11px] text-amber-300/90">
              “Tahmini” dinî bayram tarihleri hesapla bulunur ve bir gün kayabilir; Diyanet takvimi açıklanınca kontrol edin.
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-[1fr_140px_140px_auto] gap-2 items-end">
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>Diğer tatil (ad)</label>
              <input className={inputCls} value={draft.name} maxLength={80} placeholder="Ör. ara tatil, kar tatili" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Başlangıç</label>
              <input type="date" className={inputCls} value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Bitiş (tek gün ise boş)</label>
              <input type="date" className={inputCls} value={draft.end} min={draft.start} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
            </div>
            <button className={`${btnSecondary} col-span-2 sm:col-span-1`} onClick={addHoliday}>
              <Plus className="w-4 h-4" /> Ekle
            </button>
          </div>
          {error && <p className="text-xs text-rose-400">{error}</p>}
        </div>
      </div>
      <CalendarImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} data={data} update={update} />
    </Card>
  );
}
