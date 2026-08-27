'use client';

import React, { useState } from 'react';
import { Script, ScriptStatus, Platform } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { PlatformBadge } from '@/components/ui/Badge';
import { calculateTiming } from '@/lib/scriptTiming';
import {
  Flame,
  Edit3,
  PlayCircle,
  Clock,
  CheckCircle2,
  Plus,
  ArrowRight,
  ArrowLeft,
  FileText,
  FileEdit,
} from 'lucide-react';

interface KanbanColumn {
  id: ScriptStatus;
  title: string;
  icon: React.ReactNode;
  color: string;
  borderColor: string;
}

const COLUMNS: KanbanColumn[] = [
  {
    id: 'fikir',
    title: 'Fikir Havuzu',
    icon: <Flame className="w-4 h-4 text-amber-400" />,
    color: 'bg-amber-950/20 text-amber-300',
    borderColor: 'border-amber-900/40',
  },
  {
    id: 'senaryo_hazir',
    title: 'Senaryo Hazır',
    icon: <Edit3 className="w-4 h-4 text-blue-400" />,
    color: 'bg-blue-950/20 text-blue-300',
    borderColor: 'border-blue-900/40',
  },
  {
    id: 'cekimde',
    title: 'Çekimde',
    icon: <PlayCircle className="w-4 h-4 text-orange-400" />,
    color: 'bg-orange-950/20 text-orange-300',
    borderColor: 'border-orange-900/40',
  },
  {
    id: 'kurguda',
    title: 'Kurguda',
    icon: <Clock className="w-4 h-4 text-purple-400" />,
    color: 'bg-purple-950/20 text-purple-300',
    borderColor: 'border-purple-900/40',
  },
  {
    id: 'yayina_hazir',
    title: 'Yayına Hazır',
    icon: <CheckCircle2 className="w-4 h-4 text-emerald-400" />,
    color: 'bg-emerald-950/20 text-emerald-300',
    borderColor: 'border-emerald-900/40',
  },
];

interface ScriptKanbanProps {
  onSelectScript?: (scriptId: string) => void;
  onBackToEditor?: () => void;
}

export const ScriptKanban: React.FC<ScriptKanbanProps> = ({ onSelectScript, onBackToEditor }) => {
  const { scripts, updateScriptStatus, addScript, setActiveScriptId } = useAppStore();
  const [activeMobileColumn, setActiveMobileColumn] = useState<ScriptStatus>('fikir');

  const handleSelectScript = (id: string) => {
    setActiveScriptId(id);
    if (onSelectScript) onSelectScript(id);
    if (onBackToEditor) onBackToEditor();
  };

  const handleNextStatus = (script: Script, e: React.MouseEvent) => {
    e.stopPropagation();
    const statuses: ScriptStatus[] = ['fikir', 'senaryo_hazir', 'cekimde', 'kurguda', 'yayina_hazir'];
    const currentIndex = statuses.indexOf(script.status);
    if (currentIndex < statuses.length - 1) {
      updateScriptStatus(script.id, statuses[currentIndex + 1]);
    }
  };

  const handlePrevStatus = (script: Script, e: React.MouseEvent) => {
    e.stopPropagation();
    const statuses: ScriptStatus[] = ['fikir', 'senaryo_hazir', 'cekimde', 'kurguda', 'yayina_hazir'];
    const currentIndex = statuses.indexOf(script.status);
    if (currentIndex > 0) {
      updateScriptStatus(script.id, statuses[currentIndex - 1]);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121212] overflow-hidden">
      {/* Top action bar with back to editor button & mobile column tabs */}
      <div className="p-3 sm:p-4 border-b border-[#262626] bg-[#161616] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3">
          {onBackToEditor && (
            <button
              onClick={onBackToEditor}
              className="min-h-[38px] px-3.5 py-1.5 bg-[#222] hover:bg-[#2e2e2e] active:bg-[#333] border border-[#333] rounded-xl text-xs font-semibold text-white flex items-center gap-1.5 transition-colors"
            >
              <FileEdit className="w-4 h-4 text-emerald-400" />
              <span>Editöre Dön</span>
            </button>
          )}
          <span className="text-xs text-[#71717a] hidden sm:inline">Senaryo Aşamaları Kanban Panosu</span>
        </div>

        {/* Mobile column selector */}
        <div className="flex md:hidden gap-1 overflow-x-auto no-scrollbar w-full pt-1">
          {COLUMNS.map((col) => {
            const count = scripts.filter(s => s.status === col.id).length;
            const isActive = activeMobileColumn === col.id;

            return (
              <button
                key={col.id}
                onClick={() => setActiveMobileColumn(col.id)}
                className={`min-h-[34px] px-2.5 py-1 rounded-xl text-xs font-medium flex items-center gap-1.5 transition-all whitespace-nowrap ${
                  isActive
                    ? 'bg-[#2d5a27] text-white font-semibold shadow-sm'
                    : 'bg-[#202020] text-[#9ca3af]'
                }`}
              >
                <span>{col.title}</span>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-black/40 text-white font-mono">
                  {count}
                </span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Main Kanban Content Area */}
      <div className="flex-1 overflow-x-auto p-4 sm:p-6 bg-[#121212] snap-x snap-mandatory">
        <div className="flex gap-4 min-w-full md:min-w-[1200px] h-full items-start">
          {COLUMNS.map((col) => {
            const colScripts = scripts.filter(s => s.status === col.id);
            const isHiddenOnMobile = activeMobileColumn !== col.id;

            return (
              <div
                key={col.id}
                className={`${
                  isHiddenOnMobile ? 'hidden md:flex' : 'flex'
                } w-full md:w-80 bg-[#161616] border border-[#262626] rounded-2xl flex-col max-h-[calc(100vh-140px)] shrink-0 overflow-hidden shadow-lg snap-center`}
              >
                {/* Column Header */}
                <div className="p-3.5 border-b border-[#262626] bg-[#1a1a1a] flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <div className={`p-1.5 rounded-lg border ${col.color} ${col.borderColor}`}>
                      {col.icon}
                    </div>
                    <span className="text-xs font-bold text-white tracking-tight">{col.title}</span>
                  </div>
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-[#242424] text-[#a1a1aa]">
                    {colScripts.length}
                  </span>
                </div>

                {/* Cards list */}
                <div className="p-3 overflow-y-auto space-y-3 flex-1">
                  {colScripts.map((script) => {
                    const fullText = script.sections.map(s => s.content).join(' ');
                    const timing = calculateTiming(fullText, script.speakingRateWPM || 130);

                    return (
                      <div
                        key={script.id}
                        onClick={() => handleSelectScript(script.id)}
                        className="bg-[#1e1e1e] hover:bg-[#252525] active:bg-[#282828] border border-[#2e2e2e] hover:border-[#387030] rounded-xl p-3.5 cursor-pointer transition-all shadow-sm hover:shadow-md space-y-3 group"
                      >
                        <div className="flex items-start justify-between gap-2">
                          <PlatformBadge platform={script.targetPlatform} size="sm" />
                          <span className="text-[10px] font-mono text-emerald-400 bg-[#142214] px-2 py-0.5 rounded border border-[#2d5a27]/30">
                            ⏱ {timing.formattedDuration}
                          </span>
                        </div>

                        <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors leading-snug">
                          {script.title}
                        </h4>

                        <div className="flex items-center justify-between text-[11px] text-[#71717a] pt-2 border-t border-[#2a2a2a]">
                          <span>{script.sections.length} bölüm</span>
                          {script.linkedNoteId && (
                            <span className="flex items-center gap-1 text-emerald-400/80">
                              <FileText className="w-3 h-3" />
                              Not Bağlı
                            </span>
                          )}
                        </div>

                        {/* Move status buttons with touch targets */}
                        <div className="flex items-center justify-between pt-1 gap-1">
                          <button
                            onClick={(e) => handlePrevStatus(script, e)}
                            disabled={col.id === 'fikir'}
                            className="min-h-[34px] px-2.5 py-1 bg-[#181818] hover:bg-[#2a2a2a] active:bg-[#333] disabled:opacity-20 rounded-lg text-[11px] text-[#9ca3af] hover:text-white flex items-center gap-1 transition-colors"
                            title="Önceki Aşamaya Taşı"
                          >
                            <ArrowLeft className="w-3.5 h-3.5" />
                            <span>Geri</span>
                          </button>

                          <button
                            onClick={(e) => handleNextStatus(script, e)}
                            disabled={col.id === 'yayina_hazir'}
                            className="min-h-[34px] px-2.5 py-1 bg-[#2d5a27]/30 hover:bg-[#2d5a27] active:bg-[#244c1f] disabled:opacity-20 rounded-lg text-[11px] text-emerald-300 hover:text-white flex items-center gap-1 transition-colors font-semibold"
                            title="Sonraki Aşamaya İlerlet"
                          >
                            <span>İleri</span>
                            <ArrowRight className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    );
                  })}

                  {/* Add new in this column */}
                  <button
                    onClick={() => addScript({ status: col.id })}
                    className="min-h-[40px] w-full py-2 bg-[#1a1a1a] hover:bg-[#222] active:bg-[#262626] border border-dashed border-[#2e2e2e] hover:border-[#2d5a27] text-xs text-[#71717a] hover:text-emerald-300 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Bu Aşamaya Senaryo Ekle</span>
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
