'use client';

import React, { useState, useEffect } from 'react';
import { CalendarEvent, CalendarEventType, Platform, EventStatus, EventChecklistItem } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/ui/Modal';
import { generateId } from '@/lib/utils';
import {
  Calendar,
  Clock,
  Video,
  ListChecks,
  Plus,
  Trash2,
  Check,
  Tag,
  Sparkles,
} from 'lucide-react';

interface EventModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialDate?: string;
  editEvent?: CalendarEvent | null;
}

export const EventModal: React.FC<EventModalProps> = ({
  isOpen,
  onClose,
  initialDate,
  editEvent,
}) => {
  const { addEvent, updateEvent, deleteEvent, scripts } = useAppStore();

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('18:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [eventType, setEventType] = useState<CalendarEventType>('yayin');
  const [platform, setPlatform] = useState<Platform>('YouTube');
  const [status, setStatus] = useState<EventStatus>('planlandi');
  const [linkedScriptId, setLinkedScriptId] = useState<string>('');
  const [checklist, setChecklist] = useState<EventChecklistItem[]>([
    { id: '1', text: 'Kapak resmi (Thumbnail) tasarımı bitti', done: false },
    { id: '2', text: 'Video kurgusu ve ses dengelemesi tamam', done: false },
    { id: '3', text: 'Açıklama, etiketler ve kaynakça eklendi', done: false },
  ]);
  const [newChecklistText, setNewChecklistText] = useState('');

  useEffect(() => {
    if (editEvent) {
      setTitle(editEvent.title);
      setDescription(editEvent.description || '');
      setDate(editEvent.date);
      setTime(editEvent.time || '18:00');
      setDurationMinutes(editEvent.durationMinutes || 60);
      setEventType(editEvent.eventType || 'yayin');
      setPlatform(editEvent.platform || 'YouTube');
      setStatus(editEvent.status);
      setLinkedScriptId(editEvent.linkedScriptId || '');
      setChecklist(editEvent.checklist || []);
    } else {
      setTitle('');
      setDescription('');
      setDate(initialDate || new Date().toISOString().split('T')[0]);
      setTime('18:00');
      setDurationMinutes(60);
      setEventType('yayin');
      setPlatform('YouTube');
      setStatus('planlandi');
      setLinkedScriptId('');
      setChecklist([
        { id: generateId(), text: 'Kapak resmi (Thumbnail) tasarımı bitti', done: false },
        { id: generateId(), text: 'Video kurgusu ve ses dengelemesi tamam', done: false },
        { id: generateId(), text: 'Açıklama, etiketler ve kaynakça eklendi', done: false },
      ]);
    }
  }, [editEvent, initialDate, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim() || !date) return;

    if (editEvent) {
      updateEvent(editEvent.id, {
        title: title.trim(),
        description: description.trim(),
        date,
        time,
        durationMinutes,
        eventType,
        platform: eventType === 'yayin' ? platform : undefined,
        status,
        linkedScriptId: linkedScriptId || undefined,
        checklist,
      });
    } else {
      addEvent({
        title: title.trim(),
        description: description.trim(),
        date,
        time,
        durationMinutes,
        eventType,
        platform: eventType === 'yayin' ? platform : undefined,
        status,
        linkedScriptId: linkedScriptId || undefined,
        checklist,
      });
    }

    onClose();
  };

  const handleAddChecklistItem = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newChecklistText.trim()) return;
    setChecklist([
      ...checklist,
      { id: generateId(), text: newChecklistText.trim(), done: false },
    ]);
    setNewChecklistText('');
  };

  const handleToggleChecklist = (id: string) => {
    setChecklist(checklist.map(item => item.id === id ? { ...item, done: !item.done } : item));
  };

  const handleDeleteChecklist = (id: string) => {
    setChecklist(checklist.filter(item => item.id !== id));
  };

  const handleDelete = () => {
    if (editEvent) {
      deleteEvent(editEvent.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editEvent ? 'Takvim Etkinliğini Düzenle' : 'Yeni Takvim Etkinliği Ekle'}
      subtitle="Yayın planı, görev teslimi veya özel kilometre taşı oluşturun."
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Event Type Select */}
        <div>
          <label className="block text-xs font-semibold text-white mb-1.5">Etkinlik Türü</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'yayin', label: '🔴 Yayın / Video', desc: 'Sosyal Medya' },
              { id: 'gorev', label: '🟡 Görev Teslimi', desc: 'İş Planı' },
              { id: 'ozel_gun', label: '🟢 Özel Gün / Not', desc: 'Kilometre Taşı' },
            ].map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => setEventType(t.id as CalendarEventType)}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-0.5 transition-all ${
                  eventType === t.id
                    ? 'bg-[#202820] border-[#2d5a27] text-white shadow-sm'
                    : 'bg-[#202020] border-[#2e2e2e] text-[#9ca3af] hover:text-white'
                }`}
              >
                <span>{t.label}</span>
                <span className="text-[10px] font-normal text-[#71717a]">{t.desc}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-white mb-1">Etkinlik Başlığı *</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="Örn: Euler Özdeşliği Belgesel Videosu Yayını"
            className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl px-3.5 py-2 text-sm text-white focus:outline-none"
          />
        </div>

        {/* Platform (if yayin) & Status */}
        <div className="grid grid-cols-2 gap-3">
          {eventType === 'yayin' ? (
            <div>
              <label className="block text-xs font-semibold text-white mb-1">Yayın Platformu</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="YouTube">YouTube</option>
                <option value="TikTok">TikTok</option>
                <option value="Instagram">Instagram</option>
                <option value="Web">Web Video / Blog</option>
                <option value="Podcast">Podcast</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-white mb-1">Kategori</label>
              <div className="bg-[#242424] border border-[#333] rounded-xl px-3 py-2 text-xs text-[#a1a1aa]">
                {eventType === 'gorev' ? 'Görev & Yapılacak' : 'Özel Gün & Not'}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-white mb-1">Durum</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
              className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="planlandi">Planlandı</option>
              <option value="hazirlaniyor">Hazırlanıyor</option>
              <option value="yayinlandi">Tamamlandı / Yayınlandı</option>
              <option value="iptal">İptal Edildi</option>
            </select>
          </div>
        </div>

        {/* Date, Time & Duration */}
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="block text-xs font-semibold text-white mb-1">Tarih *</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white mb-1">Saat</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white mb-1">Süre (Dk)</label>
            <input
              type="number"
              min="5"
              max="480"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>
        </div>

        {/* Linked Script (Optional) */}
        {eventType === 'yayin' && (
          <div>
            <label className="block text-xs font-semibold text-white mb-1 flex items-center gap-1.5">
              <Video className="w-3.5 h-3.5 text-emerald-400" />
              <span>Bağlı Video Senaryosu (Opsiyonel)</span>
            </label>
            <select
              value={linkedScriptId}
              onChange={(e) => setLinkedScriptId(e.target.value)}
              className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="">(Bağlı Senaryo Yok)</option>
              {scripts.map(s => (
                <option key={s.id} value={s.id}>
                  [{s.targetPlatform}] {s.title}
                </option>
              ))}
            </select>
          </div>
        )}

        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-white mb-1">Açıklama & Notlar</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder="Yayın stratejisi, hedef kitle veya hatırlatıcılar..."
            className="w-full bg-[#242424] border border-[#333] focus:border-[#2d5a27] rounded-xl p-3 text-xs text-white focus:outline-none resize-none"
          />
        </div>

        {/* Checklist */}
        <div className="pt-2 border-t border-[#2a2a2a] space-y-2">
          <label className="block text-xs font-semibold text-white flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ListChecks className="w-3.5 h-3.5 text-emerald-400" />
              Kontrol Listesi
            </span>
            <span className="text-[11px] text-[#71717a]">
              {checklist.filter(c => c.done).length}/{checklist.length} tamamlandı
            </span>
          </label>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {checklist.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-[#1f1f1f] p-2 rounded-lg border border-[#2a2a2a] text-xs"
              >
                <div
                  onClick={() => handleToggleChecklist(item.id)}
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border ${
                      item.done ? 'bg-[#2d5a27] border-emerald-500 text-white' : 'border-[#444]'
                    }`}
                  >
                    {item.done && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className={item.done ? 'line-through text-[#71717a]' : 'text-white'}>
                    {item.text}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleDeleteChecklist(item.id)}
                  className="text-[#71717a] hover:text-rose-400 p-1"
                >
                  <Trash2 className="w-3.5 h-3.5" />
                </button>
              </div>
            ))}
          </div>

          <div className="flex gap-2">
            <input
              type="text"
              value={newChecklistText}
              onChange={(e) => setNewChecklistText(e.target.value)}
              placeholder="Yeni kontrol maddesi ekle..."
              className="flex-1 bg-[#202020] border border-[#333] focus:border-[#2d5a27] rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddChecklistItem}
              className="px-3 py-1.5 bg-[#262626] hover:bg-[#333] text-xs font-medium text-white rounded-lg flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>Ekle</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-4 border-t border-[#2a2a2a]">
          {editEvent ? (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-medium rounded-xl transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Sil</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
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
              {editEvent ? 'Değişiklikleri Kaydet' : 'Etkinliği Kaydet'}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
