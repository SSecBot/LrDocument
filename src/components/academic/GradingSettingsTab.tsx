'use client';

import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { AcademicData, GradingSystem, LetterGrade } from '@/lib/academic/types';
import { GENERAL_GRADING, KTU_GRADING, newId } from '@/lib/academic/grading';
import { Card, CardHeader, btnGhost, btnSecondary, inputCls, labelCls } from './ui';

interface Props {
  data: AcademicData;
  update: (fn: (d: AcademicData) => AcademicData) => void;
  university: string;
}

type LetterRule = 'pass' | 'conditional' | 'fail';

export function GradingSettingsTab({ data, update, university }: Props) {
  const g = data.grading;

  const setGrading = (patch: Partial<GradingSystem>) =>
    update((d) => ({ ...d, grading: { ...d.grading, ...patch, preset: patch.preset ?? 'ozel' } }));

  const applyPreset = (preset: 'ktu' | 'genel') => {
    if (!confirm('Not sistemi seçilen ön ayarla değiştirilecek. Devam edilsin mi?')) return;
    const base = preset === 'ktu' ? KTU_GRADING : GENERAL_GRADING;
    update((d) => ({
      ...d,
      grading: { ...structuredClone(base), universityName: preset === 'ktu' ? base.universityName : university || d.grading.universityName },
    }));
  };

  const ruleOf = (letter: string): LetterRule =>
    g.failingLetters.includes(letter) ? 'fail' : g.conditionalLetters.includes(letter) ? 'conditional' : 'pass';

  const setRule = (letter: string, rule: LetterRule) =>
    setGrading({
      failingLetters: rule === 'fail' ? [...new Set([...g.failingLetters, letter])] : g.failingLetters.filter((l) => l !== letter),
      conditionalLetters:
        rule === 'conditional' ? [...new Set([...g.conditionalLetters, letter])] : g.conditionalLetters.filter((l) => l !== letter),
    });

  const setLetter = (index: number, patch: Partial<LetterGrade>) => {
    const old = g.letters[index];
    const letters = g.letters.map((l, i) => (i === index ? { ...l, ...patch } : l));
    // Keep pass/fail rules attached when a letter is renamed.
    const rename = (list: string[]) => (patch.letter ? list.map((x) => (x === old.letter ? patch.letter! : x)) : list);
    setGrading({ letters, failingLetters: rename(g.failingLetters), conditionalLetters: rename(g.conditionalLetters) });
  };

  const sortedLetters = () => [...g.letters].sort((a, b) => b.min - a.min);

  const num = (v: string, min: number, max: number) => Math.min(max, Math.max(min, Number(v) || 0));

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader title="Not sistemi" />
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-subtle mr-1">Ön ayar:</span>
            <button className={`${btnSecondary} ${g.preset === 'ktu' ? 'border-line-strong bg-surface-3 text-fg' : ''}`} onClick={() => applyPreset('ktu')}>
              KTÜ
            </button>
            <button className={`${btnSecondary} ${g.preset === 'genel' ? 'border-line-strong bg-surface-3 text-fg' : ''}`} onClick={() => applyPreset('genel')}>
              Genel (mutlak sistem)
            </button>
            {g.preset === 'ozel' && <span className="text-[11px] px-2 py-1 rounded bg-surface-3 text-subtle">Özel ayarlar</span>}
          </div>
          {g.relativeNote && <p className="text-[11px] text-amber-300/80">{g.relativeNote}</p>}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>Üniversite</label>
              <input className={inputCls} value={g.universityName} onChange={(e) => setGrading({ universityName: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>Varsayılan final ağırlığı (%)</label>
              <input type="number" className={inputCls} value={g.finalWeight} onChange={(e) => setGrading({ finalWeight: num(e.target.value, 0, 100) })} />
            </div>
            <div>
              <label className={labelCls}>Final / bütünleme barajı</label>
              <input type="number" className={inputCls} value={g.minFinal} onChange={(e) => setGrading({ minFinal: num(e.target.value, 0, 100) })} />
            </div>
            <div>
              <label className={labelCls}>Bu ortalamanın altı FF</label>
              <input type="number" className={inputCls} value={g.failBelowAverage} onChange={(e) => setGrading({ failBelowAverage: num(e.target.value, 0, 100) })} />
            </div>
            <div>
              <label className={labelCls}>Teorik devam şartı (%)</label>
              <input type="number" className={inputCls} value={g.attendanceTheory} onChange={(e) => setGrading({ attendanceTheory: num(e.target.value, 0, 100) })} />
            </div>
            <div>
              <label className={labelCls}>Uygulama devam şartı (%)</label>
              <input type="number" className={inputCls} value={g.attendancePractice} onChange={(e) => setGrading({ attendancePractice: num(e.target.value, 0, 100) })} />
            </div>
            <div>
              <label className={labelCls}>Dönem hafta sayısı</label>
              <input type="number" className={inputCls} value={g.weeksPerTerm} onChange={(e) => setGrading({ weeksPerTerm: Math.round(num(e.target.value, 1, 30)) })} />
            </div>
            <div>
              <label className={labelCls}>Ortalama hesabı</label>
              <select className={inputCls} value={g.gpaBasis} onChange={(e) => setGrading({ gpaBasis: e.target.value as GradingSystem['gpaBasis'] })}>
                <option value="ects">AKTS ile</option>
                <option value="credit">Yerel kredi ile</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Şartlı geçme için dönem ort.</label>
              <input type="number" step={0.05} className={inputCls} value={g.conditionalGpa} onChange={(e) => setGrading({ conditionalGpa: num(e.target.value, 0, 4) })} />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title="Harf notu tablosu"
          action={
            <button
              className={btnGhost}
              onClick={() => setGrading({ letters: [...g.letters, { letter: 'XX', min: 0, point: 0 }] })}
              disabled={g.letters.length >= 15}
            >
              <Plus className="w-3.5 h-3.5" /> Satır
            </button>
          }
        />
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-sm min-w-[420px]">
            <thead>
              <tr className="text-[11px] text-muted text-left">
                <th className="pb-2 font-medium">Harf</th>
                <th className="pb-2 font-medium">En düşük puan</th>
                <th className="pb-2 font-medium">Katsayı</th>
                <th className="pb-2 font-medium">Durum</th>
                <th />
              </tr>
            </thead>
            <tbody>
              {sortedLetters().map((l) => {
                const index = g.letters.indexOf(l);
                return (
                  <tr key={`${l.letter}-${index}`}>
                    <td className="py-1 pr-2 w-20">
                      <input className={inputCls} maxLength={3} value={l.letter} onChange={(e) => setLetter(index, { letter: e.target.value.trim().toUpperCase() || l.letter })} />
                    </td>
                    <td className="py-1 pr-2 w-28">
                      <input type="number" min={0} max={100} className={inputCls} value={l.min} onChange={(e) => setLetter(index, { min: num(e.target.value, 0, 100) })} />
                    </td>
                    <td className="py-1 pr-2 w-24">
                      <input type="number" min={0} max={5} step={0.05} className={inputCls} value={l.point} onChange={(e) => setLetter(index, { point: num(e.target.value, 0, 5) })} />
                    </td>
                    <td className="py-1 pr-2">
                      <select className={inputCls} value={ruleOf(l.letter)} onChange={(e) => setRule(l.letter, e.target.value as LetterRule)}>
                        <option value="pass">Geçer</option>
                        <option value="conditional">Şartlı geçer</option>
                        <option value="fail">Kalır</option>
                      </select>
                    </td>
                    <td className="py-1 w-9">
                      <button
                        className="w-9 h-9 flex items-center justify-center text-muted hover:text-rose-400 disabled:opacity-30"
                        disabled={g.letters.length <= 2}
                        onClick={() => setGrading({ letters: g.letters.filter((_, i) => i !== index) })}
                        aria-label={`${l.letter} satırını sil`}
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </Card>

      <TermsCard data={data} update={update} />
    </div>
  );
}

function TermsCard({ data, update }: Pick<Props, 'data' | 'update'>) {
  return (
    <Card>
      <CardHeader
        title="Dönemler"
        action={
          <button
            className={btnGhost}
            disabled={data.terms.length >= 20}
            onClick={() => {
              const name = prompt('Dönem adı (ör. 2026-2027 Bahar)');
              if (!name?.trim()) return;
              const term = { id: newId(), name: name.trim().slice(0, 40) };
              update((d) => ({ ...d, terms: [...d.terms, term], activeTermId: term.id }));
            }}
          >
            <Plus className="w-3.5 h-3.5" /> Dönem
          </button>
        }
      />
      <ul className="divide-y divide-line">
        {data.terms.map((t, i) => {
          const count = data.courses.filter((c) => c.termId === t.id).length;
          return (
            <li key={t.id} className="px-4 py-2 flex items-center gap-2">
              <span className="text-[11px] text-muted w-5 tabular-nums">{i + 1}.</span>
              <input
                className={`${inputCls} flex-1`}
                value={t.name}
                onChange={(e) => update((d) => ({ ...d, terms: d.terms.map((x) => (x.id === t.id ? { ...x, name: e.target.value.slice(0, 40) || x.name } : x)) }))}
              />
              <span className="text-[11px] text-muted whitespace-nowrap">{count} ders</span>
              <button
                className="w-9 h-9 flex items-center justify-center text-muted hover:text-rose-400 disabled:opacity-30"
                disabled={count > 0 || data.terms.length <= 1}
                title={count > 0 ? 'Önce dönemdeki dersleri silin' : 'Dönemi sil'}
                onClick={() =>
                  update((d) => {
                    const terms = d.terms.filter((x) => x.id !== t.id);
                    return { ...d, terms, activeTermId: d.activeTermId === t.id ? terms[terms.length - 1].id : d.activeTermId };
                  })
                }
                aria-label="Dönemi sil"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="px-4 pb-3 text-[11px] text-muted">Dönemler eskiden yeniye sıralı olmalı; tekrar alınan derslerde sonraki dönemin notu geçerli sayılır.</p>
    </Card>
  );
}
