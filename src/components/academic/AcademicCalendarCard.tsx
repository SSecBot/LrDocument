'use client';

import React, { useState } from 'react';
import { CalendarRange, Plus, Trash2 } from 'lucide-react';
import type { AcademicData, Holiday, Term } from '@/lib/academic/types';
import { DAYS_SHORT, calendarWeeks, hasCalendar, meetingsPerWeekday, newId, officialHolidaysBetween } from '@/lib/academic/grading';
import { formatTurkishDate } from '@/lib/utils';
import { Card, CardHeader, btnGhost, btnSecondary, inputCls, labelCls } from './ui';

interface Props {
  data: AcademicData;
  update: (fn: (d: AcademicData) => AcademicData) => void;
}

/**
 * Academic calendar per term: first/last day of classes and holidays. Attendance limits are then
 * computed from the real number of class days instead of a fixed number of weeks.
 */
export function AcademicCalendarCard({ data, update }: Props) {
  const [termId, setTermId] = useState(data.activeTermId ?? data.terms[data.terms.length - 1].id);
  const term = data.terms.find((t) => t.id === termId) ?? data.terms[data.terms.length - 1];
  const [draft, setDraft] = useState<Omit<Holiday, 'id'>>({ name: '', start: '', end: '' });
  const [error, setError] = useState<string | null>(null);

  const setTerm = (patch: Partial<Term>) =>
    update((d) => ({ ...d, terms: d.terms.map((t) => (t.id === term.id ? { ...t, ...patch } : t)) }));

  const holidays = [...(term.holidays ?? [])].sort((a, b) => a.start.localeCompare(b.start));
  const meetings = meetingsPerWeekday(term);
  const weeks = calendarWeeks(term);

  const addHoliday = () => {
    setError(null);
    const name = draft.name.trim() || 'Tatil';
    const start = draft.start;
    const end = draft.end || draft.start;
    if (!start) return setError('Tatil başlangıç tarihini seçin.');
    if (end < start) return setError('Bitiş tarihi başlangıçtan önce olamaz.');
    setTerm({ holidays: [...(term.holidays ?? []), { id: newId(), name: name.slice(0, 80), start, end }].slice(0, 60) });
    setDraft({ name: '', start: '', end: '' });
  };

  const addOfficial = () => {
    if (!hasCalendar(term)) return;
    const existing = new Set((term.holidays ?? []).map((h) => h.start));
    const extra = officialHolidaysBetween(term.start, term.end).filter((h) => !existing.has(h.start));
    if (extra.length === 0) return setError('Bu tarih aralığında eklenecek sabit tarihli resmî tatil yok.');
    setError(null);
    setTerm({ holidays: [...(term.holidays ?? []), ...extra].slice(0, 60) });
  };

  const fmt = (h: Holiday) => (h.start === h.end ? formatTurkishDate(h.start) : `${formatTurkishDate(h.start)} – ${formatTurkishDate(h.end)}`);

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
        <p className="text-[11px] text-muted leading-relaxed">
          Derslerin başlangıç ve bitiş tarihlerini ve tatilleri girin. Devamsızlık sınırı, her dersin gerçekten yapılacağı gün sayısına göre
          hesaplanır; tatile denk gelen dersler sayılmaz. Takvim girilmezse {data.grading.weeksPerTerm} haftalık dönem varsayılır.
        </p>
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
              <span className="text-fg font-medium">{weeks} hafta</span> • tatiller çıkarıldıktan sonra ders günü sayısı:
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
          (term.start || term.end) && <p className="text-[11px] text-amber-400">Başlangıç ve bitiş tarihlerinin ikisini de girin.</p>
        )}

        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <h4 className="text-xs font-semibold text-body">Tatiller ve ders yapılmayan günler</h4>
            <button className={btnGhost} onClick={addOfficial} disabled={!hasCalendar(term)} title="Sabit tarihli resmî tatilleri ekler">
              <Plus className="w-3.5 h-3.5" /> Resmî tatiller
            </button>
          </div>
          {holidays.length === 0 ? (
            <p className="text-[11px] text-muted">Henüz tatil eklenmedi.</p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line">
              {holidays.map((h) => (
                <li key={h.id} className="px-3 py-1.5 flex items-center gap-2 text-xs">
                  <span className="text-body flex-1 min-w-0 truncate">{h.name}</span>
                  <span className="text-muted whitespace-nowrap">{fmt(h)}</span>
                  <button
                    className="w-7 h-7 flex items-center justify-center text-muted hover:text-rose-400"
                    onClick={() => setTerm({ holidays: (term.holidays ?? []).filter((x) => x.id !== h.id) })}
                    aria-label="Tatili sil"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                </li>
              ))}
            </ul>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-[1fr_140px_140px_auto] gap-2 items-end">
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>Ad</label>
              <input className={inputCls} value={draft.name} maxLength={80} placeholder="Ör. Ramazan Bayramı, ara tatil" onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
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
          <p className="text-[11px] text-muted">
            “Resmî tatiller” yalnızca tarihi sabit olanları ekler (29 Ekim, 1 Ocak, 23 Nisan…). Dinî bayramları ve üniversitenizin ara
            tatillerini akademik takviminize bakarak ekleyin.
          </p>
        </div>
      </div>
    </Card>
  );
}
