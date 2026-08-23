'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { MediaItem, MediaType } from '@/types';
import { MediaItemModal } from './MediaItemModal';
import { Modal } from '@/components/ui/Modal';
import { extractYouTubeId, getYouTubeThumbnailUrl, isYouTubeUrl } from '@/lib/youtube';
import {
  Image as ImageIcon,
  Video,
  Plus,
  Search,
  Layers,
  Sparkles,
  ExternalLink,
  Copy,
  Trash2,
  Edit2,
  FileText,
  Eye,
  Play,
} from 'lucide-react';
import { formatTurkishDate } from '@/lib/utils';

export const MediaWorkspace: React.FC = () => {
  const {
    mediaItems,
    deleteMediaItem,
    notes,
    scripts,
    setActiveNoteId,
    setActiveScriptId,
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

  const handleJumpToScript = (scriptId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setActiveScriptId(scriptId);
    setActiveTab('scripts');
  };

  const getTypeBadge = (type: MediaType, isYt: boolean = false) => {
    if (isYt) {
      return (
        <span className="bg-red-950/80 border border-red-800/80 text-red-300 text-[10px] font-bold px-2 py-0.5 rounded-md flex items-center gap-1 shadow-sm">
          <Play className="w-2.5 h-2.5 fill-red-300" />
          <span>YouTube Video</span>
        </span>
      );
    }
    switch (type) {
      case 'diagram':
        return <span className="bg-emerald-950/80 border border-emerald-800/80 text-emerald-300 text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-sm">Şema & Grafik</span>;
      case 'sketch':
        return <span className="bg-amber-950/80 border border-amber-800/80 text-amber-300 text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-sm">Çizim</span>;
      case 'video_link':
        return <span className="bg-sky-950/80 border border-sky-800/80 text-sky-300 text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-sm">Video Link</span>;
      case 'image':
        return <span className="bg-purple-950/80 border border-purple-800/80 text-purple-300 text-[10px] font-semibold px-2 py-0.5 rounded-md shadow-sm">Görsel</span>;
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121212] overflow-y-auto p-6 md:p-8">
      <div className="max-w-7xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div>
            <h2 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2.5">
              <ImageIcon className="w-6 h-6 text-emerald-400" />
              Medya Deposu & Çizim Galerisi
            </h2>
            <p className="text-xs text-[#9ca3af] mt-1">
              Matematik şemaları, geometrik çizimler, otomatik kapaklı YouTube video bağlantıları ve görsel varlıklar.
            </p>
          </div>

          {/* New Media Button */}
          <button
            onClick={() => {
              setEditingItem(null);
              setIsAddModalOpen(true);
            }}
            className="flex items-center gap-1.5 px-4 py-2 bg-[#2d5a27] hover:bg-[#387030] text-white text-xs font-semibold rounded-xl shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Yeni Medya Ekle</span>
          </button>
        </div>

        {/* Filter Bar & Search */}
        <div className="flex items-center justify-between gap-3 flex-wrap bg-[#181818] p-3 rounded-2xl border border-[#282828]">
          {/* Category Chips */}
          <div className="flex gap-1.5 overflow-x-auto">
            {[
              { id: 'all', label: 'Tüm Medyalar' },
              { id: 'diagram', label: 'Şemalar & Grafikler' },
              { id: 'sketch', label: 'Çizimler & Taslaklar' },
              { id: 'video_link', label: 'Video / YouTube Linkleri' },
              { id: 'image', label: 'Kapak & Görseller' },
            ].map((cat) => (
              <button
                key={cat.id}
                onClick={() => setSelectedType(cat.id as MediaType | 'all')}
                className={`text-xs px-3 py-1.5 rounded-xl whitespace-nowrap transition-colors ${
                  selectedType === cat.id
                    ? 'bg-[#2d5a27] text-white font-semibold shadow-sm'
                    : 'bg-[#222] text-[#9ca3af] hover:text-white'
                }`}
              >
                {cat.label}
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="relative min-w-[240px]">
            <Search className="w-3.5 h-3.5 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Başlık veya etiket ara..."
              className="w-full bg-[#202020] border border-[#2e2e2e] focus:border-[#2d5a27] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#71717a] focus:outline-none"
            />
          </div>
        </div>

        {/* Media Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
          {filteredItems.map((item) => {
            const linkedNote = item.linkedNoteId ? notes.find(n => n.id === item.linkedNoteId) : null;
            const linkedScript = item.linkedScriptId ? scripts.find(s => s.id === item.linkedScriptId) : null;

            const isYt = isYouTubeUrl(item.url);
            const ytThumbnail = isYt ? getYouTubeThumbnailUrl(item.url, 'hq') : null;
            const displayImageUrl = ytThumbnail || item.url;

            return (
              <div
                key={item.id}
                onClick={() => setPreviewItem(item)}
                className="bg-[#181818] hover:bg-[#1f1f1f] border border-[#282828] hover:border-[#387030] rounded-2xl overflow-hidden cursor-pointer transition-all shadow-sm hover:shadow-xl flex flex-col group"
              >
                {/* Media Image / YouTube Thumbnail Header */}
                <div className="relative h-48 bg-[#121212] overflow-hidden flex items-center justify-center">
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
                        src={displayImageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                        onError={(e) => {
                          (e.target as HTMLElement).style.display = 'none';
                        }}
                      />

                      {/* YouTube Play Icon Overlay */}
                      {isYt && (
                        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                          <div className="w-12 h-12 rounded-full bg-red-600/90 text-white flex items-center justify-center shadow-lg shadow-black/80 group-hover:scale-110 transition-transform">
                            <Play className="w-5 h-5 fill-white ml-0.5" />
                          </div>
                        </div>
                      )}
                    </>
                  )}

                  <div className="absolute top-2.5 left-2.5">
                    {getTypeBadge(item.type, isYt)}
                  </div>

                  {/* Hover quick action overlay */}
                  <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setPreviewItem(item);
                      }}
                      className="p-2 bg-[#222]/90 hover:bg-[#333] text-white rounded-xl text-xs flex items-center gap-1 shadow"
                      title="Önizle"
                    >
                      <Eye className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => handleCopyUrl(item.url, e)}
                      className="p-2 bg-[#222]/90 hover:bg-[#333] text-white rounded-xl text-xs flex items-center gap-1 shadow"
                      title="URL Kopyala"
                    >
                      <Copy className="w-4 h-4" />
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setEditingItem(item);
                        setIsAddModalOpen(true);
                      }}
                      className="p-2 bg-[#222]/90 hover:bg-[#333] text-white rounded-xl text-xs flex items-center gap-1 shadow"
                      title="Düzenle"
                    >
                      <Edit2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>

                {/* Card Body */}
                <div className="p-4 flex-1 flex flex-col justify-between space-y-3">
                  <div>
                    <h3 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors line-clamp-1">
                      {item.title}
                    </h3>
                    {item.description && (
                      <p className="text-[11px] text-[#9ca3af] line-clamp-2 mt-1 leading-relaxed">
                        {item.description}
                      </p>
                    )}
                  </div>

                  {/* Linked Docs & Tags */}
                  <div className="space-y-2 pt-2 border-t border-[#262626]">
                    {/* Linked Note / Script Links */}
                    <div className="flex items-center gap-2 flex-wrap">
                      {linkedNote && (
                        <button
                          onClick={(e) => handleJumpToNote(linkedNote.id, e)}
                          className="inline-flex items-center gap-1 bg-[#142214] hover:bg-[#2d5a27]/40 border border-[#2d5a27]/50 text-[10px] text-emerald-300 px-2 py-0.5 rounded-md transition-colors truncate max-w-full"
                          title="Bağlı Nota Git"
                        >
                          <FileText className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">{linkedNote.title}</span>
                        </button>
                      )}

                      {linkedScript && (
                        <button
                          onClick={(e) => handleJumpToScript(linkedScript.id, e)}
                          className="inline-flex items-center gap-1 bg-[#142214] hover:bg-[#2d5a27]/40 border border-[#2d5a27]/50 text-[10px] text-emerald-300 px-2 py-0.5 rounded-md transition-colors truncate max-w-full"
                          title="Bağlı Senaryoya Git"
                        >
                          <Video className="w-3 h-3 text-emerald-400 shrink-0" />
                          <span className="truncate">{linkedScript.title}</span>
                        </button>
                      )}
                    </div>

                    {/* Tags */}
                    <div className="flex items-center gap-1 flex-wrap">
                      {item.tags.slice(0, 3).map((t) => (
                        <span key={t} className="text-[10px] text-[#71717a] bg-[#222] px-1.5 py-0.2 rounded">
                          #{t}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {filteredItems.length === 0 && (
          <div className="text-center py-20 bg-[#161616] border border-[#262626] rounded-3xl p-8 space-y-4 shadow-xl">
            <div className="w-16 h-16 rounded-2xl bg-[#1f1f1f] border border-[#2e2e2e] flex items-center justify-center text-emerald-400 mx-auto shadow-inner">
              <ImageIcon className="w-8 h-8" />
            </div>
            <h3 className="text-base font-bold text-white tracking-tight">Henüz Kayıtlı Bir Medya Varlığı Bulunmuyor</h3>
            <p className="text-xs text-[#9ca3af] max-w-md mx-auto leading-relaxed">
              Matematik araştırmalarınız için geometri çizimleri, formül grafikleri veya otomatik kapak görseli oluşturan YouTube video bağlantıları ekleyin.
            </p>
            <button
              onClick={() => {
                setEditingItem(null);
                setIsAddModalOpen(true);
              }}
              className="mt-2 px-5 py-2.5 bg-[#2d5a27] hover:bg-[#387030] text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-950/50 inline-flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Medya veya YouTube Linki Ekle</span>
            </button>
          </div>
        )}
      </div>

      {/* Add / Edit Media Modal */}
      <MediaItemModal
        isOpen={isAddModalOpen}
        onClose={() => setIsAddModalOpen(false)}
        editItem={editingItem}
      />

      {/* Preview Lightbox Modal */}
      {previewItem && (
        <Modal
          isOpen={!!previewItem}
          onClose={() => setPreviewItem(null)}
          title={previewItem.title}
          subtitle={previewItem.description}
          maxWidth="max-w-3xl"
        >
          <div className="space-y-4">
            <div className="bg-[#121212] rounded-2xl overflow-hidden flex items-center justify-center p-2 border border-[#282828] max-h-[60vh]">
              {isYouTubeUrl(previewItem.url) ? (
                <div className="w-full text-center space-y-3">
                  <div className="relative rounded-xl overflow-hidden max-h-[45vh] mx-auto inline-block">
                    <img
                      src={getYouTubeThumbnailUrl(previewItem.url, 'hq') || ''}
                      alt={previewItem.title}
                      className="max-h-[45vh] object-contain rounded-xl"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                      <div className="w-14 h-14 rounded-full bg-red-600 text-white flex items-center justify-center shadow-2xl">
                        <Play className="w-6 h-6 fill-white ml-0.5" />
                      </div>
                    </div>
                  </div>
                  <p className="text-xs text-white font-mono">{previewItem.url}</p>
                  <a
                    href={previewItem.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-red-700 hover:bg-red-600 text-white text-xs font-semibold rounded-xl transition-colors shadow-md"
                  >
                    <span>YouTube'da İzle</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : previewItem.type === 'video_link' ? (
                <div className="p-12 text-center space-y-3">
                  <Video className="w-12 h-12 text-sky-400 mx-auto" />
                  <p className="text-xs text-white font-mono">{previewItem.url}</p>
                  <a
                    href={previewItem.url}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#2d5a27] hover:bg-[#387030] text-white text-xs font-semibold rounded-xl"
                  >
                    <span>Videoyu Yeni Sekmede Aç</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              ) : (
                <img
                  src={previewItem.url}
                  alt={previewItem.title}
                  className="max-h-[55vh] object-contain rounded-xl"
                />
              )}
            </div>

            <div className="flex items-center justify-between pt-2 border-t border-[#2a2a2a] flex-wrap gap-2">
              <div className="flex items-center gap-2">
                {getTypeBadge(previewItem.type, isYouTubeUrl(previewItem.url))}
                <span className="text-xs text-[#71717a]">{formatTurkishDate(previewItem.createdAt)}</span>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={(e) => handleCopyUrl(previewItem.url, e)}
                  className="px-3 py-1.5 bg-[#222] hover:bg-[#333] text-xs font-medium text-white rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Copy className="w-3.5 h-3.5" />
                  <span>URL Kopyala</span>
                </button>
                <button
                  onClick={() => {
                    deleteMediaItem(previewItem.id);
                    setPreviewItem(null);
                  }}
                  className="px-3 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-800/40 text-xs font-medium text-rose-300 rounded-xl flex items-center gap-1.5 transition-colors"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                  <span>Sil</span>
                </button>
              </div>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};
