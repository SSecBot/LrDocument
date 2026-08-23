'use client';

import React from 'react';
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
  Video,
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
  onSelectScript: (scriptId: string) => void;
}

export const ScriptKanban: React.FC<ScriptKanbanProps> = ({ onSelectScript }) => {
  const { scripts, updateScriptStatus, addScript } = useAppStore();

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
    <div className="flex-1 overflow-x-auto p-6 bg-[#121212]">
      <div className="flex gap-4 min-w-[1200px] h-full items-start">
        {COLUMNS.map((col) => {
          const colScripts = scripts.filter(s => s.status === col.id);

          return (
            <div
              key={col.id}
              className="w-80 bg-[#161616] border border-[#262626] rounded-2xl flex flex-col max-h-[calc(100vh-140px)] shrink-0 overflow-hidden shadow-lg"
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
                      onClick={() => onSelectScript(script.id)}
                      className="bg-[#1e1e1e] hover:bg-[#252525] border border-[#2e2e2e] hover:border-[#387030] rounded-xl p-3.5 cursor-pointer transition-all shadow-sm hover:shadow-md space-y-3 group"
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

                      {/* Move status buttons */}
                      <div className="flex items-center justify-between pt-1 gap-1">
                        <button
                          onClick={(e) => handlePrevStatus(script, e)}
                          disabled={col.id === 'fikir'}
                          className="px-2 py-1 bg-[#181818] hover:bg-[#2a2a2a] disabled:opacity-20 rounded text-[10px] text-[#9ca3af] hover:text-white flex items-center gap-1 transition-colors"
                          title="Önceki Aşamaya Taşı"
                        >
                          <ArrowLeft className="w-3 h-3" />
                          <span>Geri</span>
                        </button>

                        <button
                          onClick={(e) => handleNextStatus(script, e)}
                          disabled={col.id === 'yayina_hazir'}
                          className="px-2 py-1 bg-[#2d5a27]/30 hover:bg-[#2d5a27] disabled:opacity-20 rounded text-[10px] text-emerald-300 hover:text-white flex items-center gap-1 transition-colors"
                          title="Sonraki Aşamaya İlerlet"
                        >
                          <span>İleri</span>
                          <ArrowRight className="w-3 h-3" />
                        </button>
                      </div>
                    </div>
                  );
                })}

                {/* Add new in this column */}
                <button
                  onClick={() => addScript({ status: col.id })}
                  className="w-full py-2.5 bg-[#1a1a1a] hover:bg-[#222] border border-dashed border-[#2e2e2e] hover:border-[#2d5a27] text-xs text-[#71717a] hover:text-emerald-300 rounded-xl flex items-center justify-center gap-1.5 transition-colors"
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
  );
};
