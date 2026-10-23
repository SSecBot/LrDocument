'use client';

import { t as tl, tx } from '@/lib/i18n';
import type { AcademicUpdate } from './useAcademicData';
import React from 'react';
import { Plus, Trash2 } from 'lucide-react';
import type { AcademicData, GradingSystem, LetterGrade } from '@/lib/academic/types';
import { gradingForUniversity, KTU_GRADING, newId } from '@/lib/academic/grading';
import { useAppStore } from '@/store/useAppStore';
import { askConfirm, confirmDelete } from '@/components/ui/ConfirmDialog';
import { Card, CardHeader, btnGhost, btnSecondary, inputCls, labelCls } from './ui';

interface Props {
  data: AcademicData;
  update: AcademicUpdate;
  university: string;
}

type LetterRule = 'pass' | 'conditional' | 'fail';

export function GradingSettingsTab({ data, update, university }: Props) {
  const g = data.grading;
  const { systemSettings } = useAppStore();

  const setGrading = (patch: Partial<GradingSystem>, undo?: { title: string; message?: string }) =>
    update((d) => ({ ...d, grading: { ...d.grading, ...patch, preset: patch.preset ?? 'ozel' } }), undo);

  const applyPreset = async (preset: 'ktu' | 'genel') => {
    if (!(await askConfirm({ title: tl('Not sistemi değiştirilsin mi?'), message: tl('Not sistemi seçilen ön ayarla değiştirilecek.'), confirmText: tl('Değiştir'), danger: false }))) return;
    update((d) => ({
      ...d,
      grading: gradingForUniversity(
        preset === 'ktu' ? KTU_GRADING.universityName : university || d.grading.universityName || ' ',
        systemSettings.academic
      ),
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
        <CardHeader title={tl('Not sistemi')} />
        <div className="p-4 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <span className="text-xs text-subtle mr-1">{tl('Ön ayar:')}</span>
            <button className={`${btnSecondary} ${g.preset === 'ktu' ? 'border-line-strong bg-surface-3 text-fg' : ''}`} onClick={() => applyPreset('ktu')}>
              {tl('KTÜ')}
            </button>
            <button className={`${btnSecondary} ${g.preset === 'genel' ? 'border-line-strong bg-surface-3 text-fg' : ''}`} onClick={() => applyPreset('genel')}>
              {tl('Genel (mutlak sistem)')}
            </button>
            {g.preset === 'ozel' && <span className="text-[11px] px-2 py-1 rounded bg-surface-3 text-subtle">{tl('Özel ayarlar')}</span>}
          </div>
          {g.relativeNote && <p className="text-[11px] text-amber-300/80">{tx(g.relativeNote)}</p>}

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="col-span-2">
              <label className={labelCls}>{tl('Üniversite')}</label>
              <input className={inputCls} value={g.universityName} onChange={(e) => setGrading({ universityName: e.target.value })} />
            </div>
            <div>
              <label className={labelCls}>{tl('Varsayılan final ağırlığı (%)')}</label>
              <input type="number" className={inputCls} value={g.finalWeight} onChange={(e) => setGrading({ finalWeight: num(e.target.value, 0, 100) })} />
            </div>
            <div>
              <label className={labelCls}>{tl('Final / bütünleme barajı')}</label>
              <input type="number" className={inputCls} value={g.minFinal} onChange={(e) => setGrading({ minFinal: num(e.target.value, 0, 100) })} />
            </div>
            <div>
              <label className={labelCls}>{tl('Bu ortalamanın altı FF')}</label>
              <input type="number" className={inputCls} value={g.failBelowAverage} onChange={(e) => setGrading({ failBelowAverage: num(e.target.value, 0, 100) })} />
            </div>
            <div>
              <label className={labelCls}>{tl('Teorik devam şartı (%)')}</label>
              <input type="number" className={inputCls} value={g.attendanceTheory} onChange={(e) => setGrading({ attendanceTheory: num(e.target.value, 0, 100) })} />
            </div>
            <div>
              <label className={labelCls}>{tl('Uygulama devam şartı (%)')}</label>
              <input type="number" className={inputCls} value={g.attendancePractice} onChange={(e) => setGrading({ attendancePractice: num(e.target.value, 0, 100) })} />
            </div>
            <div>
              <label className={labelCls}>{tl('Dönem hafta sayısı')}</label>
              <input type="number" className={inputCls} value={g.weeksPerTerm} onChange={(e) => setGrading({ weeksPerTerm: Math.round(num(e.target.value, 1, 30)) })} />
            </div>
            <div>
              <label className={labelCls}>{tl('Ortalama hesabı')}</label>
              <select className={inputCls} value={g.gpaBasis} onChange={(e) => setGrading({ gpaBasis: e.target.value as GradingSystem['gpaBasis'] })}>
                <option value="ects">{tl('AKTS ile')}</option>
                <option value="credit">{tl('Yerel kredi ile')}</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>{tl('Şartlı geçme için dönem ort.')}</label>
              <input type="number" step={0.05} className={inputCls} value={g.conditionalGpa} onChange={(e) => setGrading({ conditionalGpa: num(e.target.value, 0, 4) })} />
            </div>
          </div>
        </div>
      </Card>

      <Card>
        <CardHeader
          title={tl('Harf notu tablosu')}
          action={
            <button
              className={btnGhost}
              onClick={() => setGrading({ letters: [...g.letters, { letter: 'XX', min: 0, point: 0 }] })}
              disabled={g.letters.length >= 15}
            >
              <Plus className="w-3.5 h-3.5" />{' '}{tl('Satır')}
            </button>
          }
        />
        <div className="p-4 overflow-x-auto">
          <table className="w-full text-sm min-w-[420px]">
            <thead>
              <tr className="text-[11px] text-muted text-left">
                <th className="pb-2 font-medium">{tl('Harf')}</th>
                <th className="pb-2 font-medium">{tl('En düşük puan')}</th>
                <th className="pb-2 font-medium">{tl('Katsayı')}</th>
                <th className="pb-2 font-medium">{tl('Durum')}</th>
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
                        <option value="pass">{tl('Geçer')}</option>
                        <option value="conditional">{tl('Şartlı geçer')}</option>
                        <option value="fail">{tl('Kalır')}</option>
                      </select>
                    </td>
                    <td className="py-1 w-9">
                      <button
                        className="w-9 h-9 flex items-center justify-center text-muted hover:text-rose-400 disabled:opacity-30"
                        disabled={g.letters.length <= 2}
                        onClick={async () => (await confirmDelete(`${l.letter} harf notu`)) && setGrading({ letters: g.letters.filter((_, i) => i !== index) }, { title: tl('Harf notu silindi'), message: l.letter })}
                        aria-label={tl('{letter} satırını sil', { letter: l.letter })}
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
        title={tl('Dönemler')}
        action={
          <button
            className={btnGhost}
            disabled={data.terms.length >= 20}
            onClick={() => {
              const name = prompt(tl('Dönem adı (ör. 2026-2027 Bahar)'));
              if (!name?.trim()) return;
              const term = { id: newId(), name: name.trim().slice(0, 40) };
              update((d) => ({ ...d, terms: [...d.terms, term], activeTermId: term.id }));
            }}
          >
            <Plus className="w-3.5 h-3.5" />{' '}{tl('Dönem')}
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
              <span className="text-[11px] text-muted whitespace-nowrap">{tl('{count} ders', { count })}</span>
              <button
                className="w-9 h-9 flex items-center justify-center text-muted hover:text-rose-400 disabled:opacity-30"
                disabled={count > 0 || data.terms.length <= 1}
                title={count > 0 ? tl('Önce dönemdeki dersleri silin') : tl('Dönemi sil')}
                onClick={async () =>
                  (await confirmDelete(tl('"{name}" dönemi', { name: t.name }))) &&
                  update((d) => {
                    const terms = d.terms.filter((x) => x.id !== t.id);
                    return {
                      ...d,
                      terms,
                      exams: (d.exams ?? []).filter((e) => e.termId !== t.id),
                      activeTermId: d.activeTermId === t.id ? terms[terms.length - 1].id : d.activeTermId,
                    };
                  }, { title: tl('Dönem silindi'), message: t.name })
                }
                aria-label={tl('Dönemi sil')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </li>
          );
        })}
      </ul>
      <p className="px-4 pb-3 text-[11px] text-muted">{tl('Dönemler eskiden yeniye sıralı olmalı; tekrar alınan derslerde sonraki dönemin notu geçerli sayılır.')}</p>
    </Card>
  );
}
