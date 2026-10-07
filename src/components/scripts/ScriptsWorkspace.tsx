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
  const [mobileView, setMobileView] = useState<'list' | 'editor'>('list');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');
  const selectedStatus = 'all' as ScriptStatus | 'all';

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

  const handleSelectScriptMobile = (id: string) => {
    setActiveScriptId(id);
    setMobileView('editor');
  };

  const handleNewScriptMobile = () => {
    const newId = addScript();
    setActiveScriptId(newId);
    setMobileView('editor');
  };

  return (
    <div className="flex h-full w-full overflow-hidden bg-app">
      {/* Sidebar for Scripts (Visible in Editor mode) */}
      {viewMode === 'editor' && (
        <div
          className={`${
            mobileView === 'list' ? 'flex w-full' : 'hidden'
          } md:flex md:w-80 border-r border-line bg-surface flex-col h-full shrink-0`}
        >
          {/* Header & New Script */}
          <div className="p-3.5 sm:p-4 border-b border-line space-y-3">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold text-white tracking-tight flex items-center gap-2">
                <Video className="w-4 h-4 text-emerald-400" />
                Senaryo Stüdyosu
              </h2>
              <button
                onClick={handleNewScriptMobile}
                className="min-h-[38px] flex items-center gap-1.5 px-3 py-1.5 bg-brand hover:bg-brand-hover active:bg-brand-active text-white text-xs font-semibold rounded-lg transition-all"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Yeni Senaryo</span>
              </button>
            </div>

            {/* View Switcher button in sidebar */}
            <div className="flex bg-surface-2 p-1 rounded-lg border border-line-strong">
              <button
                onClick={() => setViewMode('editor')}
                className="min-h-[34px] flex-1 py-1 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors bg-brand text-white"
              >
                <FileEdit className="w-3.5 h-3.5" />
                <span>Editör</span>
              </button>
              <button
                onClick={() => setViewMode('kanban')}
                className="min-h-[34px] flex-1 py-1 text-xs font-medium rounded-lg flex items-center justify-center gap-1.5 transition-colors text-subtle hover:text-white"
              >
                <Kanban className="w-3.5 h-3.5" />
                <span>Kanban Panosu</span>
              </button>
            </div>

            {/* Search Input */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Senaryolarda ara..."
                className="w-full bg-surface-2 border border-line focus:border-brand rounded-lg pl-8 pr-3 py-2 text-xs text-white placeholder-muted focus:outline-none min-h-[40px]"
              />
            </div>
          </div>

          {/* Platform Filters */}
          <div className="px-3 py-2 border-b border-line flex gap-1.5 overflow-x-auto no-scrollbar">
            {(['all', 'YouTube', 'TikTok', 'Instagram', 'Web'] as const).map((plat) => (
              <button
                key={plat}
                onClick={() => setSelectedPlatform(plat)}
                className={`min-h-[28px] text-[11px] px-2.5 py-0.5 rounded-full whitespace-nowrap transition-colors ${
                  selectedPlatform === plat
                    ? 'bg-surface-4 text-fg font-medium'
                    : 'bg-surface-2 text-subtle hover:text-white'
                }`}
              >
                {plat === 'all' ? 'Tümü' : plat}
              </button>
            ))}
          </div>

          {/* Scripts list */}
          <div className="flex-1 overflow-y-auto p-2 space-y-2">
            {filteredScripts.length === 0 ? (
              <div className="p-5 text-center text-muted text-xs space-y-2">
                <Video className="w-8 h-8 text-[#333] mx-auto mb-1" />
                <p className="text-white font-medium">Henüz kayıtlı bir senaryo bulunmuyor.</p>
                <p className="text-[11px] text-subtle">Yeni bir video senaryosu eklemek için yukarıdaki butonu kullanın.</p>
              </div>
            ) : (
              filteredScripts.map((s) => {
                const isSelected = activeScript?.id === s.id;
                const fullText = s.sections.map(sec => sec.content).join(' ');
                const timing = calculateTiming(fullText, s.speakingRateWPM || 130);

                return (
                  <div
                    key={s.id}
                    onClick={() => handleSelectScriptMobile(s.id)}
                    className={`p-3.5 rounded-lg cursor-pointer border transition-all space-y-2 ${
                      isSelected
                        ? 'bg-surface-2 border-brand'
                        : 'bg-surface hover:bg-surface-2 active:bg-surface-2 border-line'
                    }`}
                  >
                    <div className="flex items-start justify-between gap-2">
                      <PlatformBadge platform={s.targetPlatform} size="sm" />
                      <span className="text-[10px] font-mono text-emerald-400 bg-surface px-1.5 py-0.5 rounded border border-brand/30">
                        ⏱ {timing.formattedDuration}
                      </span>
                    </div>

                    <h3 className="text-xs font-bold text-white leading-snug truncate">
                      {s.title}
                    </h3>

                    <div className="flex items-center justify-between text-[11px] pt-1">
                      <ScriptStatusBadge status={s.status} />
                      <span className="text-[10px] text-muted">{s.sections.length} bölüm</span>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* Main Workspace Area (Editor or Kanban) */}
      <div
        className={`${
          viewMode === 'editor' && mobileView === 'list' ? 'hidden' : 'flex'
        } md:flex flex-1 flex-col h-full overflow-hidden`}
      >
        {viewMode === 'editor' ? (
          activeScript ? (
            <ScriptEditor
              key={activeScript.id}
              script={activeScript}
              onBack={() => setMobileView('list')}
            />
          ) : (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-6 text-muted space-y-3">
              <Video className="w-12 h-12 text-emerald-400" />
              <h3 className="text-lg font-bold text-white">Senaryo Seçilmedi</h3>
              <button
                onClick={handleNewScriptMobile}
                className="px-4 py-2 bg-brand text-white text-xs font-semibold rounded-lg"
              >
                Yeni Senaryo Başlat
              </button>
            </div>
          )
        ) : (
          <ScriptKanban onBackToEditor={() => setViewMode('editor')} />
        )}
      </div>
    </div>
  );
};
