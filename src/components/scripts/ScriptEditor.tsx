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
  ChevronLeft,
} from 'lucide-react';
import { calculateTiming } from '@/lib/scriptTiming';

interface ScriptEditorProps {
  script: Script;
  onBack?: () => void;
}

export const ScriptEditor: React.FC<ScriptEditorProps> = ({ script, onBack }) => {
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
      <div className="px-4 sm:px-6 py-3.5 bg-[#181818] border-b border-[#282828] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-[200px]">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden min-h-[38px] min-w-[38px] p-2 bg-[#222] hover:bg-[#2a2a2a] active:bg-[#333] border border-[#333] rounded-xl text-[#d1d5db] flex items-center justify-center transition-colors shrink-0"
              title="Senaryo Listesine Dön"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}

          <input
            type="text"
            value={script.title}
            onChange={handleTitleChange}
            placeholder="Senaryo Başlığı..."
            className="text-base sm:text-lg font-bold text-white bg-transparent border-b border-transparent hover:border-[#383838] focus:border-[#2d5a27] focus:outline-none px-1.5 py-0.5 w-full transition-colors truncate"
          />
        </div>

        {/* Platform & Status Selectors */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Platform Selector */}
          <select
            value={script.targetPlatform}
            onChange={(e) => handlePlatformChange(e.target.value as Platform)}
            className="min-h-[38px] bg-[#222] text-[#e5e7eb] border border-[#333] rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-[#2d5a27]"
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
            className="min-h-[38px] bg-[#222] text-[#e5e7eb] border border-[#333] rounded-xl px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-[#2d5a27]"
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
            className="min-h-[38px] min-w-[38px] p-2 bg-[#222] hover:bg-[#2c2c2c] active:bg-[#333] border border-[#333] text-[#9ca3af] hover:text-white rounded-xl transition-colors flex items-center justify-center"
            title="Tüm Metni Kopyala"
          >
            <Copy className="w-4 h-4" />
          </button>

          <button
            onClick={handleCreateCalendarEvent}
            className="min-h-[38px] px-3 py-1.5 bg-[#202820] hover:bg-[#2d5a27] text-emerald-300 hover:text-white border border-[#2d5a27]/60 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors"
            title="Takvime Yayın Olarak Ekle"
          >
            <CalendarPlus className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Takvime Ekle</span>
          </button>

          <button
            onClick={() => {
              deleteScript(script.id);
              if (onBack) onBack();
            }}
            className="min-h-[38px] min-w-[38px] p-2 bg-[#222] hover:bg-rose-950/40 border border-[#333] text-[#9ca3af] hover:text-rose-400 rounded-xl transition-colors flex items-center justify-center"
            title="Senaryoyu Sil"
          >
            <Trash2 className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* Script Timing & Target Duration Bar */}
      <ScriptTimingBar
        fullText={fullScriptText}
        wpm={script.speakingRateWPM || 130}
        onWpmChange={handleWpmChange}
      />

      {/* Linked Note Info Banner (If linked) */}
      {linkedNote && (
        <div className="px-4 sm:px-6 py-2 bg-[#182318]/50 border-b border-[#2d5a27]/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-[#d1d5db] truncate">
            <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-[#888]">Bağlı Matematik Notu:</span>
            <span className="font-semibold text-emerald-300 truncate">{linkedNote.title}</span>
          </div>
          <button
            onClick={() => {
              setActiveNoteId(linkedNote.id);
              setActiveTab('notes');
            }}
            className="text-xs text-emerald-400 hover:underline shrink-0 ml-2"
          >
            Notu Aç →
          </button>
        </div>
      )}

      {/* Script Sections Editor List */}
      <div className="flex-1 overflow-y-auto p-3.5 sm:p-6 space-y-4">
        {script.sections.length === 0 ? (
          <div className="p-12 text-center text-[#71717a] text-xs space-y-3">
            <p>Bu senaryoda henüz bölüm bulunmuyor.</p>
            <button
              onClick={() => addScriptSection(script.id, { type: 'hook', title: 'Kanca / Giriş' })}
              className="px-4 py-2 bg-[#2d5a27] hover:bg-[#387030] text-white text-xs font-semibold rounded-xl"
            >
              İlk Bölümü Ekle
            </button>
          </div>
        ) : (
          script.sections.map((section, index) => {
            const timing = calculateTiming(section.content, script.speakingRateWPM || 130);

            return (
              <div
                key={section.id}
                className="bg-[#181818] border border-[#282828] rounded-2xl p-4 sm:p-5 space-y-3 shadow-sm hover:border-[#383838] transition-all"
              >
                {/* Section Header */}
                <div className="flex items-center justify-between gap-3 flex-wrap">
                  <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                    <span className="text-xs font-mono font-bold text-[#666] w-5">
                      #{index + 1}
                    </span>

                    {/* Section Type Selector */}
                    <select
                      value={section.type}
                      onChange={(e) => updateScriptSection(script.id, section.id, { type: e.target.value as ScriptSectionType })}
                      className={`text-xs font-semibold px-2.5 py-1 rounded-lg border focus:outline-none ${getSectionBadgeColor(section.type)}`}
                    >
                      <option value="hook" className="bg-[#202020] text-rose-300">Kanca (Hook)</option>
                      <option value="intro" className="bg-[#202020] text-blue-300">Giriş (Intro)</option>
                      <option value="proof" className="bg-[#202020] text-emerald-300">İspat / Çözüm (Proof)</option>
                      <option value="example" className="bg-[#202020] text-amber-300">Örnek (Example)</option>
                      <option value="cta" className="bg-[#202020] text-purple-300">Kapanış / CTA</option>
                    </select>

                    <input
                      type="text"
                      value={section.title}
                      onChange={(e) => updateScriptSection(script.id, section.id, { title: e.target.value })}
                      placeholder="Bölüm Başlığı..."
                      className="text-xs sm:text-sm font-bold text-white bg-transparent border-b border-transparent hover:border-[#383838] focus:border-[#2d5a27] focus:outline-none px-1.5 py-0.5 flex-1 min-w-[120px]"
                    />
                  </div>

                  {/* Section Timing & Order Actions */}
                  <div className="flex items-center gap-2 shrink-0">
                    <span className="text-[11px] font-mono text-emerald-400 bg-[#152215] border border-[#2d5a27]/30 px-2 py-0.5 rounded-lg">
                      ⏱ {timing.formattedDuration} ({timing.wordCount} kelime)
                    </span>

                    <button
                      onClick={() => handleMoveSection(index, 'up')}
                      disabled={index === 0}
                      className="min-h-[32px] min-w-[32px] p-1.5 hover:bg-[#282828] disabled:opacity-20 text-[#9ca3af] rounded-lg transition-colors flex items-center justify-center"
                      title="Yukarı Taşı"
                    >
                      <ChevronUp className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => handleMoveSection(index, 'down')}
                      disabled={index === script.sections.length - 1}
                      className="min-h-[32px] min-w-[32px] p-1.5 hover:bg-[#282828] disabled:opacity-20 text-[#9ca3af] rounded-lg transition-colors flex items-center justify-center"
                      title="Aşağı Taşı"
                    >
                      <ChevronDown className="w-3.5 h-3.5" />
                    </button>

                    <button
                      onClick={() => deleteScriptSection(script.id, section.id)}
                      className="min-h-[32px] min-w-[32px] p-1.5 hover:bg-rose-950/40 text-[#9ca3af] hover:text-rose-400 rounded-lg transition-colors flex items-center justify-center"
                      title="Bölümü Sil"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>

                {/* Spoken Text & Visual Notes (Side by Side on desktop, Stacked on Mobile) */}
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
                  {/* Spoken Script Text */}
                  <div className="lg:col-span-2 space-y-1">
                    <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider block">
                      Konuşma Metni (Spoken Script)
                    </label>
                    <textarea
                      value={section.content}
                      onChange={(e) => updateScriptSection(script.id, section.id, { content: e.target.value })}
                      placeholder="Bu bölümde kameraya söylenecek veya seslendirilecek metni yazın..."
                      className="w-full h-28 bg-[#121212] border border-[#2e2e2e] focus:border-[#2d5a27] rounded-xl p-3 text-xs text-[#f5f5f0] placeholder-[#666] resize-none focus:outline-none font-sans leading-relaxed"
                    />
                  </div>

                  {/* Visual Notes / B-Roll / Animations */}
                  <div className="space-y-1">
                    <label className="text-[10px] font-bold text-[#71717a] uppercase tracking-wider flex items-center gap-1">
                      <Camera className="w-3 h-3 text-sky-400" />
                      <span>Görsel Not & Manim Kurgusu</span>
                    </label>
                    <textarea
                      value={section.visualNotes || ''}
                      onChange={(e) => updateScriptSection(script.id, section.id, { visualNotes: e.target.value })}
                      placeholder="Ekranda görünecek grafik, Manim animasyonu, B-roll veya kamera açısı..."
                      className="w-full h-28 bg-[#141414] border border-[#282828] focus:border-sky-800 rounded-xl p-3 text-xs text-[#9ca3af] placeholder-[#555] resize-none focus:outline-none"
                    />
                  </div>
                </div>
              </div>
            );
          })
        )}

        {/* Quick Add Section Button */}
        <div className="pt-2 flex items-center justify-center gap-2 flex-wrap">
          <button
            onClick={() => addScriptSection(script.id, { type: 'proof', title: 'Yeni İspat / Konu Anlatımı' })}
            className="min-h-[40px] px-4 py-2 bg-[#202020] hover:bg-[#282828] active:bg-[#333] border border-[#333] hover:border-[#2d5a27] text-xs font-semibold text-white rounded-xl shadow-sm flex items-center gap-1.5 transition-colors"
          >
            <Plus className="w-3.5 h-3.5 text-emerald-400" />
            <span>Yeni Bölüm Ekle</span>
          </button>
        </div>
      </div>
    </div>
  );
};
