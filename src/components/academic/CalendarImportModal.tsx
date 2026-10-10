'use client';

import React, { useRef, useState } from 'react';
import { FileUp, Loader2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import type { AcademicData, Holiday, Term } from '@/lib/academic/types';
import { newId } from '@/lib/academic/grading';
import { parseAcademicCalendar, type ParsedCalendarTerm } from '@/lib/academic/calendarParser';
import { readCalendarRows, type OcrProgress, type PdfJsRenderLike } from '@/lib/academic/calendarOcr';
import { loadPdfJs } from '@/lib/academic/pdfjsLoader';
import { fold } from '@/lib/academic/scheduleParser';
import { formatTurkishDate } from '@/lib/utils';
import { btnGhost, btnPrimary, btnSecondary } from './ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  data: AcademicData;
  update: (fn: (d: AcademicData) => AcademicData) => void;
}

const MAX_PDF_BYTES = 15 * 1024 * 1024;
const NEW_TERM = '__new__';

const smallInput = 'h-8 bg-surface-2 border border-line rounded-md px-2 text-xs text-fg focus:outline-none focus:border-line-strong';

/** "2026-2027 Güz" style name for a detected term. */
function termName(t: ParsedCalendarTerm): string {
  const year = Number((t.start ?? t.end ?? '').slice(0, 4));
  if (!year) return t.label;
  if (t.key === 'guz') return `${year}-${year + 1} Güz`;
  if (t.key === 'bahar') return `${year - 1}-${year} Bahar`;
  return `${year} Yaz okulu`;
}

/** Existing term whose name matches the detected one, else "create new". */
function defaultTarget(t: ParsedCalendarTerm, terms: Term[]): string {
  const wanted = fold(termName(t)).replace(/[^a-z0-9]/g, '');
  const exact = terms.find((x) => fold(x.name).replace(/[^a-z0-9]/g, '') === wanted);
  if (exact) return exact.id;
  const sameKind = terms.find((x) => fold(x.name).includes(t.key) && !x.start);
  return sameKind?.id ?? NEW_TERM;
}

const fmt = (iso?: string) => (iso ? formatTurkishDate(iso) : '—');
const fmtRange = (r: { start: string; end: string }) => (r.start === r.end ? fmt(r.start) : `${fmt(r.start)} – ${fmt(r.end)}`);

export function CalendarImportModal({ isOpen, onClose, data, update }: Props) {
  const [found, setFound] = useState<ParsedCalendarTerm[] | null>(null);
  const [targets, setTargets] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState<OcrProgress | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [usedOcr, setUsedOcr] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) {
      setFound(null);
      setError(null);
      setBusy(null);
    }
  }

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) return setError('Lütfen PDF dosyası seçin.');
    if (file.size > MAX_PDF_BYTES) return setError('PDF en fazla 15 MB olabilir.');
    setBusy({ page: 0, pages: 0, stage: 'metin', progress: 0 });
    try {
      const pdfjs = await loadPdfJs<PdfJsRenderLike>();
      const result = await readCalendarRows(pdfjs, new Uint8Array(await file.arrayBuffer()), setBusy);
      setUsedOcr(result.usedOcr);
      const parsed = parseAcademicCalendar(result.rows).terms;
      if (parsed.length === 0) {
        setError('Takvimde derslerin başlangıç / bitiş tarihleri bulunamadı. Tarihleri elle girebilirsiniz.');
        return;
      }
      setFound(parsed);
      setTargets(Object.fromEntries(parsed.map((t) => [t.key, defaultTarget(t, data.terms)])));
    } catch (err) {
      console.error(err);
      setError('PDF okunamadı. Dosya bozuk ya da şifreli olabilir.');
    } finally {
      setBusy(null);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const apply = () => {
    if (!found) return;
    update((d) => {
      let terms = [...d.terms];
      for (const t of found) {
        const target = targets[t.key];
        if (!target) continue;
        const examEntries: Holiday[] = [
          ...t.examWeeks.map((w) => ({ id: newId(), name: 'Ara sınav haftası', start: w.start, end: w.end, kind: 'sinav' as const })),
          ...(t.finals ? [{ id: newId(), name: 'Yarıyıl sonu sınavları', start: t.finals.start, end: t.finals.end, kind: 'sinav' as const }] : []),
          ...(t.makeup ? [{ id: newId(), name: 'Bütünleme sınavları', start: t.makeup.start, end: t.makeup.end, kind: 'sinav' as const }] : []),
        ];
        const patch = (term: Term): Term => ({
          ...term,
          start: t.start ?? term.start,
          end: t.end ?? term.end,
          // Replace exam periods from an earlier import, keep the user's own holidays.
          holidays: [...(term.holidays ?? []).filter((h) => h.kind !== 'sinav'), ...examEntries].slice(0, 60),
        });
        if (target === NEW_TERM) {
          if (terms.length >= 20) continue;
          terms.push(patch({ id: newId(), name: termName(t).slice(0, 40) }));
        } else {
          terms = terms.map((x) => (x.id === target ? patch(x) : x));
        }
      }
      // Keep terms in chronological order (repeated courses count the later attempt).
      if (terms.every((x) => x.start)) terms.sort((a, b) => a.start!.localeCompare(b.start!));
      return { ...d, terms };
    });
    onClose();
  };

  const progressText = (p: OcrProgress) => {
    if (p.stage === 'hazirlik') return 'Metin tanıma (OCR) hazırlanıyor…';
    if (p.stage === 'ocr') return `Sayfa ${p.page}/${p.pages} okunuyor (OCR) %${Math.round(p.progress * 100)}`;
    return p.pages ? `Sayfa ${p.page}/${p.pages} okunuyor…` : 'PDF açılıyor…';
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Akademik takvimi PDF’ten yükle" maxWidth="max-w-2xl">
      <div className="space-y-4">
        {!found ? (
          <>
            <button
              type="button"
              disabled={!!busy}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFile(e.dataTransfer.files?.[0]);
              }}
              className="w-full rounded-xl border-2 border-dashed border-line hover:border-line-strong bg-surface-2/50 px-4 py-10 flex flex-col items-center gap-2 text-center transition-colors disabled:opacity-70"
            >
              {busy ? <Loader2 className="w-6 h-6 text-subtle animate-spin" /> : <FileUp className="w-6 h-6 text-subtle" />}
              <span className="text-sm font-medium text-body">{busy ? progressText(busy) : 'Akademik takvim PDF’ini seçin veya buraya sürükleyin'}</span>
              <span className="text-[11px] text-muted max-w-md">
                Üniversitenizin önlisans/lisans akademik takvimi. Resim olarak hazırlanmış PDF’ler metin tanıma ile okunur; bu birkaç saniye
                sürebilir. Dosya cihazınızda işlenir, sunucuya yüklenmez.
              </span>
            </button>
            <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="sr-only" tabIndex={-1} aria-hidden="true" onChange={(e) => handleFile(e.target.files?.[0])} />
          </>
        ) : (
          <>
            <div className="flex items-center justify-between gap-2">
              <p className="text-xs text-subtle">
                Takvimden okunanlar{usedOcr ? ' (metin tanıma ile — tarihleri kontrol edin)' : ''}. Her yarıyılı hangi döneme uygulayacağınızı seçin.
              </p>
              <button type="button" className={btnGhost} onClick={() => setFound(null)}>Başka PDF</button>
            </div>
            <div className="space-y-2">
              {found.map((t) => (
                <div key={t.key} className="rounded-lg border border-line p-3 space-y-2">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <p className="text-sm font-semibold text-fg">{t.label} yarıyılı</p>
                    <select
                      className={`${smallInput} w-auto`}
                      value={targets[t.key] ?? ''}
                      onChange={(e) => setTargets((x) => ({ ...x, [t.key]: e.target.value }))}
                      aria-label="Uygulanacak dönem"
                    >
                      <option value="">Uygulama</option>
                      {data.terms.map((x) => (
                        <option key={x.id} value={x.id}>{x.name}</option>
                      ))}
                      <option value={NEW_TERM}>Yeni dönem: {termName(t)}</option>
                    </select>
                  </div>
                  <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-0.5 text-xs">
                    <dt className="text-muted">Dersler</dt>
                    <dd className="text-body">{fmt(t.start)} – {fmt(t.end)}</dd>
                    {t.examWeeks.map((w, i) => (
                      <React.Fragment key={i}>
                        <dt className="text-muted">Ara sınav</dt>
                        <dd className="text-body">{fmtRange(w)} <span className="text-muted">(ders yapılmaz)</span></dd>
                      </React.Fragment>
                    ))}
                    {t.finals && (
                      <>
                        <dt className="text-muted">Yarıyıl sonu</dt>
                        <dd className="text-body">{fmtRange(t.finals)}</dd>
                      </>
                    )}
                    {t.makeup && (
                      <>
                        <dt className="text-muted">Bütünleme</dt>
                        <dd className="text-body">{fmtRange(t.makeup)}</dd>
                      </>
                    )}
                  </dl>
                  {(!t.start || !t.end) && <p className="text-[11px] text-amber-400">Başlangıç veya bitiş tarihi okunamadı; uyguladıktan sonra elle girin.</p>}
                </div>
              ))}
            </div>
            <p className="text-[11px] text-muted">
              Sınav dönemleri “ders yapılmayan günler” olarak eklenir; milli ve dinî bayramlar ayrıca otomatik hesaplanır. Daha önce takvimden eklenen
              sınav dönemleri yenileriyle değiştirilir.
            </p>
          </>
        )}

        {error && <p className="text-xs text-rose-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Vazgeç</button>
          {found && (
            <button type="button" className={btnPrimary} onClick={apply} disabled={!Object.values(targets).some(Boolean)}>
              Takvimi uygula
            </button>
          )}
        </div>
      </div>
    </Modal>
  );
}
