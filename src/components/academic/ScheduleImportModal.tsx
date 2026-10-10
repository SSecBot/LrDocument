'use client';

import React, { useRef, useState } from 'react';
import { FileUp, Loader2, Trash2 } from 'lucide-react';
import { Modal } from '@/components/ui/Modal';
import type { AcademicData, Course, CourseSession, SessionKind } from '@/lib/academic/types';
import { DAYS, DAYS_SHORT, newId, weeklyHoursFromSessions } from '@/lib/academic/grading';
import { parseSchedule, type ParsedCourse } from '@/lib/academic/scheduleParser';
import { extractPdfItems, type PdfJsLike } from '@/lib/academic/pdfText';
import { emptyCourse } from './CourseModal';
import { btnGhost, btnPrimary, btnSecondary } from './ui';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  termId: string;
  courses: Course[];
  /** Student's class year from the profile; picks the matching block of a department program */
  classYear: number | null;
  update: (fn: (d: AcademicData) => AcademicData) => void;
}

const MAX_PDF_BYTES = 8 * 1024 * 1024;

interface Row extends ParsedCourse {
  key: string;
  include: boolean;
}

const yearLabel = (y: number) => (y === 0 ? 'Hazırlık' : `${y}. sınıf`);

/** Rows for the chosen class year and şube: other years and other groups' sessions are left out. */
function buildRows(parsed: ParsedCourse[], year: number | null, group: string): Row[] {
  return parsed
    .map((c, i) => ({ c, i }))
    .filter(({ c }) => year === null || c.year === null || c.year === year)
    .map(({ c, i }) => ({
      ...c,
      sessions: c.sessions.filter((s) => !group || !s.group || s.group === group).map((s) => ({ ...s })),
      key: `${i}`,
      include: !c.elective,
    }))
    .filter((r) => r.sessions.length > 0);
}

function groupsFor(parsed: ParsedCourse[], year: number | null): string[] {
  const set = new Set<string>();
  parsed
    .filter((c) => year === null || c.year === null || c.year === year)
    .forEach((c) => c.sessions.forEach((s) => s.group && set.add(s.group)));
  return [...set].sort();
}

let pdfjsPromise: Promise<PdfJsLike> | null = null;

/** Loads pdf.js on demand; the PDF is parsed in the browser and never uploaded. */
function loadPdfJs(): Promise<PdfJsLike> {
  pdfjsPromise ??= import('pdfjs-dist').then((mod) => {
    mod.GlobalWorkerOptions.workerSrc = new URL('pdfjs-dist/build/pdf.worker.min.mjs', import.meta.url).toString();
    return mod as unknown as PdfJsLike;
  });
  return pdfjsPromise;
}

const smallInput = 'h-8 bg-surface-2 border border-line rounded-md px-2 text-xs text-fg focus:outline-none focus:border-line-strong';

export function ScheduleImportModal({ isOpen, onClose, termId, courses, classYear, update }: Props) {
  const [rows, setRows] = useState<Row[] | null>(null);
  const [parsed, setParsed] = useState<ParsedCourse[]>([]);
  const [year, setYear] = useState<number | null>(null);
  const [group, setGroup] = useState('');
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [replace, setReplace] = useState(true);
  const fileRef = useRef<HTMLInputElement>(null);

  const [prevOpen, setPrevOpen] = useState(isOpen);
  if (isOpen !== prevOpen) {
    setPrevOpen(isOpen);
    if (isOpen) {
      setRows(null);
      setError(null);
      setWarnings([]);
      setBusy(false);
    }
  }

  const matchOf = (r: Pick<Row, 'code' | 'name'>) => {
    const c = r.code.trim().toLocaleUpperCase('tr-TR');
    if (c) return courses.find((x) => x.code.trim().toLocaleUpperCase('tr-TR') === c);
    const n = r.name.trim().toLocaleLowerCase('tr-TR');
    return courses.find((x) => x.name.trim().toLocaleLowerCase('tr-TR') === n);
  };

  const years = [...new Set(parsed.map((c) => c.year).filter((y): y is number => y !== null))].sort((a, b) => a - b);
  const groups = groupsFor(parsed, year);

  const choose = (nextYear: number | null, nextGroup?: string) => {
    const g = nextGroup ?? groupsFor(parsed, nextYear)[0] ?? '';
    setYear(nextYear);
    setGroup(g);
    setRows(buildRows(parsed, nextYear, g));
  };

  const handleFile = async (file: File | undefined) => {
    if (!file) return;
    setError(null);
    setWarnings([]);
    if (file.type && file.type !== 'application/pdf' && !file.name.toLowerCase().endsWith('.pdf')) {
      return setError('Lütfen PDF dosyası seçin.');
    }
    if (file.size > MAX_PDF_BYTES) return setError('PDF en fazla 8 MB olabilir.');
    setBusy(true);
    try {
      const pdfjs = await loadPdfJs();
      const items = await extractPdfItems(pdfjs, new Uint8Array(await file.arrayBuffer()));
      const result = parseSchedule(items);
      setWarnings(result.warnings);
      if (result.courses.length === 0) {
        setError('Bu PDF’te ders programı bulunamadı. Dersleri elle ekleyebilirsiniz.');
        return;
      }
      const found = [...new Set(result.courses.map((c) => c.year).filter((y): y is number => y !== null))].sort((a, b) => a - b);
      const y = found.length === 0 ? null : classYear !== null && found.includes(classYear) ? classYear : found[0];
      const g = groupsFor(result.courses, y)[0] ?? '';
      setParsed(result.courses);
      setYear(y);
      setGroup(g);
      setRows(buildRows(result.courses, y, g));
    } catch (err) {
      console.error(err);
      setError('PDF okunamadı. Dosya bozuk ya da şifreli olabilir.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  const setRow = (key: string, patch: Partial<Row>) => setRows((r) => r && r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
  const setSession = (key: string, index: number, patch: Partial<Row['sessions'][number]>) =>
    setRows((r) => r && r.map((x) => (x.key === key ? { ...x, sessions: x.sessions.map((s, i) => (i === index ? { ...s, ...patch } : s)) } : x)));
  const removeSession = (key: string, index: number) =>
    setRows((r) => r && r.map((x) => (x.key === key ? { ...x, sessions: x.sessions.filter((_, i) => i !== index) } : x)));

  const required = rows?.filter((r) => !r.elective) ?? [];
  const electives = rows?.filter((r) => r.elective) ?? [];
  const selected = required.filter((r) => r.include && r.sessions.length > 0 && r.name.trim());

  const handleImport = () => {
    if (selected.length === 0) return;
    for (const r of selected) {
      for (const s of r.sessions) {
        if (s.end <= s.start) return setError(`${r.name}: ${DAYS[s.day]} oturumunda bitiş saati başlangıçtan sonra olmalı.`);
      }
    }
    update((d) => {
      const list = [...d.courses];
      let colorIndex = list.filter((c) => c.termId === termId).length;
      for (const r of selected) {
        const sessions: CourseSession[] = r.sessions.map((s) => ({
          id: newId(),
          day: s.day,
          start: s.start,
          end: s.end,
          kind: s.kind,
          room: s.room?.slice(0, 40) ?? '',
        }));
        const code = r.code.trim().toLocaleUpperCase('tr-TR').slice(0, 20);
        const idx = code
          ? list.findIndex((c) => c.termId === termId && c.code.trim().toLocaleUpperCase('tr-TR') === code)
          : list.findIndex((c) => c.termId === termId && c.name.trim().toLocaleLowerCase('tr-TR') === r.name.trim().toLocaleLowerCase('tr-TR'));
        if (idx >= 0) {
          const existing = list[idx];
          const kept = replace ? [] : existing.sessions;
          const merged = [
            ...kept,
            ...sessions.filter((s) => !kept.some((k) => k.day === s.day && k.start === s.start && k.end === s.end)),
          ];
          const hours = weeklyHoursFromSessions(merged);
          list[idx] = {
            ...existing,
            sessions: merged.slice(0, 20),
            theoryHours: hours.theory,
            practiceHours: hours.practice,
            instructor: existing.instructor || r.instructor?.slice(0, 80) || '',
          };
        } else {
          const base = emptyCourse(termId, d.grading, colorIndex++);
          const hours = weeklyHoursFromSessions(sessions);
          list.push({
            ...base,
            code,
            name: r.name.trim().slice(0, 120),
            instructor: r.instructor?.slice(0, 80) ?? '',
            sessions: sessions.slice(0, 20),
            theoryHours: hours.theory,
            practiceHours: hours.practice,
          });
        }
      }
      return { ...d, courses: list };
    });
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="Ders programını PDF’ten içe aktar" maxWidth="max-w-3xl">
      <div className="space-y-4">
        {!rows ? (
          <>
            <button
              type="button"
              disabled={busy}
              onClick={() => fileRef.current?.click()}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => {
                e.preventDefault();
                handleFile(e.dataTransfer.files?.[0]);
              }}
              className="w-full rounded-xl border-2 border-dashed border-line hover:border-line-strong bg-surface-2/50 px-4 py-10 flex flex-col items-center gap-2 text-center transition-colors disabled:opacity-60"
            >
              {busy ? <Loader2 className="w-6 h-6 text-subtle animate-spin" /> : <FileUp className="w-6 h-6 text-subtle" />}
              <span className="text-sm font-medium text-body">{busy ? 'PDF okunuyor…' : 'Ders programı PDF’ini seçin veya buraya sürükleyin'}</span>
              <span className="text-[11px] text-muted max-w-md">
                OBS’den ya da bölüm sayfasından indirdiğiniz haftalık ders programı. Dosya cihazınızda işlenir, sunucuya yüklenmez.
              </span>
            </button>
            <input ref={fileRef} type="file" accept="application/pdf,.pdf" className="hidden" onChange={(e) => handleFile(e.target.files?.[0])} />
            <p className="text-[11px] text-muted">
              Gün sütunlu tablo, gün satırlı tablo ve “ders – gün – saat” listesi biçimleri desteklenir. Taranmış (fotoğraf) PDF’ler okunamaz.
              Bölüm programında birden fazla sınıf varsa sonraki adımda yalnızca kendi derslerinizi seçin.
            </p>
          </>
        ) : (
          <>
            <div className="flex flex-wrap items-end gap-2">
              {years.length > 0 && (
                <label className="text-[11px] text-subtle">
                  Sınıf
                  <select className={`${smallInput} block mt-1 w-32`} value={year ?? ''} onChange={(e) => choose(Number(e.target.value))}>
                    {years.map((y) => (
                      <option key={y} value={y}>{yearLabel(y)}</option>
                    ))}
                  </select>
                </label>
              )}
              {groups.length > 0 && (
                <label className="text-[11px] text-subtle">
                  Şube / grup
                  <select className={`${smallInput} block mt-1 w-32`} value={group} onChange={(e) => choose(year, e.target.value)}>
                    {groups.map((g) => (
                      <option key={g} value={g}>{g} şubesi</option>
                    ))}
                    <option value="">Tüm şubeler</option>
                  </select>
                </label>
              )}
              <button type="button" className={`${btnGhost} ml-auto`} onClick={() => setRows(null)}>Başka PDF seç</button>
            </div>
            <p className="text-xs text-subtle">
              {year !== null ? `${yearLabel(year)} için ` : ''}
              {required.length} ders bulundu. Kontrol edip gerekirse düzeltin. Seçmeli dersler eklenmez; PDF’te seçmeli diye işaretlenmemiş
              bir seçmeli ders varsa “Seçmeli” düğmesiyle ayırın. Aldığınız seçmelileri sonra “Ders ekle” ile elle ekleyin.
            </p>
            <div className="space-y-2 max-h-[55vh] overflow-y-auto pr-1 -mr-1">
              {required.map((r) => {
                const match = matchOf(r);
                return (
                  <div key={r.key} className={`rounded-lg border border-line p-3 space-y-2 ${r.include ? 'bg-surface-2/40' : 'opacity-50'}`}>
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={r.include}
                        onChange={(e) => setRow(r.key, { include: e.target.checked })}
                        aria-label="Bu dersi al"
                        className="shrink-0"
                      />
                      <input className={`${smallInput} w-24 shrink-0 uppercase`} value={r.code} onChange={(e) => setRow(r.key, { code: e.target.value })} placeholder="Kod" />
                      <input className={`${smallInput} flex-1 min-w-0`} value={r.name} onChange={(e) => setRow(r.key, { name: e.target.value })} placeholder="Ders adı" />
                      <span
                        className={`hidden sm:inline text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${
                          match ? 'bg-sky-500/15 text-sky-300' : 'bg-emerald-500/15 text-emerald-300'
                        }`}
                      >
                        {match ? 'Mevcut ders' : 'Yeni ders'}
                      </span>
                      <button
                        type="button"
                        className="shrink-0 h-7 px-2 rounded-md border border-line text-[11px] text-subtle hover:text-fg hover:bg-surface-3"
                        onClick={() => setRow(r.key, { elective: true, include: false })}
                        title="Seçmeli ders olarak ayır (eklenmez)"
                      >
                        Seçmeli
                      </button>
                    </div>
                    <ul className="space-y-1.5 sm:pl-6">
                      {r.sessions.map((s, i) => (
                        <li key={i} className="flex flex-wrap items-center gap-1.5">
                          <select className={`${smallInput} w-20`} value={s.day} onChange={(e) => setSession(r.key, i, { day: Number(e.target.value) })} aria-label="Gün">
                            {DAYS_SHORT.map((d, di) => (
                              <option key={di} value={di}>{d}</option>
                            ))}
                          </select>
                          <input type="time" className={`${smallInput} w-[92px]`} value={s.start} onChange={(e) => setSession(r.key, i, { start: e.target.value })} aria-label="Başlangıç" />
                          <input type="time" className={`${smallInput} w-[92px]`} value={s.end} onChange={(e) => setSession(r.key, i, { end: e.target.value })} aria-label="Bitiş" />
                          <select
                            className={`${smallInput} w-24`}
                            value={s.kind}
                            onChange={(e) => setSession(r.key, i, { kind: e.target.value as SessionKind })}
                            aria-label="Tür"
                          >
                            <option value="teori">Teorik</option>
                            <option value="uygulama">Uygulama</option>
                          </select>
                          <input
                            className={`${smallInput} w-24`}
                            value={s.room ?? ''}
                            onChange={(e) => setSession(r.key, i, { room: e.target.value })}
                            placeholder="Derslik"
                            aria-label="Derslik"
                          />
                          <button
                            type="button"
                            className="w-8 h-8 flex items-center justify-center text-muted hover:text-rose-400"
                            onClick={() => removeSession(r.key, i)}
                            aria-label="Oturumu kaldır"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
              {electives.length > 0 && (
                <div className="rounded-lg border border-dashed border-line p-3 space-y-1.5">
                  <p className="text-[11px] font-medium text-subtle">Seçmeli dersler — eklenmez, aldıklarınızı “Ders ekle” ile elle ekleyin</p>
                  {electives.map((r) => (
                    <div key={r.key} className="flex items-center justify-between gap-2 text-xs text-muted">
                      <span className="truncate">
                        {r.code && `${r.code} — `}
                        {r.name}
                      </span>
                      <button
                        type="button"
                        className="shrink-0 text-[11px] text-subtle hover:text-fg hover:underline"
                        onClick={() => setRow(r.key, { elective: false, include: true })}
                      >
                        Zorunlu ders
                      </button>
                    </div>
                  ))}
                </div>
              )}
            </div>
            {required.some((r) => matchOf(r)) && (
              <label className="flex items-center gap-2 text-xs text-body">
                <input type="checkbox" checked={replace} onChange={(e) => setReplace(e.target.checked)} />
                Mevcut derslerin saatlerini PDF’tekilerle değiştir (kapalıysa eklenir)
              </label>
            )}
          </>
        )}

        {warnings.length > 0 && !error && <p className="text-[11px] text-amber-300/90">{warnings.join(' ')}</p>}
        {error && <p className="text-xs text-rose-400">{error}</p>}

        <div className="flex justify-end gap-2">
          <button type="button" className={btnSecondary} onClick={onClose}>Vazgeç</button>
          {rows && (
            <button type="button" className={btnPrimary} disabled={selected.length === 0} onClick={handleImport}>
              {selected.length} dersi ekle
            </button>
          )}
        </div>
        {rows && <p className="text-[11px] text-muted">Yeni dersler varsayılan kredi/AKTS ve vize-final ağırlıklarıyla eklenir; ders kartından düzenleyebilirsiniz.</p>}
      </div>
    </Modal>
  );
}

