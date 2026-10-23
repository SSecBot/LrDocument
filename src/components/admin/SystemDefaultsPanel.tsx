'use client';

import { responseError, thrownError } from '@/lib/errors';
import React, { useState } from 'react';
import { RotateCcw, Save } from 'lucide-react';
import { applySystemSettings, useAppStore } from '@/store/useAppStore';
import { DEFAULT_SYSTEM_SETTINGS, resolveSystemSettings, type SystemSettings } from '@/lib/systemSettings';

type NumberField = { kind: 'number'; path: string; label: string; unit?: string; step?: number; min?: number; max?: number };
type SelectField = { kind: 'select'; path: string; label: string; options: [string, string][] };
type TimeField = { kind: 'time'; path: string; label: string };
type BoolField = { kind: 'bool'; path: string; label: string };
type Field = NumberField | SelectField | TimeField | BoolField;

const PRESET_FIELDS = (preset: 'ktu' | 'genel'): Field[] => [
  { kind: 'number', path: `academic.${preset}.finalWeight`, label: 'Final ağırlığı', unit: '%', min: 0, max: 100 },
  { kind: 'number', path: `academic.${preset}.minFinal`, label: 'Final / bütünleme barajı', min: 0, max: 100 },
  { kind: 'number', path: `academic.${preset}.failBelowAverage`, label: 'Bu ortalamanın altı FF', min: 0, max: 100 },
  { kind: 'number', path: `academic.${preset}.attendanceTheory`, label: 'Teorik devam şartı', unit: '%', min: 0, max: 100 },
  { kind: 'number', path: `academic.${preset}.attendancePractice`, label: 'Uygulama devam şartı', unit: '%', min: 0, max: 100 },
  { kind: 'number', path: `academic.${preset}.weeksPerTerm`, label: 'Dönem hafta sayısı', min: 1, max: 30, step: 1 },
];

const GROUPS: { title: string; hint?: string; fields: Field[] }[] = [
  {
    title: 'Fiyatlar',
    hint: 'Açılış sayfası, kayıt formu ve hesap sayfasında gösterilir.',
    fields: [
      { kind: 'number', path: 'pricing.monthly', label: 'Aylık plan', unit: 'TL', step: 1, min: 0 },
      { kind: 'number', path: 'pricing.lifetime', label: 'Ömür boyu plan', unit: 'TL', step: 1, min: 0 },
      { kind: 'number', path: 'pricing.studentDiscountPercent', label: 'Öğrenci indirimi', unit: '%', min: 0, max: 100 },
      { kind: 'number', path: 'pricing.corporatePercent', label: 'Kurumsal: kişi başı normal fiyatın', unit: '%', min: 0, max: 100 },
      { kind: 'number', path: 'pricing.corporateMinSeats', label: 'Kurumsal en az kişi', step: 1, min: 1 },
      { kind: 'number', path: 'pricing.corporateMaxSeats', label: 'Kurumsal en fazla kişi', step: 1, min: 1 },
    ],
  },
  {
    title: 'Finans',
    hint: 'Kredi / borç eklenirken öne doldurulan oranlar; kullanıcı her borç için değiştirebilir.',
    fields: [
      { kind: 'number', path: 'finance.loanMonthlyInterestRate', label: 'Aylık faiz oranı', unit: '%', step: 0.01, min: 0, max: 50 },
      { kind: 'number', path: 'finance.loanMinPaymentRate', label: 'Asgari ödeme oranı', unit: '%', step: 0.1, min: 0, max: 100 },
      { kind: 'number', path: 'finance.exchangeMarkupTRY', label: 'Döviz kur marjı', unit: 'TL', step: 0.01, min: 0 },
      { kind: 'select', path: 'finance.defaultCurrency', label: 'Varsayılan para birimi', options: [['TRY', 'TL'], ['USD', 'USD'], ['EUR', 'EUR']] },
    ],
  },
  {
    title: 'Ders takibi — genel',
    fields: [
      { kind: 'number', path: 'academic.tomorrowFromHour', label: 'Yarının programı şu saatten itibaren', unit: ':00', step: 1, min: 0, max: 23 },
      { kind: 'number', path: 'academic.defaultCredit', label: 'Yeni ders kredisi', min: 0, max: 30 },
      { kind: 'number', path: 'academic.defaultEcts', label: 'Yeni ders AKTS', min: 0, max: 60 },
    ],
  },
  { title: 'Not sistemi — KTÜ', hint: 'Yeni öğrencilerde ve ön ayar seçildiğinde kullanılır.', fields: PRESET_FIELDS('ktu') },
  { title: 'Not sistemi — diğer üniversiteler', fields: PRESET_FIELDS('genel') },
  {
    title: 'Takvim ve görevler',
    fields: [
      { kind: 'number', path: 'calendar.defaultEventDurationMinutes', label: 'Etkinlik süresi', unit: 'dk', step: 5, min: 5 },
      { kind: 'time', path: 'calendar.defaultEventTime', label: 'Etkinlik saati' },
      { kind: 'select', path: 'tasks.defaultPriority', label: 'Görev önceliği', options: [['yuksek', 'Yüksek'], ['orta', 'Orta'], ['dusuk', 'Düşük']] },
    ],
  },
  {
    title: 'Güvenlik',
    hint: 'Şifre kuralı yeni ve değiştirilen şifrelere uygulanır. Oturum süresi yeni girişlerde geçerli olur. E-posta doğrulaması açıkken doğrulanmamış hesaplar girişte e-postalarına gelen kodu girer (yöneticiler hariç).',
    fields: [
      { kind: 'bool', path: 'security.requireEmailVerification', label: 'Girişte e-posta doğrulaması zorunlu' },
      { kind: 'number', path: 'security.passwordMinLength', label: 'En kısa şifre', unit: 'karakter', step: 1, min: 8, max: 64 },
      { kind: 'number', path: 'security.sessionDays', label: 'Oturum süresi', unit: 'gün', step: 1, min: 1, max: 90 },
    ],
  },
];

function getAt(obj: unknown, path: string): unknown {
  return path.split('.').reduce<unknown>((o, k) => (o && typeof o === 'object' ? (o as Record<string, unknown>)[k] : undefined), obj);
}

function setAt<T>(obj: T, path: string, value: unknown): T {
  const keys = path.split('.');
  const clone = structuredClone(obj) as Record<string, unknown>;
  let cur = clone;
  for (const k of keys.slice(0, -1)) cur = cur[k] as Record<string, unknown>;
  cur[keys[keys.length - 1]] = value;
  return clone as T;
}

const inputCls = 'w-full h-9 bg-app border border-line rounded-md px-2.5 text-sm text-fg focus:outline-none focus:border-line-strong';

export function SystemDefaultsPanel() {
  const { systemSettings, addToast } = useAppStore();
  const [draft, setDraft] = useState<SystemSettings>(systemSettings);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const dirty = JSON.stringify(draft) !== JSON.stringify(systemSettings);

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ settings: draft }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(responseError(res, data, 'Kaydedilemedi.'));
      const saved = resolveSystemSettings(data.settings);
      setDraft(saved);
      // Every open screen picks up the new defaults right away.
      applySystemSettings(saved);
      addToast({ type: 'success', title: 'Varsayılanlar kaydedildi', message: 'Yeni değerler tüm kullanıcılara uygulanır.' });
    } catch (err) {
      setError(thrownError(err, 'Kaydedilemedi.'));
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <p className="text-xs text-muted max-w-xl">
          Sistem genelindeki varsayılan değerler. Mevcut kayıtları değiştirmez; yeni oluşturulan kayıtlarda ve formlarda kullanılır.
        </p>
        <div className="flex gap-2">
          <button
            onClick={() => setDraft(DEFAULT_SYSTEM_SETTINGS)}
            className="h-9 px-3 text-xs text-body hover:text-fg bg-surface-2 hover:bg-surface-3 border border-line rounded-md inline-flex items-center gap-1.5"
          >
            <RotateCcw className="w-3.5 h-3.5" /> Fabrika değerleri
          </button>
          <button
            onClick={save}
            disabled={!dirty || saving}
            className="h-9 px-4 text-xs text-white bg-brand hover:bg-brand-hover rounded-md inline-flex items-center gap-1.5 disabled:opacity-50"
          >
            <Save className="w-3.5 h-3.5" /> {saving ? 'Kaydediliyor…' : 'Kaydet'}
          </button>
        </div>
      </div>
      {error && <p className="text-xs text-rose-300" role="alert">{error}</p>}

      <div className="grid gap-4 lg:grid-cols-2">
        {GROUPS.map((g) => (
          <section key={g.title} className="rounded-lg border border-line bg-surface">
            <header className="px-4 py-3 border-b border-line">
              <h3 className="text-sm font-semibold text-fg">{g.title}</h3>
              {g.hint && <p className="text-[11px] text-muted mt-0.5">{g.hint}</p>}
            </header>
            <div className="p-4 grid gap-3 sm:grid-cols-2">
              {g.fields.map((f) => {
                const value = getAt(draft, f.path);
                return (
                  <label key={f.path} className="block">
                    <span className="block text-[11px] text-subtle mb-1">
                      {f.label}
                      {f.kind === 'number' && f.unit ? ` (${f.unit})` : ''}
                    </span>
                    {f.kind === 'number' ? (
                      <input
                        type="number"
                        className={inputCls}
                        value={Number.isFinite(value as number) ? (value as number) : ''}
                        step={f.step ?? 0.5}
                        min={f.min}
                        max={f.max}
                        onChange={(e) => setDraft((d) => setAt(d, f.path, e.target.value === '' ? NaN : Number(e.target.value)))}
                      />
                    ) : f.kind === 'bool' ? (
                      <select className={inputCls} value={value ? 'true' : 'false'} onChange={(e) => setDraft((d) => setAt(d, f.path, e.target.value === 'true'))}>
                        <option value="true">Açık</option>
                        <option value="false">Kapalı</option>
                      </select>
                    ) : f.kind === 'time' ? (
                      <input type="time" className={inputCls} value={String(value ?? '')} onChange={(e) => setDraft((d) => setAt(d, f.path, e.target.value))} />
                    ) : (
                      <select className={inputCls} value={String(value ?? '')} onChange={(e) => setDraft((d) => setAt(d, f.path, e.target.value))}>
                        {f.options.map(([v, l]) => (
                          <option key={v} value={v}>
                            {l}
                          </option>
                        ))}
                      </select>
                    )}
                  </label>
                );
              })}
            </div>
          </section>
        ))}
      </div>
    </div>
  );
}
