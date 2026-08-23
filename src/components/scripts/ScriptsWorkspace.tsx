'use client';

import React, { useState } from 'react';
import { useAppStore } from '@/store/useAppStore';
import { ScriptEditor } from './ScriptEditor';
import { ScriptKanban } from './ScriptKanban';
import { PlatformBadge, ScriptStatusBadge } from '@/components/ui/Badge';
import {
  Video,
  Plus,
  Search,
  Kanban,
  FileEdit,
  Sparkles,
  Filter,
} from 'lucide-react';
import { Platform, ScriptStatus } from '@/types';
import { calculateTiming } from '@/lib/scriptTiming';

export const ScriptsWorkspace: React.FC = () => {
  const {
    scripts,
    activeScriptId,
    setActiveScriptId,
    addScript,
  } = useAppStore();

  const [viewMode, setViewMode] = useState<'editor' | 'kanban'>('editor');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');
  const [selectedStatus, setSelectedStatus] = useState<ScriptStatus | 'all'>('all');

  const filteredScripts = scripts.filter((s) => {
    if (selectedPlatform !== 'all' && s.targetPlatform !== selectedPlatform) return false;
    if (selectedStatus !== 'all' && s.status !== selectedStatus) return false;
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = s.title.toLowerCase().includes(q);
      const matchSection = s.sections.some(sec =>
        sec.title.toLowerCase().includes(q) || sec.content.toLowerCase().includes(q)
      );
      if (!matchTitle && !matchSection) return false;
    }
    return true;
  });

  const activeScript = scripts.find(s => s.id === activeScriptId) || filteredScripts[0];

  return (
    <div className="flex h-full w-full overflow-hidden bg-[#121212]">
      {/* Sidebar for Scripts (Visible in Editor mode) */}
      {viewMode === 'editor' && (
        <div className="w-80 border-r border-[#262626] bg-[#161616] flex flex-col h-full shrink-0">
          {/* Header & New Script */}
          <div className="p-4 border-b border-[#262626] space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-400" />
                Senaryo Stüdyosu
              </h2>
              <button
                onClick={() => addScript()}
                className="flex items-center gap-1.5 px-2.5 py-1.5 bg-[#2d5a27] hover:bg-[#387030] text-white text-xs font-semibold rounded-lg shadow-sm transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Yeni Senaryo</span>
              </button>
            </div>

            {/* View Switcher button in sidebar */}
            <div className="flex bg-[#222] p-1 rounded-lg border border-[#333]">
              <button
                onClick={() => setViewMode('editor')}
                className="flex-1 py-1 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors bg-[#2d5a27] text-white"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Editör</span>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className="flex-1 py-1 text-xs font-medium rounded-md flex items-center justify-center gap-1.5 transition-colors text-[#9ca3af] hover:text-white"
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Kanban Panosu</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Senaryolarda ara..."
                className="w-full bg-[#202020] border border-[#2e2e2e] focus:border-[#2d5a27] rounded-lg pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#71717a] focus:outline-none"
              />
            </div>
          </div>

          {/* Platform Filters */}
          <div className="px-3 py-2 border-b border-[#242424] flex gap-1 overflow-x-auto">
            {(['all', 'YouTube', 'TikTok', 'Instagram', 'Web'] as const).map((plat) => (
              <button
                key={plat}
                onClick={() => setSelectedPlatform(plat)}
                className={`text-[11px] px-2.5 py-1 rounded-full whitespace-nowrap transition-colors ${
                  selectedPlatform === plat
                    ? 'bg-[#2d5a27] text-white font-medium'
                    : 'bg-[#202020] text-[#9ca3af] hover:text-white'
                }`}
              >
                {plat === 'all' ? 'Tüm Platformlar' : plat}
              </button>
            ))}
          </div>

          {/* Scripts list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredScripts.length === 0 ? (
              <div className="p-6 text-center text-[#71717a] text-xs space-y-2">
                <Video className="w-8 h-8 text-[#333] mx-auto mb-1" />
                <p className="text-white font-medium">Henüz kayıtlı bir senaryo bulunmuyor.</p>
                <p className="text-[11px] text-[#888]">Yeni bir video senaryosu eklemek için yukarıdaki "+ Yeni Senaryo" butonunu kullanın.</p>
              </div>
            ) : (
              filteredScripts.map((s) => {
                const isSelected = activeScript?.id === s.id;
                const fullText = s.sections.map(sec => sec.content).join(' ');
                const timing = calculateTiming(fullText, s.speakingRateWPM || 130);

                return (
                  <div
                    key={s.id}
                    onClick={() => setActiveScriptId(s.id)}
                    className={`p-3.5 rounded-xl cursor-pointer border transition-all space-y-2 ${
                      isSelected
                        ? 'bg-[#202820] border-[#2d5a27] shadow-lg'
                        : 'bg-[#1a1a1a] hover:bg-[#222222] border-[#282828]'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <PlatformBadge platform={s.targetPlatform} size="sm" />
                      <span className="text-[10px] font-mono text-emerald-400 bg-[#142214] px-1.5 py-0.5 rounded border border-[#2d5a27]/30">
                        ⏱ {timing.formattedDuration}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-white leading-snug truncate">
                      {s.title}
                    </h3>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <ScriptStatusBadge status={s.status} />
                      <span className="text-[10px] text-[#71717a]">{s.sections.length} bölüm</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Main Area: Editor or Kanban */}
      <div className="flex-1 flex flex-col h-full overflow-hidden">
        {/* Kanban Top Navigation bar (when in kanban mode) */}
        {viewMode === 'kanban' && (
          <div className="px-6 py-3 bg-[#181818] border-b border-[#282828] flex items-center justify-between">
            <div className="flex items-center gap-3">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Kanban className="w-4 h-4 text-emerald-400" />
                Senaryo Üretim Hattı (Kanban)
              </h2>
              <span className="text-xs text-[#9ca3af]">Kartları aşamalar arasında ilerletin</span>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setViewMode('editor')}
                className="px-3 py-1.5 bg-[#222] hover:bg-[#2c2c2c] text-xs font-medium text-[#d1d5db] rounded-lg border border-[#333] flex items-center gap-1.5 transition-colors"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Editöre Dön</span>
              </button>
              <button
                onClick={() => addScript()}
                className="px-3 py-1.5 bg-[#2d5a27] hover:bg-[#387030] text-xs font-semibold text-white rounded-lg flex items-center gap-1.5 transition-colors"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Yeni Senaryo</span>
              </button>
            </div>
          </div>
        )}

        {viewMode === 'editor' ? (
          activeScript ? (
            <ScriptEditor key={activeScript.id} script={activeScript} />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 text-[#71717a] space-y-3">
              <div className="w-16 h-16 rounded-2xl bg-[#1a1a1a] border border-[#2e2e2e] flex items-center justify-center text-sky-400 shadow-inner">
                <Video className="w-8 h-8" />
              </div>
              <h3 className="text-lg font-bold text-white tracking-tight">Henüz Kayıtlı Bir Senaryo Bulunmuyor</h3>
              <p className="text-xs max-w-md text-[#9ca3af] leading-relaxed">
                YouTube, TikTok ve Instagram için bölüm bölüm kurgulanmış video metinleri hazırlayın ve konuşma süresini anlık olarak hesaplayın.
              </p>
              <button
                onClick={() => addScript()}
                className="mt-2 px-5 py-2.5 bg-[#2d5a27] hover:bg-[#387030] text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-950/50 flex items-center gap-2 transition-all"
              >
                <Plus className="w-4 h-4" />
                <span>Yeni Video Senaryosu Oluştur</span>
              </button>
            </div>
          )
        ) : (
          <ScriptKanban
            onSelectScript={(id) => {
              setActiveScriptId(id);
              setViewMode('editor');
            }}
          />
        )}
      </div>
    </div>
  );
};
