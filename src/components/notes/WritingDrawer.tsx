'use client';

import React, { useState } from 'react';
import { WRITING_TOOLS, type WritingTool } from '@/lib/writingTools';

const GROUPS = ['Roman', 'Tez / Akademik'] as const;

/**
 * Yazım araçları: a strip above the editor (like Semboller) with shortcuts for novels and theses.
 * Some also have a keyboard shortcut: Ctrl / ⌘ + Shift + key.
 */
export function WritingDrawer({ onApply }: { onApply: (tool: WritingTool) => void }) {
  const [group, setGroup] = useState<(typeof GROUPS)[number]>('Roman');
  const tools = WRITING_TOOLS.filter((t) => t.group === group);
  return (
    <div className="border-b border-line bg-surface px-3 sm:px-6 py-2.5 space-y-2" aria-label="Yazım araçları">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="flex gap-1" role="tablist">
          {GROUPS.map((g) => (
            <button
              key={g}
              role="tab"
              aria-selected={group === g}
              onClick={() => setGroup(g)}
              className={`h-7 px-2.5 rounded-md text-[11px] whitespace-nowrap transition-colors ${group === g ? 'bg-surface-4 text-fg' : 'text-subtle hover:text-fg hover:bg-surface-2'}`}
            >
              {g}
            </button>
          ))}
        </div>
        <span className="text-[11px] text-muted hidden sm:inline">Numaralar nottaki son değerden devam eder.</span>
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
        {tools.map((t) => (
          <button
            key={t.id}
            // Keep the caret / selection in the editor while clicking.
            onMouseDown={(e) => e.preventDefault()}
            onClick={() => onApply(t)}
            title={`${t.hint}${t.key ? ` (Ctrl / ⌘ + Shift + ${t.key})` : ''}`}
            className="h-8 px-2.5 rounded-md border border-line bg-surface-2 hover:bg-surface-3 hover:border-line-strong text-[11px] text-body inline-flex items-center gap-1.5 transition-colors"
          >
            {t.name}
            {t.key && <kbd className="text-[10px] text-muted font-mono hidden sm:inline">⇧{t.key}</kbd>}
          </button>
        ))}
      </div>
    </div>
  );
}
