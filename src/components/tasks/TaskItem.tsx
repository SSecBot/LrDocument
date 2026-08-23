'use client';

import React, { useState } from 'react';
import { Task } from '@/types';
import { useAppStore, isTaskOverdue, getEffectiveTaskPriority } from '@/store/useAppStore';
import { PriorityBadge } from '@/components/ui/Badge';
import { CrossLinkModal } from './CrossLinkModal';
import {
  Check,
  Calendar,
  FileText,
  Video,
  Link2,
  Trash2,
  Clock,
  AlertCircle,
  AlertTriangle,
} from 'lucide-react';
import { formatTurkishDate, getRelativeTimeTurkish } from '@/lib/utils';
import confetti from 'canvas-confetti';

interface TaskItemProps {
  task: Task;
}

export const TaskItem: React.FC<TaskItemProps> = ({ task }) => {
  const {
    toggleTask,
    deleteTask,
    notes,
    scripts,
    setActiveNoteId,
    setActiveScriptId,
    setActiveTab,
  } = useAppStore();

  const [isCrossLinkModalOpen, setIsCrossLinkModalOpen] = useState(false);

  const linkedNote = task.linkedNoteId ? notes.find(n => n.id === task.linkedNoteId) : null;
  const linkedScript = task.linkedScriptId ? scripts.find(s => s.id === task.linkedScriptId) : null;

  const overdue = isTaskOverdue(task);
  const effectivePriority = getEffectiveTaskPriority(task);

  const handleToggle = () => {
    if (!task.completed) {
      // Trigger confetti celebration
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

  const handleJumpToNote = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (linkedNote) {
      setActiveNoteId(linkedNote.id);
      setActiveTab('notes');
    }
  };

  const handleJumpToScript = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (linkedScript) {
      setActiveScriptId(linkedScript.id);
      setActiveTab('scripts');
    }
  };

  return (
    <>
      <div
        className={`p-4 rounded-2xl border transition-all space-y-3 group ${
          task.completed
            ? 'bg-[#161616]/70 border-[#222222] opacity-75'
            : overdue
            ? 'bg-[#221316]/70 border-rose-900/60 hover:border-rose-700/80 shadow-md shadow-rose-950/30'
            : 'bg-[#181818] hover:bg-[#1f1f1f] border-[#282828] hover:border-[#383838]'
        }`}
      >
        <div className="flex items-start gap-3.5">
          {/* Custom Checkbox */}
          <button
            onClick={handleToggle}
            className={`w-5 h-5 rounded-lg flex items-center justify-center transition-all mt-0.5 shrink-0 border ${
              task.completed
                ? 'bg-[#2d5a27] border-emerald-500 text-white shadow-sm shadow-emerald-900/40'
                : overdue
                ? 'bg-[#281619] border-rose-700/60 hover:border-rose-500 text-transparent'
                : 'bg-[#222] border-[#3e3e3e] hover:border-[#2d5a27] text-transparent'
            }`}
            aria-label={task.completed ? 'Tamamlandı olarak işaretlendi' : 'Tamamla'}
          >
            <Check className={`w-3.5 h-3.5 stroke-[3] ${task.completed ? 'text-white' : 'text-transparent'}`} />
          </button>

          {/* Task Info */}
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 flex-wrap">
              <h4
                className={`text-sm font-semibold transition-all ${
                  task.completed ? 'line-through text-[#71717a]' : 'text-white'
                }`}
              >
                {task.title}
              </h4>

              {/* Dynamic Priority Badge */}
              <PriorityBadge priority={effectivePriority} />

              {/* Overdue Auto-Priority Elevation Pill */}
              {overdue && (
                <span className="inline-flex items-center gap-1 bg-rose-950/80 border border-rose-700/80 text-rose-300 text-[10px] font-bold px-2 py-0.5 rounded-md animate-pulse">
                  <AlertTriangle className="w-3 h-3 text-rose-400" />
                  <span>Vadesi Geçti (Otomatik Yüksek Öncelik)</span>
                </span>
              )}
            </div>

            {task.description && (
              <p className="text-xs text-[#9ca3af] mt-1 leading-relaxed">
                {task.description}
              </p>
            )}

            {/* Badges & Links row */}
            <div className="flex items-center gap-2 mt-3 flex-wrap text-xs">
              {/* Due date */}
              {task.dueDate && (
                <div
                  className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md border text-[11px] font-medium ${
                    overdue
                      ? 'bg-rose-950/60 border-rose-800/60 text-rose-300'
                      : 'bg-[#222] border-[#333] text-[#a1a1aa]'
                  }`}
                >
                  <Calendar className="w-3 h-3 text-emerald-400" />
                  <span>{getRelativeTimeTurkish(task.dueDate)} ({formatTurkishDate(task.dueDate)})</span>
                  {overdue && <AlertCircle className="w-3 h-3 text-rose-400 ml-0.5" />}
                </div>
              )}

              {/* Linked Note Jump */}
              {linkedNote && (
                <button
                  onClick={handleJumpToNote}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#202820] hover:bg-[#2d5a27]/40 border border-[#2d5a27]/50 text-[11px] text-emerald-300 transition-colors"
                  title="Bağlı Nota Git"
                >
                  <FileText className="w-3 h-3 text-emerald-400" />
                  <span className="truncate max-w-[150px]">Not: {linkedNote.title}</span>
                </button>
              )}

              {/* Linked Script Jump */}
              {linkedScript && (
                <button
                  onClick={handleJumpToScript}
                  className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-md bg-[#202820] hover:bg-[#2d5a27]/40 border border-[#2d5a27]/50 text-[11px] text-emerald-300 transition-colors"
                  title="Bağlı Video Senaryosuna Git"
                >
                  <Video className="w-3 h-3 text-emerald-400" />
                  <span className="truncate max-w-[150px]">Senaryo: {linkedScript.title}</span>
                </button>
              )}

              {/* Cross Link button */}
              <button
                onClick={() => setIsCrossLinkModalOpen(true)}
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-[#202020] hover:bg-[#2a2a2a] border border-[#333] text-[11px] text-[#9ca3af] hover:text-white transition-colors"
                title="Döküman bağlantılarını düzenle"
              >
                <Link2 className="w-3 h-3" />
                <span>{linkedNote || linkedScript ? 'Bağlantıyı Değiştir' : '+ Not/Senaryo Bağla'}</span>
              </button>
            </div>
          </div>

          {/* Delete Button */}
          <button
            onClick={() => deleteTask(task.id)}
            className="p-2 text-[#71717a] hover:text-rose-400 hover:bg-rose-950/30 rounded-lg transition-colors opacity-0 group-hover:opacity-100"
            title="Görevi Sil"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      <CrossLinkModal
        task={task}
        isOpen={isCrossLinkModalOpen}
        onClose={() => setIsCrossLinkModalOpen(false)}
      />
    </>
  );
};
