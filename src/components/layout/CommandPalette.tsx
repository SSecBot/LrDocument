'use client';

import React, { useState, useEffect } from 'react';
import { useAppStore } from '@/store/useAppStore';
import {
  Search,
  FileText,
  CheckSquare,
  Calendar,
  Image as ImageIcon,
  Wallet,
  Kanban,
  Plus,
} from 'lucide-react';
import { formatCurrencyTRY } from '@/lib/utils';

export const CommandPalette: React.FC = () => {
  const {
    isCommandPaletteOpen,
    setIsCommandPaletteOpen,
    notes,
    tasks,
    kanbanCards,
    mediaItems,
    transactions,
    setActiveTab,
    setActiveNoteId,
    addNote,
  } = useAppStore();

  const [query, setQuery] = useState('');

  // Global Ctrl+K / Cmd+K listener
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsCommandPaletteOpen(!isCommandPaletteOpen);
      }
      if (e.key === 'Escape' && isCommandPaletteOpen) {
        setIsCommandPaletteOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isCommandPaletteOpen, setIsCommandPaletteOpen]);

  if (!isCommandPaletteOpen) return null;

  const q = query.toLowerCase().trim();

  const matchingNotes = notes.filter(n =>
    !q || n.title.toLowerCase().includes(q) || n.tags.some(t => t.toLowerCase().includes(q))
  ).slice(0, 3);

  const matchingKanban = kanbanCards.filter(k =>
    !q || k.title.toLowerCase().includes(q) || k.tags.some(t => t.toLowerCase().includes(q))
  ).slice(0, 3);

  const matchingMedia = mediaItems.filter(m =>
    !q || m.title.toLowerCase().includes(q) || m.tags.some(t => t.toLowerCase().includes(q))
  ).slice(0, 3);

  const matchingTransactions = transactions.filter(t =>
    !q || t.title.toLowerCase().includes(q) || t.category.toLowerCase().includes(q)
  ).slice(0, 3);

  const handleSelectNote = (id: string) => {
    setActiveNoteId(id);
    setActiveTab('notes');
    setIsCommandPaletteOpen(false);
  };

  const handleSelectKanban = () => {
    setActiveTab('kanban');
    setIsCommandPaletteOpen(false);
  };

  const handleSelectMedia = () => {
    setActiveTab('media');
    setIsCommandPaletteOpen(false);
  };

  const handleSelectTasks = () => {
    setActiveTab('tasks');
    setIsCommandPaletteOpen(false);
  };

  const handleSelectCalendar = () => {
    setActiveTab('calendar');
    setIsCommandPaletteOpen(false);
  };

  const handleSelectFinance = () => {
    setActiveTab('finance');
    setIsCommandPaletteOpen(false);
  };

  return (
    <div className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm flex items-start justify-center pt-20 p-4 animate-fade-in select-none">
      <div
        className="fixed inset-0"
        onClick={() => setIsCommandPaletteOpen(false)}
      />

      <div className="relative w-full max-w-2xl bg-surface border border-line rounded-xl overflow-hidden z-10 flex flex-col max-h-[80vh]">
        {/* Search input header */}
        <div className="p-4 border-b border-line flex items-center gap-3 bg-surface-2">
          <Search className="w-5 h-5 text-emerald-400 shrink-0" />
          <input
            type="text"
            autoFocus
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Notlarda, kanbanda, medyada veya finansta arayın..."
            className="w-full bg-transparent text-white placeholder-muted text-sm focus:outline-none"
          />
          <kbd className="text-[11px] font-mono bg-surface-3 text-muted px-2 py-0.5 rounded-md border border-line-strong">
            ESC
          </kbd>
        </div>

        {/* Results area */}
        <div className="p-4 overflow-y-auto space-y-4 flex-1">
          {/* Quick Actions */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted px-2">Hızlı İşlemler</span>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 pt-1">
              <button
                onClick={() => {
                  const id = addNote();
                  handleSelectNote(id);
                }}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-xs font-semibold text-white transition-colors text-left"
              >
                <Plus className="w-4 h-4 text-emerald-400" />
                <span>Yeni Not Oluştur</span>
              </button>

              <button
                onClick={handleSelectTasks}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-xs font-semibold text-white transition-colors text-left"
              >
                <CheckSquare className="w-4 h-4 text-sky-400" />
                <span>Görevleri Aç</span>
              </button>

              <button
                onClick={handleSelectKanban}
                className="flex items-center gap-2 p-2.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-xs font-semibold text-white transition-colors text-left"
              >
                <Kanban className="w-4 h-4 text-emerald-400" />
                <span>Kanban Panosunu Aç</span>
              </button>
            </div>
          </div>

          {/* Notes */}
          {matchingNotes.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted px-2">Notlar</span>
              <div className="space-y-1 pt-1">
                {matchingNotes.map((n) => (
                  <button
                    key={n.id}
                    onClick={() => handleSelectNote(n.id)}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-xs text-white transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <FileText className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate">{n.title}</span>
                    </div>
                    <span className="text-[10px] text-muted bg-surface-3 px-2 py-0.5 rounded">
                      {n.folder}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Kanban Cards */}
          {matchingKanban.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted px-2">Kanban Kartları</span>
              <div className="space-y-1 pt-1">
                {matchingKanban.map((k) => (
                  <button
                    key={k.id}
                    onClick={handleSelectKanban}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-xs text-white transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Kanban className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate">{k.title}</span>
                    </div>
                    <span className="text-[10px] text-emerald-300 bg-emerald-950/60 px-2 py-0.5 rounded">
                      {k.columnId}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}


          {/* Finance Records */}
          {matchingTransactions.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted px-2">Finans İşlemleri</span>
              <div className="space-y-1 pt-1">
                {matchingTransactions.map((t) => (
                  <button
                    key={t.id}
                    onClick={handleSelectFinance}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-xs text-white transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <Wallet className="w-4 h-4 text-emerald-400 shrink-0" />
                      <span className="truncate">{t.title}</span>
                    </div>
                    <span className={`text-[11px] font-mono font-bold ${t.type === 'gelir' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {t.type === 'gelir' ? '+' : '-'}{formatCurrencyTRY(t.amount)}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Media Items */}
          {matchingMedia.length > 0 && (
            <div className="space-y-1">
              <span className="text-[10px] font-bold uppercase tracking-wider text-muted px-2">Medya & Çizimler</span>
              <div className="space-y-1 pt-1">
                {matchingMedia.map((m) => (
                  <button
                    key={m.id}
                    onClick={handleSelectMedia}
                    className="w-full flex items-center justify-between p-2.5 rounded-lg bg-surface-2 hover:bg-surface-3 text-xs text-white transition-colors text-left"
                  >
                    <div className="flex items-center gap-2.5 truncate">
                      <ImageIcon className="w-4 h-4 text-purple-400 shrink-0" />
                      <span className="truncate">{m.title}</span>
                    </div>
                    <span className="text-[10px] text-purple-300 bg-purple-950/60 px-2 py-0.5 rounded">
                      {m.type}
                    </span>
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Navigation Links */}
          <div className="space-y-1">
            <span className="text-[10px] font-bold uppercase tracking-wider text-muted px-2">Modüllere Git</span>
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
              <button
                onClick={handleSelectKanban}
                className="flex items-center gap-1.5 p-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-xs text-white transition-colors text-left"
              >
                <Kanban className="w-3.5 h-3.5 text-emerald-400" />
                <span>Kanban ({kanbanCards.length})</span>
              </button>

              <button
                onClick={handleSelectTasks}
                className="flex items-center gap-1.5 p-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-xs text-white transition-colors text-left"
              >
                <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>Görevler ({tasks.filter(t => !t.completed).length})</span>
              </button>

              <button
                onClick={handleSelectCalendar}
                className="flex items-center gap-1.5 p-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-xs text-white transition-colors text-left"
              >
                <Calendar className="w-3.5 h-3.5 text-purple-400" />
                <span>Takvim</span>
              </button>

              <button
                onClick={handleSelectFinance}
                className="flex items-center gap-1.5 p-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-xs text-white transition-colors text-left"
              >
                <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                <span>Finans</span>
              </button>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 py-2.5 bg-app border-t border-line flex items-center justify-between text-[11px] text-muted">
          <span>Gezinmek için arama yapın veya bir modüle tıklayın</span>
          <span className="font-mono text-[10px] text-muted">ESC veya Tıkla ile Kapat</span>
        </div>
      </div>
    </div>
  );
};
