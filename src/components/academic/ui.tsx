'use client';

import React from 'react';
import type { CourseStatus } from '@/lib/academic/grading';
import { STATUS_LABEL } from '@/lib/academic/grading';

export const inputCls =
  'h-9 w-full bg-surface-2 border border-line rounded-lg px-2.5 text-sm text-fg placeholder:text-muted focus:outline-none focus:border-line-strong';

export const labelCls = 'block text-[11px] font-medium text-subtle mb-1';

export const btnPrimary =
  'h-9 px-3.5 whitespace-nowrap shrink-0 bg-brand hover:bg-brand-hover active:bg-brand-active text-white text-xs font-semibold rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50';

export const btnSecondary =
  'h-9 px-3 whitespace-nowrap bg-surface-2 hover:bg-surface-3 border border-line text-body text-xs font-medium rounded-lg inline-flex items-center justify-center gap-1.5 transition-colors disabled:opacity-50';

export const btnGhost =
  'h-8 px-2 text-subtle hover:text-fg hover:bg-surface-2 text-xs rounded-lg inline-flex items-center justify-center gap-1 transition-colors';

export const COURSE_COLORS = ['#3f8f4f', '#3b82f6', '#a855f7', '#f59e0b', '#ef4444', '#14b8a6', '#ec4899', '#64748b'];

export function Card({ children, className = '' }: { children: React.ReactNode; className?: string }) {
  return <div className={`bg-surface border border-line rounded-xl ${className}`}>{children}</div>;
}

export function CardHeader({ title, action, icon }: { title: React.ReactNode; action?: React.ReactNode; icon?: React.ReactNode }) {
  return (
    <div className="flex items-center justify-between gap-2 px-4 h-11 border-b border-line">
      <h3 className="text-sm font-semibold text-fg flex items-center gap-2 min-w-0 truncate">
        {icon}
        {title}
      </h3>
      {action}
    </div>
  );
}

export function Stat({ label, value, hint, tone }: { label: string; value: React.ReactNode; hint?: React.ReactNode; tone?: 'good' | 'warn' | 'bad' }) {
  const toneCls = tone === 'good' ? 'text-emerald-400' : tone === 'warn' ? 'text-amber-400' : tone === 'bad' ? 'text-rose-400' : 'text-fg';
  return (
    <div className="bg-surface border border-line rounded-lg px-3 py-2.5">
      <div className="text-[11px] text-muted">{label}</div>
      <div className={`mt-0.5 text-lg font-semibold tabular-nums ${toneCls}`}>{value}</div>
      {hint && <div className="text-[11px] text-muted">{hint}</div>}
    </div>
  );
}

const STATUS_CLS: Record<CourseStatus, string> = {
  devam: 'bg-surface-3 text-subtle',
  gecti: 'bg-emerald-500/15 text-emerald-300',
  sartli: 'bg-amber-500/15 text-amber-300',
  kaldi: 'bg-rose-500/15 text-rose-300',
  devamsiz: 'bg-rose-500/15 text-rose-300',
};

export function StatusBadge({ status }: { status: CourseStatus }) {
  return (
    <span className={`text-[11px] px-1.5 py-0.5 rounded font-medium whitespace-nowrap ${STATUS_CLS[status]}`}>
      {STATUS_LABEL[status]}
    </span>
  );
}

export function LetterBadge({ letter, failing, conditional }: { letter: string | null; failing?: boolean; conditional?: boolean }) {
  if (!letter) return <span className="text-xs text-muted">—</span>;
  const cls = failing
    ? 'bg-rose-500/15 text-rose-300 border-rose-500/30'
    : conditional
      ? 'bg-amber-500/15 text-amber-300 border-amber-500/30'
      : 'bg-emerald-500/15 text-emerald-300 border-emerald-500/30';
  return <span className={`inline-flex min-w-9 justify-center text-xs font-semibold px-1.5 py-0.5 rounded border ${cls}`}>{letter}</span>;
}

export function Progress({ value, max, state }: { value: number; max: number; state: 'ok' | 'warn' | 'over' }) {
  const pct = max > 0 ? Math.min(100, (value / max) * 100) : value > 0 ? 100 : 0;
  const color = state === 'over' ? 'bg-rose-500' : state === 'warn' ? 'bg-amber-500' : 'bg-emerald-500';
  return (
    <div className="h-1.5 w-full rounded-full bg-surface-3 overflow-hidden" role="progressbar" aria-valuenow={value} aria-valuemax={max}>
      <div className={`h-full ${color} transition-all`} style={{ width: `${pct}%` }} />
    </div>
  );
}

export function EmptyState({ title, text, action }: { title: string; text?: string; action?: React.ReactNode }) {
  return (
    <div className="px-4 py-10 text-center space-y-2">
      <p className="text-sm font-medium text-body">{title}</p>
      {text && <p className="text-xs text-muted max-w-sm mx-auto">{text}</p>}
      {action && <div className="pt-1">{action}</div>}
    </div>
  );
}

/** Number input that keeps an empty value as null. */
export function ScoreInput({
  value,
  onChange,
  placeholder = '—',
  className = '',
  max = 100,
}: {
  value: number | null;
  onChange: (v: number | null) => void;
  placeholder?: string;
  className?: string;
  max?: number;
}) {
  return (
    <input
      type="number"
      inputMode="decimal"
      min={0}
      max={max}
      step="any"
      value={value ?? ''}
      placeholder={placeholder}
      onChange={(e) => {
        const raw = e.target.value;
        if (raw === '') return onChange(null);
        const n = Number(raw);
        if (Number.isFinite(n)) onChange(Math.min(max, Math.max(0, n)));
      }}
      className={`h-8 w-20 bg-surface-2 border border-line rounded-md px-2 text-sm text-fg text-right tabular-nums focus:outline-none focus:border-line-strong ${className}`}
    />
  );
}
