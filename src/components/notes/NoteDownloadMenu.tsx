'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Download, FileSpreadsheet, FileText, FileType2, Loader2 } from 'lucide-react';
import type { Note } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { exportNote, type ExportFormat } from '@/lib/noteExport';

const OPTIONS: Record<'text' | 'table' | 'pdf', { format: ExportFormat; label: string; hint: string; icon: React.ElementType }[]> = {
  text: [
    { format: 'md', label: 'Markdown (.md)', hint: 'Düz metin, her yerde açılır', icon: FileText },
    { format: 'pdf', label: 'PDF (.pdf)', hint: 'Formüller görüntüsüyle birlikte', icon: FileType2 },
    { format: 'docx', label: 'Word (.docx)', hint: 'Word / LibreOffice’te düzenlenir', icon: FileText },
  ],
  table: [
    { format: 'xlsx', label: 'Excel (.xlsx)', hint: 'Tüm sayfalar ve formüller', icon: FileSpreadsheet },
    { format: 'csv', label: 'CSV (.csv)', hint: 'Açık sayfanın değerleri', icon: FileText },
    { format: 'pdf', label: 'PDF (.pdf)', hint: 'Açık sayfanın görünümü', icon: FileType2 },
  ],
  pdf: [{ format: 'original', label: 'PDF (.pdf)', hint: 'Yüklenen dosyanın kendisi', icon: FileType2 }],
};

/** "İndir" button with the formats that fit the note's type. */
export function NoteDownloadMenu({ note, getLatest }: { note: Note; getLatest?: () => Note }) {
  const { addToast } = useAppStore();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState<ExportFormat | null>(null);
  const box = useRef<HTMLDivElement>(null);
  const kind = note.kind ?? 'text';

  useEffect(() => {
    if (!open) return;
    const close = (e: MouseEvent | KeyboardEvent) => {
      if (e instanceof KeyboardEvent ? e.key === 'Escape' : !box.current?.contains(e.target as Node)) setOpen(false);
    };
    window.addEventListener('mousedown', close);
    window.addEventListener('keydown', close);
    return () => {
      window.removeEventListener('mousedown', close);
      window.removeEventListener('keydown', close);
    };
  }, [open]);

  const run = async (format: ExportFormat) => {
    setBusy(format);
    try {
      await exportNote(getLatest?.() ?? note, format);
      setOpen(false);
    } catch (err) {
      console.error(err);
      addToast({ type: 'error', title: 'İndirilemedi', message: (err as Error).message || 'Dosya hazırlanamadı.' });
    } finally {
      setBusy(null);
    }
  };

  return (
    <div ref={box} className="relative">
      <button
        onClick={() => setOpen((v) => !v)}
        aria-haspopup="menu"
        aria-expanded={open}
        className="min-h-[38px] min-w-[38px] p-2 bg-surface-2 hover:bg-surface-3 border border-line-strong text-subtle hover:text-white rounded-lg transition-colors flex items-center justify-center gap-1"
        title="İndir"
        aria-label="Notu indir"
      >
        {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Download className="w-4 h-4" />}
      </button>
      {open && (
        <div role="menu" className="absolute right-0 top-full mt-1 z-40 w-64 rounded-lg border border-line bg-surface shadow-xl p-1">
          <p className="px-2.5 py-1.5 text-[11px] text-muted">Hangi biçimde indirilsin?</p>
          {OPTIONS[kind].map(({ format, label, hint, icon: Icon }) => (
            <button
              key={format}
              role="menuitem"
              disabled={!!busy}
              onClick={() => run(format)}
              className="w-full text-left px-2.5 py-2 rounded-md hover:bg-surface-2 flex items-start gap-2.5 disabled:opacity-60"
            >
              {busy === format ? <Loader2 className="w-4 h-4 mt-0.5 animate-spin text-subtle" /> : <Icon className="w-4 h-4 mt-0.5 text-subtle" />}
              <span>
                <span className="block text-sm text-fg">{label}</span>
                <span className="block text-[11px] text-muted">{hint}</span>
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
