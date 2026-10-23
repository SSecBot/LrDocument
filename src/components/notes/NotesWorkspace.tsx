'use client';

import { t as tl, tx } from '@/lib/i18n';
import { responseError } from '@/lib/errors';
import React, { useContext, useRef, useState } from 'react';
import { SpaceContext, useAppStore } from '@/store/useAppStore';
import { NoteEditor } from './NoteEditor';
import { SecretNotes } from './SecretNotes';
import { FolderIcon, FolderIconPicker } from './folderIcons';
import { FolderItem } from '@/types';
import {
  Plus,
  Search,
  Star,
  Pin,
  FileText,
  Tag,
  FolderPlus,
  Edit2,
  Trash2,
  Upload,
  Loader2,
  PanelLeftClose,
  PanelLeftOpen,
  ArrowUpDown,
  ChevronUp,
  ChevronDown,
  GripVertical,
  Check,
  Lock,
  Table2,
  FileType2,
} from 'lucide-react';
import { applyOrder, moveId, moveIdTo, type UserPreferences } from '@/lib/preferences';
import { useSwipe } from '@/lib/shortcuts';
import { importNoteFile, ImportError, NOTE_IMPORT_ACCEPT } from '@/lib/noteImport';
import { importTableFile, TABLE_IMPORT_ACCEPT } from '@/lib/noteExport';
import { newDoc, parseDoc } from '@/lib/sheet/engine';
import { describePdfError } from '@/lib/academic/pdfErrors';
import { formatTurkishDate } from '@/lib/utils';
import { Modal } from '@/components/ui/Modal';
import { canEdit, isCorporate } from '@/lib/corporate';

const tableTextCache = new Map<string, string>();
/** Cell values of a table note, for the note search (cached per content). */
function searchableTableText(content: string): string {
  let text = tableTextCache.get(content);
  if (text === undefined) {
    text = parseDoc(content)
      .sheets.flatMap((s) => [s.name, ...Object.values(s.cells).map((c) => c.v)])
      .join(' ');
    if (tableTextCache.size > 200) tableTextCache.clear();
    tableTextCache.set(content, text);
  }
  return text;
}

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
    preferences,
    setPreference,
    addToast,
    currentUser,
  } = useAppStore();
  const editable = canEdit(currentUser, 'notes');
  const space = useContext(SpaceContext);
  const collapsed = preferences.notesPanelCollapsed;
  const fileRef = useRef<HTMLInputElement>(null);
  const [importing, setImporting] = useState<string | null>(null);

  // İçe aktar: first the type (Not / Tablo), then only files of that type can be chosen.
  const [importDialog, setImportDialog] = useState(false);
  const [importMode, setImportMode] = useState<'note' | 'table'>('note');
  const [pdfAsText, setPdfAsText] = useState(false);
  const [handwriting, setHandwriting] = useState(false);
  const [newMenu, setNewMenu] = useState(false);

  const isSheetFile = (f: File) => /\.(xlsx|xls|xlsm|ods|csv|tsv)$/i.test(f.name);

  /** A PDF kept as it is: uploaded (encrypted on the server) and shown with the PDF reader. */
  const uploadPdf = async (file: File): Promise<string> => {
    if (file.size > 25 * 1024 * 1024) throw new ImportError(tl('PDF en fazla 25 MB olabilir.'));
    const res = await fetch(`/api/files${space === 'personal' ? '?personal=1' : ''}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/pdf', 'X-File-Name': encodeURIComponent(file.name) },
      body: file,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new ImportError(responseError(res, data, tl('PDF yüklenemedi.')));
    return data.id as string;
  };

  const handleImport = async (files: FileList | null) => {
    if (!files?.length) return;
    let lastId: string | null = null;
    for (const file of Array.from(files).slice(0, 10)) {
      setImporting(`${file.name} okunuyor…`);
      try {
        // An Excel / CSV file always becomes a table note.
        if (importMode === 'table' || isSheetFile(file)) {
          const t = await importTableFile(file);
          lastId = addNote({ title: t.title, content: JSON.stringify(t.doc), kind: 'table' });
          addToast({ type: 'success', title: tl('Tablo içe aktarıldı'), message: [`“${t.title}”`, ...t.notes].join(' — ') });
          continue;
        }
        const isPdf = /\.pdf$/i.test(file.name) || file.type === 'application/pdf';
        if (isPdf && !pdfAsText) {
          setImporting(tl('{name} şifrelenip kaydediliyor…', { name: file.name }));
          const fileId = await uploadPdf(file);
          lastId = addNote({ title: file.name.replace(/\.pdf$/i, '').slice(0, 200) || 'PDF', content: '', kind: 'pdf', fileId });
          addToast({ type: 'success', title: tl('PDF eklendi'), message: tl('“{name}” uygulamada açılır; istediğinizde metne dönüştürebilirsiniz.', { name: file.name }) });
          continue;
        }
        const result = await importNoteFile(
          file,
          (p) =>
            setImporting(p.stage === 'ocr' ? tl('{name}: sayfa {page}/{pages} metin tanıma %{v3}', { name: file.name, page: p.page, pages: p.pages, v3: Math.round(p.progress * 100) }) : `${file.name}: sayfa ${p.page || 1}/${p.pages || '…'}`),
          { handwriting }
        );
        lastId = addNote({ title: result.title, content: result.content });
        addToast({
          type: result.notes.length ? 'warning' : 'success',
          title: tl('Not içe aktarıldı'),
          message: [`“${result.title}”`, ...result.notes].join(' — '),
        });
      } catch (err) {
        console.error(err);
        addToast({
          type: 'error',
          title: tl('{name} aktarılamadı', { name: file.name }),
          message: err instanceof ImportError ? err.message : describePdfError(err),
        });
      }
    }
    setImporting(null);
    if (fileRef.current) fileRef.current.value = '';
    if (lastId) {
      setActiveNoteId(lastId);
      setMobileView('editor');
    }
  };

  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTag, setSelectedTag] = useState<string | null>(null);
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');
  // Phones: swiping from the left edge goes back from a note to the list (like the system back gesture).
  const editorSwipe = useSwipe<HTMLDivElement>({ fromLeftEdge: 32, onRight: () => setMobileView('list'), enabled: preferences.touchGestures });

  // Folder Modals state
  const [isNewFolderModalOpen, setIsNewFolderModalOpen] = useState(false);
  const [newFolderName, setNewFolderName] = useState('');
  const [newFolderDesc, setNewFolderDesc] = useState('');
  const [newFolderIcon, setNewFolderIcon] = useState(tl('Folder'));

  const [editingFolder, setEditingFolder] = useState<FolderItem | null>(null);
  const [editFolderName, setEditFolderName] = useState('');
  const [editFolderDesc, setEditFolderDesc] = useState('');
  const [editFolderIcon, setEditFolderIcon] = useState(tl('Folder'));

  const [deletingFolder, setDeletingFolder] = useState<FolderItem | null>(null);
  const [deleteWithNotes, setDeleteWithNotes] = useState(false);
  const deletingCount = deletingFolder ? notes.filter((n) => n.folder === deletingFolder.id).length : 0;

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
      // Tables: the cell values (not the stored JSON); PDF notes: the title only.
      const matchContent = (n.kind === 'table' ? searchableTableText(n.content) : n.kind === 'pdf' ? '' : n.content).toLowerCase().includes(q);
      const matchTag = n.tags.some(t => t.toLowerCase().includes(q));
      if (!matchTitle && !matchContent && !matchTag) return false;
    }

    return true;
  });

  // Sıralama: pinned first, then the chosen order (son düzenlenen, oluşturma, başlık or elle).
  const noteSort = preferences.noteSort;
  const byUpdated = [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
  const manualIds = applyOrder(byUpdated, preferences.noteOrder).map((n) => n.id);
  const manualRank = new Map(manualIds.map((id, i) => [id, i]));
  const sortedNotes = [...filteredNotes].sort((a, b) => {
    if (a.isPinned !== b.isPinned) return a.isPinned ? -1 : 1;
    switch (noteSort) {
      case 'created':
        return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
      case 'title':
        return (a.title || '').localeCompare(b.title || '', 'tr', { sensitivity: 'base', numeric: true });
      case 'manual':
        return (manualRank.get(a.id) ?? 0) - (manualRank.get(b.id) ?? 0);
      default:
        return new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime();
    }
  });

  const saveNoteOrder = (ids: string[]) => setPreference('noteOrder', ids.slice(0, 1000));
  /** Elle sıralama: one step up / down among the notes shown (within the pinned / unpinned group). */
  const stepNote = (id: string, step: -1 | 1) => {
    const i = sortedNotes.findIndex((n) => n.id === id);
    const neighbor = sortedNotes[i + step];
    if (i < 0 || !neighbor || neighbor.isPinned !== sortedNotes[i].isPinned) return;
    saveNoteOrder(moveIdTo(manualIds, id, neighbor.id));
  };

  // Klasör sırası (kişisel tercih)
  const orderedFolders = applyOrder(folders, preferences.folderOrder);
  const folderIds = orderedFolders.map((f) => f.id);
  const [reorderFolders, setReorderFolders] = useState(false);
  const [dragging, setDragging] = useState<{ kind: 'folder' | 'note'; id: string } | null>(null);
  const [dropTarget, setDropTarget] = useState<string | null>(null);
  const dropHandlers = (kind: 'folder' | 'note', id: string) => ({
    onDragOver: (e: React.DragEvent) => {
      if (dragging?.kind !== kind || dragging.id === id) return;
      e.preventDefault();
      e.dataTransfer.dropEffect = 'move';
      if (dropTarget !== id) setDropTarget(id);
    },
    onDragLeave: () => {
      if (dropTarget === id) setDropTarget(null);
    },
    onDrop: (e: React.DragEvent) => {
      e.preventDefault();
      if (dragging?.kind !== kind) return;
      if (kind === 'folder') setPreference('folderOrder', moveIdTo(folderIds, dragging.id, id));
      else saveNoteOrder(moveIdTo(manualIds, dragging.id, id));
      setDragging(null);
      setDropTarget(null);
    },
  });
  const dragHandlers = (kind: 'folder' | 'note', id: string) => ({
    draggable: true,
    onDragStart: (e: React.DragEvent) => {
      e.dataTransfer.effectAllowed = 'move';
      e.dataTransfer.setData('text/plain', id);
      setDragging({ kind, id });
    },
    onDragEnd: () => {
      setDragging(null);
      setDropTarget(null);
    },
  });

  const activeNote = notes.find(n => n.id === activeNoteId) || sortedNotes[0];

  const handleCreateFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (newFolderName.trim()) {
      addFolder(newFolderName.trim(), newFolderDesc.trim(), newFolderIcon);
      setNewFolderName('');
      setNewFolderDesc('');
      setNewFolderIcon(tl('Folder'));
      setIsNewFolderModalOpen(false);
    }
  };

  const handleEditFolder = (folder: FolderItem, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingFolder(folder);
    setEditFolderName(folder.name);
    setEditFolderDesc(folder.description || '');
    setEditFolderIcon(folder.iconName || tl('Folder'));
  };

  const handleSaveEditFolder = (e: React.FormEvent) => {
    e.preventDefault();
    if (editingFolder && editFolderName.trim()) {
      updateFolder(editingFolder.id, editFolderName.trim(), editFolderDesc.trim(), editFolderIcon);
      setEditingFolder(null);
    }
  };

  const askDeleteFolder = (folder: FolderItem) => {
    setDeleteWithNotes(false);
    setDeletingFolder(folder);
  };

  const handleDeleteFolderConfirm = () => {
    if (deletingFolder) {
      deleteFolder(deletingFolder.id, { withNotes: deleteWithNotes });
      setDeletingFolder(null);
    }
  };

  // Always visible on touch screens; on desktop they appear on hover / keyboard focus.
  const folderActionCls =
    'w-7 h-7 items-center justify-center rounded text-muted hover:text-emerald-400 hover:bg-surface-3 inline-flex [@media(hover:hover)]:hidden [@media(hover:hover)]:group-hover/f:inline-flex [@media(hover:hover)]:group-focus-within/f:inline-flex';

  const getFolderIcon = (iconName?: string) => <FolderIcon name={iconName} className="w-3.5 h-3.5 text-muted shrink-0" />;

  const handleSelectNoteMobile = (noteId: string) => {
    setActiveNoteId(noteId);
    setMobileView('editor');
  };

  const handleNewNoteMobile = (kind: 'text' | 'table' = 'text') => {
    setNewMenu(false);
    const newId = kind === 'table' ? addNote({ kind: 'table', content: JSON.stringify(newDoc()) }) : addNote();
    setActiveNoteId(newId);
    setMobileView('editor');
  };
  const openImport = () => setImportDialog(true);
  const chooseImport = (mode: 'note' | 'table') => {
    setImportMode(mode);
    setImportDialog(false);
    // The file picker opens from the click (browsers allow it only then).
    if (fileRef.current) {
      fileRef.current.accept = mode === 'table' ? TABLE_IMPORT_ACCEPT : NOTE_IMPORT_ACCEPT;
      fileRef.current.click();
    }
  };

  // Gizli notlar: personal — in a corporate account they live in Şahsi Notlar, for the owner only
  // (a member signed in with a code shares the owner's account key).
  const secretAllowed = !currentUser?.memberId && (space === 'personal' || !isCorporate(currentUser));
  if (activeFolder === 'secret' && secretAllowed) {
    return <SecretNotes onExit={() => setActiveFolder('all')} />;
  }

  return (
    <div className="flex h-full w-full overflow-hidden bg-app">
      <input
        ref={fileRef}
        type="file"
        multiple
        accept={NOTE_IMPORT_ACCEPT}
        className="sr-only"
        tabIndex={-1}
        aria-hidden="true"
        onChange={(e) => handleImport(e.target.files)}
      />

      {/* Collapsed rail (desktop) */}
      {collapsed && (
        <div className="hidden md:flex w-11 shrink-0 flex-col items-center gap-1 py-2 border-r border-line bg-surface">
          <button
            onClick={() => setPreference('notesPanelCollapsed', false)}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2"
            title={tl('Not listesini göster')}
            aria-label={tl('Not listesini göster')}
          >
            <PanelLeftOpen className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleNewNoteMobile()}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2"
            title={tl('Yeni not')}
            aria-label={tl('Yeni not')}
          >
            <Plus className="w-4 h-4" />
          </button>
          <button
            onClick={() => handleNewNoteMobile('table')}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2"
            title={tl('Yeni tablo')}
            aria-label={tl('Yeni tablo')}
          >
            <Table2 className="w-4 h-4" />
          </button>
          <button
            onClick={openImport}
            disabled={!!importing}
            className="w-8 h-8 rounded-md flex items-center justify-center text-muted hover:text-fg hover:bg-surface-2"
            title={tl('Dosyadan içe aktar')}
            aria-label={tl('Dosyadan içe aktar')}
          >
            {importing ? <Loader2 className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          </button>
        </div>
      )}

      {/* Secondary Left Column: Notes List & Folders */}
      <div
        className={`${
          mobileView === 'list' ? 'flex w-full' : 'hidden'
        } ${collapsed ? 'md:hidden' : 'md:flex'} md:w-80 border-r border-line bg-surface flex-col h-full shrink-0`}
      >
        {/* Header & Search */}
        <div className="p-3.5 sm:p-4 border-b border-line space-y-3">
          <div className="flex items-center justify-between gap-2">
            <h2 className="text-sm font-semibold text-fg tracking-tight">{space === 'personal' ? tl('Şahsi Notlar') : isCorporate(currentUser) ? tl('Ortak Notlar') : tl('Notlar')}</h2>
            <div className="flex items-center gap-1">
              {editable && (
                <>
              <button
                onClick={openImport}
                disabled={!!importing}
                className="min-h-[36px] flex items-center gap-1.5 px-2.5 text-xs text-body hover:text-fg bg-surface-2 hover:bg-surface-3 border border-line rounded-md transition-colors disabled:opacity-60"
                title={tl('Dosyadan not veya tablo oluştur')}
              >
                {importing ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Upload className="w-3.5 h-3.5" />}
                <span>{tl('İçe aktar')}</span>
              </button>
              <div className="relative">
                <button
                  onClick={() => setNewMenu((v) => !v)}
                  aria-haspopup="menu"
                  aria-expanded={newMenu}
                  className="min-h-[36px] flex items-center gap-1.5 px-2.5 bg-brand hover:bg-brand-hover active:bg-brand-active text-white text-xs font-medium rounded-md transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>{tl('Yeni')}</span>
                </button>
                {newMenu && (
                  <>
                    <div className="fixed inset-0 z-30" onClick={() => setNewMenu(false)} aria-hidden="true" />
                    <div role="menu" className="absolute right-0 top-full mt-1 z-40 w-48 rounded-lg border border-line bg-surface shadow-xl p-1">
                      <button role="menuitem" onClick={() => handleNewNoteMobile('text')} className="w-full text-left px-2.5 py-2 rounded-md hover:bg-surface-2 flex items-center gap-2 text-sm text-fg">
                        <FileText className="w-4 h-4 text-subtle" />{' '}{tl('Not')}
                      </button>
                      <button role="menuitem" onClick={() => handleNewNoteMobile('table')} className="w-full text-left px-2.5 py-2 rounded-md hover:bg-surface-2 flex items-center gap-2 text-sm text-fg">
                        <Table2 className="w-4 h-4 text-subtle" />{' '}{tl('Tablo (Excel gibi)')}
                      </button>
                    </div>
                  </>
                )}
              </div>
                </>
              )}
              <button
                onClick={() => setPreference('notesPanelCollapsed', true)}
                className="hidden md:flex w-9 h-9 items-center justify-center rounded-md text-muted hover:text-fg hover:bg-surface-2"
                title={tl('Not listesini gizle')}
                aria-label={tl('Not listesini gizle')}
              >
                <PanelLeftClose className="w-4 h-4" />
              </button>
            </div>
          </div>
          {importing && <p className="text-[11px] text-subtle truncate" aria-live="polite">{tx(importing)}</p>}

          {/* Search bar */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder={tl('Notlarda veya LaTeX\'te ara...')}
              className="w-full bg-surface-2 border border-line focus:border-brand rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-muted focus:outline-none transition-colors min-h-[40px]"
            />
          </div>
        </div>

        {/* Folders List Bar */}
        <div className="px-3 py-2 border-b border-line bg-app">
          <div className="flex items-center justify-between px-2 mb-1.5">
            <span className="text-[10px] font-bold text-muted uppercase tracking-wider">{tl('Klasörler')}</span>
            <div className="flex items-center gap-1">
            {folders.length > 1 && (
              <button
                onClick={() => setReorderFolders((v) => !v)}
                aria-pressed={reorderFolders}
                className={`p-1 rounded transition-colors flex items-center gap-1 text-[11px] ${reorderFolders ? 'text-emerald-400' : 'text-muted hover:text-emerald-400'}`}
                title={reorderFolders ? tl('Sıralamayı bitir') : tl('Klasörleri sırala (sürükleyin veya oklarla taşıyın)')}
              >
                {reorderFolders ? <Check className="w-3.5 h-3.5" /> : <ArrowUpDown className="w-3.5 h-3.5" />}
                <span>{reorderFolders ? tl('Bitti') : tl('Sırala')}</span>
              </button>
            )}
            {editable && !reorderFolders && (
            <button
              onClick={() => setIsNewFolderModalOpen(true)}
              className="text-muted hover:text-emerald-400 p-1 rounded transition-colors flex items-center gap-1 text-[11px]"
              title={tl('Yeni Klasör Oluştur')}
            >
              <FolderPlus className="w-3.5 h-3.5" />
              <span>{tl('+ Klasör')}</span>
            </button>
            )}
            </div>
          </div>
          <div className="space-y-0.5 max-h-40 sm:max-h-48 overflow-y-auto pr-0.5 no-scrollbar">
            <button
              onClick={() => { setActiveFolder('all'); setSelectedTag(null); }}
              className={`w-full min-h-[36px] flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeFolder === 'all' && !selectedTag
                  ? 'bg-brand/25 text-emerald-300 border border-brand/40'
                  : 'text-subtle hover:text-white hover:bg-surface-2'
                }`}
            >
              <div className="flex items-center gap-2">
                <FileText className="w-3.5 h-3.5" />
                <span>{tl('Tüm Notlar')}</span>
              </div>
              <span className="text-[10px] text-muted">{notes.length}</span>
            </button>

            <button
              onClick={() => { setActiveFolder('favorites'); setSelectedTag(null); }}
              className={`w-full min-h-[36px] flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeFolder === 'favorites'
                  ? 'bg-brand/25 text-emerald-300 border border-brand/40'
                  : 'text-subtle hover:text-white hover:bg-surface-2'
                }`}
            >
              <div className="flex items-center gap-2">
                <Star className="w-3.5 h-3.5 text-amber-400 fill-amber-400/30" />
                <span>{tl('Favoriler')}</span>
              </div>
              <span className="text-[10px] text-muted">
                {notes.filter(n => n.isFavorite).length}
              </span>
            </button>

            {secretAllowed && (
              <button
                onClick={() => { setActiveFolder('secret'); setSelectedTag(null); }}
                className="w-full min-h-[36px] flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors text-subtle hover:text-white hover:bg-surface-2"
              >
                <div className="flex items-center gap-2">
                  <Lock className="w-3.5 h-3.5 text-amber-400" />
                  <span>{tl('Gizli Notlar')}</span>
                </div>
                <span className="text-[10px] text-muted">{tl('şifreli')}</span>
              </button>
            )}

            {orderedFolders.map((folder, index) => {
              const count = notes.filter(n => n.folder === folder.id).length;
              const isActive = activeFolder === folder.id;

              return (
                <div
                  key={folder.id}
                  {...dragHandlers('folder', folder.id)}
                  {...dropHandlers('folder', folder.id)}
                  onClick={() => { if (!reorderFolders) { setActiveFolder(folder.id); setSelectedTag(null); } }}
                  className={`w-full min-h-[36px] flex items-center justify-between px-2.5 py-1.5 rounded-lg text-xs font-medium transition-colors cursor-pointer group/f ${isActive
                      ? 'bg-brand/25 text-emerald-300 border border-brand/40'
                      : 'text-subtle hover:text-white hover:bg-surface-2'
                    } ${dropTarget === folder.id ? 'ring-1 ring-brand' : ''} ${dragging?.id === folder.id ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-center gap-2 truncate flex-1 min-w-0">
                    {reorderFolders ? <GripVertical className="w-3.5 h-3.5 text-muted shrink-0" /> : getFolderIcon(folder.iconName)}
                    <span className="truncate">{tx(folder.name)}</span>
                  </div>

                  {reorderFolders ? (
                    <div className="flex items-center gap-0.5 shrink-0">
                      <button
                        onClick={(e) => { e.stopPropagation(); setPreference('folderOrder', moveId(folderIds, folder.id, -1)); }}
                        disabled={index === 0}
                        className="w-8 h-8 inline-flex items-center justify-center rounded text-muted hover:text-fg hover:bg-surface-3 disabled:opacity-30"
                        aria-label={tl('{name} klasörünü yukarı taşı', { name: folder.name })}
                      >
                        <ChevronUp className="w-4 h-4" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); setPreference('folderOrder', moveId(folderIds, folder.id, 1)); }}
                        disabled={index === orderedFolders.length - 1}
                        className="w-8 h-8 inline-flex items-center justify-center rounded text-muted hover:text-fg hover:bg-surface-3 disabled:opacity-30"
                        aria-label={tl('{name} klasörünü aşağı taşı', { name: folder.name })}
                      >
                        <ChevronDown className="w-4 h-4" />
                      </button>
                    </div>
                  ) : (
                  <div className="flex items-center gap-1 shrink-0">
                    <span className={`text-[10px] text-muted ${editable ? '[@media(hover:hover)]:group-hover/f:hidden [@media(hover:hover)]:group-focus-within/f:hidden' : ''}`}>{count}</span>

                    {/* Edit folder */}
                    {editable && (
                      <>
                    <button
                      onClick={(e) => handleEditFolder(folder, e)}
                      className={folderActionCls}
                      title={tl('Klasörü düzenle')}
                      aria-label={tl('{name} klasörünü düzenle', { name: folder.name })}
                    >
                      <Edit2 className="w-3 h-3" />
                    </button>

                    {/* Delete folder */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        askDeleteFolder(folder);
                      }}
                      className={`${folderActionCls} hover:!text-rose-400`}
                      title={tl('Klasörü sil')}
                      aria-label={tl('{name} klasörünü sil', { name: folder.name })}
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                      </>
                    )}
                  </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Tag Filters */}
        {allTags.length > 0 && (
          <div className="px-3 py-2 border-b border-line overflow-x-auto no-scrollbar">
            <div className="flex items-center gap-1.5 flex-nowrap sm:flex-wrap">
              <Tag className="w-3 h-3 text-muted shrink-0" />
              {allTags.slice(0, 8).map((tag) => (
                <button
                  key={tag}
                  onClick={() => setSelectedTag(selectedTag === tag ? null : tag)}
                  className={`min-h-[28px] text-[10px] px-2.5 py-0.5 rounded-full transition-all whitespace-nowrap ${selectedTag === tag
                      ? 'bg-emerald-500/20 text-emerald-300 border border-emerald-500/40 font-medium'
                      : 'bg-surface-2 text-muted hover:text-body border border-line'
                    }`}
                >
                  #{tx(tag)}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Sıralama */}
        <div className="px-3 py-1.5 border-b border-line flex items-center justify-between gap-2">
          <label htmlFor="note-sort" className="text-[11px] text-muted flex items-center gap-1.5">
            <ArrowUpDown className="w-3 h-3" />{' '}{tl('Sırala')}
          </label>
          <select
            id="note-sort"
            value={noteSort}
            onChange={(e) => setPreference('noteSort', e.target.value as UserPreferences['noteSort'])}
            className="h-8 bg-surface-2 border border-line rounded-md px-2 text-[11px] text-body focus:outline-none focus:border-brand"
          >
            <option value="updated">{tl('Son düzenlenen')}</option>
            <option value="created">{tl('Oluşturma tarihi')}</option>
            <option value="title">{tl('Başlık (A–Z)')}</option>
            <option value="manual">{tl('Elle (sürükle / oklar)')}</option>
          </select>
        </div>

        {/* Notes list */}
        <div className="flex-1 overflow-y-auto p-2 space-y-1.5">
          {sortedNotes.length === 0 ? (
            <div className="p-5 text-center text-muted text-xs space-y-2">
              <FileText className="w-8 h-8 text-muted mx-auto mb-1" />
              <p className="text-white font-medium">{tl('Henüz kayıtlı bir not bulunmuyor.')}</p>
              {editable && <p className="text-[11px] text-subtle">{tl('Yeni bir not eklemek için yukarıdaki butonu kullanın.')}</p>}
            </div>
          ) : (
            sortedNotes.map((n, index) => {
              const isSelected = activeNote?.id === n.id;
              const manual = noteSort === 'manual';
              const canUp = manual && index > 0 && sortedNotes[index - 1].isPinned === n.isPinned;
              const canDown = manual && index < sortedNotes.length - 1 && sortedNotes[index + 1].isPinned === n.isPinned;
              const kindLabel = n.kind === 'table' ? tl('Tablo') : n.kind === 'pdf' ? 'PDF' : tl('Not');
              const snippet =
                n.kind === 'table'
                  ? tl('Tablo notu')
                  : n.kind === 'pdf'
                    ? tl('PDF belgesi — uygulamada açılır')
                    : n.content
                        .replace(/[#*`$\n]/g, ' ')
                        .trim()
                        .substring(0, 90);

              return (
                <div
                  key={n.id}
                  {...(manual ? { ...dragHandlers('note', n.id), ...dropHandlers('note', n.id) } : {})}
                  onClick={() => handleSelectNoteMobile(n.id)}
                  className={`p-3 sm:p-3.5 rounded-xl cursor-pointer border transition-all relative group ${isSelected
                      ? 'bg-surface-2 border-brand'
                      : 'bg-surface hover:bg-surface-2 active:bg-surface-2 border-line hover:border-line-strong'
                    } ${dropTarget === n.id ? 'ring-1 ring-brand' : ''} ${dragging?.id === n.id ? 'opacity-50' : ''}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <h3 className="text-xs font-semibold text-white truncate flex-1 flex items-center gap-1.5">
                      {n.isPinned && (
                        <Pin className="w-3 h-3 text-amber-400 shrink-0 rotate-45" />
                      )}
                      <span className="truncate">{n.title || tl('Başlıksız Not')}</span>
                    </h3>
                    {n.isFavorite && (
                      <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />
                    )}
                    {manual && (
                      <span className="flex items-center -my-1 -mr-1 shrink-0">
                        <button
                          onClick={(e) => { e.stopPropagation(); stepNote(n.id, -1); }}
                          disabled={!canUp}
                          className="w-7 h-7 inline-flex items-center justify-center rounded text-muted hover:text-fg hover:bg-surface-3 disabled:opacity-30"
                          aria-label={tl('{v0} yukarı taşı', { v0: n.title || 'Not' })}
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={(e) => { e.stopPropagation(); stepNote(n.id, 1); }}
                          disabled={!canDown}
                          className="w-7 h-7 inline-flex items-center justify-center rounded text-muted hover:text-fg hover:bg-surface-3 disabled:opacity-30"
                          aria-label={tl('{v0} aşağı taşı', { v0: n.title || 'Not' })}
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </button>
                      </span>
                    )}
                  </div>

                  <p className="text-[11px] text-subtle line-clamp-2 mt-1 leading-normal">
                    {snippet || tl('İçerik yok...')}
                  </p>

                  <div className="flex items-center justify-between mt-2 pt-2 border-t border-line text-[10px] text-muted">
                    <span className="flex items-center gap-1.5">
                      {tx(formatTurkishDate(n.updatedAt))}
                      <span className="text-muted">·</span>
                      <span className="inline-flex items-center gap-1">
                        {n.kind === 'table' ? <Table2 className="w-3 h-3" /> : n.kind === 'pdf' ? <FileType2 className="w-3 h-3" /> : <FileText className="w-3 h-3" />}
                        {tx(kindLabel)}
                      </span>
                    </span>
                    <div className="flex items-center gap-1">
                      {n.tags.slice(0, 2).map(t => (
                        <span key={t} className="bg-surface-2 px-1.5 py-0.2 rounded text-subtle">
                          {tx(t)}
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
        ref={editorSwipe}
        data-edge-back={mobileView === 'editor' ? '' : undefined}
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
          <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted space-y-3">
            <div className="w-16 h-16 rounded-xl bg-surface border border-line flex items-center justify-center text-emerald-400">
              <FileText className="w-8 h-8" />
            </div>
            <h3 className="text-lg font-bold text-white tracking-tight">{tl('Henüz Kayıtlı Bir Not Bulunmuyor')}</h3>
            <p className="text-xs max-w-md text-subtle leading-relaxed">
              {tl('Markdown formatında zengin notlar yazabilir, canlı KaTeX formülleri ($e^')}{'{'}i\pi{'}'}{' '}{tl('+ 1 = 0$) ekleyebilir ve klasörlerle organize edebilirsiniz.')}
            </p>
            {editable && (
            <button
              onClick={() => handleNewNoteMobile()}
              className="mt-2 px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-semibold rounded-lg flex items-center gap-2 transition-all min-h-[44px]"
            >
              <Plus className="w-4 h-4" />
              <span>{tl('İlk Notunuzu Başlatın')}</span>
            </button>
            )}
          </div>
        )}
      </div>

      {/* İçe aktar: choose the type first */}
      <Modal isOpen={importDialog} onClose={() => setImportDialog(false)} title={tl('İçe aktar')} subtitle={tl('Ne tür bir not oluşturulsun?')} maxWidth="max-w-lg">
        <div className="grid sm:grid-cols-2 gap-3">
          <div className="rounded-xl border border-line p-3 space-y-2">
            <div className="flex items-center gap-2 text-sm font-semibold text-fg">
              <FileText className="w-4 h-4 text-emerald-400" />{' '}{tl('Not')}
            </div>
            <p className="text-xs text-muted">{tl('PDF, Word (.docx), Markdown (.md) veya metin (.txt). PDF’ler olduğu gibi saklanır ve uygulamada açılır.')}</p>
            <label className="flex items-start gap-2 text-xs text-body">
              <input type="checkbox" className="mt-0.5 accent-[var(--color-brand)]" checked={pdfAsText} onChange={(e) => setPdfAsText(e.target.checked)} />
              {tl('PDF’leri düzenlenebilir metne çevir')}
            </label>
            <label className={`flex items-start gap-2 text-xs ${pdfAsText ? 'text-body' : 'text-muted'}`}>
              <input type="checkbox" className="mt-0.5 accent-[var(--color-brand)]" checked={handwriting} disabled={!pdfAsText} onChange={(e) => setHandwriting(e.target.checked)} />
              {tl('El yazısı (taranmış elle yazılmış notlar)')}
            </label>
            <button onClick={() => chooseImport('note')} className="w-full h-10 rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-semibold">
              {tl('Not dosyası seç')}
            </button>
          </div>
          <div className="rounded-xl border border-line p-3 space-y-2 flex flex-col">
            <div className="flex items-center gap-2 text-sm font-semibold text-fg">
              <Table2 className="w-4 h-4 text-emerald-400" />{' '}{tl('Tablo')}
            </div>
            <p className="text-xs text-muted flex-1">{tl('Excel (.xlsx, .xls), LibreOffice (.ods) veya CSV. Tüm sayfalar ve formüller tablo notu olarak açılır.')}</p>
            <button onClick={() => chooseImport('table')} className="w-full h-10 rounded-lg bg-brand hover:bg-brand-hover text-white text-sm font-semibold">
              {tl('Tablo dosyası seç')}
            </button>
          </div>
        </div>
      </Modal>

      {/* Create Folder Modal */}
      <Modal
        isOpen={isNewFolderModalOpen}
        onClose={() => setIsNewFolderModalOpen(false)}
        title={tl('Yeni Klasör Oluştur')}
        subtitle={tl('Notlarınızı kategorize etmek için bir klasör ekleyin.')}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleCreateFolder} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white mb-1">{tl('Klasör Adı *')}</label>
            <input
              type="text"
              required
              value={newFolderName}
              onChange={(e) => setNewFolderName(e.target.value)}
              placeholder={tl('Örn: Kuantum Mekaniği, YKS 2026...')}
              className="w-full bg-surface-2 border border-line-strong focus:border-brand rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white mb-1">{tl('Açıklama (Opsiyonel)')}</label>
            <input
              type="text"
              value={newFolderDesc}
              onChange={(e) => setNewFolderDesc(e.target.value)}
              placeholder={tl('Bu klasördeki notların kısa açıklaması...')}
              className="w-full bg-surface-2 border border-line-strong focus:border-brand rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none min-h-[44px]"
            />
          </div>
          <div>
            <span className="block text-xs font-semibold text-white mb-1.5">{tl('Simge')}</span>
            <FolderIconPicker value={newFolderIcon} onChange={setNewFolderIcon} />
          </div>
          <div className="modal-actions flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setIsNewFolderModalOpen(false)}
              className="min-h-[40px] px-4 py-2 bg-surface-2 hover:bg-surface-4 text-xs font-medium text-body rounded-lg transition-colors"
            >
              {tl('İptal')}
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 bg-brand hover:bg-brand-hover text-xs font-semibold text-white rounded-lg transition-colors"
            >
              {tl('Klasör Oluştur')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Edit Folder Modal */}
      <Modal
        isOpen={!!editingFolder}
        onClose={() => setEditingFolder(null)}
        title={tl('Klasörü Düzenle')}
        subtitle={tl('Klasör adını ve açıklamasını güncelleyin.')}
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveEditFolder} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-white mb-1">{tl('Klasör Adı *')}</label>
            <input
              type="text"
              required
              value={editFolderName}
              onChange={(e) => setEditFolderName(e.target.value)}
              className="w-full bg-surface-2 border border-line-strong focus:border-brand rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none min-h-[44px]"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-white mb-1">{tl('Açıklama (Opsiyonel)')}</label>
            <input
              type="text"
              value={editFolderDesc}
              onChange={(e) => setEditFolderDesc(e.target.value)}
              className="w-full bg-surface-2 border border-line-strong focus:border-brand rounded-lg px-3.5 py-2.5 text-sm text-white focus:outline-none min-h-[44px]"
            />
          </div>
          <div>
            <span className="block text-xs font-semibold text-white mb-1.5">{tl('Simge')}</span>
            <FolderIconPicker value={editFolderIcon} onChange={setEditFolderIcon} />
          </div>
          <div className="modal-actions flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={() => {
                const folder = editingFolder;
                setEditingFolder(null);
                if (folder) askDeleteFolder(folder);
              }}
              className="modal-actions-start sm:mr-auto min-h-[40px] px-3 py-2 text-xs font-medium text-rose-300 hover:bg-rose-500/10 rounded-lg inline-flex items-center gap-1.5 transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />{' '}{tl('Klasörü sil')}
            </button>
            <button
              type="button"
              onClick={() => setEditingFolder(null)}
              className="min-h-[40px] px-4 py-2 bg-surface-2 hover:bg-surface-4 text-xs font-medium text-body rounded-lg transition-colors"
            >
              {tl('İptal')}
            </button>
            <button
              type="submit"
              className="min-h-[40px] px-4 py-2 bg-brand hover:bg-brand-hover text-xs font-semibold text-white rounded-lg transition-colors"
            >
              {tl('Kaydet')}
            </button>
          </div>
        </form>
      </Modal>

      {/* Delete Folder Confirm Modal */}
      <Modal
        isOpen={!!deletingFolder}
        onClose={() => setDeletingFolder(null)}
        title={tl('Klasörü sil')}
        subtitle={tx(deletingFolder?.name)}
        maxWidth="max-w-md"
      >
        <div className="space-y-4">
          <p className="text-sm text-body">
            {deletingCount === 0
              ? tl('Klasör boş; silindiğinde hiçbir not etkilenmez.')
              : deleteWithNotes
                ? tl('Klasör ve içindeki {deletingCount} not silinecek.', { deletingCount })
                : tl('Klasör silinecek; içindeki {deletingCount} not “Tüm notlar” altında kalır.', { deletingCount })}
          </p>
          {deletingCount > 0 && (
            <label className="flex items-start gap-2.5 rounded-lg border border-line bg-surface-2 px-3 py-2.5 text-sm text-body cursor-pointer">
              <input type="checkbox" className="mt-0.5 w-4 h-4 accent-[var(--color-rose-500)]" checked={deleteWithNotes} onChange={(e) => setDeleteWithNotes(e.target.checked)} />
              <span>
                {tl('İçindeki')}{' '}{deletingCount} notu da sil
                <span className="block text-xs text-muted">{tl('Sildikten sonra birkaç saniye içinde “Geri al” ile geri getirebilirsiniz.')}</span>
              </span>
            </label>
          )}
          <div className="modal-actions flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setDeletingFolder(null)}
              className="min-h-[40px] px-4 py-2 bg-surface-2 hover:bg-surface-4 text-xs font-medium text-body rounded-lg transition-colors"
            >
              {tl('Vazgeç')}
            </button>
            <button
              type="button"
              onClick={handleDeleteFolderConfirm}
              className="min-h-[40px] px-4 py-2 bg-rose-600 hover:bg-rose-700 text-xs font-semibold text-white rounded-lg transition-colors"
            >
              {deleteWithNotes && deletingCount > 0 ? tl('Klasörü ve notları sil') : tl('Klasörü sil')}
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};
