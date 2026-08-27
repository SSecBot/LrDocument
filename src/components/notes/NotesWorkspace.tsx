'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { NoteEditor } from './NoteEditor';
import { FolderItem } from '@/types';
import {
  Plus,
  Search,
  Folder,
  Star,
  Pin,
  FileText,
  Tag,
  BookOpen,
  Sigma,
  Binary,
  Archive,
  FolderPlus,
  Edit2,
  Trash2,
} from 'lucide-react';
import { formatTurkishDate } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';

export const NotesWorkspace: React.FC = () => {
  const {
    notes,
    activeNoteId,
    setActiveNoteId,
    activeFolder,
    setActiveFolder,
    folders,
    addNote,
    addFolder,
    updateFolder,
    deleteFolder,
  } = useAppStore();

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');

  // Folder Modals state
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');

  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [editFolderDesc, setEditFolderDesc] = useState('');

  const [deletingFolder, setDeletingFolder] = useState<FolderItem | null>(null);

  // Collect all unique tags
  const allTags = Array.from(new Set(notes.flatMap(n => n.tags)));

  // Filter notes
  const filteredNotes = notes.filter((n) => {
    // Folder filter
    if (activeFolder === 'favorites' && !n.isFavorite) return false;
    if (activeFolder !== 'all' && activeFolder !== 'favorites' && n.folder !== activeFolder) return false;

    // Tag filter
    if (selectedTag && !n.tags.includes(selectedTag)) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = n.title.toLowerCase().includes(q);
      const matchContent = n.content.toLowerCase().includes(q);
      const matchTag = n.tags.some(t => t.toLowerCase().includes(q));
      if (!matchTitle && !matchContent && !matchTag) return false;
    }

    return true;
  });

  // Sort notes: pinned first, then updated date descending
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned && !b.isPinned) return -1;
    if (!a.isPinned && b.isPinned) return 1;
    return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
  });

  const activeNote = notes.find(n => n.id === activeNoteId) || sortedNotes[0];

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      addFolder(newFolderName.trim(), newFolderDesc.trim());
      setNewFolderName('');
      setNewFolderDesc('');
      setIsNewFolderModalOpen(false);
    }
  };

  const handleEditFolder = (folder: FolderItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFolder(folder);
    setEditFolderName(folder.name);
    setEditFolderDesc(folder.description || '');
  };

  const handleSaveEditFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFolder && editFolderName.trim()) {
      updateFolder(editingFolder.id, editFolderName.trim(), editFolderDesc.trim());
      setEditingFolder(null);
    }
  };

  const handleDeleteFolderConfirm = () => {
    if (deletingFolder) {
      deleteFolder(deletingFolder.id);
      setDeletingFolder(null);
    }
  };

  const getFolderIcon = (iconName?: string) => {
    switch (iconName) {
      case 'Sigma': return <Sigma className="w-4 h-4 text-emerald-400" />;
      case 'BookOpen': return <BookOpen className="w-4 h-4 text-sky-400" />;
      case 'Binary': return <Binary className="w-4 h-4 text-amber-400" />;
      case 'Archive': return <Archive className="w-4 h-4 text-zinc-400" />;
      default: return <Folder className="w-4 h-4 text-emerald-400" />;
    }
  };

  const handleSelectNoteMobile = (noteId: string) => {
    setActiveNoteId(noteId);
    setMobileView('editor');
  };

  const handleNewNoteMobile = () => {
    const newId = addNote();
    setActiveNoteId(newId);
    setMobileView('editor');
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#121212]">
      {/* Secondary Left Column: Notes List & Folders */}
      <div
        className={`${
          mobileView === 'list' ? 'flex w-full' : 'hidden'
        } md:flex md:w-80 border-r border-[#262626] bg-[#161616] flex-col h-full shrink-0`}
      >
        {/* Header & Search */}
        <div className="p-3.5 sm:p-4 border-b border-[#262626] space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
              <FileText className="w-4 h-4 text-emerald-400" />
              Not Defteri
            </h2>
            <button
              onClick={handleNewNoteMobile}
              className="min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 bg-[#2d5a27] hover:bg-[#387030] active:bg-[#244c1f] text-white text-xs font-semibold rounded-xl shadow-sm transition-all"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Yeni Not</span>
            </button>
          </div>

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Notlarda veya LaTeX'te ara..."
              className="w-full bg-[#202020] border border-[#2e2e2e] focus:border-[#2d5a27] rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-[#71717a] focus:outline-none transition-colors min-h-[40px]"
            />
          </div>
        </div>

        {/* Folders List Bar */}
        <div className="px-3 py-2 border-b border-[#242424] bg-[#131313]">
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider">Klasörler</span>
            <button
              onClick={() => setIsNewFolderModalOpen(true)}
              className="text-[#71717a] hover:text-emerald-400 p-1 rounded transition-colors flex items-center gap-1 text-[11px]"
              title="Yeni Klasör Oluştur"
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>+ Klasör</span>
            </button>
          </div>
          <div className="space-y-0.5 max-h-40 sm:max-h-48 overflow-y-auto pr-0.5 no-scrollbar">
            <button
              onClick={() => { setActiveFolder('all'); setSelectedTag(null); }}
              className={`w-full min-h-[36px] flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeFolder === 'all' && !selectedTag
                  ? 'bg-[#2d5a27]/25 text-emerald-300 border border-[#2d5a27]/40'
                  : 'text-[#9ca3af] hover:text-white hover:bg-[#202020]'
                }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                <span>Tüm Notlar</span>
              </div>
              <span className="text-[10px] text-[#71717a]">{notes.length}</span>
            </button>

            <button
              onClick={() => { setActiveFolder('favorites'); setSelectedTag(null); }}
              className={`w-full min-h-[36px] flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeFolder === 'favorites'
                  ? 'bg-[#2d5a27]/25 text-emerald-300 border border-[#2d5a27]/40'
                  : 'text-[#9ca3af] hover:text-white hover:bg-[#202020]'
                }`}
            >
              <div className="flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
                <span>Favoriler</span>
              </div>
              <span className="text-[10px] text-[#71717a]">
                {notes.filter(n => n.isFavorite).length}
              </span>
            </button>

            {folders.map((folder) => {
              const count = notes.filter(n => n.folder === folder.id).length;
              const isActive = activeFolder === folder.id;

              return (
                <div
                  key={folder.id}
                  onClick={() => { setActiveFolder(folder.id); setSelectedTag(null); }}
                  className={`w-full min-h-[36px] flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer group/f ${isActive
                      ? 'bg-[#2d5a27]/25 text-emerald-300 border border-[#2d5a27]/40'
                      : 'text-[#9ca3af] hover:text-white hover:bg-[#202020]'
                    }`}
                >
                  <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                    {getFolderIcon(folder.iconName)}
                    <span className="truncate">{folder.name}</span>
                  </div>

                  <div className="flex items-center gap-1 shrink-0">
                    <span className="text-[10px] text-[#71717a] group-hover/f:hidden">{count}</span>

                    {/* Edit folder */}
                    <button
                      onClick={(e) => handleEditFolder(folder, e)}
                      className="p-1 hover:text-emerald-400 rounded hidden group-hover/f:inline-block text-[#71717a]"
                      title="Klasörü Düzenle"
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>

                    {/* Delete folder */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeletingFolder(folder);
                      }}
                      className="p-1 hover:text-rose-400 rounded hidden group-hover/f:inline-block text-[#71717a]"
                      title="Klasörü Sil"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="px-3 py-2 border-b border-[#242424] overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 flex-nowrap sm:flex-wrap">
              <Tag className="w-3 h-3 text-[#71717a] shrink-0" />
              {allTags.slice(0, 8).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`min-h-[28px] text-[10px] px-2.5 py-0.5 rounded-full transition-all whitespace-nowrap ${selectedTag === tag
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-medium'
                      : 'bg-[#202020] text-[#71717a] hover:text-[#d1d5db] border border-[#2a2a2a]'
                    }`}
                >
                  #{tag}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {sortedNotes.length === 0 ? (
            <div className="p-6 text-center text-[#71717a] text-xs space-y-2">
              <FileText className="w-8 h-8 text-[#333] mx-auto mb-1" />
              <p className="text-white font-medium">Henüz kayıtlı bir not bulunmuyor.</p>
              <p className="text-[11px] text-[#888]">Yeni bir not eklemek için yukarıdaki butonu kullanın.</p>
            </div>
          ) : (
            sortedNotes.map((n) => {
              const isSelected = activeNote?.id === n.id;
              const snippet = n.content
                .replace(/[#*`$\n]/g, ' ')
                .trim()
                .substring(0, 90);

              return (
                <div
                  key={n.id}
                  onClick={() => handleSelectNoteMobile(n.id)}
                  className={`p-3 sm:p-3.5 rounded-xl cursor-pointer border transition-all relative group ${isSelected
                      ? 'bg-[#202820] border-[#2d5a27] shadow-lg shadow-black/40'
                      : 'bg-[#1a1a1a] hover:bg-[#222222] active:bg-[#252525] border-[#282828] hover:border-[#383838]'
                    }`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-semibold text-white truncate flex-1 flex items-center gap-1.5">
                      {n.isPinned && (
                        <Pin className="w-3 h-3 text-amber-400 shrink-0 rotate-45" />
                      )}
                      <span className="truncate">{n.title || 'Başlıksız Not'}</span>
                    </h3>
                    {n.isFavorite && (
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                    )}
                  </div>

                  <p className="text-[11px] text-[#9ca3af] line-clamp-2 mt-1 leading-normal">
                    {snippet || 'İçerik yok...'}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-[#262626] text-[10px] text-[#71717a]">
                    <span>{formatTurkishDate(n.updatedAt)}</span>
                    <div className="flex items-center gap-1">
                      {n.tags.slice(0, 2).map(t => (
                        <span key={t} className="bg-[#242424] px-1.5 py-0.2 rounded text-[#9ca3af]">
                          {t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Main Right Area: Active Note Editor */}
      <div
        className={`${
          mobileView === 'editor' ? 'flex flex-1' : 'hidden'
        } md:flex md:flex-1 h-full overflow-hidden`}
      >
        {activeNote ? (
          <NoteEditor
            key={activeNote.id}
            note={activeNote}
            onBack={() => setMobileView('list')}
          />
        ) : (
          <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[#71717a] space-y-3">
            <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-[#2e2e2e] flex items-center justify-center text-emerald-400 shadow-inner">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">Henüz Kayıtlı Bir Not Bulunmuyor</h3>
            <p className="text-xs max-w-md text-[#9ca3af] leading-relaxed">
              Markdown formatında zengin notlar yazabilir, canlı KaTeX formülleri ($e^{'{'}i\pi{'}'} + 1 = 0$) ekleyebilir ve klasörlerle organize edebilirsiniz.
            </p>
            <button
              onClick={handleNewNoteMobile}
              className="mt-2 px-5 py-2.5 bg-[#2d5a27] hover:bg-[#387030] text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>İlk Notunuzu Başlatın</span>
            </button>
          </div>
        )}
      </div>

      {/* Create Folder Modal */}
      <Modal
        isOpen={isNewFolderModalOpen}
        onClose={() => setIsNewFolderModalOpen(false)}
        title="Yeni Klasör Oluştur"
        subtitle="Notlarınızı kategorize etmek için bir klasör ekleyin."
      >
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white mb-1">Klasör Adı *</label>
            <input
              type="text"
              required
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder="Örn: Kuantum Mekaniği, YKS 2026..."
              className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white mb-1">Açıklama (Opsiyonel)</label>
            <input
              type="text"
              value={newFolderDesc}
              onChange={(e) => setNewFolderDesc(e.target.value)}
              placeholder="Bu klasördeki notların kısa açıklaması..."
              className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none min-h-[44px]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setIsNewFolderModalOpen(false)}
              className="min-h-[40px] px-4 py-2 bg-[#262626] hover:bg-[#333] text-xs font-medium text-[#d1d5db] rounded-xl transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 bg-[#2d5a27] hover:bg-[#387030] text-xs font-semibold text-white rounded-xl shadow-md transition-colors"
            >
              Klasör Oluştur
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Folder Modal */}
      <Modal
        isOpen={!!editingFolder}
        onClose={() => setEditingFolder(null)}
        title="Klasörü Düzenle"
        subtitle="Klasör adını ve açıklamasını güncelleyin."
      >
        <form onSubmit={handleSaveEditFolder} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white mb-1">Klasör Adı *</label>
            <input
              type="text"
              required
              value={editFolderName}
              onChange={(e) => setEditFolderName(e.target.value)}
              className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white mb-1">Açıklama (Opsiyonel)</label>
            <input
              type="text"
              value={editFolderDesc}
              onChange={(e) => setEditFolderDesc(e.target.value)}
              className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl px-3.5 py-2.5 text-sm text-white focus:outline-none min-h-[44px]"
            />
          </div>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setEditingFolder(null)}
              className="min-h-[40px] px-4 py-2 bg-[#262626] hover:bg-[#333] text-xs font-medium text-[#d1d5db] rounded-xl transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 bg-[#2d5a27] hover:bg-[#387030] text-xs font-semibold text-white rounded-xl shadow-md transition-colors"
            >
              Kaydet
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Folder Confirm Modal */}
      <Modal
        isOpen={!!deletingFolder}
        onClose={() => setDeletingFolder(null)}
        title="Klasörü Sil"
        subtitle="Bu klasörü silmek istediğinize emin misiniz? İçindeki notlar silinmez, kök dizine taşınır."
      >
        <div className="space-y-4 pt-2">
          <p className="text-xs text-[#d1d5db]">
            <strong>{deletingFolder?.name}</strong> klasörü silinecektir.
          </p>
          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setDeletingFolder(null)}
              className="min-h-[40px] px-4 py-2 bg-[#262626] hover:bg-[#333] text-xs font-medium text-[#d1d5db] rounded-xl transition-colors"
            >
              Vazgeç
            </button>
            <button
              type="button"
              onClick={handleDeleteFolderConfirm}
              className="min-h-[40px] px-4 py-2 bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white rounded-xl shadow-md transition-colors"
            >
              Evet, Sil
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
