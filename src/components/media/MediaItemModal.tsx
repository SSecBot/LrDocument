'use client';

import React, { useState, useEffect } from 'react';
import { MediaItem, MediaType } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/ui/Modal';
import { extractYouTubeId, getYouTubeThumbnailUrl, isYouTubeUrl } from '@/lib/youtube';
import {
  Image as ImageIcon,
  Video,
  FileText,
  Layers,
  Sparkles,
  Play,
  CheckCircle,
} from 'lucide-react';

interface MediaItemModalProps {
  isOpen: boolean;
  onClose: () => void;
  editItem?: MediaItem | null;
}

export const MediaItemModal: React.FC<MediaItemModalProps> = ({
  isOpen,
  onClose,
  editItem,
}) => {
  const { addMediaItem, updateMediaItem, notes, scripts } = useAppStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState<MediaType>('diagram');
  const [url, setUrl] = useState('');
  const [linkedNoteId, setLinkedNoteId] = useState('');
  const [linkedScriptId, setLinkedScriptId] = useState('');
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(['Matematik', 'Görsel']);

  useEffect(() => {
    if (editItem) {
      setTitle(editItem.title);
      setDescription(editItem.description || '');
      setType(editItem.type);
      setUrl(editItem.url);
      setLinkedNoteId(editItem.linkedNoteId || '');
      setLinkedScriptId(editItem.linkedScriptId || '');
      setTags(editItem.tags || []);
    } else {
      setTitle('');
      setDescription('');
      setType('diagram');
      setUrl('');
      setLinkedNoteId('');
      setLinkedScriptId('');
      setTags(['Matematik', 'Görsel']);
    }
  }, [editItem, isOpen]);

  const handleUrlChange = (newUrl: string) => {
    setUrl(newUrl);
    if (isYouTubeUrl(newUrl)) {
      setType('video_link');
      if (!tags.includes('YouTube')) {
        setTags([...tags, 'YouTube']);
      }
    }
  };

  const handleAddTag = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' && tagInput.trim()) {
      e.preventDefault();
      if (!tags.includes(tagInput.trim())) {
        setTags([...tags, tagInput.trim()]);
      }
      setTagInput('');
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags(tags.filter(t => t !== tagToRemove));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !url.trim()) return;

    if (editItem) {
      updateMediaItem(editItem.id, {
        title: title.trim(),
        description: description.trim(),
        type,
        url: url.trim(),
        linkedNoteId: linkedNoteId || undefined,
        linkedScriptId: linkedScriptId || undefined,
        tags,
      });
    } else {
      addMediaItem({
        title: title.trim(),
        description: description.trim(),
        type,
        url: url.trim(),
        linkedNoteId: linkedNoteId || undefined,
        linkedScriptId: linkedScriptId || undefined,
        tags,
      });
    }

    onClose();
  };

  const ytThumbnail = isYouTubeUrl(url) ? getYouTubeThumbnailUrl(url, 'hq') : null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editItem ? 'Medya Öğesini Düzenle' : 'Yeni Medya / Çizim Ekle'}
      subtitle="Matematiksel çizim, şema, YouTube video bağlantısı veya kapak görseli kaydedin."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-white mb-1">Medya Başlığı *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Örn: Euler Formülü Karmaşık Düzlem Çizimi"
            className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none"
          />
        </div>

        {/* Media Type */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
          {[
            { id: 'diagram', label: 'Şema & Grafik', icon: <Layers className="w-4 h-4" /> },
            { id: 'sketch', label: 'El Çizimi & Taslak', icon: <Sparkles className="w-4 h-4" /> },
            { id: 'video_link', label: 'Video / YouTube Linki', icon: <Video className="w-4 h-4" /> },
            { id: 'image', label: 'Kapak / Görsel', icon: <ImageIcon className="w-4 h-4" /> },
          ].map((t) => (
            <button
              type="button"
              key={t.id}
              onClick={() => setType(t.id as MediaType)}
              className={`p-2.5 rounded-xl border text-xs font-medium flex flex-col items-center gap-1.5 transition-all ${
                type === t.id
                  ? 'bg-[#202820] border-[#2d5a27] text-white shadow-sm'
                  : 'bg-[#202020] border-[#2e2e2e] text-[#9ca3af] hover:text-white'
              }`}
            >
              {t.icon}
              <span>{t.label}</span>
            </button>
          ))}
        </div>

        {/* URL */}
        <div>
          <label className="block text-xs font-semibold text-white mb-1">
            {type === 'video_link' ? 'Video / YouTube Linki *' : 'Görsel / Çizim URL veya Dosya Linki *'}
          </label>
          <input
            type="url"
            required
            value={url}
            onChange={(e) => handleUrlChange(e.target.value)}
            placeholder={
              type === 'video_link'
                ? 'https://www.youtube.com/watch?v=... veya https://youtu.be/...'
                : 'https://images.unsplash.com/... veya görsel bağlantısı'
            }
            className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl px-3.5 py-2 text-xs font-mono text-white focus:outline-none"
          />
        </div>

        {/* Live YouTube Thumbnail Detection Preview */}
        {ytThumbnail && (
          <div className="p-3 bg-[#182318] border border-emerald-800/50 rounded-xl flex items-center gap-3">
            <div className="relative w-24 h-14 bg-black rounded-lg overflow-hidden shrink-0">
              <img src={ytThumbnail} alt="YouTube Preview" className="w-full h-full object-cover" />
              <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                <Play className="w-4 h-4 text-white fill-white" />
              </div>
            </div>
            <div className="text-xs text-emerald-300">
              <span className="font-bold flex items-center gap-1">
                <CheckCircle className="w-3.5 h-3.5 text-emerald-400" />
                YouTube Video Kapağı Algılandı
              </span>
              <p className="text-[11px] text-[#a1a1aa] mt-0.5">Yüksek çözünürlüklü küçük resim otomatik olarak medyaya atanacaktır.</p>
            </div>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-white mb-1">Açıklama</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Görsel veya videonun matematiksel bağlamı..."
            className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl p-3 text-xs text-white focus:outline-none resize-none"
          />
        </div>

        {/* Document Linking */}
        <div className="grid grid-cols-2 gap-3 pt-2 border-t border-[#2a2a2a]">
          <div>
            <label className="block text-xs font-semibold text-white mb-1 flex items-center gap-1">
              <FileText className="w-3 h-3 text-emerald-400" />
              <span>Bağlı Not (Opsiyonel)</span>
            </label>
            <select
              value={linkedNoteId}
              onChange={(e) => setLinkedNoteId(e.target.value)}
              className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="">(Bağlı Not Yok)</option>
              {notes.map(n => (
                <option key={n.id} value={n.id}>
                  {n.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white mb-1 flex items-center gap-1">
              <Video className="w-3 h-3 text-sky-400" />
              <span>Bağlı Senaryo (Opsiyonel)</span>
            </label>
            <select
              value={linkedScriptId}
              onChange={(e) => setLinkedScriptId(e.target.value)}
              className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl px-2.5 py-1.5 text-xs text-white focus:outline-none"
            >
              <option value="">(Bağlı Senaryo Yok)</option>
              {scripts.map(s => (
                <option key={s.id} value={s.id}>
                  {s.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-semibold text-white mb-1">Etiketler</label>
          <div className="flex items-center gap-1.5 flex-wrap bg-[#202020] border border-[#333] rounded-xl p-2">
            {tags.map((t) => (
              <span
                key={t}
                className="bg-[#2a2a2a] px-2 py-0.5 rounded-md text-[11px] text-[#e5e7eb] flex items-center gap-1"
              >
                #{t}
                <button
                  type="button"
                  onClick={() => handleRemoveTag(t)}
                  className="text-[#71717a] hover:text-rose-400 ml-0.5"
                >
                  ×
                </button>
              </span>
            ))}
            <input
              type="text"
              value={tagInput}
              onChange={(e) => setTagInput(e.target.value)}
              onKeyDown={handleAddTag}
              placeholder="+ Etiket (Enter)"
              className="bg-transparent text-xs text-white placeholder-[#71717a] focus:outline-none px-1 w-24"
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex justify-end gap-2 pt-3 border-t border-[#2a2a2a]">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-[#242424] hover:bg-[#2c2c2c] text-xs font-medium text-[#d1d5db] rounded-xl transition-colors"
          >
            İptal
          </button>
          <button
            type="submit"
            className="px-5 py-2 bg-[#2d5a27] hover:bg-[#387030] text-xs font-semibold text-white rounded-xl shadow-md transition-all"
          >
            {editItem ? 'Değişiklikleri Kaydet' : 'Medyayı Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
