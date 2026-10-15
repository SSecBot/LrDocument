'use client';

import React from 'react';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export const fieldCls =
  'w-full h-10 bg-app border border-line rounded-md px-3 text-sm text-fg placeholder-muted focus:outline-none focus:border-line-strong';
export const labelCls = 'block text-xs font-medium text-subtle mb-1.5';
export const primaryBtn =
  'h-10 px-4 rounded-md bg-brand hover:bg-brand-hover text-white text-sm font-medium disabled:opacity-50 inline-flex items-center justify-center gap-2';

export function Panel({ title, description, children }: { title: string; description?: string; children: React.ReactNode }) {
  return (
    <section className="rounded-lg bg-surface border border-line">
      <header className="px-5 py-4 border-b border-line">
        <h2 className="text-sm font-semibold text-fg">{title}</h2>
        {description && <p className="text-xs text-muted mt-1">{description}</p>}
      </header>
      <div className="p-5">{children}</div>
    </section>
  );
}

export function Message({ kind, text }: { kind: 'ok' | 'error'; text: string }) {
  return (
    <p
      role={kind === 'error' ? 'alert' : 'status'}
      className={`text-xs flex items-center gap-2 ${kind === 'ok' ? 'text-emerald-300' : 'text-rose-300'}`}
    >
      {kind === 'ok' ? <CheckCircle2 className="w-4 h-4 shrink-0" /> : <AlertCircle className="w-4 h-4 shrink-0" />}
      {text}
    </p>
  );
}

