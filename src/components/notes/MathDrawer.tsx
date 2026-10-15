'use client';

import React, { useState } from 'react';
import { MATH_SHORTCUTS, MathShortcut } from '@/lib/mathShortcuts';
import { Search } from 'lucide-react';

interface MathSymbolBarProps {
  onInsertLatex: (latex: string) => void;
}

const CATEGORIES = ['Tümü', 'Temel', 'Kalkülüs', 'Cebir & Matris', 'Semboller', 'Yunan Harfleri'];

/**
 * LaTeX symbol drawer shown as a collapsible strip above the editor (toggled from the toolbar).
 * Clicking a symbol inserts it at the cursor.
 */
export const MathSymbolBar: React.FC<MathSymbolBarProps> = ({ onInsertLatex }) => {
  const [query, setQuery] = useState('');
  const [category, setCategory] = useState('Tümü');

  const q = query.trim().toLocaleLowerCase('tr-TR');
  const filtered = MATH_SHORTCUTS.filter(
    (s) =>
      (category === 'Tümü' || s.category === category) &&
      (!q || s.name.toLocaleLowerCase('tr-TR').includes(q) || s.latex.toLowerCase().includes(q))
  );

  const insert = (item: MathShortcut) => {
    const block = item.category === 'Cebir & Matris' || item.id === 'defint' || item.id === 'cases' || item.id === 'sum';
    onInsertLatex(block ? `\n$$ ${item.latex} $$\n` : `$ ${item.latex} $`);
  };

  return (
    <div className="border-b border-line bg-surface px-3 sm:px-6 py-2.5 space-y-2" aria-label="LaTeX sembolleri">
      <div className="flex items-center gap-2 flex-wrap">
        <div className="relative w-full sm:w-56">
          <Search className="w-3.5 h-3.5 text-muted absolute left-2.5 top-1/2 -translate-y-1/2" />
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Sembol ara (integral, matris, pi…)"
            className="w-full h-8 bg-surface-2 border border-line focus:border-line-strong rounded-md pl-8 pr-2 text-xs text-fg placeholder-muted focus:outline-none"
          />
        </div>
        <div className="flex gap-1 overflow-x-auto no-scrollbar">
          {CATEGORIES.map((cat) => (
            <button
              key={cat}
              onClick={() => setCategory(cat)}
              aria-pressed={category === cat}
              className={`h-7 px-2.5 rounded-md text-[11px] whitespace-nowrap transition-colors ${
                category === cat ? 'bg-surface-4 text-fg' : 'text-subtle hover:text-fg hover:bg-surface-2'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>
      </div>
      <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto pr-1">
        {filtered.map((item) => (
          <button
            key={item.id}
            onClick={() => insert(item)}
            title={`${item.name} — ${item.latex}`}
            className="h-8 max-w-[220px] px-2.5 rounded-md border border-line bg-surface-2 hover:bg-surface-3 hover:border-line-strong text-left inline-flex items-center gap-2 transition-colors"
          >
            <span className="text-[11px] text-body truncate">{item.name}</span>
            <code className="text-[10px] text-muted font-mono truncate">{item.latex}</code>
          </button>
        ))}
        {filtered.length === 0 && <p className="text-xs text-muted py-1.5">Eşleşen sembol yok.</p>}
      </div>
    </div>
  );
};
