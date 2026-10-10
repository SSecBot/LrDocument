'use client';

import React, { useEffect, useState } from 'react';
import { CheckCircle2, AlertCircle, GraduationCap, Save } from 'lucide-react';
import { CLASS_YEARS, isAcademicEmail } from '@/lib/studentProfile';

interface ProfileForm {
  university: string;
  studentEmail: string;
  department: string;
  classYear: number;
  studentNo: string;
}

const EMPTY: ProfileForm = { university: '', studentEmail: '', department: '', classYear: 1, studentNo: '' };

const inputCls =
  'w-full min-h-[44px] bg-app border border-line rounded-lg px-3.5 py-2.5 text-xs text-white placeholder-neutral-600 focus:outline-none focus:border-emerald-500 transition-colors';
const labelCls = 'block text-[11px] font-semibold uppercase tracking-wider text-neutral-400 mb-2';

/** Lets student accounts edit university, department, class year etc. */
export function StudentProfileCard() {
  const [form, setForm] = useState<ProfileForm>(EMPTY);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'ok' | 'error'; text: string } | null>(null);

  useEffect(() => {
    let cancelled = false;
    fetch('/api/student', { cache: 'no-store' })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (cancelled) return;
        if (json?.profile) {
          setForm({
            university: json.profile.university ?? '',
            studentEmail: json.profile.studentEmail ?? '',
            department: json.profile.department ?? '',
            classYear: json.profile.classYear ?? 1,
            studentNo: json.profile.studentNo ?? '',
          });
        }
      })
      .finally(() => {
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
      setMessage({ type: 'error', text: 'Öğrenci e-postası üniversite uzantılı olmalıdır (ör. ad@ogr.ktu.edu.tr).' });
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
      setMessage(res.ok ? { type: 'ok', text: data.message || 'Kaydedildi.' } : { type: 'error', text: data.error || 'Kaydedilemedi.' });
    } catch {
      setMessage({ type: 'error', text: 'Bağlantı hatası oluştu.' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="p-5 sm:p-6 rounded-xl bg-surface border border-line space-y-5">
      <div className="border-b border-line pb-4">
        <h2 className="text-lg font-bold text-white flex items-center gap-2.5">
          <GraduationCap className="w-5 h-5 text-emerald-400" />
          Öğrenci Bilgileri
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          Üniversite, bölüm ve sınıf bilgileriniz. Yeni döneme geçtiğinizde sınıfınızı buradan güncelleyebilirsiniz.
        </p>
      </div>

      {message && (
        <div
          className={`p-3 rounded-lg text-xs flex items-center gap-2 border ${
            message.type === 'ok' ? 'bg-emerald-500/10 border-emerald-500/30 text-emerald-200' : 'bg-rose-500/10 border-rose-500/30 text-rose-300'
          }`}
        >
          {message.type === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
          {message.text}
        </div>
      )}

      {loading ? (
        <div className="h-24 flex items-center justify-center">
          <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
        </div>
      ) : (
        <form onSubmit={handleSubmit} className="grid grid-cols-1 sm:grid-cols-2 gap-4 max-w-2xl">
          <div className="sm:col-span-2">
            <label className={labelCls}>Üniversite</label>
            <input className={inputCls} required value={form.university} onChange={(e) => set('university', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Bölüm</label>
            <input className={inputCls} required value={form.department} onChange={(e) => set('department', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Sınıf</label>
            <select className={inputCls} value={form.classYear} onChange={(e) => set('classYear', Number(e.target.value))}>
              {CLASS_YEARS.map((c) => (
                <option key={c.value} value={c.value}>{c.label}</option>
              ))}
            </select>
          </div>
          <div>
            <label className={labelCls}>Öğrenci e-postası</label>
            <input className={inputCls} type="email" required value={form.studentEmail} onChange={(e) => set('studentEmail', e.target.value)} />
          </div>
          <div>
            <label className={labelCls}>Öğrenci numarası (isteğe bağlı)</label>
            <input className={inputCls} value={form.studentNo} maxLength={30} onChange={(e) => set('studentNo', e.target.value)} />
          </div>
          <div className="sm:col-span-2">
            <button
              type="submit"
              disabled={saving}
              className="px-5 py-3 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs transition-colors disabled:opacity-50 inline-flex items-center gap-2 min-h-[44px]"
            >
              <Save className="w-4 h-4" />
              {saving ? 'Kaydediliyor…' : 'Öğrenci bilgilerini kaydet'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
}
