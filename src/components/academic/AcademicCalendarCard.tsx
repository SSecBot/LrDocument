'use client';

import { t as tl, tx } from '@/lib/i18n';
import type { AcademicUpdate } from './useAcademicData';
import { ERR, responseError } from '@/lib/errors';
import React, { useState } from 'react';
import { CalendarCheck2, CalendarRange, FileUp, Plus, Send, Trash2 } from 'lucide-react';
import type { AcademicData, Holiday, Term } from '@/lib/academic/types';
import { DAYS_SHORT, calendarWeeks, hasCalendar, meetingsPerWeekday, newId, termHolidays } from '@/lib/academic/grading';
import { formatTurkishDate } from '@/lib/utils';
import { CalendarImportModal } from './CalendarImportModal';
import { Card, CardHeader, btnSecondary, inputCls, labelCls } from './ui';
import type { SchoolInfo } from './useAcademicData';
import { confirmDelete } from '@/components/ui/ConfirmDialog';

interface Props {
  data: AcademicData;
  update: AcademicUpdate;
  /** The student's university (catalog) and its published calendar */
  school?: SchoolInfo | null;
}

const fmt = (h: Pick<Holiday, 'start' | 'end'>) =>
  h.start === h.end ? formatTurkishDate(h.start) : `${formatTurkishDate(h.start)} – ${formatTurkishDate(h.end)}`;

/**
 * Academic calendar per term: first/last day of classes, exam weeks and holidays. Attendance limits
 * are computed from the real class days instead of a fixed number of weeks.
 */
export function AcademicCalendarCard({ data, update, school }: Props) {
  const [termId, setTermId] = useState(data.activeTermId ?? data.terms[data.terms.length - 1].id);
  const term = data.terms.find((t) => t.id === termId) ?? data.terms[data.terms.length - 1];
  const [draft, setDraft] = useState<Omit<Holiday, 'id'>>({ name: '', start: '', end: '' });
  const [error, setError] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [proposal, setProposal] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);
  const [proposing, setProposing] = useState(false);

  const setTerm = (patch: Partial<Term>, undo?: { title: string; message?: string }) =>
    update((d) => ({ ...d, terms: d.terms.map((t) => (t.id === term.id ? { ...t, ...patch } : t)) }), undo);
  // Dates typed by hand win over the school calendar: later updates no longer overwrite this term.
  const setTermDates = (patch: Pick<Term, 'start'> | Pick<Term, 'end'>) => setTerm({ ...patch, school: null });

  /** Sends this term's calendar to the admin, to be published for every student of the university. */
  const propose = async () => {
    if (!hasCalendar(term)) return;
    setProposing(true);
    setProposal(null);
    try {
      const res = await fetch('/api/feedback', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          kind: 'takvim',
          terms: [
            {
              id: term.id,
              name: term.name,
              start: term.start,
              end: term.end,
              holidays: (term.holidays ?? []).map((h) => ({ id: h.id, name: h.name, start: h.start, end: h.end, ...(h.half ? { half: true } : {}), ...(h.kind ? { kind: h.kind } : {}) })),
            },
          ],
        }),
      });
      const json = await res.json().catch(() => ({}));
      setProposal(res.ok ? { kind: 'ok', text: tl('Takvim yöneticiye gönderildi. Onaylanınca okulunuzdaki tüm öğrencilere eklenecek.') } : { kind: 'error', text: responseError(res, json, tl('Takvim gönderilemedi.')) });
    } catch {
      setProposal({ kind: 'error', text: ERR.network });
    } finally {
      setProposing(false);
    }
  };
  const fromSchool = !!term.school;
  const schoolHasTerm = !!school?.calendar?.terms.some((n) => n.toLocaleLowerCase('tr-TR') === term.name.toLocaleLowerCase('tr-TR'));

  const holidays = termHolidays(term);
  const meetings = meetingsPerWeekday(term);
  const weeks = calendarWeeks(term);
  const auto = term.autoHolidays !== false;
  const estimated = holidays.some((h) => h.estimated);

  const addHoliday = () => {
    setError(null);
    const start = draft.start;
    const end = draft.end || draft.start;
    if (!start) return setError(tl('Başlangıç tarihini seçin.'));
    if (end < start) return setError(tl('Bitiş tarihi başlangıçtan önce olamaz.'));
    setTerm({
      holidays: [...(term.holidays ?? []), { id: newId(), name: (draft.name.trim() || tl('Tatil')).slice(0, 80), start, end, kind: 'tatil' as const }].slice(0, 60),
    });
    setDraft({ name: '', start: '', end: '' });
  };

  const badge = (h: Holiday) => {
    if (h.kind === 'sinav') return <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/15 text-sky-300 whitespace-nowrap">{tl('sınav · ders yok')}</span>;
    if (h.half) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-amber-500/15 text-amber-300 whitespace-nowrap">{tl('öğleden sonra')}</span>;
    if (h.auto) return <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-muted whitespace-nowrap">{h.estimated ? 'otomatik · tahmini' : 'otomatik'}</span>;
    return null;
  };

  return (
    <Card>
      <CardHeader
        title={tl('Akademik takvim')}
        icon={<CalendarRange className="w-4 h-4 text-subtle" />}
        action={
          data.terms.length > 1 && (
            <select className={`${inputCls} w-auto max-w-[9.5rem] sm:max-w-none h-8 text-xs shrink-0`} value={term.id} onChange={(e) => setTermId(e.target.value)} aria-label="Dönem">
              {data.terms.map((t) => (
                <option key={t.id} value={t.id}>{t.name}</option>
              ))}
            </select>
          )
        }
      />
      <div className="p-4 space-y-4">
        {school && (
          <div className={`rounded-lg border px-3 py-2.5 text-xs flex items-start gap-2 ${fromSchool ? 'border-emerald-500/30 bg-emerald-500/5' : 'border-line bg-surface-2'}`}>
            <CalendarCheck2 className={`w-4 h-4 shrink-0 mt-0.5 ${fromSchool ? 'text-emerald-400' : 'text-muted'}`} />
            <p className="text-subtle">
              {fromSchool
                ? tl('Bu dönemin tarihleri {name} akademik takviminden otomatik geldi. Tarihleri elle değiştirirseniz sizin girdikleriniz korunur.', { name: school.name })
                : school.calendar
                  ? tl('{name} takviminde yayınlanan dönemler: {v1}. Aynı adlı dönemleriniz otomatik doldurulur.', { name: school.name, v1: school.calendar.terms.join(', ') })
                  : tl('{name} için yayınlanmış bir akademik takvim yok. Aşağıdan PDF yükleyebilir, sonra okulunuz için önerebilirsiniz.', { name: school.name })}
            </p>
          </div>
        )}
        <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-dashed border-line p-3">
          <p className="text-[11px] text-muted flex-1">
            {tl('Üniversitenizin akademik takvim PDF’ini yükleyin: derslerin başlangıç ve bitiş tarihleri ile sınav haftaları otomatik girilir. Sınav haftalarında ders yapılmadığı varsayılır.')}
          </p>
          <button className={btnSecondary} onClick={() => setImportOpen(true)}>
            <FileUp className="w-4 h-4" />{' '}{tl('Takvim PDF’i yükle')}
          </button>
        </div>

        <div className="grid grid-cols-2 gap-3 max-w-md">
          <div>
            <label className={labelCls}>{tl('Derslerin başlangıcı')}</label>
            <input type="date" className={inputCls} value={term.start ?? ''} onChange={(e) => setTermDates({ start: e.target.value || undefined })} />
          </div>
          <div>
            <label className={labelCls}>{tl('Derslerin bitişi')}</label>
            <input type="date" className={inputCls} value={term.end ?? ''} min={term.start} onChange={(e) => setTermDates({ end: e.target.value || undefined })} />
          </div>
        </div>

        {hasCalendar(term) && meetings ? (
          <div className="rounded-lg bg-surface-2 border border-line px-3 py-2 text-xs text-subtle">
            <p>
              <span className="text-fg font-medium">{weeks} hafta</span>{' '}{tl('• tatil ve sınav günleri çıkarıldıktan sonra ders günü sayısı:')}
            </p>
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {meetings.slice(0, 6).map((n, i) => (
                <span key={i} className="px-1.5 py-0.5 rounded bg-surface-3 tabular-nums">
                  {tx(DAYS_SHORT[i])} {n}
                </span>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-[11px] text-muted">
            {tl('Takvim girilmezse')}{' '}{data.grading.weeksPerTerm}{' '}{tl('haftalık dönem varsayılır.')}
            {(term.start || term.end) && <span className="text-amber-400">{' '}{tl('Başlangıç ve bitiş tarihlerinin ikisini de girin.')}</span>}
          </p>
        )}

        <label className="flex items-start gap-2 text-xs text-body">
          <input type="checkbox" className="mt-0.5" checked={auto} onChange={(e) => setTerm({ autoHolidays: e.target.checked })} />
          <span>
            {tl('Milli ve dinî bayramları otomatik ekle')}
            <span className="block text-[11px] text-muted">
              {tl('Resmî tatiller, Ramazan ve Kurban Bayramı; arife günleri ile 28 Ekim’de öğleden sonraki dersler sayılmaz.')}
            </span>
          </span>
        </label>

        <div className="space-y-2">
          <h4 className="text-xs font-semibold text-body">{tl('Ders yapılmayan günler')}</h4>
          {holidays.length === 0 ? (
            <p className="text-[11px] text-muted">{hasCalendar(term) ? tl('Bu dönemde tatil yok.') : tl('Dönem tarihleri girilince bayramlar burada listelenir.')}</p>
          ) : (
            <ul className="divide-y divide-line rounded-lg border border-line max-h-72 overflow-y-auto">
              {holidays.map((h) => (
                <li key={h.id} className="px-3 py-1.5 flex items-center gap-2 text-xs">
                  <span className="text-body flex-1 min-w-0 truncate">{tx(h.name)}</span>
                  {badge(h)}
                  <span className="text-muted whitespace-nowrap">{tx(fmt(h))}</span>
                  {h.auto ? (
                    <span className="w-7" />
                  ) : (
                    <button
                      className="w-7 h-7 flex items-center justify-center text-muted hover:text-rose-400"
                      onClick={async () => (await confirmDelete(`"${h.name}"`)) && setTerm({ holidays: (term.holidays ?? []).filter((x) => x.id !== h.id) }, { title: tl('Tatil silindi'), message: h.name })}
                      aria-label={tl('Sil')}
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
              {tl('“Tahmini” dinî bayram tarihleri hesapla bulunur ve bir gün kayabilir; Diyanet takvimi açıklanınca kontrol edin.')}
            </p>
          )}
          <div className="grid grid-cols-2 sm:grid-cols-[1fr_140px_140px_auto] gap-2 items-end">
            <div className="col-span-2 sm:col-span-1">
              <label className={labelCls}>{tl('Diğer tatil (ad)')}</label>
              <input className={inputCls} value={draft.name} maxLength={80} placeholder={tl('Ör. ara tatil, kar tatili')} onChange={(e) => setDraft({ ...draft, name: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>{tl('Başlangıç')}</label>
              <input type="date" className={inputCls} value={draft.start} onChange={(e) => setDraft({ ...draft, start: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>{tl('Bitiş (tek gün ise boş)')}</label>
              <input type="date" className={inputCls} value={draft.end} min={draft.start} onChange={(e) => setDraft({ ...draft, end: e.target.value })} />
            </div>
            <button className={`${btnSecondary} col-span-2 sm:col-span-1`} onClick={addHoliday}>
              <Plus className="w-4 h-4" />{' '}{tl('Ekle')}
            </button>
          </div>
          {error && <p className="text-xs text-rose-400">{tx(error)}</p>}
        </div>

        {school && hasCalendar(term) && !fromSchool && !schoolHasTerm && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-3 rounded-lg border border-sky-500/30 bg-sky-500/5 p-3">
            <p className="text-[11px] text-subtle flex-1">
              {tl('Bu dönemin takvimini')}{' '}{tx(school.name)}{' '}{tl('için önerin: yönetici onaylarsa okulunuzdaki tüm öğrencilere otomatik eklenir.')}
            </p>
            <button className={btnSecondary} disabled={proposing} onClick={propose}>
              <Send className="w-4 h-4" />{' '}{tl('Okulum için öner')}
            </button>
          </div>
        )}
        {proposal && <p className={`text-xs ${proposal.kind === 'ok' ? 'text-emerald-300' : 'text-rose-400'}`}>{tx(proposal.text)}</p>}
      </div>
      <CalendarImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} data={data} update={update} />
    </Card>
  );
}
