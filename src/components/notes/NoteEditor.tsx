'use client';

import React, { useEffect, useLayoutEffect, useState, useRef } from 'react';
import { flushSync } from 'react-dom';
import { useNow } from '@/components/academic/useNow';
import { Note } from '@/types';
import { canEdit } from '@/lib/corporate';
import { applyOrder } from '@/lib/preferences';
import { flushPendingMutations, useAppStore } from '@/store/useAppStore';
import { KatexPreview } from './KatexPreview';
import { MathSymbolBar } from './MathDrawer';
import { WritingDrawer } from './WritingDrawer';
import { WRITING_KEYS, writingStats, type WritingTool } from '@/lib/writingTools';
import { NoteDownloadMenu } from './NoteDownloadMenu';
import { SpreadsheetEditor } from './SpreadsheetEditor';
import { PdfViewer } from './PdfViewer';
import { Modal } from '@/components/ui/Modal';
import { pdfToText } from '@/lib/noteImport';
import {
  Columns2,
  Eye,
  Edit3,
  Star,
  Pin,
  Trash2,
  Copy,
  CheckSquare,
  Tag,
  Folder,
  Calendar,
  Sigma,
  ChevronLeft,
  ChevronDown,
  ChevronRight,
  PenLine,
  BookOpen,
} from 'lucide-react';
import { formatTurkishDate } from '@/lib/utils';
import { confirmDelete } from '@/components/ui/ConfirmDialog';

interface NoteEditorProps {
  note: Note;
  onBack?: () => void;
}

export const NoteEditor: React.FC<NoteEditorProps> = ({ note, onBack }) => {
  const {
    updateNote,
    deleteNote,
    toggleFavoriteNote,
    togglePinNote,
    folders,
    addTask,
    setActiveTab,
    addToast,
    preferences,
    setPreference,
    systemSettings,
    currentUser,
    addNote,
    setActiveNoteId,
    remoteEdits,
  } = useAppStore();
  // Kurumsal: members with view-only access to Ortak Notlar read the note, they cannot change it.
  const editable = canEdit(currentUser, 'notes');

  // Opens in the editor; Bölünmüş (editor + preview) and Önizleme are one click away.
  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>(editable ? 'edit' : 'preview');
  const kind = note.kind ?? 'text';
  const isText = kind === 'text';
  // PDF note → "Metne dönüştür" (printed or handwritten text) creates a separate text note.
  const [convertBytes, setConvertBytes] = useState<Uint8Array | null>(null);
  const [converting, setConverting] = useState<string | null>(null);
  const convertPdf = async (handwriting: boolean) => {
    const data = convertBytes;
    setConvertBytes(null);
    if (!data) return;
    setConverting('Hazırlanıyor…');
    try {
      const notes: string[] = [];
      const text = await pdfToText(data, notes, (p) =>
        setConverting(p.stage === 'ocr' ? `Sayfa ${p.page}/${p.pages} okunuyor… %${Math.round(p.progress * 100)}` : p.stage === 'hazirlik' ? 'Metin tanıma hazırlanıyor…' : `Sayfa ${p.page}/${p.pages}`)
      , handwriting);
      if (!text.trim()) throw new Error('PDF’te okunabilir yazı bulunamadı.');
      const id = addNote({ title: `${note.title} (metin)`, content: text.slice(0, 200_000), folder: note.folder });
      setActiveNoteId(id);
      addToast({ type: notes.length ? 'warning' : 'success', title: 'Metin notu oluşturuldu', message: notes.join(' ') || 'PDF’teki yazı yeni bir nota aktarıldı.' });
    } catch (err) {
      addToast({ type: 'error', title: 'Metne dönüştürülemedi', message: (err as Error).message });
    } finally {
      setConverting(null);
    }
  };
  // Kitap görünümü (tablet / computer): the preview flows into two columns and turns like pages.
  const [wide, setWide] = useState(() => typeof window === 'undefined' || window.innerWidth >= 768);
  useEffect(() => {
    const onResize = () => setWide(window.innerWidth >= 768);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  const bookRef = useRef<HTMLDivElement>(null);
  const BOOK_GAP = 64;
  const turnPage = (dir: 1 | -1) => {
    const el = bookRef.current;
    if (el) el.scrollBy({ left: dir * (el.clientWidth + BOOK_GAP), behavior: 'smooth' });
  };
  const symbolsOpen = preferences.mathDrawerOpen;
  const writingOpen = preferences.writingDrawerOpen;
  const [newTagInput, setNewTagInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  // Kurumsal live editing: a teammate's saved change replaces the content while this note is open.
  // Keep the caret where it was (shifted by the inserted / removed text before it).
  const prevContent = useRef(note.content);
  const localContent = useRef(note.content);
  const selection = useRef({ start: 0, end: 0 });
  useLayoutEffect(() => {
    const old = prevContent.current;
    const next = note.content;
    prevContent.current = next;
    if (next === localContent.current) return;
    localContent.current = next;
    const ta = textareaRef.current;
    if (!ta || document.activeElement !== ta) return;
    let p = 0;
    while (p < old.length && p < next.length && old[p] === next[p]) p++;
    const shift = next.length - old.length;
    const adjust = (i: number) => (i <= p ? i : Math.max(p, i + shift));
    ta.setSelectionRange(adjust(selection.current.start), adjust(selection.current.end));
  }, [note.content]);

  const remote = remoteEdits[`note:${note.id}`];
  const now = useNow(2000);
  const remoteLive = !!remote && now.getTime() - remote.at < 6000;

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    localContent.current = e.target.value;
    prevContent.current = e.target.value;
    updateNote(note.id, { content: e.target.value });
  };

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateNote(note.id, { title: e.target.value });
  };

  const handleInsertLatex = (latex: string) => {
    const textarea = textareaRef.current;
    if (!textarea) {
      updateNote(note.id, { content: note.content + '\n' + latex });
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const currentContent = note.content;

    const newContent =
      currentContent.substring(0, start) +
      latex +
      currentContent.substring(end);

    updateNote(note.id, { content: newContent });

    // Re-focus and set cursor
    setTimeout(() => {
      textarea.focus();
      textarea.setSelectionRange(start + latex.length, start + latex.length);
    }, 50);
  };

  /** Yazım araçları: applies a roman / tez tool at the caret (at the end when the editor is hidden). */
  const applyTool = (tool: WritingTool) => {
    if (!editable) return;
    const ta = textareaRef.current;
    const text = ta ? ta.value : note.content;
    const start = ta ? ta.selectionStart : text.length;
    const end = ta ? ta.selectionEnd : text.length;
    const result = tool.apply(text, start, end);
    localContent.current = result.text;
    prevContent.current = result.text;
    if (ta) {
      // Render the new text now and place the caret right away, so fast typing continues there.
      flushSync(() => updateNote(note.id, { content: result.text }));
      ta.focus();
      ta.setSelectionRange(result.start, result.end);
      selection.current = { start: result.start, end: result.end };
      return;
    }
    updateNote(note.id, { content: result.text });
    setViewMode('edit');
    setTimeout(() => {
      const el = textareaRef.current;
      if (!el) return;
      el.focus();
      el.setSelectionRange(result.start, result.end);
    }, 0);
  };

  /** Wraps the selection in Markdown marks (Ctrl+B / Ctrl+I). */
  const wrapSelection = (mark: string) => {
    const ta = textareaRef.current;
    if (!ta || !editable) return;
    const { selectionStart: start, selectionEnd: end } = ta;
    const text = note.content;
    const inner = text.slice(start, end) || 'metin';
    updateNote(note.id, { content: text.slice(0, start) + mark + inner + mark + text.slice(end) });
    setTimeout(() => {
      ta.focus();
      ta.setSelectionRange(start + mark.length, start + mark.length + inner.length);
    }, 0);
  };

  // Klavye kısayolları: Ctrl/⌘+B kalın, +I italik, +S hemen kaydet, +Shift+E düzenle/önizleme.
  const handleEditorKeys = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (!(e.ctrlKey || e.metaKey) || e.altKey) return;
    const key = e.key.toLowerCase();
    if (key === 's') {
      e.preventDefault();
      flushPendingMutations();
      addToast({ type: 'success', title: 'Kaydedildi' });
    } else if (key === 'e' && e.shiftKey) {
      e.preventDefault();
      setViewMode((m) => (m === 'preview' ? 'edit' : 'preview'));
    } else if (!e.shiftKey && (key === 'b' || key === 'i') && e.target === textareaRef.current) {
      e.preventDefault();
      wrapSelection(key === 'b' ? '**' : '*');
    } else if (e.shiftKey && WRITING_KEYS[key] && e.target === textareaRef.current) {
      // Yazım araçları: Ctrl+Shift+B bölüm, +H sahne, +D diyalog, +F dipnot, +Q alıntı.
      e.preventDefault();
      applyTool(WRITING_KEYS[key]);
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && newTagInput.trim()) {
      e.preventDefault();
      const tag = newTagInput.trim();
      if (!note.tags.includes(tag)) {
        updateNote(note.id, { tags: [...note.tags, tag] });
      }
      setNewTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    updateNote(note.id, { tags: note.tags.filter(t => t !== tagToRemove) });
  };

  const handleCopyMarkdown = () => {
    navigator.clipboard.writeText(note.content);
    addToast({ type: 'success', title: 'Panoya Kopyalandı', message: 'Markdown içeriği kopyalandı.' });
  };

  const handleCreateTaskFromNote = () => {
    addTask({
      title: `"${note.title}" notunu incele ve geliştir`,
      completed: false,
      priority: systemSettings.tasks.defaultPriority,
      linkedNoteId: note.id,
    });
    setActiveTab('tasks');
  };

  const stats = writingStats(note.content);
  const wordCount = stats.words;
  const charCount = note.content.length;

  return (
    <div className="flex-1 flex flex-col h-full bg-app overflow-hidden relative" onKeyDown={handleEditorKeys}>
      {/* Top action bar */}
      <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 border-b border-line bg-surface gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden min-h-[38px] min-w-[38px] p-2 bg-surface-2 hover:bg-surface-3 active:bg-surface-4 border border-line-strong rounded-lg text-body flex items-center justify-center transition-colors shrink-0"
              title="Not Listesine Dön"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <input
            type="text"
            value={note.title}
            onChange={handleTitleChange}
            readOnly={!editable}
            placeholder="Not Başlığı..."
            className="text-base sm:text-lg font-bold text-white bg-transparent border-b border-transparent hover:border-line-strong focus:border-brand focus:outline-none px-1 py-0.5 w-full transition-colors truncate"
          />
        </div>

        {/* View Mode Toggle & Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Symbol drawer toggle (the drawer opens as a strip below this bar) */}
          {isText && (
          <button
            onClick={() => setPreference('mathDrawerOpen', !symbolsOpen)}
            aria-expanded={symbolsOpen}
            className={`min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-medium transition-colors ${
              symbolsOpen ? 'bg-surface-4 border-line-strong text-fg' : 'bg-surface-2 border-line-strong text-body hover:text-fg'
            }`}
            title={symbolsOpen ? 'Sembol çekmecesini kapat' : 'Sembol çekmecesini aç'}
          >
            <Sigma className="w-4 h-4" />
            <span className="hidden sm:inline">Semboller</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${symbolsOpen ? 'rotate-180' : ''}`} />
          </button>
          )}

          {isText && editable && (
          <button
            onClick={() => setPreference('writingDrawerOpen', !writingOpen)}
            aria-expanded={writingOpen}
            className={`min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 border rounded-md text-xs font-medium transition-colors ${
              writingOpen ? 'bg-surface-4 border-line-strong text-fg' : 'bg-surface-2 border-line-strong text-body hover:text-fg'
            }`}
            title="Yazım araçları: roman ve tez yazarken kısayollar"
          >
            <PenLine className="w-4 h-4" />
            <span className="hidden sm:inline">Yazım</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${writingOpen ? 'rotate-180' : ''}`} />
          </button>
          )}

          {/* View switches */}
          {isText && (
          <div className="flex bg-surface-2 p-1 rounded-lg border border-line-strong">
            <button
              onClick={() => setViewMode('edit')}
              className={`min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors ${
                viewMode === 'edit' ? 'bg-surface-4 text-fg font-medium' : 'text-subtle hover:text-white'
              }`}
              title="Yalnızca Editör"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editör</span>
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`hidden sm:flex min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-lg items-center gap-1 transition-colors ${
                viewMode === 'split' ? 'bg-surface-4 text-fg font-medium' : 'text-subtle hover:text-white'
              }`}
              title="Bölünmüş Görünüm"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Bölünmüş</span>
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors ${
                viewMode === 'preview' ? 'bg-surface-4 text-fg font-medium' : 'text-subtle hover:text-white'
              }`}
              title="Yalnızca Önizleme"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Önizleme</span>
            </button>
          </div>
          )}

          {/* Pin & Favorite */}
          {editable && (
            <>
          <button
            onClick={() => togglePinNote(note.id)}
            className={`min-h-[38px] min-w-[38px] p-2 rounded-xl border transition-colors flex items-center justify-center ${
              note.isPinned
                ? 'bg-amber-950/40 border-amber-600/50 text-amber-300'
                : 'bg-surface-2 border-line-strong text-subtle hover:text-white'
            }`}
            title={note.isPinned ? 'Sabitlemeyi Kaldır' : 'Başa Sabitle'}
          >
            <Pin className="w-4 h-4" />
          </button>

          <button
            onClick={() => toggleFavoriteNote(note.id)}
            className={`min-h-[38px] min-w-[38px] p-2 rounded-xl border transition-colors flex items-center justify-center ${
              note.isFavorite
                ? 'bg-amber-950/40 border-amber-600/50 text-amber-400 fill-amber-400'
                : 'bg-surface-2 border-line-strong text-subtle hover:text-white'
            }`}
            title={note.isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
          >
            <Star className={`w-4 h-4 ${note.isFavorite ? 'fill-amber-400' : ''}`} />
          </button>
            </>
          )}

          {/* Quick Actions */}
          {isText && (
          <button
            onClick={handleCopyMarkdown}
            className="min-h-[38px] min-w-[38px] p-2 bg-surface-2 hover:bg-surface-3 border border-line-strong text-subtle hover:text-white rounded-lg transition-colors flex items-center justify-center"
            title="Markdown İçeriğini Kopyala"
          >
            <Copy className="w-4 h-4" />
          </button>
          )}

          <NoteDownloadMenu note={note} />

          <button
            onClick={handleCreateTaskFromNote}
            className="hidden lg:flex min-h-[38px] px-2.5 py-1.5 bg-surface-2 hover:bg-surface-3 border border-line-strong text-body rounded-lg text-xs font-medium items-center gap-1.5 transition-colors"
            title="Bu not için görev ekle"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Görev Oluştur</span>
          </button>

          {editable && (
          <button
            onClick={async () => {
              if (!(await confirmDelete(`"${note.title || 'Başlıksız not'}" notu`))) return;
              deleteNote(note.id);
              if (onBack) onBack();
            }}
            className="min-h-[38px] min-w-[38px] p-2 bg-surface-2 hover:bg-rose-950/40 border border-line-strong hover:border-rose-800 text-subtle hover:text-rose-300 rounded-lg transition-colors flex items-center justify-center"
            title="Notu Sil"
          >
            <Trash2 className="w-4 h-4" />
          </button>
          )}
        </div>
      </div>

      {/* Metadata bar: Folder, Tags, Dates */}
      <div className="flex items-center gap-2.5 sm:gap-3 px-4 sm:px-6 py-2 bg-surface border-b border-line text-xs text-subtle flex-wrap">
        {/* Folder Select */}
        <div className="flex items-center gap-1.5">
          <Folder className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <select
            value={note.folder}
            onChange={(e) => updateNote(note.id, { folder: e.target.value })}
            disabled={!editable}
            className="bg-surface-2 text-body border border-line-strong rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-brand min-h-[34px]"
          >
            <option value="">Klasörsüz</option>
            {applyOrder(folders, preferences.folderOrder).map(f => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
            {!!note.folder && !folders.some((f) => f.id === note.folder) && <option value={note.folder}>Silinmiş klasör</option>}
          </select>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 bg-surface-2 border border-line-strong px-2 py-0.5 rounded text-[11px] text-body"
            >
              #{tag}
              {editable && (
              <button
                onClick={() => handleRemoveTag(tag)}
                className="text-muted hover:text-rose-400 ml-0.5"
              >
                ×
              </button>
              )}
            </span>
          ))}
          {editable && (
          <input
            type="text"
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="+ Etiket ekle (Enter)"
            className="bg-transparent border border-dashed border-line-strong focus:border-brand rounded-lg px-2 py-1 text-[11px] text-body focus:outline-none w-28 min-h-[32px]"
          />
          )}
        </div>

        {/* Updated Date */}
        {remote && (
          <div className="flex items-center gap-1.5 text-[11px] text-subtle" role="status" aria-live="polite">
            <span className={`w-1.5 h-1.5 rounded-full ${remoteLive ? 'bg-emerald-400 animate-pulse' : 'bg-surface-4'}`} aria-hidden="true" />
            {remoteLive ? `${remote.by} düzenliyor` : `Son değişiklik: ${remote.by}`}
          </div>
        )}
        <div className="hidden sm:flex items-center gap-1 text-[11px] text-muted">
          <Calendar className="w-3 h-3" />
          <span>Son düzenleme: {formatTurkishDate(note.updatedAt)}</span>
        </div>
      </div>

      {isText && symbolsOpen && <MathSymbolBar onInsertLatex={handleInsertLatex} />}
      {isText && editable && writingOpen && <WritingDrawer onApply={applyTool} />}

      {kind === 'table' && (
        <div className="flex-1 min-h-0">
          <SpreadsheetEditor value={note.content} readOnly={!editable} onChange={(json) => updateNote(note.id, { content: json })} />
        </div>
      )}
      {kind === 'pdf' && (
        <div className="flex-1 min-h-0">
          {note.fileId ? (
            <PdfViewer fileId={note.fileId} onConvert={editable ? setConvertBytes : undefined} />
          ) : (
            <p className="p-6 text-sm text-muted">PDF dosyası bulunamadı.</p>
          )}
          {converting && (
            <p className="absolute bottom-3 left-1/2 -translate-x-1/2 px-3 py-2 rounded-lg bg-surface border border-line text-xs text-body shadow-lg" aria-live="polite">
              {converting}
            </p>
          )}
        </div>
      )}
      <Modal isOpen={!!convertBytes} onClose={() => setConvertBytes(null)} title="Metne dönüştür" subtitle="PDF’teki yazı yeni bir metin notuna aktarılır; PDF olduğu gibi kalır." maxWidth="max-w-md">
        <div className="grid gap-2">
          <button onClick={() => convertPdf(false)} className="text-left p-3 rounded-lg border border-line hover:border-brand hover:bg-surface-2">
            <span className="block text-sm text-fg font-medium">Basılı yazı</span>
            <span className="block text-xs text-muted">Bilgisayarda yazılmış veya taranmış belgeler</span>
          </button>
          <button onClick={() => convertPdf(true)} className="text-left p-3 rounded-lg border border-line hover:border-brand hover:bg-surface-2">
            <span className="block text-sm text-fg font-medium">El yazısı</span>
            <span className="block text-xs text-muted">Elle yazılmış notların fotoğrafı / taraması. Okunaklı yazıda en iyi sonucu verir; sonucu kontrol edin.</span>
          </button>
        </div>
      </Modal>

      {/* Main editor / preview content area */}
      {isText && (
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Editor Column */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`flex flex-col h-full border-r border-line ${viewMode === 'split' ? 'md:w-1/2 w-full' : 'w-full'}`}>
            <div className="px-4 py-2 bg-surface border-b border-line text-[11px] font-medium text-muted">Markdown ve formül</div>
            <textarea
              ref={textareaRef}
              value={note.content}
              onChange={handleContentChange}
              onSelect={(e) => {
                selection.current = { start: e.currentTarget.selectionStart, end: e.currentTarget.selectionEnd };
              }}
              readOnly={!editable}
              placeholder="Notunuzu buraya yazın... Matematik formülleri için $..$ veya $$..$$ kullanın."
              className="flex-1 w-full p-4 sm:p-5 bg-app text-fg font-mono text-sm leading-relaxed resize-none focus:outline-none overflow-y-auto selection:bg-brand selection:text-white"
            />
          </div>
        )}

        {/* Right Column: KaTeX Canlı Önizleme */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`flex flex-col h-full bg-app overflow-hidden ${viewMode === 'split' ? 'md:w-1/2 w-full' : 'w-full'}`}>
            {/* Header for Right Panel */}
            <div className="px-4 py-1.5 bg-surface border-b border-line flex items-center justify-between gap-2 sticky top-0 z-10">
              <span className="text-[11px] font-medium text-muted">Önizleme</span>

              <span className="flex items-center gap-1 text-[11px] text-muted">
                {viewMode === 'preview' && wide && preferences.pdfSpread && (
                  <>
                    <button onClick={() => turnPage(-1)} className="w-7 h-7 rounded-md inline-flex items-center justify-center hover:bg-surface-2 hover:text-fg" aria-label="Önceki sayfa">
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <button onClick={() => turnPage(1)} className="w-7 h-7 rounded-md inline-flex items-center justify-center hover:bg-surface-2 hover:text-fg" aria-label="Sonraki sayfa">
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </>
                )}
                {viewMode === 'preview' && wide && (
                  <button
                    onClick={() => setPreference('pdfSpread', !preferences.pdfSpread)}
                    aria-pressed={preferences.pdfSpread}
                    className={`h-7 px-2 rounded-md inline-flex items-center gap-1 hover:bg-surface-2 hover:text-fg ${preferences.pdfSpread ? 'bg-surface-2 text-fg' : ''}`}
                    title="Kitap görünümü: metin kitap gibi iki sayfa yan yana gösterilir"
                  >
                    <BookOpen className="w-3.5 h-3.5" /> Kitap
                  </button>
                )}
                <span className="ml-1">
                  {wordCount} kelime • {charCount} karakter
                </span>
              </span>
            </div>

            {/* Content view */}
            {viewMode === 'preview' && wide && preferences.pdfSpread ? (
              <div className="flex-1 min-h-0 px-6 py-6 sm:px-10">
                <div
                  ref={bookRef}
                  tabIndex={0}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowRight' || e.key === 'PageDown') {
                      e.preventDefault();
                      turnPage(1);
                    } else if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
                      e.preventDefault();
                      turnPage(-1);
                    }
                  }}
                  className="book-columns h-full overflow-x-auto overflow-y-hidden focus:outline-none"
                  style={{ columnGap: BOOK_GAP }}
                  aria-label="Kitap görünümü (sağ / sol ok tuşlarıyla sayfa çevirin)"
                >
                  <KatexPreview content={note.content} />
                </div>
              </div>
            ) : (
              <div className="flex-1 overflow-y-auto p-4 sm:p-5">
                <KatexPreview content={note.content} />
              </div>
            )}
          </div>
        )}
      </div>

      )}

      {/* Footer stats bar */}
      {isText && (
      <div className="flex items-center justify-between px-4 sm:px-6 py-2 border-t border-line bg-surface text-xs text-muted">
        <div className="flex items-center gap-3 sm:gap-4 text-[11px]">
          <span>{wordCount} kelime</span>
          <span>{charCount} karakter</span>
          {wordCount > 0 && (
            <span className="hidden sm:inline" title="Yaklaşık: sayfa başına 250 kelime, dakikada 200 kelime okuma">
              ≈ {stats.pages} sayfa · {stats.minutes} dk okuma
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5 text-muted text-[11px]">
          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500"></span>
          <span>Otomatik kaydedilir</span>
        </div>
      </div>
      )}

    </div>
  );
};
