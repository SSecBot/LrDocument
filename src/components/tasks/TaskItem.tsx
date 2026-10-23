'use client';

import { t, tx } from '@/lib/i18n';
import React, { useState } from 'react';
import { Task, TaskPriority } from '@/types';
import { useAppStore, isTaskOverdue, getEffectiveTaskPriority } from '@/store/useAppStore';
import { PriorityBadge } from '@/components/ui/Badge';
import { CrossLinkModal } from './CrossLinkModal';
import {
  Check,
  Calendar,
  FileText,
  Link2,
  Trash2,
  AlertCircle,
  AlertTriangle,
  Kanban,
  Edit2,
  X,
  Save,
  UserRound,
  Clock,
} from 'lucide-react';
import { isCorporate } from '@/lib/corporate';
import { formatTurkishDate, getRelativeTimeTurkish } from '@/lib/utils';
import confetti from 'canvas-confetti';
import { confirmDelete } from '@/components/ui/ConfirmDialog';

interface TaskItemProps {
  task: Task;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task }) => {
  const {
    toggleTask,
    updateTask,
    deleteTask,
    notes,
    addKanbanCard,
    setActiveNoteId,
    setActiveTab,
    addToast,
    currentUser,
  } = useAppStore();

  const [isCrossLinkModalOpen, setIsCrossLinkModalOpen] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Edit form state
  const [editTitle, setEditTitle] = useState(task.title);
  const [editDescription, setEditDescription] = useState(task.description || '');
  const [editPriority, setEditPriority] = useState<TaskPriority>(task.priority);
  const [editDueDate, setEditDueDate] = useState(task.dueDate || '');
  const [editStartDate, setEditStartDate] = useState(task.startDate || '');
  const [editDueTime, setEditDueTime] = useState(task.dueTime || '');
  const rangeDays =
    task.startDate && task.dueDate
      ? Math.round((Date.parse(`${task.dueDate}T00:00:00Z`) - Date.parse(`${task.startDate}T00:00:00Z`)) / 86_400_000) + 1
      : 0;

  const linkedNote = task.linkedNoteId ? notes.find(n => n.id === task.linkedNoteId) : null;

  const overdue = isTaskOverdue(task);
  const effectivePriority = getEffectiveTaskPriority(task);

  const handleToggle = () => {
    if (!task.completed) {
      try {
        confetti({
          particleCount: 50,
          spread: 60,
          origin: { y: 0.8 },
          colors: ['#4ade80', '#2d5a27', '#ffffff', '#fbbf24'],
        });
      } catch {}
    }
    toggleTask(task.id);
  };

  const handleSaveEdit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!editTitle.trim()) return;

    updateTask(task.id, {
      title: editTitle.trim(),
      description: editDescription.trim() || undefined,
      priority: editPriority,
      startDate: editStartDate && editDueDate && editStartDate <= editDueDate ? editStartDate : undefined,
      dueDate: editDueDate || undefined,
      dueTime: editDueDate && editDueTime ? editDueTime : undefined,
    });

    setIsEditing(false);
    addToast({
      type: 'success',
      title: t('Görev Güncellendi'),
      message: t('"{v0}" başarıyla kaydedildi.', { v0: editTitle.trim() }),
    });
  };

  const handleCancelEdit = () => {
    setEditTitle(task.title);
    setEditDescription(task.description || '');
    setEditPriority(task.priority);
    setEditDueDate(task.dueDate || '');
    setEditStartDate(task.startDate || '');
    setEditDueTime(task.dueTime || '');
    setIsEditing(false);
  };

  const handleSendToKanban = (e: React.MouseEvent) => {
    e.stopPropagation();
    addKanbanCard({
      title: task.title,
      description: task.description || t('Görevler modülünden aktarıldı.'),
      projectType: 'genel',
      columnId: 'yapilacak',
      priority: task.priority,
      dueDate: task.dueDate,
      tags: [t('Görev')],
      linkedNoteId: task.linkedNoteId,
    });

    addToast({
      type: 'success',
      title: t('Kanban Panosuna Eklendi'),
      message: t('"{title}" Yapılacaklar sütununa eklendi.', { title: task.title }),
    });
  };

  const handleJumpToNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (linkedNote) {
      setActiveNoteId(linkedNote.id);
      setActiveTab('notes');
    }
  };

  return (
    <>
      <div
        className={`p-3.5 sm:p-4 rounded-xl border transition-all space-y-3 group ${
          task.completed
            ? 'bg-surface/70 border-line opacity-75'
            : overdue
            ? 'bg-rose-950/50/70 border-rose-900/60 hover:border-rose-700/80'
            : 'bg-surface hover:bg-surface-2 border-line hover:border-line-strong'
        }`}
      >
        {isEditing ? (
          /* Inline Edit Form */
          <form onSubmit={handleSaveEdit} className="space-y-3">
            <div className="space-y-2">
              <div>
                <label className="block text-[11px] font-bold text-subtle mb-1">{t('Görev Başlığı *')}</label>
                <input
                  type="text"
                  required
                  value={editTitle}
                  onChange={(e) => setEditTitle(e.target.value)}
                  className="w-full bg-surface-2 border border-line-strong focus:border-brand rounded-lg px-3 py-2 text-xs sm:text-sm text-white focus:outline-none min-h-[44px]"
                  placeholder={t('Görev başlığı...')}
                />
              </div>

              <div>
                <label className="block text-[11px] font-bold text-subtle mb-1">{t('Açıklama & Detaylar')}</label>
                <textarea
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  rows={2}
                  className="w-full bg-surface-2 border border-line-strong focus:border-brand rounded-lg px-3 py-2 text-xs text-white focus:outline-none resize-none"
                  placeholder={t('Görevle ilgili ayrıntılı notlar...')}
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
                <div>
                  <label className="block text-[11px] font-bold text-subtle mb-1">{t('Öncelik')}</label>
                  <select
                    value={editPriority}
                    onChange={(e) => setEditPriority(e.target.value as TaskPriority)}
                    className="w-full bg-surface-2 border border-line-strong focus:border-brand rounded-lg px-3 py-2 text-xs text-white focus:outline-none min-h-[44px]"
                  >
                    <option value="yuksek">{t('Yüksek Öncelik')}</option>
                    <option value="orta">{t('Orta Öncelik')}</option>
                    <option value="dusuk">{t('Düşük Öncelik')}</option>
                  </select>
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-subtle mb-1">{t('Başlangıç (isteğe bağlı)')}</label>
                  <input
                    type="date"
                    value={editStartDate}
                    max={editDueDate || undefined}
                    onChange={(e) => setEditStartDate(e.target.value)}
                    className="w-full bg-surface-2 border border-line-strong focus:border-brand rounded-lg px-3 py-2 text-xs text-white focus:outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-subtle mb-1">{editStartDate ? t('Bitiş Tarihi') : t('Son Teslim Tarihi')}</label>
                  <input
                    type="date"
                    value={editDueDate}
                    min={editStartDate || undefined}
                    onChange={(e) => setEditDueDate(e.target.value)}
                    className="w-full bg-surface-2 border border-line-strong focus:border-brand rounded-lg px-3 py-2 text-xs text-white focus:outline-none min-h-[44px]"
                  />
                </div>

                <div>
                  <label className="block text-[11px] font-bold text-subtle mb-1">{t('Saat (isteğe bağlı)')}</label>
                  <input
                    type="time"
                    value={editDueTime}
                    disabled={!editDueDate}
                    onChange={(e) => setEditDueTime(e.target.value)}
                    className="w-full bg-surface-2 border border-line-strong focus:border-brand rounded-lg px-3 py-2 text-xs text-white focus:outline-none min-h-[44px] disabled:opacity-50"
                    title={editDueDate ? undefined : t('Önce bir tarih seçin')}
                  />
                </div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
              <button
                type="button"
                onClick={handleCancelEdit}
                className="min-h-[40px] px-3.5 py-1.5 bg-surface-2 hover:bg-surface-3 text-body text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer"
              >
                <X className="w-3.5 h-3.5" />
                <span>{t('İptal')}</span>
              </button>

              <button
                type="submit"
                className="min-h-[40px] px-4 py-1.5 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-lg flex items-center gap-1.5 transition-all cursor-pointer"
              >
                <Save className="w-3.5 h-3.5" />
                <span>{t('Kaydet')}</span>
              </button>
            </div>
          </form>
        ) : (
          /* Normal Task View */
          <div className="flex items-start gap-2.5 sm:gap-3.5">
            {/* Custom Checkbox with touch-target container */}
            <button
              onClick={handleToggle}
              className="min-h-[44px] min-w-[44px] -ml-2 -mt-2 p-2 flex items-center justify-center rounded-lg transition-all cursor-pointer"
              aria-label={task.completed ? t('Tamamlandı olarak işaretlendi') : t('Tamamla')}
            >
              <div
                className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all border ${
                  task.completed
                    ? 'bg-brand border-emerald-500 text-white'
                    : overdue
                    ? 'bg-rose-950/60 border-rose-700/60 hover:border-rose-500 text-transparent'
                    : 'bg-surface-2 border-line-strong hover:border-brand text-transparent'
                }`}
              >
                <Check className={`w-3.5 h-3.5 stroke-[3] ${task.completed ? 'text-white' : 'text-transparent'}`} />
              </div>
            </button>

            {/* Task Info */}
            <div className="flex-1 min-w-0 pt-0.5">
              <div className="flex items-center gap-2 flex-wrap">
                <h4
                  className={`text-xs sm:text-sm font-semibold transition-all ${
                    task.completed ? 'line-through text-muted' : 'text-white'
                  }`}
                >
                  {tx(task.title)}
                </h4>

                {/* Dynamic Priority Badge */}
                <PriorityBadge priority={effectivePriority} />

                {/* Overdue Auto-Priority Elevation Pill */}
                {overdue && (
                  <span className="inline-flex items-center gap-1 bg-rose-950/80 border border-rose-700/80 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-md">
                    <AlertTriangle className="w-3 h-3 text-rose-400" />
                    <span>{t('Vadesi Geçti')}</span>
                  </span>
                )}
              </div>

              {task.description && (
                <p className="text-xs text-subtle mt-1 leading-relaxed">
                  {tx(task.description)}
                </p>
              )}

              {/* Badges & Links row */}
              <div className="flex items-center gap-1.5 sm:gap-2 mt-2.5 flex-wrap text-xs">
                {/* Due date */}
                {task.dueDate && (
                  <div
                    className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-medium min-h-[32px] ${
                      overdue
                        ? 'bg-rose-950/60 border-rose-800/60 text-rose-300'
                        : 'bg-surface-2 border-line-strong text-subtle'
                    }`}
                  >
                    <Calendar className="w-3 h-3 text-emerald-400" />
                    {task.startDate ? (
                      <span>
                        {tx(formatTurkishDate(task.startDate))} – {tx(formatTurkishDate(task.dueDate))} ({rangeDays}{' '}{t('gün)')}
                      </span>
                    ) : (
                      <span>{tx(getRelativeTimeTurkish(task.dueDate))} ({tx(formatTurkishDate(task.dueDate))})</span>
                    )}
                    {task.dueTime && (
                      <span className="inline-flex items-center gap-0.5 ml-1 font-semibold tabular-nums">
                        <Clock className="w-3 h-3" /> {tx(task.dueTime)}
                      </span>
                    )}
                    {overdue && <AlertCircle className="w-3 h-3 text-rose-400 ml-0.5" />}
                  </div>
                )}

                {/* Kurumsal: who added it */}
                {isCorporate(currentUser) && task.createdBy && (
                  <span className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[11px] text-muted min-h-[32px]" title={t('Ekleyen')}>
                    <UserRound className="w-3 h-3" /> {tx(task.createdBy)}
                  </span>
                )}

                {/* Linked Note Jump */}
                {linkedNote && (
                  <button
                    onClick={handleJumpToNote}
                    className="min-h-[32px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-brand/40 border border-brand/50 text-[11px] text-emerald-300 transition-colors cursor-pointer"
                    title={t('Bağlı Nota Git')}
                  >
                    <FileText className="w-3 h-3 text-emerald-400" />
                    <span className="truncate max-w-[130px]">{t('Not:')}{' '}{tx(linkedNote.title)}</span>
                  </button>
                )}


                {/* One-Click Push to Kanban button */}
                <button
                  onClick={handleSendToKanban}
                  className="min-h-[32px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-brand-soft border border-brand/60 text-[11px] text-emerald-300 hover:text-white font-medium transition-colors cursor-pointer"
                  title={t('Görevi Kanban panosuna aktar')}
                >
                  <Kanban className="w-3 h-3 text-emerald-400" />
                  <span>{t('Kanban’a Ekle')}</span>
                </button>

                {/* Cross Link button */}
                <button
                  onClick={() => setIsCrossLinkModalOpen(true)}
                  className="min-h-[32px] inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-surface-2 hover:bg-surface-3 border border-line-strong text-[11px] text-subtle hover:text-white transition-colors cursor-pointer"
                  title={t('Döküman bağlantılarını düzenle')}
                >
                  <Link2 className="w-3 h-3" />
                  <span>{linkedNote ? t('Bağlantı') : t('+ Not')}</span>
                </button>
              </div>
            </div>

            {/* Action Buttons (Edit & Delete) */}
            <div className="flex items-center gap-1 shrink-0">
              <button
                onClick={() => setIsEditing(true)}
                className="min-h-[44px] min-w-[44px] p-2.5 text-subtle hover:text-emerald-400 hover:bg-surface-2 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                title={t('Görevi Düzenle')}
                aria-label={t('Düzenle')}
              >
                <Edit2 className="w-4 h-4" />
              </button>

              <button
                onClick={async () => (await confirmDelete(t('"{title}" görevi', { title: task.title }))) && deleteTask(task.id)}
                className="min-h-[44px] min-w-[44px] p-2.5 text-muted hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                title={t('Görevi Sil')}
                aria-label={t('Sil')}
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      <CrossLinkModal
        task={task}
        isOpen={isCrossLinkModalOpen}
        onClose={() => setIsCrossLinkModalOpen(false)}
      />
    </>
  );
};
