'use client';

import { t as tl, tx } from '@/lib/i18n';
import React, { useState } from 'react';
import { CalendarEvent, CalendarEventType, Platform, EventStatus, EventChecklistItem } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/ui/Modal';
import { generateId, toLocalDateString } from '@/lib/utils';
import {
  ListChecks,
  Plus,
  Trash2,
  Check,
} from 'lucide-react';
import { confirmDelete } from '@/components/ui/ConfirmDialog';

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
  const { addEvent, updateEvent, deleteEvent, systemSettings } = useAppStore();
  const defaults = systemSettings.calendar;

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [date, setDate] = useState('');
  const [time, setTime] = useState('18:00');
  const [durationMinutes, setDurationMinutes] = useState(60);
  const [eventType, setEventType] = useState<CalendarEventType>('yayin');
  const [platform, setPlatform] = useState<Platform>('YouTube');
  const [status, setStatus] = useState<EventStatus>('planlandi');
  const [checklist, setChecklist] = useState<EventChecklistItem[]>([
    { id: '1', text: tl('Kapak resmi (Thumbnail) tasarımı bitti'), done: false },
    { id: '2', text: tl('Video kurgusu ve ses dengelemesi tamam'), done: false },
    { id: '3', text: tl('Açıklama, etiketler ve kaynakça eklendi'), done: false },
  ]);
  const [newChecklistText, setNewChecklistText] = useState('');

  // Reset the form whenever the modal is (re)opened or a different record is edited.
  // Adjusting state during render (instead of in an effect) avoids a flash of stale values.
  const resetKey = `${isOpen}:${editEvent?.id ?? 'new'}:${initialDate ?? ''}`;
  const [prevResetKey, setPrevResetKey] = useState<string | null>(null);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    if (editEvent) {
      setTitle(editEvent.title);
      setDescription(editEvent.description || '');
      setDate(editEvent.date);
      setTime(editEvent.time || defaults.defaultEventTime);
      setDurationMinutes(editEvent.durationMinutes || defaults.defaultEventDurationMinutes);
      setEventType(editEvent.eventType || 'yayin');
      setPlatform(editEvent.platform || 'YouTube');
      setStatus(editEvent.status);
      setChecklist(editEvent.checklist || []);
    } else {
      setTitle('');
      setDescription('');
      setDate(initialDate || toLocalDateString());
      setTime(defaults.defaultEventTime);
      setDurationMinutes(defaults.defaultEventDurationMinutes);
      setEventType('gorev');
      setPlatform('YouTube');
      setStatus('planlandi');
      setChecklist([]);
    }
  }

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

  const handleDelete = async () => {
    if (editEvent && (await confirmDelete(tl('"{title}" etkinliği', { title: editEvent.title })))) {
      deleteEvent(editEvent.id);
      onClose();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={editEvent ? tl('Takvim Etkinliğini Düzenle') : tl('Yeni Takvim Etkinliği Ekle')}
      subtitle={tl('Yayın planı, görev teslimi veya özel kilometre taşı oluşturun.')}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Event Type Select */}
        <div>
          <label className="block text-xs font-semibold text-white mb-1.5">{tl('Etkinlik Türü')}</label>
          <div className="grid grid-cols-3 gap-2">
            {[
              { id: 'yayin', label: tl('Yayın / Video'), desc: tl('Sosyal Medya') },
              { id: 'gorev', label: tl('Görev Teslimi'), desc: tl('İş Planı') },
              { id: 'ozel_gun', label: tl('Özel Gün / Not'), desc: tl('Kilometre Taşı') },
            ].map((t) => (
              <button
                type="button"
                key={t.id}
                onClick={() => setEventType(t.id as CalendarEventType)}
                className={`p-2.5 rounded-xl border text-xs font-semibold flex flex-col items-center gap-0.5 transition-all ${
                  eventType === t.id
                    ? 'bg-surface-2 border-brand text-white'
                    : 'bg-surface-2 border-line text-subtle hover:text-white'
                }`}
              >
                <span>{tx(t.label)}</span>
                <span className="text-[10px] font-normal text-muted">{tx(t.desc)}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Title */}
        <div>
          <label className="block text-xs font-semibold text-white mb-1">{tl('Etkinlik Başlığı *')}</label>
          <input
            type="text"
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder={tl('Örn: Euler Özdeşliği Belgesel Videosu Yayını')}
            className="w-full bg-surface-2 border border-line-strong focus:border-brand rounded-lg px-3.5 py-2 text-sm text-white focus:outline-none"
          />
        </div>

        {/* Platform (if yayin) & Status */}
        <div className="grid grid-cols-2 gap-3">
          {eventType === 'yayin' ? (
            <div>
              <label className="block text-xs font-semibold text-white mb-1">{tl('Yayın Platformu')}</label>
              <select
                value={platform}
                onChange={(e) => setPlatform(e.target.value as Platform)}
                className="w-full bg-surface-2 border border-line-strong focus:border-brand rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="YouTube">YouTube</option>
                <option value="TikTok">TikTok</option>
                <option value="Instagram">{tl('Instagram')}</option>
                <option value="Web">{tl('Web Video / Blog')}</option>
                <option value="Podcast">{tl('Podcast')}</option>
              </select>
            </div>
          ) : (
            <div>
              <label className="block text-xs font-semibold text-white mb-1">{tl('Kategori')}</label>
              <div className="bg-surface-2 border border-line-strong rounded-lg px-3 py-2 text-xs text-subtle">
                {eventType === 'gorev' ? tl('Görev & Yapılacak') : tl('Özel Gün & Not')}
              </div>
            </div>
          )}

          <div>
            <label className="block text-xs font-semibold text-white mb-1">{tl('Durum')}</label>
            <select
              value={status}
              onChange={(e) => setStatus(e.target.value as EventStatus)}
              className="w-full bg-surface-2 border border-line-strong focus:border-brand rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
            >
              <option value="planlandi">{tl('Planlandı')}</option>
              <option value="hazirlaniyor">{tl('Hazırlanıyor')}</option>
              <option value="yayinlandi">{tl('Tamamlandı / Yayınlandı')}</option>
              <option value="iptal">{tl('İptal Edildi')}</option>
            </select>
          </div>
        </div>

        {/* Date, Time & Duration */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
          <div className="col-span-2 sm:col-span-1">
            <label className="block text-xs font-semibold text-white mb-1">{tl('Tarih *')}</label>
            <input
              type="date"
              required
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className="w-full bg-surface-2 border border-line-strong focus:border-brand rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white mb-1">{tl('Saat')}</label>
            <input
              type="time"
              value={time}
              onChange={(e) => setTime(e.target.value)}
              className="w-full bg-surface-2 border border-line-strong focus:border-brand rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-white mb-1">{tl('Süre (Dk)')}</label>
            <input
              type="number"
              min="5"
              max="480"
              value={durationMinutes}
              onChange={(e) => setDurationMinutes(Number(e.target.value))}
              className="w-full bg-surface-2 border border-line-strong focus:border-brand rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
            />
          </div>
        </div>


        {/* Description */}
        <div>
          <label className="block text-xs font-semibold text-white mb-1">{tl('Açıklama & Notlar')}</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            rows={2}
            placeholder={tl('Yayın stratejisi, hedef kitle veya hatırlatıcılar...')}
            className="w-full bg-surface-2 border border-line-strong focus:border-brand rounded-lg p-3 text-xs text-white focus:outline-none resize-none"
          />
        </div>

        {/* Checklist */}
        <div className="pt-2 border-t border-line space-y-2">
          <label className="block text-xs font-semibold text-white flex items-center justify-between">
            <span className="flex items-center gap-1.5">
              <ListChecks className="w-3.5 h-3.5 text-emerald-400" />
              {tl('Kontrol Listesi')}
            </span>
            <span className="text-[11px] text-muted">
              {checklist.filter(c => c.done).length}/{checklist.length}{' '}{tl('tamamlandı')}
            </span>
          </label>

          <div className="space-y-1.5 max-h-36 overflow-y-auto pr-1">
            {checklist.map((item) => (
              <div
                key={item.id}
                className="flex items-center justify-between bg-surface-2 p-2 rounded-lg border border-line text-xs"
              >
                <div
                  onClick={() => handleToggleChecklist(item.id)}
                  className="flex items-center gap-2 cursor-pointer flex-1"
                >
                  <div
                    className={`w-4 h-4 rounded flex items-center justify-center border ${
                      item.done ? 'bg-brand border-emerald-500 text-white' : 'border-line-strong'
                    }`}
                  >
                    {item.done && <Check className="w-3 h-3 stroke-[3]" />}
                  </div>
                  <span className={item.done ? 'line-through text-muted' : 'text-white'}>
                    {tx(item.text)}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={async () => (await confirmDelete(tl('Kontrol maddesi'), tl('Kaydet’e basana kadar değişiklik kalıcı olmaz.'))) && handleDeleteChecklist(item.id)}
                  className="text-muted hover:text-rose-400 p-1"
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
              placeholder={tl('Yeni kontrol maddesi ekle...')}
              className="flex-1 bg-surface-2 border border-line-strong focus:border-brand rounded-lg px-3 py-1.5 text-xs text-white focus:outline-none"
            />
            <button
              type="button"
              onClick={handleAddChecklistItem}
              className="px-3 py-1.5 bg-surface-2 hover:bg-surface-4 text-xs font-medium text-white rounded-lg flex items-center gap-1 transition-colors"
            >
              <Plus className="w-3 h-3" />
              <span>{tl('Ekle')}</span>
            </button>
          </div>
        </div>

        {/* Footer Actions */}
        <div className="modal-actions flex items-center justify-between">
          {editEvent ? (
            <button
              type="button"
              onClick={handleDelete}
              className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900/60 text-rose-300 border border-rose-800/40 text-xs font-medium rounded-lg transition-colors flex items-center gap-1.5"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>{tl('Sil')}</span>
            </button>
          ) : <div />}

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface-2 hover:bg-surface-3 text-xs font-medium text-body rounded-lg transition-colors"
            >
              {tl('İptal')}
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-brand hover:bg-brand-hover text-xs font-semibold text-white rounded-lg transition-all"
            >
              {editEvent ? tl('Değişiklikleri Kaydet') : tl('Etkinliği Kaydet')}
            </button>
          </div>
        </div>
      </form>
    </Modal>
  );
};
