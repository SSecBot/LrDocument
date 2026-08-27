'use client';

import React, { useState, useRef } from 'react';
import { Note } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { KatexPreview } from './KatexPreview';
import { MathDrawer } from './MathDrawer';
import {
  Columns2,
  Eye,
  Edit3,
  Star,
  Pin,
  Trash2,
  Copy,
  Download,
  CheckSquare,
  Tag,
  Folder,
  Calendar,
  Sparkles,
  Sigma,
  ChevronLeft,
} from 'lucide-react';
import { formatTurkishDate } from '@/lib/utils';

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
  } = useAppStore();

  const [viewMode, setViewMode] = useState<'split' | 'edit' | 'preview'>('split');
  const [isMathDrawerOpen, setIsMathDrawerOpen] = useState(false);
  const [newTagInput, setNewTagInput] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleContentChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
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

  const handleDownloadMarkdown = () => {
    const blob = new Blob([note.content], { type: 'text/markdown;charset=utf-8' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = `${note.title.toLowerCase().replace(/[^a-z0-9]/g, '-')}.md`;
    link.click();
    addToast({ type: 'success', title: 'İndirildi', message: 'Markdown dosyası indirildi.' });
  };

  const handleCreateTaskFromNote = () => {
    addTask({
      title: `"${note.title}" notunu incele ve geliştir`,
      completed: false,
      priority: 'orta',
      linkedNoteId: note.id,
    });
    setActiveTab('tasks');
  };

  const wordCount = note.content.trim().split(/\s+/).filter(Boolean).length;
  const charCount = note.content.length;

  return (
    <div className="flex-1 flex flex-col h-full bg-[#141414] overflow-hidden relative">
      {/* Top action bar */}
      <div className="flex items-center justify-between px-3.5 sm:px-6 py-3 border-b border-[#282828] bg-[#181818] gap-3 flex-wrap">
        <div className="flex items-center gap-2 flex-1 min-w-[200px]">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden min-h-[38px] min-w-[38px] p-2 bg-[#222] hover:bg-[#2a2a2a] active:bg-[#333] border border-[#333] rounded-xl text-[#d1d5db] flex items-center justify-center transition-colors shrink-0"
              title="Not Listesine Dön"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <input
            type="text"
            value={note.title}
            onChange={handleTitleChange}
            placeholder="Not Başlığı..."
            className="text-base sm:text-lg font-bold text-white bg-transparent border-b border-transparent hover:border-[#383838] focus:border-[#2d5a27] focus:outline-none px-1 py-0.5 w-full transition-colors truncate"
          />
        </div>

        {/* View Mode Toggle & Action Buttons */}
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          {/* Math Drawer Trigger Button */}
          <button
            onClick={() => setIsMathDrawerOpen(true)}
            className="min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 bg-[#202820] hover:bg-[#2d5a27] border border-[#2d5a27]/60 text-emerald-300 hover:text-white rounded-xl text-xs font-semibold shadow-sm transition-all group"
            title="LaTeX Sembol Çekmecesini Aç"
          >
            <Sigma className="w-4 h-4 text-emerald-400 group-hover:scale-110 transition-transform" />
            <span className="hidden sm:inline">LaTeX Sembolleri</span>
          </button>

          {/* View switches */}
          <div className="flex bg-[#222222] p-1 rounded-xl border border-[#333]">
            <button
              onClick={() => setViewMode('edit')}
              className={`min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors ${
                viewMode === 'edit' ? 'bg-[#2d5a27] text-white' : 'text-[#9ca3af] hover:text-white'
              }`}
              title="Yalnızca Editör"
            >
              <Edit3 className="w-3.5 h-3.5" />
              <span>Editör</span>
            </button>
            <button
              onClick={() => setViewMode('split')}
              className={`hidden sm:flex min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-lg items-center gap-1 transition-colors ${
                viewMode === 'split' ? 'bg-[#2d5a27] text-white' : 'text-[#9ca3af] hover:text-white'
              }`}
              title="Bölünmüş Görünüm"
            >
              <Columns2 className="w-3.5 h-3.5" />
              <span>Bölünmüş</span>
            </button>
            <button
              onClick={() => setViewMode('preview')}
              className={`min-h-[32px] px-2.5 py-1 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors ${
                viewMode === 'preview' ? 'bg-[#2d5a27] text-white' : 'text-[#9ca3af] hover:text-white'
              }`}
              title="Yalnızca Önizleme"
            >
              <Eye className="w-3.5 h-3.5" />
              <span>Önizleme</span>
            </button>
          </div>

          {/* Pin & Favorite */}
          <button
            onClick={() => togglePinNote(note.id)}
            className={`min-h-[38px] min-w-[38px] p-2 rounded-xl border transition-colors flex items-center justify-center ${
              note.isPinned
                ? 'bg-amber-950/40 border-amber-600/50 text-amber-300'
                : 'bg-[#222] border-[#333] text-[#9ca3af] hover:text-white'
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
                : 'bg-[#222] border-[#333] text-[#9ca3af] hover:text-white'
            }`}
            title={note.isFavorite ? 'Favorilerden Çıkar' : 'Favorilere Ekle'}
          >
            <Star className={`w-4 h-4 ${note.isFavorite ? 'fill-amber-400' : ''}`} />
          </button>

          {/* Quick Actions */}
          <button
            onClick={handleCopyMarkdown}
            className="min-h-[38px] min-w-[38px] p-2 bg-[#222] hover:bg-[#2c2c2c] border border-[#333] text-[#9ca3af] hover:text-white rounded-xl transition-colors flex items-center justify-center"
            title="Markdown İçeriğini Kopyala"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            onClick={handleDownloadMarkdown}
            className="min-h-[38px] min-w-[38px] p-2 bg-[#222] hover:bg-[#2c2c2c] border border-[#333] text-[#9ca3af] hover:text-white rounded-xl transition-colors flex items-center justify-center"
            title="Markdown Dosyası Olarak İndir (.md)"
          >
            <Download className="w-4 h-4" />
          </button>

          <button
            onClick={handleCreateTaskFromNote}
            className="hidden lg:flex min-h-[38px] px-2.5 py-1.5 bg-[#222] hover:bg-[#2c2c2c] border border-[#333] text-[#d1d5db] rounded-xl text-xs font-medium items-center gap-1.5 transition-colors"
            title="Bu not için görev ekle"
          >
            <CheckSquare className="w-3.5 h-3.5" />
            <span>Görev Oluştur</span>
          </button>

          <button
            onClick={() => {
              deleteNote(note.id);
              if (onBack) onBack();
            }}
            className="min-h-[38px] min-w-[38px] p-2 bg-[#222] hover:bg-rose-950/40 border border-[#333] hover:border-rose-800 text-[#9ca3af] hover:text-rose-300 rounded-xl transition-colors flex items-center justify-center"
            title="Notu Sil"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Metadata bar: Folder, Tags, Dates */}
      <div className="flex items-center gap-2.5 sm:gap-3 px-4 sm:px-6 py-2 bg-[#161616] border-b border-[#242424] text-xs text-[#9ca3af] flex-wrap">
        {/* Folder Select */}
        <div className="flex items-center gap-1.5">
          <Folder className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          <select
            value={note.folder}
            onChange={(e) => updateNote(note.id, { folder: e.target.value })}
            className="bg-[#202020] text-[#e5e7eb] border border-[#333] rounded-lg px-2 py-1 text-xs focus:outline-none focus:border-[#2d5a27] min-h-[34px]"
          >
            {folders.map(f => (
              <option key={f.id} value={f.id}>
                {f.name}
              </option>
            ))}
          </select>
        </div>

        {/* Tags */}
        <div className="flex items-center gap-1.5 flex-wrap flex-1">
          <Tag className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
          {note.tags.map((tag) => (
            <span
              key={tag}
              className="inline-flex items-center gap-1 bg-[#222] border border-[#333] px-2 py-0.5 rounded text-[11px] text-[#e5e7eb]"
            >
              #{tag}
              <button
                onClick={() => handleRemoveTag(tag)}
                className="text-[#71717a] hover:text-rose-400 ml-0.5"
              >
                ×
              </button>
            </span>
          ))}
          <input
            type="text"
            value={newTagInput}
            onChange={(e) => setNewTagInput(e.target.value)}
            onKeyDown={handleAddTag}
            placeholder="+ Etiket ekle (Enter)"
            className="bg-transparent border border-dashed border-[#3a3a3a] focus:border-[#2d5a27] rounded-lg px-2 py-1 text-[11px] text-[#e5e7eb] focus:outline-none w-28 min-h-[32px]"
          />
        </div>

        {/* Updated Date */}
        <div className="hidden sm:flex items-center gap-1 text-[11px] text-[#71717a]">
          <Calendar className="w-3 h-3" />
          <span>Son düzenleme: {formatTurkishDate(note.updatedAt)}</span>
        </div>
      </div>

      {/* Main editor / preview content area */}
      <div className="flex-1 flex flex-col md:flex-row overflow-hidden min-h-0">
        {/* Editor Column */}
        {(viewMode === 'edit' || viewMode === 'split') && (
          <div className={`flex flex-col h-full border-r border-[#262626] ${viewMode === 'split' ? 'md:w-1/2 w-full' : 'w-full'}`}>
            <div className="px-4 py-2 bg-[#181818] border-b border-[#262626] text-[11px] font-medium text-[#71717a] flex items-center justify-between">
              <span>MARKDOWN & FORMÜL GİRDİSİ</span>
              <button
                onClick={() => setIsMathDrawerOpen(true)}
                className="text-emerald-400 hover:underline flex items-center gap-1 font-semibold"
              >
                <Sigma className="w-3 h-3" />
                <span>Sembol Çekmecesini Aç</span>
              </button>
            </div>
            <textarea
              ref={textareaRef}
              value={note.content}
              onChange={handleContentChange}
              placeholder="Notunuzu buraya yazın... Matematik formülleri için $..$ veya $$..$$ kullanın."
              className="flex-1 w-full p-4 sm:p-6 bg-[#121212] text-[#f5f5f0] font-mono text-sm leading-relaxed resize-none focus:outline-none overflow-y-auto selection:bg-[#2d5a27] selection:text-white"
            />
          </div>
        )}

        {/* Right Column: KaTeX Canlı Önizleme */}
        {(viewMode === 'preview' || viewMode === 'split') && (
          <div className={`flex flex-col h-full bg-[#151515] overflow-hidden ${viewMode === 'split' ? 'md:w-1/2 w-full' : 'w-full'}`}>
            {/* Header for Right Panel */}
            <div className="px-4 py-2 bg-[#181818] border-b border-[#262626] flex items-center justify-between sticky top-0 z-10">
              <div className="flex items-center gap-2">
                <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
                <span className="text-xs font-bold text-white tracking-tight">CANLI ÖNİZLEME (KaTeX)</span>
              </div>

              <span className="text-[11px] text-[#71717a]">
                {wordCount} kelime • {charCount} karakter
              </span>
            </div>

            {/* Content view */}
            <div className="flex-1 overflow-y-auto p-4 sm:p-6">
              <KatexPreview content={note.content} />
            </div>
          </div>
        )}
      </div>

      {/* Footer stats bar */}
      <div className="flex items-center justify-between px-4 sm:px-6 py-2 border-t border-[#242424] bg-[#161616] text-xs text-[#71717a]">
        <div className="flex items-center gap-3 sm:gap-4 text-[11px]">
          <span>{wordCount} kelime</span>
          <span>{charCount} karakter</span>
        </div>
        <div className="flex items-center gap-1.5 text-emerald-400 font-medium text-[11px]">
          <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
          <span>Otomatik Kaydedildi</span>
        </div>
      </div>

      {/* Slide-over Math Drawer */}
      <MathDrawer
        isOpen={isMathDrawerOpen}
        onClose={() => setIsMathDrawerOpen(false)}
        onInsertLatex={handleInsertLatex}
      />
    </div>
  );
};
