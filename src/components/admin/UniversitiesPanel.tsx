'use client';

import React, { useCallback, useEffect, useState } from 'react';
import { CalendarCheck2, CalendarX2, FileUp, Loader2, MapPin, Plus, Search, Trash2, Users } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/ui/Modal';
import { CalendarImportModal } from '@/components/academic/CalendarImportModal';
import { UNIVERSITIES, UNIVERSITY_TYPE_LABEL, type University } from '@/lib/universities';
import { fold } from '@/lib/academic/scheduleParser';
import { currentTermName, GENERAL_GRADING, newId } from '@/lib/academic/grading';
import type { SchoolTerm } from '@/lib/academic/schoolCalendar';
import type { AcademicData, Holiday } from '@/lib/academic/types';
import { formatTurkishDate } from '@/lib/utils';

interface Overview {
  students: Record<string, number>;
  calendars: Record<string, { updatedAt: string; terms: string[]; bundled?: boolean }>;
  unlisted: { name: string; count: number }[];
}

type Filter = 'ogrenci' | 'eksik' | 'yayinda' | 'tumu';
const FILTERS: { id: Filter; label: string }[] = [
  { id: 'ogrenci', label: 'Öğrencisi olanlar' },
  { id: 'eksik', label: 'Takvimi eksik' },
  { id: 'yayinda', label: 'Takvimi yayında' },
  { id: 'tumu', label: 'Tümü' },
];

const field = 'h-9 w-full bg-app border border-line rounded-md px-2.5 text-sm text-fg placeholder-muted focus:outline-none focus:border-line-strong';

/**
 * Yönetici Paneli › Üniversiteler: the 205 universities, how many students each has, and the
 * academic calendar published for it (term dates, exam weeks, holidays). Students of a university
 * receive its calendar in Ders Takibi automatically; they only enter their own course schedule.
 */
export function UniversitiesPanel() {
  const [overview, setOverview] = useState<Overview | null>(null);
  const [query, setQuery] = useState('');
  const [filter, setFilter] = useState<Filter>('ogrenci');
  const [editing, setEditing] = useState<University | null>(null);

  const load = useCallback(async () => {
    const res = await fetch('/api/admin/universities', { cache: 'no-store' }).catch(() => null);
    setOverview(res?.ok ? await res.json() : { students: {}, calendars: {}, unlisted: [] });
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/admin/universities', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => !cancelled && setOverview(json ?? { students: {}, calendars: {}, unlisted: [] }))
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  if (!overview) {
    return (
      <div className="h-40 flex items-center justify-center">
        <Loader2 className="w-5 h-5 text-subtle animate-spin" />
      </div>
    );
  }

  const words = fold(query).split(/\s+/).filter(Boolean);
  const effectiveFilter: Filter = filter === 'ogrenci' && Object.keys(overview.students).length === 0 && !words.length ? 'tumu' : filter;
  const list = UNIVERSITIES.filter((u) => {
    if (words.length && !words.every((w) => fold(`${u.name} ${u.city} ${u.domain ?? ''}`).includes(w))) return false;
    const students = overview.students[u.id] ?? 0;
    const published = !!overview.calendars[u.id];
    if (effectiveFilter === 'ogrenci') return students > 0;
    if (effectiveFilter === 'eksik') return students > 0 && !published;
    if (effectiveFilter === 'yayinda') return published;
    return true;
  }).sort((a, b) => (overview.students[b.id] ?? 0) - (overview.students[a.id] ?? 0) || a.name.localeCompare(b.name, 'tr'));

  const totalPublished = Object.keys(overview.calendars).length;

  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-line bg-surface p-4 text-xs text-subtle leading-relaxed">
        Bir üniversitenin akademik takvimini burada bir kez yayınlayın (PDF’ten okutarak ya da elle): o okulun bütün öğrencilerinin ders takibine dönem
        tarihleri, sınav haftaları ve tatiller otomatik eklenir; öğrenciler yalnızca kendi ders programlarını girer. Öğrencilerin önerdiği takvimler
        Talepler sekmesine düşer. Yayında: <span className="text-fg font-medium">{totalPublished}</span> / {UNIVERSITIES.length} üniversite.
      </div>

      <div className="flex flex-col sm:flex-row gap-2">
        <div className="relative flex-1">
          <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
          <input className={`${field} pl-9 h-10`} placeholder="Üniversite, şehir veya alan adı ara" value={query} onChange={(e) => setQuery(e.target.value)} />
        </div>
        <div className="flex gap-1.5 overflow-x-auto no-scrollbar">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              onClick={() => setFilter(f.id)}
              className={`h-10 px-3 rounded-md text-xs whitespace-nowrap border transition-colors ${
                effectiveFilter === f.id ? 'border-brand bg-brand-soft text-fg' : 'border-line text-subtle hover:text-fg'
              }`}
            >
              {f.label}
            </button>
          ))}
        </div>
      </div>

      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed border-line py-10 text-center text-sm text-muted">Eşleşen üniversite yok.</p>
      ) : (
        <ul className="rounded-lg border border-line bg-surface divide-y divide-line">
          {list.slice(0, 120).map((u) => {
            const cal = overview.calendars[u.id];
            const students = overview.students[u.id] ?? 0;
            return (
              <li key={u.id}>
                <button onClick={() => setEditing(u)} className="w-full text-left px-4 py-3 hover:bg-surface-2 flex items-center gap-3">
                  <span className="min-w-0 flex-1">
                    <span className="block text-sm text-fg truncate">{u.name}</span>
                    <span className="flex items-center gap-1 text-[11px] text-muted">
                      <MapPin className="w-3 h-3" /> {u.city} · {UNIVERSITY_TYPE_LABEL[u.type]}
                    </span>
                  </span>
                  <span className="hidden sm:inline-flex items-center gap-1 text-xs text-subtle tabular-nums w-16 justify-end" title="Öğrenci sayısı">
                    <Users className="w-3.5 h-3.5" /> {students}
                  </span>
                  {cal ? (
                    <span
                      className="text-[11px] px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 inline-flex items-center gap-1 whitespace-nowrap"
                      title={cal.bundled ? 'Okulun resmî sitesinden alınan hazır takvim' : 'Yönetici tarafından yayınlandı'}
                    >
                      <CalendarCheck2 className="w-3 h-3" /> {cal.terms.length} dönem{cal.bundled ? ' · hazır' : ''}
                    </span>
                  ) : (
                    <span className="text-[11px] px-2 py-0.5 rounded-full bg-surface-3 text-muted inline-flex items-center gap-1 whitespace-nowrap">
                      <CalendarX2 className="w-3 h-3" /> takvim yok
                    </span>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}

      {overview.unlisted.length > 0 && (
        <details className="rounded-lg border border-line bg-surface p-4 text-xs">
          <summary className="cursor-pointer text-subtle">Listede olmayan okul yazan öğrenciler ({overview.unlisted.reduce((s, x) => s + x.count, 0)})</summary>
          <ul className="mt-2 space-y-1 text-body">
            {overview.unlisted.map((x) => (
              <li key={x.name}>
                {x.name} <span className="text-muted">· {x.count}</span>
              </li>
            ))}
          </ul>
          <p className="mt-2 text-muted">Bu öğrenciler Ayarlar › Öğrenci bilgileri’nden okullarını listeden seçince takvim alabilir.</p>
        </details>
      )}

      {editing && (
        <CalendarEditor
          university={editing}
          students={overview.students[editing.id] ?? 0}
          onClose={() => setEditing(null)}
          onSaved={load}
        />
      )}
    </div>
  );
}

const emptyHoliday = { name: '', start: '', end: '', kind: 'tatil' as 'tatil' | 'sinav' };

function CalendarEditor({ university, students, onClose, onSaved }: { university: University; students: number; onClose: () => void; onSaved: () => void }) {
  const { addToast } = useAppStore();
  const [terms, setTerms] = useState<SchoolTerm[] | null>(null);
  const [sourceUrl, setSourceUrl] = useState('');
  const [published, setPublished] = useState<string | null>(null);
  const [importOpen, setImportOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [drafts, setDrafts] = useState<Record<string, typeof emptyHoliday>>({});

  useEffect(() => {
    let cancelled = false;
    fetch(`/api/admin/universities/${university.id}`, { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((json) => {
        if (cancelled) return;
        setTerms(json?.calendar?.terms ?? []);
        setSourceUrl(json?.calendar?.sourceUrl ?? '');
        setPublished(json?.calendar?.updatedAt ?? null);
      })
      .catch(() => !cancelled && setTerms([]));
    return () => {
      cancelled = true;
    };
  }, [university.id]);

  const setTerm = (id: string, patch: Partial<SchoolTerm>) => setTerms((ts) => ts!.map((t) => (t.id === id ? { ...t, ...patch } : t)));

  // The PDF reader of Ders Takibi works on AcademicData; give it the edited terms and take them back.
  const asData: AcademicData = {
    version: 1,
    grading: GENERAL_GRADING,
    terms: (terms ?? []).map((t) => ({ id: t.id, name: t.name, start: t.start, end: t.end, holidays: t.holidays })),
    activeTermId: null,
    courses: [],
    exams: [],
  };
  const fromImport = (fn: (d: AcademicData) => AcademicData) => {
    const next = fn(asData);
    setTerms(next.terms.map((t) => ({ id: t.id, name: t.name, start: t.start, end: t.end, holidays: t.holidays ?? [] })));
  };

  const save = async () => {
    setBusy(true);
    setError(null);
    try {
      const res = await fetch(`/api/admin/universities/${university.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ terms, sourceUrl }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || 'Kaydedilemedi.');
      addToast({ type: 'success', title: 'Takvim yayınlandı', message: `${university.name} öğrencilerinin ders takibine eklenecek.` });
      onSaved();
      onClose();
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setBusy(false);
    }
  };

  const unpublish = async () => {
    if (!confirm('Takvim yayından kaldırılsın mı? Öğrencilere daha önce eklenen tarihler silinmez.')) return;
    setBusy(true);
    await fetch(`/api/admin/universities/${university.id}`, { method: 'DELETE' }).catch(() => null);
    setBusy(false);
    onSaved();
    onClose();
  };

  const addHoliday = (termId: string) => {
    const d = drafts[termId] ?? emptyHoliday;
    if (!d.start) return setError('Tatil / sınav için başlangıç tarihi girin.');
    const end = d.end || d.start;
    if (end < d.start) return setError('Bitiş tarihi başlangıçtan önce olamaz.');
    setError(null);
    const t = terms!.find((x) => x.id === termId)!;
    const h: Holiday = { id: newId(), name: (d.name.trim() || (d.kind === 'sinav' ? 'Sınav haftası' : 'Tatil')).slice(0, 80), start: d.start, end, kind: d.kind };
    setTerm(termId, { holidays: [...t.holidays, h].sort((a, b) => a.start.localeCompare(b.start)).slice(0, 60) });
    setDrafts((x) => ({ ...x, [termId]: emptyHoliday }));
  };

  return (
    <Modal
      isOpen
      onClose={onClose}
      title={university.name}
      subtitle={`${university.city} · ${students} öğrenci${published ? ` · son yayın ${formatTurkishDate(published.slice(0, 10))}` : ' · takvim yayınlanmadı'}`}
      maxWidth="max-w-3xl"
    >
      {!terms ? (
        <div className="h-32 flex items-center justify-center">
          <Loader2 className="w-5 h-5 text-subtle animate-spin" />
        </div>
      ) : (
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2">
            <button type="button" onClick={() => setImportOpen(true)} className="h-9 px-3 rounded-md border border-line-strong text-body hover:bg-surface-2 text-xs inline-flex items-center gap-1.5">
              <FileUp className="w-3.5 h-3.5" /> Akademik takvim PDF’inden oku
            </button>
            <button
              type="button"
              onClick={() => setTerms((ts) => [...ts!, { id: newId(), name: currentTermName(), holidays: [] }].slice(0, 12))}
              className="h-9 px-3 rounded-md border border-line text-subtle hover:text-fg hover:bg-surface-2 text-xs inline-flex items-center gap-1.5"
            >
              <Plus className="w-3.5 h-3.5" /> Dönem ekle
            </button>
          </div>

          {terms.length === 0 && (
            <p className="rounded-lg border border-dashed border-line py-8 text-center text-xs text-muted">
              Henüz dönem yok. Okulun akademik takvim PDF’ini okutun ya da dönemi elle ekleyin.
            </p>
          )}

          {terms.map((t) => {
            const d = drafts[t.id] ?? emptyHoliday;
            return (
              <section key={t.id} className="rounded-lg border border-line p-3 space-y-3">
                <div className="grid grid-cols-2 sm:grid-cols-[1fr_150px_150px_auto] gap-2 items-end">
                  <label className="col-span-2 sm:col-span-1 block">
                    <span className="block text-[11px] text-muted mb-1">Dönem adı (öğrencideki dönemle eşleşir)</span>
                    <input className={field} value={t.name} maxLength={40} onChange={(e) => setTerm(t.id, { name: e.target.value })} placeholder="2026-2027 Güz" />
                  </label>
                  <label className="block">
                    <span className="block text-[11px] text-muted mb-1">Derslerin başlangıcı</span>
                    <input type="date" className={field} value={t.start ?? ''} onChange={(e) => setTerm(t.id, { start: e.target.value || undefined })} />
                  </label>
                  <label className="block">
                    <span className="block text-[11px] text-muted mb-1">Derslerin bitişi</span>
                    <input type="date" className={field} value={t.end ?? ''} min={t.start} onChange={(e) => setTerm(t.id, { end: e.target.value || undefined })} />
                  </label>
                  <button
                    type="button"
                    onClick={() => setTerms((ts) => ts!.filter((x) => x.id !== t.id))}
                    className="col-span-2 sm:col-span-1 h-9 px-2 rounded-md text-rose-300 hover:bg-rose-500/10 text-xs inline-flex items-center justify-center gap-1"
                    aria-label={`${t.name} dönemini kaldır`}
                  >
                    <Trash2 className="w-3.5 h-3.5" /> <span className="sm:hidden">Dönemi kaldır</span>
                  </button>
                </div>

                {t.holidays.length > 0 && (
                  <ul className="divide-y divide-line rounded-md border border-line text-xs">
                    {t.holidays.map((h) => (
                      <li key={h.id} className="px-2.5 py-1.5 flex items-center gap-2">
                        <span className="flex-1 min-w-0 truncate text-body">{h.name}</span>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded whitespace-nowrap ${h.kind === 'sinav' ? 'bg-sky-500/15 text-sky-300' : 'bg-surface-3 text-muted'}`}>
                          {h.kind === 'sinav' ? 'sınav' : 'tatil'}
                        </span>
                        <span className="text-muted whitespace-nowrap">
                          {formatTurkishDate(h.start)}
                          {h.end !== h.start ? ` – ${formatTurkishDate(h.end)}` : ''}
                        </span>
                        <button
                          type="button"
                          className="w-7 h-7 flex items-center justify-center text-muted hover:text-rose-400"
                          onClick={() => setTerm(t.id, { holidays: t.holidays.filter((x) => x.id !== h.id) })}
                          aria-label={`${h.name} kaldır`}
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}

                <div className="grid grid-cols-2 sm:grid-cols-[1fr_110px_130px_130px_auto] gap-2 items-end">
                  <input className={`${field} col-span-2 sm:col-span-1`} placeholder="Sınav haftası / tatil adı" value={d.name} maxLength={80} onChange={(e) => setDrafts((x) => ({ ...x, [t.id]: { ...d, name: e.target.value } }))} />
                  <select className={field} value={d.kind} onChange={(e) => setDrafts((x) => ({ ...x, [t.id]: { ...d, kind: e.target.value as 'tatil' | 'sinav' } }))} aria-label="Tür">
                    <option value="sinav">Sınav</option>
                    <option value="tatil">Tatil</option>
                  </select>
                  <input type="date" className={field} value={d.start} onChange={(e) => setDrafts((x) => ({ ...x, [t.id]: { ...d, start: e.target.value } }))} aria-label="Başlangıç" />
                  <input type="date" className={field} value={d.end} min={d.start} onChange={(e) => setDrafts((x) => ({ ...x, [t.id]: { ...d, end: e.target.value } }))} aria-label="Bitiş (tek gün ise boş)" />
                  <button type="button" onClick={() => addHoliday(t.id)} className="h-9 px-3 rounded-md border border-line text-subtle hover:text-fg text-xs inline-flex items-center justify-center gap-1">
                    <Plus className="w-3.5 h-3.5" /> Ekle
                  </button>
                </div>
              </section>
            );
          })}

          <label className="block">
            <span className="block text-[11px] text-muted mb-1">Kaynak (okulun takvim sayfası, isteğe bağlı)</span>
            <input className={field} type="url" value={sourceUrl} maxLength={300} placeholder={university.domain ? `https://www.${university.domain}/...` : 'https://'} onChange={(e) => setSourceUrl(e.target.value)} />
          </label>
          <p className="text-[11px] text-muted">Milli ve dinî bayramlar her öğrencide otomatik hesaplanır; burada yalnızca okulun kendi tarihlerini girin.</p>
          {error && <p className="text-xs text-rose-400">{error}</p>}

          <div className="modal-actions flex items-center justify-end gap-2">
            {published && (
              <button type="button" disabled={busy} onClick={unpublish} className="modal-actions-start sm:mr-auto h-10 px-3 rounded-md text-sm text-rose-300 hover:bg-rose-500/10 inline-flex items-center gap-1.5">
                <Trash2 className="w-4 h-4" /> Yayından kaldır
              </button>
            )}
            <button type="button" onClick={onClose} className="h-10 px-4 rounded-md border border-line text-subtle hover:text-fg text-sm">
              Vazgeç
            </button>
            <button type="button" disabled={busy || terms.length === 0} onClick={save} className="h-10 px-4 rounded-md bg-brand hover:bg-brand-hover text-white text-sm font-medium disabled:opacity-50">
              {busy ? 'Kaydediliyor…' : 'Yayınla'}
            </button>
          </div>
        </div>
      )}
      <CalendarImportModal isOpen={importOpen} onClose={() => setImportOpen(false)} data={asData} update={fromImport} />
    </Modal>
  );
}
