'use client';

import React, { useState } from 'react';
import { Target, TrendingUp } from 'lucide-react';
import type { AcademicData } from '@/lib/academic/types';
import { requiredGpaForTarget, summarizeAll } from '@/lib/academic/grading';
import { Card, CardHeader, EmptyState, LetterBadge, Stat, StatusBadge, inputCls, labelCls } from './ui';
import { gpaTone } from './OverviewTab';

interface Props {
  data: AcademicData;
  update: (fn: (d: AcademicData) => AcademicData) => void;
}

function standing(gpa: number | null): string {
  if (gpa === null) return 'Henüz notlandırılmış ders yok';
  if (gpa >= 3.5) return 'Yüksek onur düzeyi';
  if (gpa >= 3.0) return 'Onur düzeyi';
  if (gpa >= 2.0) return 'Başarılı';
  if (gpa >= 1.8) return 'Sınırda — 2.00 altında mezuniyet yapılamaz';
  return 'Başarısız durum — üst dönem dersi alma kısıtı olabilir';
}

export function AnalysisTab({ data, update }: Props) {
  const g = data.grading;
  const all = summarizeAll(data);
  const basis = g.gpaBasis === 'ects' ? 'AKTS' : 'kredi';
  const [upcoming, setUpcoming] = useState(30);
  const target = data.targetGpa ?? 3.0;
  const needed = requiredGpaForTarget(all.gpa, all.gradedWeight, target, upcoming);

  const retakes = all.terms.flatMap((t) =>
    t.courses.filter((c) => c.finalStatus === 'kaldi' || c.finalStatus === 'devamsiz').map((c) => ({ ...c, term: t.term }))
  );
  // Only courses not passed in a later term need to be retaken.
  const passedCodes = new Set(
    all.terms.flatMap((t) => t.courses.filter((c) => c.finalStatus === 'gecti').map((c) => c.course.code.toLocaleUpperCase('tr-TR')))
  );
  const openRetakes = retakes.filter((r) => !r.course.code || !passedCodes.has(r.course.code.toLocaleUpperCase('tr-TR')));

  const letterOrder = [...g.letters.map((l) => l.letter), 'D'];
  const maxCount = Math.max(1, ...Object.values(all.letterCounts));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-2">
        <Stat label="Genel ortalama (AGNO)" value={all.gpa?.toFixed(2) ?? '—'} hint={standing(all.gpa)} tone={gpaTone(all.gpa)} />
        <Stat label={`Notlanan ${basis}`} value={all.gradedWeight} hint="ortalamaya katılan" />
        <Stat label={`Tamamlanan ${basis}`} value={all.earnedWeight} hint="başarıyla geçilen" />
        <Stat label="Tekrar edilecek" value={openRetakes.length} hint="ders" tone={openRetakes.length ? 'bad' : 'good'} />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader title="Dönemler" icon={<TrendingUp className="w-4 h-4 text-subtle" />} />
          <table className="w-full text-sm">
            <thead>
              <tr className="text-[11px] text-muted text-left">
                <th className="px-4 py-2 font-medium">Dönem</th>
                <th className="px-2 py-2 font-medium text-right">Ders</th>
                <th className="px-2 py-2 font-medium text-right">{basis}</th>
                <th className="px-4 py-2 font-medium text-right">ANO</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-line">
              {all.terms.map((t) => (
                <tr key={t.term.id}>
                  <td className="px-4 py-2 text-body">{t.term.name}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-subtle">{t.courses.length}</td>
                  <td className="px-2 py-2 text-right tabular-nums text-subtle">{t.totalWeight}</td>
                  <td className={`px-4 py-2 text-right tabular-nums font-semibold ${t.gpa === null ? 'text-muted' : t.gpa >= 2 ? 'text-fg' : 'text-rose-400'}`}>
                    {t.gpa?.toFixed(2) ?? '—'}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </Card>

        <Card>
          <CardHeader title="Harf notu dağılımı" />
          {Object.keys(all.letterCounts).length === 0 ? (
            <EmptyState title="Notlandırılmış ders yok" />
          ) : (
            <div className="p-4 space-y-1.5">
              {letterOrder
                .filter((l) => all.letterCounts[l])
                .map((l) => (
                  <div key={l} className="flex items-center gap-3 text-xs">
                    <span className="w-7 text-subtle font-medium">{l}</span>
                    <div className="flex-1 h-2 rounded-full bg-surface-3 overflow-hidden">
                      <div
                        className={`h-full ${g.failingLetters.includes(l) || l === 'D' ? 'bg-rose-500' : g.conditionalLetters.includes(l) ? 'bg-amber-500' : 'bg-emerald-500'}`}
                        style={{ width: `${(all.letterCounts[l] / maxCount) * 100}%` }}
                      />
                    </div>
                    <span className="w-5 text-right tabular-nums text-subtle">{all.letterCounts[l]}</span>
                  </div>
                ))}
            </div>
          )}
        </Card>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-3">
        <Card>
          <CardHeader title="Hedef ortalama hesaplayıcı" icon={<Target className="w-4 h-4 text-subtle" />} />
          <div className="p-4 space-y-3">
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className={labelCls}>Hedef AGNO</label>
                <input
                  type="number"
                  min={0}
                  max={4}
                  step={0.05}
                  className={inputCls}
                  value={target}
                  onChange={(e) => {
                    const v = Math.min(4, Math.max(0, Number(e.target.value) || 0));
                    update((d) => ({ ...d, targetGpa: v }));
                  }}
                />
              </div>
              <div>
                <label className={labelCls}>Önümüzdeki {basis}</label>
                <input type="number" min={1} className={inputCls} value={upcoming} onChange={(e) => setUpcoming(Math.max(1, Number(e.target.value) || 1))} />
              </div>
            </div>
            <p className="text-sm text-body">
              {needed === null ? (
                'Hesaplamak için gelecek dönem kredisini girin.'
              ) : needed > 4 ? (
                <>Bu kredi miktarıyla hedefe ulaşılamıyor (gereken ortalama {needed.toFixed(2)}). Daha fazla krediye yayın.</>
              ) : needed <= 0 ? (
                <>Mevcut ortalamanızla hedefin üzerindesiniz.</>
              ) : (
                <>
                  Önümüzdeki {upcoming} {basis} için dönem ortalaması en az{' '}
                  <span className="font-semibold text-emerald-400 tabular-nums">{needed.toFixed(2)}</span> olmalı.
                </>
              )}
            </p>
          </div>
        </Card>

        <Card>
          <CardHeader title="Tekrar edilmesi gereken dersler" />
          {openRetakes.length === 0 ? (
            <EmptyState title="Tekrar edilecek ders yok" />
          ) : (
            <ul className="divide-y divide-line">
              {openRetakes.map((r) => (
                <li key={r.course.id} className="px-4 py-2.5 flex items-center gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="text-sm text-fg truncate">{r.course.name}</p>
                    <p className="text-[11px] text-muted">{r.term.name}</p>
                  </div>
                  <LetterBadge letter={r.grade.letter} failing />
                  <StatusBadge status={r.finalStatus} />
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <p className="text-[11px] text-muted">
        AGNO, dersin {basis} değeriyle ağırlıklandırılır; tekrar alınan derslerde (aynı ders kodu) son alınan not geçerlidir.
        {g.conditionalLetters.length > 0 && ` ${g.conditionalLetters.join(', ')} notları, o dönemin ortalaması ${g.conditionalGpa.toFixed(2)} ve üzerindeyse başarılı sayılır.`}
      </p>
    </div>
  );
}
