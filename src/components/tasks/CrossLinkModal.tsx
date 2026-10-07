'use client';

import React, { useState } from 'react';
import { Task } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/ui/Modal';
import { FileText, Video, Check } from 'lucide-react';

interface CrossLinkModalProps {
  task: Task;
  isOpen: boolean;
  onClose: () => void;
}

export const CrossLinkModal: React.FC<CrossLinkModalProps> = ({
  task,
  isOpen,
  onClose,
}) => {
  const { notes, scripts, updateTask, addToast } = useAppStore();
  const [selectedNoteId, setSelectedNoteId] = useState<string | undefined>(task.linkedNoteId);
  const [selectedScriptId, setSelectedScriptId] = useState<string | undefined>(task.linkedScriptId);

  const handleSave = () => {
    updateTask(task.id, {
      linkedNoteId: selectedNoteId || undefined,
      linkedScriptId: selectedScriptId || undefined,
    });
    addToast({ type: 'success', title: 'Bağlantılar Güncellendi', message: 'Görev dökümanlarla başarıyla ilişkilendirildi.' });
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Görevi Not veya Senaryo ile İlişkilendir"
      subtitle="Bu görevi tamamlamak için gereken dökümanı bağlayın."
      maxWidth="max-w-md"
    >
      <div className="space-y-5">
        {/* Note selection */}
        <div>
          <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
            <FileText className="w-4 h-4 text-emerald-400" />
            <span>Matematik Notu Bağla</span>
          </label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            <div
              onClick={() => setSelectedNoteId(undefined)}
              className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between ${
                !selectedNoteId
                  ? 'bg-surface-2 border-brand text-emerald-300 font-semibold'
                  : 'bg-surface-2 border-line text-subtle hover:text-white'
              }`}
            >
              <span>(Not Bağlantısı Yok)</span>
              {!selectedNoteId && <Check className="w-4 h-4 text-emerald-400" />}
            </div>

            {notes.map((n) => (
              <div
                key={n.id}
                onClick={() => setSelectedNoteId(n.id)}
                className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                  selectedNoteId === n.id
                    ? 'bg-surface-2 border-brand text-white font-semibold'
                    : 'bg-surface-2 border-line text-subtle hover:text-white hover:bg-surface-2'
                }`}
              >
                <span className="truncate">{n.title}</span>
                {selectedNoteId === n.id && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* Script selection */}
        <div>
          <label className="block text-xs font-semibold text-white uppercase tracking-wider mb-2 flex items-center gap-2">
            <Video className="w-4 h-4 text-emerald-400" />
            <span>Video Senaryosu Bağla</span>
          </label>
          <div className="space-y-1.5 max-h-48 overflow-y-auto pr-1">
            <div
              onClick={() => setSelectedScriptId(undefined)}
              className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between ${
                !selectedScriptId
                  ? 'bg-surface-2 border-brand text-emerald-300 font-semibold'
                  : 'bg-surface-2 border-line text-subtle hover:text-white'
              }`}
            >
              <span>(Senaryo Bağlantısı Yok)</span>
              {!selectedScriptId && <Check className="w-4 h-4 text-emerald-400" />}
            </div>

            {scripts.map((s) => (
              <div
                key={s.id}
                onClick={() => setSelectedScriptId(s.id)}
                className={`p-2.5 rounded-lg border text-xs cursor-pointer flex items-center justify-between transition-colors ${
                  selectedScriptId === s.id
                    ? 'bg-surface-2 border-brand text-white font-semibold'
                    : 'bg-surface-2 border-line text-subtle hover:text-white hover:bg-surface-2'
                }`}
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-[10px] text-emerald-400 bg-surface px-1.5 py-0.5 rounded">
                    {s.targetPlatform}
                  </span>
                  <span className="truncate">{s.title}</span>
                </div>
                {selectedScriptId === s.id && <Check className="w-4 h-4 text-emerald-400 shrink-0" />}
              </div>
            ))}
          </div>
        </div>

        {/* Footer actions */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-line">
          <button
            onClick={onClose}
            className="px-4 py-2 bg-surface-2 hover:bg-surface-3 text-xs font-medium text-body rounded-lg transition-colors"
          >
            İptal
          </button>
          <button
            onClick={handleSave}
            className="px-4 py-2 bg-brand hover:bg-brand-hover text-xs font-semibold text-white rounded-lg transition-colors"
          >
            Bağlantıları Kaydet
          </button>
        </div>
      </div>
    </Modal>
  );
};
