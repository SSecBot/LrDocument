'use client';

import React from 'react';
import { Script, ScriptSection, ScriptSectionType, Platform, ScriptStatus } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { ScriptTimingBar } from './ScriptTimingBar';
import { PlatformBadge, ScriptStatusBadge } from '@/components/ui/Badge';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Camera,
  Link2,
  Copy,
  CalendarPlus,
  FileText,
} from 'lucide-react';
import { calculateTiming } from '@/lib/scriptTiming';

interface ScriptEditorProps {
  script: Script;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ script }) => {
  const {
    updateScript,
    deleteScript,
    updateScriptStatus,
    addScriptSection,
    updateScriptSection,
    deleteScriptSection,
    notes,
    setActiveTab,
    setActiveNoteId,
    addEvent,
    addToast,
  } = useAppStore();

  const fullScriptText = script.sections.map(s => `${s.title}\n${s.content}`).join('\n\n');
  const linkedNote = script.linkedNoteId ? notes.find(n => n.id === script.linkedNoteId) : null;

  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    updateScript(script.id, { title: e.target.value });
  };

  const handlePlatformChange = (platform: Platform) => {
    updateScript(script.id, { targetPlatform: platform });
  };

  const handleStatusChange = (status: ScriptStatus) => {
    updateScriptStatus(script.id, status);
  };

  const handleWpmChange = (wpm: number) => {
    updateScript(script.id, { speakingRateWPM: wpm });
  };

  const handleMoveSection = (index: number, direction: 'up' | 'down') => {
    const newSections = [...script.sections];
    const targetIndex = direction === 'up' ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= newSections.length) return;

    const temp = newSections[index];
    newSections[index] = newSections[targetIndex];
    newSections[targetIndex] = temp;

    updateScript(script.id, { sections: newSections });
  };

  const handleCopyFullScript = () => {
    navigator.clipboard.writeText(fullScriptText);
    addToast({ type: 'success', title: 'Senaryo Kopyalandı', message: 'Tüm senaryo metni panoya alındı.' });
  };

  const handleCreateCalendarEvent = () => {
    addEvent({
      title: `${script.title} Yayını`,
      description: `Hedef Platform: ${script.targetPlatform}\nSenaryo Hazır.`,
      date: new Date(Date.now() + 86400000 * 3).toISOString().split('T')[0],
      time: '18:00',
      durationMinutes: 60,
      eventType: 'yayin',
      platform: script.targetPlatform,
      linkedScriptId: script.id,
      status: 'hazirlaniyor',
      checklist: [
        { id: '1', text: 'Seslendirme ve çekim tamamlandı', done: false },
        { id: '2', text: 'Kurgu ve efektler eklendi', done: false },
        { id: '3', text: 'Küçük resim (Thumbnail) hazırlandı', done: false },
      ]
    });
    setActiveTab('calendar');
  };

  const getSectionBadgeColor = (type: ScriptSectionType) => {
    switch (type) {
      case 'hook': return 'bg-rose-950/40 text-rose-300 border-rose-800/40';
      case 'intro': return 'bg-blue-950/40 text-blue-300 border-blue-800/40';
      case 'proof': return 'bg-emerald-950/40 text-emerald-300 border-emerald-800/40';
      case 'example': return 'bg-amber-950/40 text-amber-300 border-amber-800/40';
      case 'cta': return 'bg-purple-950/40 text-purple-300 border-purple-800/40';
      default: return 'bg-zinc-800 text-zinc-300 border-zinc-700';
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121212] overflow-hidden">
      {/* Top Header */}
      <div className="px-6 py-4 bg-[#181818] border-b border-[#282828] flex items-center justify-between gap-4 flex-wrap">
        <div className="flex items-center gap-3 flex-1 min-w-[300px]">
          <input
            type="text"
            value={script.title}
            onChange={handleTitleChange}
            placeholder="Senaryo Başlığı..."
            className="text-lg font-bold text-white bg-transparent border-b border-transparent hover:border-[#383838] focus:border-[#2d5a27] focus:outline-none px-1.5 py-0.5 w-full transition-colors"
          />
        </div>

        {/* Platform & Status Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Platform Selector */}
          <select
            value={script.targetPlatform}
            onChange={(e) => handlePlatformChange(e.target.value as Platform)}
            className="bg-[#222] text-[#e5e7eb] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-[#2d5a27]"
          >
            <option value="YouTube">YouTube</option>
            <option value="TikTok">TikTok</option>
            <option value="Instagram">Instagram</option>
            <option value="Web">Web Video</option>
            <option value="Podcast">Podcast</option>
          </select>

          {/* Status Selector */}
          <select
            value={script.status}
            onChange={(e) => handleStatusChange(e.target.value as ScriptStatus)}
            className="bg-[#222] text-[#e5e7eb] border border-[#333] rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-[#2d5a27]"
          >
            <option value="fikir">Fikir Aşamasında</option>
            <option value="senaryo_hazir">Senaryo Hazır</option>
            <option value="cekimde">Çekimde</option>
            <option value="kurguda">Kurguda</option>
            <option value="yayina_hazir">Yayına Hazır</option>
          </select>

          {/* Actions */}
          <button
            onClick={handleCopyFullScript}
            className="p-2 bg-[#222] hover:bg-[#2c2c2c] border border-[#333] text-[#9ca3af] hover:text-white rounded-lg transition-colors"
            title="Tüm Metni Kopyala"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            onClick={handleCreateCalendarEvent}
            className="flex items-center gap-1.5 px-3 py-1.5 bg-[#2d5a27]/25 hover:bg-[#2d5a27]/40 border border-[#2d5a27]/50 text-emerald-300 rounded-lg text-xs font-medium transition-colors"
            title="Yayın takvimine ekle"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Takvime Ekle</span>
          </button>

          <button
            onClick={() => deleteScript(script.id)}
            className="p-2 bg-[#222] hover:bg-rose-950/40 border border-[#333] hover:border-rose-800 text-[#9ca3af] hover:text-rose-300 rounded-lg transition-colors"
            title="Senaryoyu Sil"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Linked Note Info Banner (if any) */}
      {linkedNote && (
        <div className="px-6 py-2 bg-[#162316] border-b border-emerald-900/40 flex items-center justify-between text-xs text-emerald-300">
          <div className="flex items-center gap-2">
            <Link2 className="w-3.5 h-3.5" />
            <span>Bağlı Matematik Notu: <strong>{linkedNote.title}</strong></span>
          </div>
          <button
            onClick={() => {
              setActiveNoteId(linkedNote.id);
              setActiveTab('notes');
            }}
            className="underline hover:text-white flex items-center gap-1 font-medium"
          >
            <FileText className="w-3 h-3" />
            Notu Görüntüle
          </button>
        </div>
      )}

      {/* Timing and speech rate bar */}
      <ScriptTimingBar
        fullText={fullScriptText}
        wpm={script.speakingRateWPM || 130}
        onWpmChange={handleWpmChange}
      />

      {/* Script Sections Builder */}
      <div className="flex-1 overflow-y-auto p-6 space-y-6">
        <div className="max-w-4xl mx-auto space-y-5">
          {script.sections.map((section, index) => {
            const sectionTiming = calculateTiming(section.content, script.speakingRateWPM || 130);

            return (
              <div
                key={section.id}
                className="bg-[#181818] border border-[#282828] rounded-2xl p-5 shadow-sm space-y-4 hover:border-[#383838] transition-colors"
              >
                {/* Section Header */}
                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 flex-1">
                    <span
                      className={`text-[11px] font-bold uppercase tracking-wider px-2.5 py-0.5 rounded border ${getSectionBadgeColor(
                        section.type
                      )}`}
                    >
                      Bölüm {index + 1}
                    </span>

                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) =>
                        updateScriptSection(script.id, section.id, { title: e.target.value })
                      }
                      placeholder="Bölüm Başlığı (örn: Kanca, İspat, Giriş)..."
                      className="bg-transparent text-sm font-bold text-white border-b border-transparent focus:border-[#2d5a27] focus:outline-none px-1 py-0.5 flex-1"
                    />
                  </div>

                  {/* Section Stats & Ordering buttons */}
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-mono font-medium text-emerald-400 bg-[#142214] px-2 py-0.5 rounded border border-[#2d5a27]/30">
                      ⏱ {sectionTiming.formattedDuration} ({sectionTiming.wordCount} kelime)
                    </span>

                    <button
                      onClick={() => handleMoveSection(index, 'up')}
                      disabled={index === 0}
                      className="p-1 bg-[#222] hover:bg-[#2e2e2e] disabled:opacity-30 rounded text-[#9ca3af] hover:text-white"
                      title="Yukarı Taşı"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>
                    <button
                      onClick={() => handleMoveSection(index, 'down')}
                      disabled={index === script.sections.length - 1}
                      className="p-1 bg-[#222] hover:bg-[#2e2e2e] disabled:opacity-30 rounded text-[#9ca3af] hover:text-white"
                      title="Aşağı Taşı"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => deleteScriptSection(script.id, section.id)}
                      className="p-1 bg-[#222] hover:bg-rose-950/40 rounded text-[#9ca3af] hover:text-rose-300"
                      title="Bölümü Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Section Content Area */}
                <div>
                  <textarea
                    value={section.content}
                    onChange={(e) =>
                      updateScriptSection(script.id, section.id, { content: e.target.value })
                    }
                    placeholder="Konuşmacı metnini buraya yazın..."
                    rows={4}
                    className="w-full bg-[#121212] border border-[#262626] focus:border-[#2d5a27] rounded-xl p-3.5 text-sm text-[#f5f5f0] leading-relaxed resize-y focus:outline-none"
                  />
                </div>

                {/* B-Roll & Visual Notes input */}
                <div className="flex items-center gap-2 bg-[#141414] border border-[#262626] rounded-xl px-3 py-2">
                  <Camera className="w-4 h-4 text-amber-400 shrink-0" />
                  <input
                    type="text"
                    value={section.visualNotes || ''}
                    onChange={(e) =>
                      updateScriptSection(script.id, section.id, { visualNotes: e.target.value })
                    }
                    placeholder="Görsel / B-Roll / Kamera notları (örn: Manim animasyonu, yakın çekim)..."
                    className="bg-transparent text-xs text-[#fef08a] placeholder-[#71717a] focus:outline-none w-full"
                  />
                </div>
              </div>
            );
          })}

          {/* Add Section Quick Bar */}
          <div className="flex items-center justify-center gap-2 pt-2 flex-wrap">
            <button
              onClick={() => addScriptSection(script.id, { type: 'hook', title: 'Yeni Kanca (Hook)' })}
              className="px-3 py-2 bg-[#181818] hover:bg-[#242424] border border-[#2e2e2e] text-xs font-medium text-rose-300 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Kanca</span>
            </button>
            <button
              onClick={() => addScriptSection(script.id, { type: 'body', title: 'Yeni Gelişme / Açıklama' })}
              className="px-3 py-2 bg-[#181818] hover:bg-[#242424] border border-[#2e2e2e] text-xs font-medium text-emerald-300 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Gelişme</span>
            </button>
            <button
              onClick={() => addScriptSection(script.id, { type: 'proof', title: 'Matematiksel İspat / Çözüm' })}
              className="px-3 py-2 bg-[#181818] hover:bg-[#242424] border border-[#2e2e2e] text-xs font-medium text-sky-300 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ İspat / Çözüm</span>
            </button>
            <button
              onClick={() => addScriptSection(script.id, { type: 'cta', title: 'Kapanış & Çağrı (CTA)' })}
              className="px-3 py-2 bg-[#181818] hover:bg-[#242424] border border-[#2e2e2e] text-xs font-medium text-purple-300 rounded-xl flex items-center gap-1.5 transition-colors"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>+ Kapanış / CTA</span>
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
