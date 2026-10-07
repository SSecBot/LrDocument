'use client';

import React, { useState, useEffect } from 'react';
import { MATH_SHORTCUTS, MathShortcut } from '@/lib/mathShortcuts';
import {
  Sigma,
  Search,
  X,
  Copy,
  Check,
} from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

interface MathDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  onInsertLatex: (latex: string, isBlock?: boolean) => void;
}

export const MathDrawer: React.FC<MathDrawerProps> = ({
  isOpen,
  onClose,
  onInsertLatex,
}) => {
  const { addToast } = useAppStore();
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('Tümü');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  const categories = ['Tümü', 'Temel', 'Kalkülüs', 'Cebir & Matris', 'Semboller', 'Yunan Harfleri'];

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape' && isOpen) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, onClose]);

  if (!isOpen) return null;

  const filtered = MATH_SHORTCUTS.filter((s) => {
    if (selectedCategory !== 'Tümü' && s.category !== selectedCategory) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchName = s.name.toLowerCase().includes(q);
      const matchLatex = s.latex.toLowerCase().includes(q);
      if (!matchName && !matchLatex) return false;
    }
    return true;
  });

  const handleCopy = (latex: string, id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(latex);
    setCopiedId(id);
    addToast({ type: 'success', title: 'LaTeX Kopyalandı', message: `${latex}` });
    setTimeout(() => setCopiedId(null), 2000);
  };

  const handleInsert = (item: MathShortcut) => {
    const isBlockFormula = item.category === 'Cebir & Matris' || item.id === 'defint' || item.id === 'cases' || item.id === 'sum';
    const formatted = isBlockFormula ? `\n$$ ${item.latex} $$\n` : `$ ${item.latex} $`;
    onInsertLatex(formatted, isBlockFormula);
    addToast({ type: 'info', title: 'Formül Eklendi', message: `"${item.name}" editöre yerleştirildi.` });
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden select-none">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/70 backdrop-blur-sm transition-opacity animate-fade-in"
        onClick={onClose}
      />

      {/* Drawer Container */}
      <div className="fixed inset-y-0 right-0 max-w-full flex w-full sm:w-auto">
        <div className="w-full sm:w-screen sm:max-w-md bg-surface sm:border-l border-line flex flex-col h-full animate-fade-in">
          {/* Header */}
          <div className="px-4 sm:px-6 py-4 border-b border-line bg-surface flex items-center justify-between">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 rounded-lg bg-brand/30 border border-brand/50 flex items-center justify-center text-emerald-400 shrink-0">
                <Sigma className="w-4 h-4" />
              </div>
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">LaTeX Sembol Çekmecesi</h3>
                <p className="text-[11px] text-muted">Tıklayarak nota ekleyin veya kopyalayın</p>
              </div>
            </div>

            <button
              onClick={onClose}
              className="min-h-[44px] min-w-[44px] p-2.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-subtle hover:text-white transition-colors flex items-center justify-center"
              title="Kapat (ESC)"
              aria-label="Kapat"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Search bar */}
          <div className="p-4 border-b border-line bg-app space-y-3">
            <div className="relative">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                autoFocus
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Sembol veya formül ara... (örn: integral, matris, pi)"
                className="w-full bg-surface-2 border border-line focus:border-brand rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-muted focus:outline-none min-h-[44px]"
              />
            </div>

            {/* Category Pills */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 no-scrollbar">
              {categories.map((cat) => (
                <button
                  key={cat}
                  onClick={() => setSelectedCategory(cat)}
                  className={`text-xs min-h-[36px] px-3 py-1.5 rounded-full whitespace-nowrap transition-all ${
                    selectedCategory === cat
                      ? 'bg-surface-4 text-fg font-medium'
                      : 'bg-surface-2 text-subtle hover:text-white hover:bg-surface-3'
                  }`}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>

          {/* Symbols Grid */}
          <div className="flex-1 overflow-y-auto p-4 space-y-2">
            <div className="grid grid-cols-2 gap-2.5">
              {filtered.map((item) => (
                <div
                  key={item.id}
                  onClick={() => handleInsert(item)}
                  className="bg-surface hover:bg-surface-2 active:bg-surface-3 border border-line hover:border-brand-hover rounded-lg p-3 cursor-pointer transition-all flex flex-col justify-between group min-h-[90px]"
                  title="Eklemek için tıkla"
                >
                  <div className="flex items-start justify-between gap-1 mb-1">
                    <span className="text-xs font-semibold text-white group-hover:text-emerald-300 transition-colors">
                      {item.name}
                    </span>
                    <button
                      onClick={(e) => handleCopy(item.latex, item.id, e)}
                      className="min-h-[32px] min-w-[32px] p-1.5 bg-surface-2 hover:bg-surface-3 rounded-lg text-muted hover:text-white transition-colors flex items-center justify-center"
                      title="LaTeX Kodunu Kopyala"
                    >
                      {copiedId === item.id ? (
                        <Check className="w-3.5 h-3.5 text-emerald-400" />
                      ) : (
                        <Copy className="w-3.5 h-3.5" />
                      )}
                    </button>
                  </div>

                  <div className="bg-app rounded-lg p-2 font-mono text-xs text-emerald-400 border border-line text-center overflow-x-auto truncate">
                    {item.latex}
                  </div>

                  <div className="text-[10px] text-muted mt-2 flex items-center justify-between">
                    <span>{item.category}</span>
                    <span className="text-emerald-400 opacity-80 group-hover:opacity-100 transition-opacity font-medium">
                      + Ekle
                    </span>
                  </div>
                </div>
              ))}
            </div>

            {filtered.length === 0 && (
              <div className="p-6 text-center text-muted text-xs">
                Aramanızla eşleşen sembol bulunamadı.
              </div>
            )}
          </div>

          {/* Quick info footer */}
          <div className="p-4 border-t border-line bg-app text-[11px] text-muted flex items-center justify-between">
            <span>Seçilen formül imleç konumuna eklenir.</span>
            <span className="font-mono text-emerald-400">$ ... $ / $$ ... $$</span>
          </div>
        </div>
      </div>
    </div>
  );
};
