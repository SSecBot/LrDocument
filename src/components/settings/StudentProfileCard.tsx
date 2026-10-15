'use client';

import React, { useEffect, useState } from 'react';
import { CalendarCheck2, ExternalLink, Save } from 'lucide-react';
import { CLASS_YEARS, isAcademicEmail } from '@/lib/studentProfile';
import { UNIVERSITY_TYPE_LABEL } from '@/lib/universities';
import { UniversityPicker } from '@/components/academic/UniversityPicker';
import type { SchoolInfo } from '@/components/academic/useAcademicData';
import { formatTurkishDate } from '@/lib/utils';
import { Message, Panel, fieldCls, labelCls, primaryBtn } from './settingsUi';

interface ProfileForm {
  university: string;
  universityId: string | null;
  studentEmail: string;
  department: string;
  classYear: number;
  studentNo: string;
}

const EMPTY: ProfileForm = { university: '', universityId: null, studentEmail: '', department: '', classYear: 1, studentNo: '' };

/** University (from the catalog), department, class year and student e-mail of a student account. */
export function StudentProfileCard() {
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [school, setSchool] = useState<SchoolInfo | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ kind: 'ok' | 'error'; text: string } | null>(null);

  const load = () =>
    fetch('/api/student', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (json?.profile) {
          setForm({
            university: json.profile.university ?? '',
            universityId: json.profile.universityId ?? null,
            studentEmail: json.profile.studentEmail ?? '',
            department: json.profile.department ?? '',
            classYear: json.profile.classYear ?? 1,
            studentNo: json.profile.studentNo ?? '',
          });
        }
        setSchool(json?.school ?? null);
      });

  useEffect(() => {
    let cancelled = false;
    load().finally(() => {
      if (!cancelled) setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const set = <K extends keyof ProfileForm>(key: K, value: ProfileForm[K]) => setForm((f) => ({ ...f, [key]: value }));

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    if (!isAcademicEmail(form.studentEmail)) {
      setMessage({ kind: 'error', text: 'Öğrenci e-postası üniversite uzantılı olmalıdır (ör. ad@ogr.universite.edu.tr).' });
      return;
    }
    setSaving(true);
    try {
      const res = await fetch('/api/student/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setMessage({ kind: 'error', text: data.error || 'Kaydedilemedi.' });
        return;
      }
      setMessage({ kind: 'ok', text: data.message || 'Kaydedildi.' });
      await load();
    } catch {
      setMessage({ kind: 'error', text: 'Bağlantı hatası oluştu.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Panel title="Öğrenci bilgileri" description="Üniversitenizi listeden seçin: okulunuzun akademik takvimi yayınlandığında ders takibinize otomatik eklenir. Ders programınızı siz girersiniz.">
      {loading ? (
        <div className="h-24 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-line-strong border-t-fg rounded-full animate-spin" />
        </div>
      ) : (
        <div className="space-y-5">
          {school && (
            <div className="rounded-lg border border-line bg-surface-2 px-4 py-3 text-sm space-y-1.5">
              <p className="text-fg font-medium">{school.name}</p>
              <p className="text-xs text-muted">
                {school.city} · {UNIVERSITY_TYPE_LABEL[school.type]} üniversitesi
                {school.domain && (
                  <>
                    {' · '}
                    <a href={`https://www.${school.domain}`} target="_blank" rel="noopener noreferrer" className="text-sky-300 hover:underline inline-flex items-center gap-1">
                      {school.domain} <ExternalLink className="w-3 h-3" />
                    </a>
                  </>
                )}
              </p>
              <p className="text-xs flex items-start gap-1.5">
                <CalendarCheck2 className={`w-3.5 h-3.5 mt-0.5 shrink-0 ${school.calendar ? 'text-emerald-400' : 'text-muted'}`} />
                {school.calendar ? (
                  <span className="text-body">
                    Akademik takvim yayında ({school.calendar.terms.join(', ')}; {formatTurkishDate(school.calendar.updatedAt.slice(0, 10))} güncellemesi). Tarihler ders
                    takibinize otomatik eklendi.
                  </span>
                ) : (
                  <span className="text-muted">
                    Okulunuzun akademik takvimi henüz yayınlanmadı. Ayarlar › Ders takibi › Akademik takvim bölümünden PDF’ini yükleyip okulunuz için önerebilirsiniz.
                  </span>
                )}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
            <div className="sm:col-span-2">
              <label htmlFor="ogrenci-universite" className={labelCls}>Üniversite</label>
              <UniversityPicker
                id="ogrenci-universite"
                required
                inputClassName={fieldCls}
                universityId={form.universityId}
                university={form.university}
                email={form.studentEmail}
                onChange={(v) => setForm((f) => ({ ...f, ...v }))}
              />
            </div>
            <label className="block">
              <span className={labelCls}>Bölüm</span>
              <input className={fieldCls} required value={form.department} onChange={(e) => set('department', e.target.value)} />
            </label>
            <label className="block">
              <span className={labelCls}>Sınıf</span>
              <select className={fieldCls} value={form.classYear} onChange={(e) => set('classYear', Number(e.target.value))}>
                {CLASS_YEARS.map((c) => (
                  <option key={c.value} value={c.value}>{c.label}</option>
                ))}
              </select>
            </label>
            <label className="block">
              <span className={labelCls}>Öğrenci e-postası</span>
              <input className={fieldCls} type="email" required value={form.studentEmail} onChange={(e) => set('studentEmail', e.target.value)} />
              <span className="block text-[11px] text-muted mt-1">Doğrulama ve bu adresle giriş: Ayarlar › Güvenlik.</span>
            </label>
            <label className="block">
              <span className={labelCls}>Öğrenci numarası (isteğe bağlı)</span>
              <input className={fieldCls} value={form.studentNo} maxLength={30} onChange={(e) => set('studentNo', e.target.value)} />
            </label>
            {message && (
              <div className="sm:col-span-2">
                <Message {...message} />
              </div>
            )}
            <div className="sm:col-span-2">
              <button type="submit" disabled={saving} className={primaryBtn}>
                <Save className="w-4 h-4" />
                {saving ? 'Kaydediliyor…' : 'Kaydet'}
              </button>
            </div>
          </form>
        </div>
      )}
    </Panel>
  );
}
