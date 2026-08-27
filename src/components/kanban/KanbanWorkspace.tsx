'use client';

import React, { useState, useRef } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { KanbanCard, KanbanColumnId, KanbanProjectType } from '@/types';
import { KanbanCardModal } from './KanbanCardModal';
import { PriorityBadge } from '@/components/ui/Badge';
import {
  Kanban,
  Plus,
  Search,
  ArrowLeft,
  ArrowRight,
  Edit2,
  Trash2,
  Flame,
  CheckCircle2,
  Clock,
  Edit3,
  PlayCircle,
  FileText,
  Video,
  Calendar,
} from 'lucide-react';
import { formatTurkishDate } from '@/lib/utils';

interface ColumnDef {
  id: KanbanColumnId;
  title: string;
  shortTitle: string;
  icon: React.ReactNode;
  headerColor: string;
  badgeColor: string;
  borderColor: string;
}

const COLUMNS: ColumnDef[] = [
  {
    id: 'fikir',
    title: 'Fikir & Havuz',
    shortTitle: 'Fikir',
    icon: <Flame className="w-4 h-4 text-amber-400" />,
    headerColor: 'bg-amber-950/20 text-amber-300',
    badgeColor: 'bg-amber-900/30 text-amber-300 border-amber-800/40',
    borderColor: 'border-amber-900/40',
  },
  {
    id: 'yapilacak',
    title: 'Planlandı / Yapılacak',
    shortTitle: 'Yapılacak',
    icon: <Edit3 className="w-4 h-4 text-blue-400" />,
    headerColor: 'bg-blue-950/20 text-blue-300',
    badgeColor: 'bg-blue-900/30 text-blue-300 border-blue-800/40',
    borderColor: 'border-blue-900/40',
  },
  {
    id: 'devam_ediyor',
    title: 'Devam Ediyor / Üretimde',
    shortTitle: 'Üretimde',
    icon: <PlayCircle className="w-4 h-4 text-orange-400" />,
    headerColor: 'bg-orange-950/20 text-orange-300',
    badgeColor: 'bg-orange-900/30 text-orange-300 border-orange-800/40',
    borderColor: 'border-orange-900/40',
  },
  {
    id: 'inceleme',
    title: 'İnceleme & Kurgu',
    shortTitle: 'İnceleme',
    icon: <Clock className="w-4 h-4 text-purple-400" />,
    headerColor: 'bg-purple-950/20 text-purple-300',
    badgeColor: 'bg-purple-900/30 text-purple-300 border-purple-800/40',
    borderColor: 'border-purple-900/40',
  },
  {
    id: 'tamamlandi',
    title: 'Tamamlandı / Yayında',
    shortTitle: 'Yayında',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    headerColor: 'bg-emerald-950/20 text-emerald-300',
    badgeColor: 'bg-emerald-900/30 text-emerald-300 border-emerald-800/40',
    borderColor: 'border-emerald-900/40',
  },
];

const PROJECT_TYPE_INFO: Record<string, { label: string; icon: string; style: string }> = {
  genel: { label: 'Genel', icon: '📋', style: 'bg-[#282828] text-[#d1d5db] border-[#383838]' },
  icerik: { label: 'İçerik', icon: '✨', style: 'bg-cyan-950/50 text-cyan-300 border-cyan-800/50' },
  matematik: { label: 'Matematik', icon: '📐', style: 'bg-emerald-950/50 text-emerald-300 border-emerald-800/50' },
  finans: { label: 'Finans', icon: '💰', style: 'bg-amber-950/50 text-amber-300 border-amber-800/50' },
  senaryo: { label: 'Senaryo', icon: '🎬', style: 'bg-rose-950/50 text-rose-300 border-rose-800/50' },
};

export const KanbanWorkspace: React.FC = () => {
  const {
    kanbanCards,
    moveKanbanCard,
    deleteKanbanCard,
    setActiveNoteId,
    setActiveScriptId,
    setActiveTab,
  } = useAppStore();

  const [selectedProjectType, setSelectedProjectType] = useState<KanbanProjectType | 'all'>('all');
  const [activeMobileColumn, setActiveMobileColumn] = useState<KanbanColumnId | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [dragOverColumn, setDragOverColumn] = useState<KanbanColumnId | null>(null);

  // Modal state
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingCard, setEditingCard] = useState<KanbanCard | null>(null);
  const [targetColumnForNew, setTargetColumnForNew] = useState<KanbanColumnId>('fikir');

  const boardContainerRef = useRef<HTMLDivElement>(null);

  const filteredCards = kanbanCards.filter((card) => {
    if (selectedProjectType !== 'all' && card.projectType !== selectedProjectType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = card.title.toLowerCase().includes(q);
      const matchDesc = card.description?.toLowerCase().includes(q);
      const matchTags = card.tags.some(t => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTags) return false;
    }
    return true;
  });

  const columnOrder: KanbanColumnId[] = ['fikir', 'yapilacak', 'devam_ediyor', 'inceleme', 'tamamlandi'];

  const handleNextColumn = (card: KanbanCard, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = columnOrder.indexOf(card.columnId);
    if (currentIndex < columnOrder.length - 1) {
      moveKanbanCard(card.id, columnOrder[currentIndex + 1]);
    }
  };

  const handlePrevColumn = (card: KanbanCard, e: React.MouseEvent) => {
    e.stopPropagation();
    const currentIndex = columnOrder.indexOf(card.columnId);
    if (currentIndex > 0) {
      moveKanbanCard(card.id, columnOrder[currentIndex - 1]);
    }
  };

  // Drag and drop
  const handleDragStart = (e: React.DragEvent, cardId: string) => {
    e.dataTransfer.setData('text/plain', cardId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, colId: KanbanColumnId) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverColumn !== colId) {
      setDragOverColumn(colId);
    }
  };

  const handleDragLeave = (e: React.DragEvent, colId: KanbanColumnId) => {
    e.preventDefault();
    if (dragOverColumn === colId) {
      setDragOverColumn(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetColId: KanbanColumnId) => {
    e.preventDefault();
    setDragOverColumn(null);
    const cardId = e.dataTransfer.getData('text/plain');
    if (cardId) {
      moveKanbanCard(cardId, targetColId);
    }
  };

  const openNewCardModal = (colId: KanbanColumnId = 'fikir') => {
    setEditingCard(null);
    setTargetColumnForNew(colId);
    setIsModalOpen(true);
  };

  const openEditCardModal = (card: KanbanCard) => {
    setEditingCard(card);
    setTargetColumnForNew(card.columnId);
    setIsModalOpen(true);
  };

  const displayedColumns = COLUMNS.filter((col) => {
    if (activeMobileColumn === 'all') return true;
    return col.id === activeMobileColumn;
  });

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121212] overflow-hidden select-none">
      {/* Top Header & Actions */}
      <div className="px-4 sm:px-6 py-3.5 bg-[#181818] border-b border-[#282828] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#2d5a27] to-[#142812] border border-[#387030] flex items-center justify-center shadow-lg shadow-emerald-950/40 shrink-0">
            <Kanban className="w-5 h-5 text-white" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold text-white tracking-tight flex items-center gap-2">
              Evrensel Kanban Panosu
            </h1>
            <p className="text-[11px] sm:text-xs text-[#71717a] hidden sm:block">
              Tüm araştırma, video, finans ve genel projelerinizi aşamalarla yönetin.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
          {/* Search input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Kartlarda ara..."
              className="bg-[#202020] border border-[#2e2e2e] focus:border-[#2d5a27] rounded-xl pl-8 pr-3 py-2 text-xs text-white placeholder-[#71717a] focus:outline-none w-36 sm:w-48 min-h-[40px]"
            />
          </div>

          {/* New Card Button */}
          <button
            onClick={() => openNewCardModal('fikir')}
            className="min-h-[40px] flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-[#2d5a27] hover:bg-[#387030] text-white text-xs font-semibold rounded-xl shadow-md shadow-emerald-950/50 transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Kart Ekle</span>
          </button>
        </div>
      </div>

      {/* Project Type Filter Pills Bar */}
      <div className="px-4 sm:px-6 py-2 bg-[#151515] border-b border-[#242424] flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-bold text-[#666] uppercase tracking-wider shrink-0 mr-1">
          Proje:
        </span>
        {[
          { id: 'all', label: 'Tüm Projeler', icon: '🌐' },
          { id: 'matematik', label: 'Matematik', icon: '📐' },
          { id: 'senaryo', label: 'Senaryo', icon: '🎬' },
          { id: 'icerik', label: 'İçerik', icon: '✨' },
          { id: 'finans', label: 'Finans', icon: '💰' },
          { id: 'genel', label: 'Genel', icon: '📋' },
        ].map((pt) => {
          const isSelected = selectedProjectType === pt.id;
          return (
            <button
              key={pt.id}
              onClick={() => setSelectedProjectType(pt.id as KanbanProjectType | 'all')}
              className={`min-h-[34px] text-xs px-3 py-1 rounded-xl border flex items-center gap-1.5 whitespace-nowrap transition-all ${
                isSelected
                  ? 'bg-[#2d5a27] text-white font-bold border-[#387030] shadow-sm'
                  : 'bg-[#1e1e1e] text-[#9ca3af] hover:text-white border-[#2c2c2c] hover:bg-[#252525]'
              }`}
            >
              <span>{pt.icon}</span>
              <span>{pt.label}</span>
              {pt.id !== 'all' && (
                <span className="text-[10px] opacity-70 ml-0.5">
                  ({kanbanCards.filter(c => c.projectType === pt.id).length})
                </span>
              )}
            </button>
          );
        })}
      </div>

      {/* Mobile-Only Column Switcher Tabs (< md) */}
      <div className="md:hidden px-4 py-2 bg-[#131313] border-b border-[#222] flex items-center gap-1.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveMobileColumn('all')}
          className={`min-h-[34px] px-3 py-1 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
            activeMobileColumn === 'all'
              ? 'bg-[#2d5a27] text-white'
              : 'bg-[#1e1e1e] text-[#888] hover:text-white'
          }`}
        >
          Tüm Sütunlar (Akış)
        </button>
        {COLUMNS.map((col) => {
          const count = filteredCards.filter(c => c.columnId === col.id).length;
          const isActive = activeMobileColumn === col.id;
          return (
            <button
              key={col.id}
              onClick={() => setActiveMobileColumn(col.id)}
              className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-semibold whitespace-nowrap flex items-center gap-1.5 transition-colors ${
                isActive
                  ? 'bg-[#2d5a27] text-white'
                  : 'bg-[#1e1e1e] text-[#888] hover:text-white'
              }`}
            >
              <span>{col.shortTitle}</span>
              <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 font-mono">
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {/* Responsive Kanban Columns (Snap-scroll on mobile, horizontal board on desktop) */}
      <div
        ref={boardContainerRef}
        className="flex-1 overflow-x-auto p-4 sm:p-6 bg-[#121212] snap-x snap-mandatory flex gap-4 items-start w-full"
      >
        {displayedColumns.map((col) => {
          const colCards = filteredCards.filter(c => c.columnId === col.id);
          const isOver = dragOverColumn === col.id;

          return (
            <div
              key={col.id}
              onDragOver={(e) => handleDragOver(e, col.id)}
              onDragLeave={(e) => handleDragLeave(e, col.id)}
              onDrop={(e) => handleDrop(e, col.id)}
              className={`w-[85vw] max-w-[340px] shrink-0 snap-center md:w-72 lg:w-80 md:min-w-0 bg-[#161616] border rounded-2xl flex flex-col max-h-[calc(100vh-210px)] md:max-h-[calc(100vh-175px)] overflow-hidden shadow-xl transition-all ${
                isOver
                  ? 'border-emerald-500 ring-2 ring-emerald-500/30 bg-[#1c221c]'
                  : 'border-[#262626]'
              }`}
            >
              {/* Column Header */}
              <div className="p-3.5 border-b border-[#262626] bg-[#1a1a1a] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <div className={`p-1.5 rounded-lg border ${col.headerColor} ${col.borderColor}`}>
                    {col.icon}
                  </div>
                  <span className="text-xs font-bold text-white tracking-tight">{col.title}</span>
                </div>
                <span className={`text-xs font-mono font-bold px-2 py-0.5 rounded-full border ${col.badgeColor}`}>
                  {colCards.length}
                </span>
              </div>

              {/* Cards Container */}
              <div className="p-3 overflow-y-auto space-y-3 flex-1">
                {colCards.length === 0 && (
                  <div className="py-8 px-2 text-center text-[11px] text-[#666] border border-dashed border-[#242424] rounded-xl bg-[#141414]/50">
                    Bu aşamada kart bulunmuyor
                  </div>
                )}

                {colCards.map((card) => {
                  const typeInfo = PROJECT_TYPE_INFO[card.projectType] || PROJECT_TYPE_INFO.genel;
                  const isOverdue = card.dueDate && new Date(card.dueDate).getTime() < new Date().setHours(0, 0, 0, 0) && col.id !== 'tamamlandi';

                  return (
                    <div
                      key={card.id}
                      draggable={true}
                      onDragStart={(e) => handleDragStart(e, card.id)}
                      onClick={() => openEditCardModal(card)}
                      className="bg-[#1e1e1e] hover:bg-[#252525] active:bg-[#2a2a2a] border border-[#2e2e2e] hover:border-[#387030] rounded-xl p-3.5 cursor-grab active:cursor-grabbing transition-all shadow-sm hover:shadow-md space-y-2.5 group relative select-none"
                    >
                      {/* Top Badges: Project Type & Priority */}
                      <div className="flex items-center justify-between gap-1.5">
                        <span className={`text-[10px] font-bold px-2 py-0.5 rounded-md border flex items-center gap-1 ${typeInfo.style}`}>
                          <span>{typeInfo.icon}</span>
                          <span>{typeInfo.label}</span>
                        </span>

                        <PriorityBadge priority={card.priority} />
                      </div>

                      {/* Card Title */}
                      <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug">
                        {card.title}
                      </h4>

                      {/* Description Preview */}
                      {card.description && (
                        <p className="text-[11px] text-[#9ca3af] line-clamp-2 leading-relaxed">
                          {card.description}
                        </p>
                      )}

                      {/* Due Date & Links */}
                      <div className="flex items-center justify-between text-[10px] text-[#71717a] pt-1.5 border-t border-[#2a2a2a] flex-wrap gap-1">
                        {card.dueDate ? (
                          <span className={`flex items-center gap-1 font-mono ${
                            isOverdue ? 'text-rose-400 font-bold' : 'text-[#a1a1aa]'
                          }`}>
                            <Calendar className="w-3.5 h-3.5" />
                            <span>{formatTurkishDate(card.dueDate)}</span>
                            {isOverdue && <span className="text-[9px] bg-rose-950 text-rose-300 px-1 rounded">Gecikti</span>}
                          </span>
                        ) : (
                          <span className="text-[#555]">Tarih belirtilmedi</span>
                        )}

                        {card.linkedNoteId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveNoteId(card.linkedNoteId!);
                              setActiveTab('notes');
                            }}
                            className="min-h-[28px] flex items-center gap-1 text-emerald-400 hover:underline"
                            title="Bağlı Nota Git"
                          >
                            <FileText className="w-3 h-3" />
                            <span>Not</span>
                          </button>
                        )}

                        {card.linkedScriptId && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              setActiveScriptId(card.linkedScriptId!);
                              setActiveTab('scripts');
                            }}
                            className="min-h-[28px] flex items-center gap-1 text-sky-400 hover:underline"
                            title="Bağlı Senaryoya Git"
                          >
                            <Video className="w-3 h-3" />
                            <span>Senaryo</span>
                          </button>
                        )}
                      </div>

                      {/* Tags */}
                      {card.tags.length > 0 && (
                        <div className="flex items-center gap-1 flex-wrap pt-0.5">
                          {card.tags.map(tag => (
                            <span key={tag} className="text-[9px] px-1.5 py-0.2 rounded bg-[#272727] text-[#9ca3af]">
                              #{tag}
                            </span>
                          ))}
                        </div>
                      )}

                      {/* Move Buttons & Actions Bar */}
                      <div className="flex items-center justify-between pt-1 gap-1">
                        <button
                          onClick={(e) => handlePrevColumn(card, e)}
                          disabled={col.id === 'fikir'}
                          className="min-h-[34px] px-2.5 py-1 bg-[#181818] hover:bg-[#2a2a2a] active:bg-[#333] disabled:opacity-20 rounded-lg text-[10px] text-[#9ca3af] hover:text-white flex items-center gap-1 transition-colors"
                          title="Önceki Aşamaya Taşı"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          <span>Geri</span>
                        </button>

                        <div className="flex items-center gap-1">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              openEditCardModal(card);
                            }}
                            className="min-h-[34px] min-w-[34px] p-2 hover:bg-[#2a2a2a] active:bg-[#333] rounded-lg text-[#71717a] hover:text-white transition-colors flex items-center justify-center"
                            title="Düzenle"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteKanbanCard(card.id);
                            }}
                            className="min-h-[34px] min-w-[34px] p-2 hover:bg-rose-950/40 active:bg-rose-900/60 rounded-lg text-[#71717a] hover:text-rose-400 transition-colors flex items-center justify-center"
                            title="Sil"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>

                        <button
                          onClick={(e) => handleNextColumn(card, e)}
                          disabled={col.id === 'tamamlandi'}
                          className="min-h-[34px] px-2.5 py-1 bg-[#2d5a27]/40 hover:bg-[#2d5a27] active:bg-[#387030] disabled:opacity-20 rounded-lg text-[10px] text-emerald-300 hover:text-white flex items-center gap-1 transition-colors font-semibold"
                          title="Sonraki Aşamaya İlerlet"
                        >
                          <span>İleri</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Add button inside column */}
                <button
                  onClick={() => openNewCardModal(col.id)}
                  className="w-full min-h-[40px] py-2.5 bg-[#1a1a1a] hover:bg-[#222] active:bg-[#282828] border border-dashed border-[#2e2e2e] hover:border-[#2d5a27] text-xs text-[#71717a] hover:text-emerald-300 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Bu Aşamaya Kart Ekle</span>
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Card Edit & Create Modal */}
      <KanbanCardModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editCard={editingCard}
        defaultColumnId={targetColumnForNew}
      />
    </div>
  );
};
