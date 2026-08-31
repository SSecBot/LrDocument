'use client';

import React, { useState, useEffect } from 'react';
import { KanbanCard, KanbanColumnId, KanbanProjectType, TaskPriority } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/ui/Modal';
import {
  FileText,
  Video,
} from 'lucide-react';

interface KanbanCardModalProps {
  isOpen: boolean;
  onClose: () => void;
  editCard?: KanbanCard | null;
  defaultColumnId?: KanbanColumnId;
}

const PROJECT_TYPES: { id: KanbanProjectType; label: string; icon: string }[] = [
  { id: 'genel', label: 'Genel Yapılacaklar', icon: '📋' },
  { id: 'icerik', label: 'İçerik Üretimi', icon: '✨' },
  { id: 'matematik', label: 'Matematik Araştırması', icon: '📐' },
  { id: 'finans', label: 'Finans Planı', icon: '💰' },
  { id: 'senaryo', label: 'Video Senaryosu', icon: '🎬' },
];

const COLUMNS: { id: KanbanColumnId; label: string }[] = [
  { id: 'fikir', label: 'Fikir & Havuz' },
  { id: 'yapilacak', label: 'Planlandı / Yapılacak' },
  { id: 'devam_ediyor', label: 'Devam Ediyor / Üretimde' },
  { id: 'inceleme', label: 'İnceleme & Kurgu' },
  { id: 'tamamlandi', label: 'Tamamlandı / Yayında' },
];

export const KanbanCardModal: React.FC<KanbanCardModalProps> = ({
  isOpen,
  onClose,
  editCard,
  defaultColumnId = 'fikir',
}) => {
  const { addKanbanCard, updateKanbanCard, notes, scripts } = useAppStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [projectType, setProjectType] = useState<KanbanProjectType>('genel');
  const [columnId, setColumnId] = useState<KanbanColumnId>(defaultColumnId);
  const [priority, setPriority] = useState<TaskPriority>('orta');
  const [dueDate, setDueDate] = useState('');
  const [tagsInput, setTagsInput] = useState('');
  const [linkedNoteId, setLinkedNoteId] = useState('');
  const [linkedScriptId, setLinkedScriptId] = useState('');

  useEffect(() => {
    if (editCard) {
      setTitle(editCard.title);
      setDescription(editCard.description || '');
      setProjectType(editCard.projectType);
      setColumnId(editCard.columnId);
      setPriority(editCard.priority);
      setDueDate(editCard.dueDate || '');
      setTagsInput(editCard.tags.join(', '));
      setLinkedNoteId(editCard.linkedNoteId || '');
      setLinkedScriptId(editCard.linkedScriptId || '');
    } else {
      setTitle('');
      setDescription('');
      setProjectType('genel');
      setColumnId(defaultColumnId);
      setPriority('orta');
      setDueDate('');
      setTagsInput('');
      setLinkedNoteId('');
      setLinkedScriptId('');
    }
  }, [editCard, defaultColumnId, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    const tags = tagsInput
      .split(',')
      .map(t => t.trim())
      .filter(Boolean);

    if (editCard) {
      updateKanbanCard(editCard.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        projectType,
        columnId,
        priority,
        dueDate: dueDate || undefined,
        tags,
        linkedNoteId: linkedNoteId || undefined,
        linkedScriptId: linkedScriptId || undefined,
      });
    } else {
      addKanbanCard({
        title: title.trim(),
        description: description.trim() || undefined,
        projectType,
        columnId,
        priority,
        dueDate: dueDate || undefined,
        tags,
        linkedNoteId: linkedNoteId || undefined,
        linkedScriptId: linkedScriptId || undefined,
      });
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editCard ? 'Kanban Kartını Düzenle' : 'Yeni Kanban Kartı Oluştur'}
      subtitle="Genel görevler, matematik araştırmaları, senaryo veya finans için kart ekleyin."
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-white mb-1">Kart Başlığı *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Örn: Riemann Hipotezi için numerik hesaplama betiği yaz"
            className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none"
          />
        </div>

        {/* Project Type & Column */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-white mb-1">Proje Türü *</label>
            <select
              value={projectType}
              onChange={(e) => setProjectType(e.target.value as KanbanProjectType)}
              className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              {PROJECT_TYPES.map((pt) => (
                <option key={pt.id} value={pt.id}>
                  {pt.icon} {pt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white mb-1">Kanban Aşaması *</label>
            <select
              value={columnId}
              onChange={(e) => setColumnId(e.target.value as KanbanColumnId)}
              className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              {COLUMNS.map((col) => (
                <option key={col.id} value={col.id}>
                  {col.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Priority & Due Date */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-semibold text-white mb-1">Öncelik Seviyesi</label>
            <select
              value={priority}
              onChange={(e) => setPriority(e.target.value as TaskPriority)}
              className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="yuksek">🔴 Yüksek Öncelik</option>
              <option value="orta">🟡 Orta Öncelik</option>
              <option value="dusuk">🟢 Düşük Öncelik</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white mb-1">Hedef / Teslim Tarihi</label>
            <input
              type="date"
              value={dueDate}
              onChange={(e) => setDueDate(e.target.value)}
              className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-white mb-1">Açıklama & Detaylar</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={3}
            placeholder="Kartın detayları, hedefler veya notlar..."
            className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl p-3 text-xs text-white focus:outline-none resize-none"
          />
        </div>

        {/* Tags */}
        <div>
          <label className="block text-xs font-semibold text-white mb-1">Etiketler (Virgülle ayırın)</label>
          <input
            type="text"
            value={tagsInput}
            onChange={(e) => setTagsInput(e.target.value)}
            placeholder="Örn: Araştırma, Analiz, Manim, Python"
            className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl px-3.5 py-2 text-xs text-white focus:outline-none"
          />
        </div>

        {/* Link with Note or Script */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          <div>
            <label className="block text-xs font-semibold text-white mb-1 flex items-center gap-1">
              <FileText className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bağlı Not (Opsiyonel)</span>
            </label>
            <select
              value={linkedNoteId}
              onChange={(e) => setLinkedNoteId(e.target.value)}
              className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="">(Bağlantı Yok)</option>
              {notes.map((n) => (
                <option key={n.id} value={n.id}>
                  {n.title}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-white mb-1 flex items-center gap-1">
              <Video className="w-3.5 h-3.5 text-sky-400" />
              <span>Bağlı Senaryo (Opsiyonel)</span>
            </label>
            <select
              value={linkedScriptId}
              onChange={(e) => setLinkedScriptId(e.target.value)}
              className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="">(Bağlantı Yok)</option>
              {scripts.map((s) => (
                <option key={s.id} value={s.id}>
                  [{s.targetPlatform}] {s.title}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex justify-end gap-2 pt-4 border-t border-[#2a2a2a]">
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
            {editCard ? 'Kartı Güncelle' : 'Kartı Kaydet'}
          </button>
        </div>
      </form>
    </Modal>
  );
};
