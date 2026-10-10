'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { MediaItem, MediaType } from '@/types';
import { MediaItemModal } from './MediaItemModal';
import { Modal } from '@/components/ui/Modal';
import { extractYouTubeId, getYouTubeThumbnailUrl, isYouTubeUrl } from '@/lib/youtube';
import { safeMediaSrc } from '@/lib/safeUrl';
import {
  Image as ImageIcon,
  Video,
  Plus,
  Search,
  Copy,
  Trash2,
  Edit2,
  FileText,
  Play,
} from 'lucide-react';
import { formatTurkishDate } from '@/lib/utils';

export const MediaWorkspace: React.FC = () => {
  const {
    mediaItems,
    deleteMediaItem,
    notes,
    setActiveNoteId,
    setActiveTab,
    addToast,
  } = useAppStore();

  const [selectedType, setSelectedType] = useState<MediaType | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [editingItem, setEditingItem] = useState<MediaItem | null>(null);
  const [previewItem, setPreviewItem] = useState<MediaItem | null>(null);

  const filteredItems = mediaItems.filter((item) => {
    if (selectedType !== 'all' && item.type !== selectedType) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = item.title.toLowerCase().includes(q);
      const matchDesc = item.description?.toLowerCase().includes(q);
      const matchTag = item.tags.some(t => t.toLowerCase().includes(q));
      if (!matchTitle && !matchDesc && !matchTag) return false;
    }
    return true;
  });

  const handleCopyUrl = (url: string, e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(url);
    addToast({ type: 'success', title: 'Bağlantı Kopyalandı', message: url });
  };

  const handleJumpToNote = (noteId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveNoteId(noteId);
    setActiveTab('notes');
  };

  const getTypeBadge = (type: MediaType, isYt: boolean = false) => {
    if (isYt) {
      return (
        <span className="bg-red-950/90 border border-red-800/80 text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1">
          <Play className="w-2.5 h-2.5 fill-red-300" />
          <span>YouTube</span>
        </span>
      );
    }
    switch (type) {
      case 'diagram':
        return <span className="bg-emerald-950/90 border border-emerald-800/80 text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded-md">Şema</span>;
      case 'sketch':
        return <span className="bg-amber-950/90 border border-amber-800/80 text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded-md">Çizim</span>;
      case 'video_link':
        return <span className="bg-sky-950/90 border border-sky-800/80 text-sky-300 text-[10px] font-semibold px-2 py-0.5 rounded-md">Video</span>;
      case 'image':
        return <span className="bg-purple-950/90 border border-purple-800/80 text-purple-300 text-[10px] font-semibold px-2 py-0.5 rounded-md">Görsel</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-app overflow-y-auto p-4 sm:p-5 md:p-6">
      <div className="max-w-7xl mx-auto w-full space-y-5 sm:space-y-5">
        {/* Header */}
        <div className="flex items-center justify-between gap-3 sm:gap-4 flex-wrap">
          <div>
            <h2 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2.5">
              <ImageIcon className="w-5 sm:w-6 h-5 sm:h-6 text-emerald-400" />
              Medya Deposu & Görsel Galerisi
            </h2>
            <p className="text-xs text-subtle mt-1">
              Matematik şemaları, YouTube video bağlantıları ve görsel varlıklarınız.
            </p>
          </div>

          {/* New Media Button */}
          <button
            onClick={() => {
              setEditingItem(null);
              setIsAddModalOpen(true);
            }}
            className="min-h-[40px] flex items-center gap-1.5 px-4 py-2 bg-brand hover:bg-brand-hover active:bg-brand-active text-white text-xs font-semibold rounded-lg transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Medya Ekle</span>
          </button>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex items-center justify-between gap-3 flex-wrap bg-surface p-2.5 sm:p-3 rounded-xl border border-line">
          {/* Category Chips */}
          <div className="flex gap-1.5 overflow-x-auto no-scrollbar w-full sm:w-auto">
            {[
              { id: 'all', label: 'Tüm Medyalar' },
              { id: 'diagram', label: 'Şemalar' },
              { id: 'sketch', label: 'Çizimler' },
              { id: 'video_link', label: 'Video Linkleri' },
              { id: 'image', label: 'Görseller' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedType(cat.id as MediaType | 'all')}
                className={`min-h-[34px] text-xs px-3 py-1.5 rounded-lg whitespace-nowrap transition-colors ${
                  selectedType === cat.id
                    ? 'bg-surface-4 text-fg font-medium'
                    : 'bg-surface-2 text-subtle hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative w-full sm:w-64">
            <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Başlık veya etiket ara..."
              className="w-full min-h-[38px] bg-surface-2 border border-line focus:border-brand rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-muted focus:outline-none"
            />
          </div>
        </div>

        {/* Media Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4 sm:gap-5">
          {filteredItems.map((item) => {
            const linkedNote = item.linkedNoteId ? notes.find(n => n.id === item.linkedNoteId) : null;

            const isYt = isYouTubeUrl(item.url);
            const ytThumbnail = isYt ? getYouTubeThumbnailUrl(item.url, 'hq') : null;
            const displayImageUrl = ytThumbnail || item.url;

            return (
              <div
                key={item.id}
                onClick={() => setPreviewItem(item)}
                className="bg-surface hover:bg-surface-2 border border-line hover:border-brand-hover rounded-xl overflow-hidden cursor-pointer transition-all flex flex-col group"
              >
                {/* Media Image / YouTube Thumbnail Header */}
                <div className="relative h-44 sm:h-48 bg-app overflow-hidden flex items-center justify-center">
                  {item.type === 'video_link' && !isYt ? (
                    <div className="flex flex-col items-center justify-center text-center p-4">
                      <div className="w-12 h-12 rounded-full bg-sky-950/60 border border-sky-800/50 flex items-center justify-center text-sky-400 mb-2 group-hover:scale-110 transition-transform">
                        <Video className="w-6 h-6" />
                      </div>
                      <span className="text-xs text-sky-300 font-mono font-medium truncate max-w-[200px]">
                        {item.url}
                      </span>
                    </div>
                  ) : (
                    <>
                      <img
                        src={safeMediaSrc(displayImageUrl)}
                        loading="lazy"
                        referrerPolicy="no-referrer"
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />

                      {/* YouTube Play Icon Overlay */}
                      {isYt && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 fill-white ml-0.5" />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div className="absolute top-2.5 left-2.5">
                    {getTypeBadge(item.type, isYt)}
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-3.5 sm:p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-xs text-subtle line-clamp-2 mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Tags */}
                  <div className="flex items-center gap-1.5 flex-wrap">
                    {item.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="text-[10px] px-2 py-0.5 rounded-md bg-surface-2 text-subtle border border-line-strong"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>

                  {/* Connected note */}
                  {linkedNote && (
                    <div className="pt-2 border-t border-line space-y-1">
                      {linkedNote && (
                        <button
                          onClick={(e) => handleJumpToNote(linkedNote.id, e)}
                          className="min-h-[28px] w-full text-left flex items-center gap-1.5 text-[11px] text-emerald-400 hover:underline truncate"
                        >
                          <FileText className="w-3 h-3 shrink-0" />
                          <span className="truncate">Not: {linkedNote.title}</span>
                        </button>
                      )}
                    </div>
                  )}

                  {/* Footer date & touch action buttons */}
                  <div className="pt-2 border-t border-line flex items-center justify-between text-[11px] text-muted">
                    <span>{formatTurkishDate(item.createdAt)}</span>

                    <div className="flex items-center gap-1">
                      <button
                        onClick={(e) => handleCopyUrl(item.url, e)}
                        className="min-h-[34px] min-w-[34px] p-1.5 hover:bg-surface-3 text-subtle hover:text-white rounded-lg transition-colors flex items-center justify-center"
                        title="URL Kopyala"
                      >
                        <Copy className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          setEditingItem(item);
                          setIsAddModalOpen(true);
                        }}
                        className="min-h-[34px] min-w-[34px] p-1.5 hover:bg-surface-3 text-subtle hover:text-white rounded-lg transition-colors flex items-center justify-center"
                        title="Düzenle"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          deleteMediaItem(item.id);
                        }}
                        className="min-h-[34px] min-w-[34px] p-1.5 hover:bg-rose-950/40 text-subtle hover:text-rose-400 rounded-lg transition-colors flex items-center justify-center"
                        title="Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-16 bg-surface border border-line rounded-xl sm:rounded-xl p-6 space-y-3">
            <div className="w-14 h-14 rounded-xl bg-surface-2 border border-line flex items-center justify-center text-emerald-400 mx-auto">
              <ImageIcon className="w-7 h-7" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">Kayıtlı Medya Öğesi Bulunamadı</h3>
            <p className="text-xs text-subtle max-w-sm mx-auto leading-relaxed">
              Matematik çizimleri, diyagramlar, YouTube video bağlantıları veya kapak resimleri eklemek için “Yeni Medya Ekle” butonunu kullanın.
            </p>
          </div>
        )}
      </div>

      {/* Add / Edit Modal */}
      <MediaItemModal
        isOpen={isAddModalOpen}
        onClose={() => {
          setIsAddModalOpen(false);
          setEditingItem(null);
        }}
        editItem={editingItem}
      />

      {/* Preview Modal */}
      {previewItem && (
        <Modal
          isOpen={!!previewItem}
          onClose={() => setPreviewItem(null)}
          title={previewItem.title}
          subtitle={`${formatTurkishDate(previewItem.createdAt)} • ${previewItem.tags.join(', ')}`}
          maxWidth="max-w-4xl"
        >
          <div className="space-y-4">
            {isYouTubeUrl(previewItem.url) ? (
              <div className="aspect-video w-full rounded-lg overflow-hidden bg-black border border-line-strong">
                <iframe
                  src={`https://www.youtube-nocookie.com/embed/${extractYouTubeId(previewItem.url)}`}
                  title={previewItem.title}
                  className="w-full h-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  allowFullScreen
                />
              </div>
            ) : (
              <div className="rounded-xl overflow-hidden bg-app border border-line-strong flex items-center justify-center p-2">
                <img
                  src={safeMediaSrc(previewItem.url)}
                  referrerPolicy="no-referrer"
                  alt={previewItem.title}
                  className="max-h-[60vh] max-w-full object-contain rounded-lg"
                />
              </div>
            )}

            {previewItem.description && (
              <div className="p-4 bg-app rounded-lg border border-line text-xs text-body leading-relaxed">
                {previewItem.description}
              </div>
            )}
          </div>
        </Modal>
      )}
    </div>
  );
};
