'use client';

import React, { useState } from 'react';
import { Script, ScriptSectionType, Platform, ScriptStatus } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { ScriptTimingBar } from './ScriptTimingBar';
import { PlatformBadge, ScriptStatusBadge } from '@/components/ui/Badge';
import {
  Plus,
  Trash2,
  ChevronUp,
  ChevronDown,
  Camera,
  Copy,
  CalendarPlus,
  FileText,
  ChevronLeft,
  Layers,
  ScrollText,
} from 'lucide-react';
import { calculateTiming } from '@/lib/scriptTiming';
import { toLocalDateString } from '@/lib/utils';

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
    addNote,
    setActiveTab,
    setActiveNoteId,
    addEvent,
    addToast,
  } = useAppStore();

  const [editorMode, setEditorMode] = useState<'cards' | 'unified'>('cards');

  const fullScriptText = script.sections.map(s => `${s.title}\n${s.content}`).join('\n\n');
  const linkedNote = script.linkedNoteId ? notes.find(n => n.id === script.linkedNoteId) : null;
  const overallTiming = calculateTiming(
    script.sections.map(s => s.content).join(' '),
    script.speakingRateWPM || 130
  );

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

  // Export to Notes Module Action
  const handleExportToNotes = () => {
    let noteMarkdown = `# Video Senaryosu: ${script.title}\n\n`;
    noteMarkdown += `> **Platform:** ${script.targetPlatform}  \n`;
    noteMarkdown += `> **Durum:** ${script.status}  \n`;
    noteMarkdown += `> **Tahmini Süre:** ${overallTiming.formattedDuration} (${overallTiming.wordCount} kelime, ${script.speakingRateWPM || 130} kelime/dk)\n\n`;
    noteMarkdown += `---\n\n`;

    script.sections.forEach((sec, idx) => {
      noteMarkdown += `### ${idx + 1}. [${sec.type.toUpperCase()}] ${sec.title}\n`;
      if (sec.visualNotes) {
        noteMarkdown += `> 🎬 **Görsel / Çekim Notu:** ${sec.visualNotes}\n\n`;
      }
      noteMarkdown += `${sec.content || '*(Metin girilmedi)*'}\n\n`;
    });

    const newNoteId = addNote({
      title: `Senaryo: ${script.title}`,
      content: noteMarkdown,
      folder: 'taslaklar',
      tags: ['Senaryo', script.targetPlatform, 'Video'],
    });

    updateScript(script.id, { linkedNoteId: newNoteId });

    addToast({
      type: 'success',
      title: 'Notlara Aktarıldı (✓)',
      message: `"${script.title}" senaryosu yeni bir not olarak Notlar modülüne kaydedildi.`,
    });
  };

  const handleCreateCalendarEvent = () => {
    addEvent({
      title: `${script.title} Yayını`,
      description: `Hedef Platform: ${script.targetPlatform}\nSenaryo Hazır.`,
      date: toLocalDateString(new Date(Date.now() + 86400000 * 3)),
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
    <div className="flex-1 flex flex-col h-full bg-app overflow-hidden select-none">
      {/* Top Header */}
      <div className="px-4 sm:px-6 py-3.5 bg-surface border-b border-line flex items-center justify-between gap-3 flex-wrap shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 flex-1 min-w-[200px]">
          {onBack && (
            <button
              onClick={onBack}
              className="md:hidden min-h-[44px] min-w-[44px] p-2.5 bg-surface-2 hover:bg-surface-3 active:bg-surface-4 border border-line-strong rounded-lg text-body flex items-center justify-center transition-colors shrink-0 cursor-pointer"
              title="Senaryo Listesine Dön"
            >
              <ChevronLeft className="w-5 h-5" />
            </button>
          )}

          <input
            type="text"
            value={script.title}
            onChange={handleTitleChange}
            placeholder="Senaryo Başlığı..."
            className="text-base sm:text-lg font-bold text-white bg-transparent border-b border-transparent hover:border-line-strong focus:border-brand focus:outline-none px-1.5 py-0.5 w-full transition-colors truncate"
          />
        </div>

        {/* View Mode Switcher + Controls */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Cards vs Unified Text View Switcher */}
          <div className="flex bg-surface-2 p-1 rounded-lg border border-line-strong">
            <button
              onClick={() => setEditorMode('cards')}
              className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                editorMode === 'cards' ? 'bg-surface-4 text-fg font-medium' : 'text-subtle hover:text-white'
              }`}
            >
              <Layers className="w-3.5 h-3.5" />
              <span>Bölüm Kartları</span>
            </button>

            <button
              onClick={() => setEditorMode('unified')}
              className={`min-h-[36px] px-3 py-1 text-xs font-semibold rounded-lg flex items-center gap-1.5 transition-colors cursor-pointer ${
                editorMode === 'unified' ? 'bg-surface-4 text-fg font-medium' : 'text-subtle hover:text-white'
              }`}
            >
              <ScrollText className="w-3.5 h-3.5 text-emerald-300" />
              <span>Birleşik Metin</span>
            </button>
          </div>

          {/* Platform Selector */}
          <select
            value={script.targetPlatform}
            onChange={(e) => handlePlatformChange(e.target.value as Platform)}
            className="min-h-[44px] bg-surface-2 text-body border border-line-strong rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-brand cursor-pointer"
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
            className="min-h-[44px] bg-surface-2 text-body border border-line-strong rounded-lg px-2.5 py-1.5 text-xs font-medium focus:outline-none focus:border-brand cursor-pointer"
          >
            <option value="fikir">Fikir Aşamasında</option>
            <option value="senaryo_hazir">Senaryo Hazır</option>
            <option value="cekimde">Çekimde</option>
            <option value="kurguda">Kurguda</option>
            <option value="yayina_hazir">Yayına Hazır</option>
          </select>

          {/* Export to Notes Button */}
          <button
            onClick={handleExportToNotes}
            className="min-h-[44px] px-3.5 py-2 bg-brand-soft hover:bg-brand-soft border border-brand text-emerald-300 hover:text-white rounded-lg text-xs font-bold flex items-center gap-1.5 transition-all cursor-pointer"
            title="Senaryoyu Notlar modülüne yeni bir belge olarak aktar"
          >
            <FileText className="w-4 h-4 text-emerald-400" />
            <span className="hidden sm:inline">Notlara Ekle</span>
          </button>

          {/* Copy Script */}
          <button
            onClick={handleCopyFullScript}
            className="min-h-[44px] min-w-[44px] p-2.5 bg-surface-2 hover:bg-surface-3 active:bg-surface-4 border border-line-strong text-subtle hover:text-white rounded-lg transition-colors flex items-center justify-center cursor-pointer"
            title="Tüm Metni Kopyala"
          >
            <Copy className="w-4 h-4" />
          </button>

          {/* Add to Calendar */}
          <button
            onClick={handleCreateCalendarEvent}
            className="min-h-[44px] px-3 py-2 bg-surface-2 hover:bg-brand text-emerald-300 hover:text-white border border-brand/60 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            title="Takvime Yayın Olarak Ekle"
          >
            <CalendarPlus className="w-4 h-4" />
            <span className="hidden lg:inline">Takvime Ekle</span>
          </button>

          {/* Delete Script */}
          <button
            onClick={() => {
              deleteScript(script.id);
              if (onBack) onBack();
            }}
            className="min-h-[44px] min-w-[44px] p-2.5 bg-surface-2 hover:bg-rose-950/40 border border-line-strong text-subtle hover:text-rose-400 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
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
        <div className="px-4 sm:px-6 py-2 bg-surface/50 border-b border-brand/40 flex items-center justify-between text-xs">
          <div className="flex items-center gap-2 text-body truncate">
            <FileText className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
            <span className="text-subtle">Bağlı Not:</span>
            <span className="font-semibold text-emerald-300 truncate">{linkedNote.title}</span>
          </div>
          <button
            onClick={() => {
              setActiveNoteId(linkedNote.id);
              setActiveTab('notes');
            }}
            className="text-xs text-emerald-400 hover:underline shrink-0 ml-2 cursor-pointer font-medium"
          >
            Notu Aç →
          </button>
        </div>
      )}

      {/* Main Content Area: Cards Mode OR Unified Text Mode */}
      {editorMode === 'cards' ? (
        /* Section Cards List */
        <div className="flex-1 overflow-y-auto p-3.5 sm:p-5 space-y-4">
          {script.sections.length === 0 ? (
            <div className="p-12 text-center text-muted text-xs space-y-3">
              <p>Bu senaryoda henüz bölüm bulunmuyor.</p>
              <button
                onClick={() => addScriptSection(script.id, { type: 'hook', title: 'Kanca / Giriş' })}
                className="min-h-[44px] px-4 py-2 bg-brand hover:bg-brand-hover text-white text-xs font-semibold rounded-lg cursor-pointer"
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
                  className="bg-surface border border-line rounded-lg p-4 sm:p-5 space-y-3 hover:border-line-strong transition-all"
                >
                  {/* Section Header */}
                  <div className="flex items-center justify-between gap-3 flex-wrap">
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <span className="text-xs font-mono font-bold text-muted w-5">
                        #{index + 1}
                      </span>

                      {/* Section Type Selector */}
                      <select
                        value={section.type}
                        onChange={(e) =>
                          updateScriptSection(script.id, section.id, {
                            type: e.target.value as ScriptSectionType,
                          })
                        }
                        className={`min-h-[36px] text-xs font-semibold rounded-xl px-2.5 py-1 border focus:outline-none cursor-pointer ${getSectionBadgeColor(
                          section.type
                        )}`}
                      >
                        <option value="hook">🎯 Kanca (Hook)</option>
                        <option value="intro">👋 Giriş & Problem</option>
                        <option value="body">💡 Gövde / Ana Fikir</option>
                        <option value="proof">📐 İspat & Detay</option>
                        <option value="example">🌟 Örnek & Hikaye</option>
                        <option value="cta">🚀 Harekete Geçirici (CTA)</option>
                      </select>

                      {/* Section Title Input */}
                      <input
                        type="text"
                        value={section.title}
                        onChange={(e) =>
                          updateScriptSection(script.id, section.id, { title: e.target.value })
                        }
                        placeholder="Bölüm Başlığı..."
                        className="flex-1 bg-transparent text-xs sm:text-sm font-bold text-white border-b border-transparent focus:border-brand focus:outline-none px-2 py-1"
                      />
                    </div>

                    {/* Section Stats & Reorder Actions */}
                    <div className="flex items-center gap-1.5">
                      <span className="text-[11px] font-mono text-emerald-400 bg-surface px-2 py-1 rounded-lg border border-brand/40">
                        ⏱ {timing.formattedDuration} ({timing.wordCount} kelime)
                      </span>

                      <button
                        onClick={() => handleMoveSection(index, 'up')}
                        disabled={index === 0}
                        className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 disabled:opacity-30 text-subtle hover:text-white transition-colors cursor-pointer"
                        title="Yukarı Taşı"
                      >
                        <ChevronUp className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => handleMoveSection(index, 'down')}
                        disabled={index === script.sections.length - 1}
                        className="p-1.5 rounded-lg bg-surface-2 hover:bg-surface-3 disabled:opacity-30 text-subtle hover:text-white transition-colors cursor-pointer"
                        title="Aşağı Taşı"
                      >
                        <ChevronDown className="w-3.5 h-3.5" />
                      </button>

                      <button
                        onClick={() => deleteScriptSection(script.id, section.id)}
                        className="p-1.5 rounded-lg bg-surface-2 hover:bg-rose-950/40 text-subtle hover:text-rose-400 transition-colors cursor-pointer"
                        title="Bölümü Sil"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>

                  {/* Visual Notes / Camera Cue */}
                  <div className="bg-app border border-line rounded-lg p-2.5 flex items-start gap-2">
                    <Camera className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                    <input
                      type="text"
                      value={section.visualNotes || ''}
                      onChange={(e) =>
                        updateScriptSection(script.id, section.id, { visualNotes: e.target.value })
                      }
                      placeholder="Görsel / Çekim Notu (Örn: Ekranda formül animasyonu belirecek, kamera yakın plana geçecek...)"
                      className="w-full bg-transparent text-xs text-subtle placeholder-muted focus:outline-none"
                    />
                  </div>

                  {/* Speech Content Editor */}
                  <div>
                    <textarea
                      value={section.content}
                      onChange={(e) =>
                        updateScriptSection(script.id, section.id, { content: e.target.value })
                      }
                      rows={4}
                      placeholder="Konuşma metnini buraya yazın..."
                      className="w-full bg-surface border border-line focus:border-brand rounded-lg p-3 text-xs sm:text-sm text-white placeholder-muted focus:outline-none resize-y leading-relaxed font-sans"
                    />
                  </div>
                </div>
              );
            })
          )}

          {/* Add Section Button */}
          <div className="pt-2">
            <button
              onClick={() => addScriptSection(script.id, { type: 'body', title: 'Yeni Bölüm' })}
              className="min-h-[44px] w-full py-3 bg-surface hover:bg-surface-2 border-2 border-dashed border-brand/60 hover:border-emerald-500 rounded-lg text-xs font-bold text-emerald-400 flex items-center justify-center gap-2 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>+ Yeni Senaryo Bölümü Ekle</span>
            </button>
          </div>
        </div>
      ) : (
        /* Unified Concatenated Text View Mode */
        <div className="flex-1 overflow-y-auto p-4 sm:p-5 space-y-5 max-w-4xl mx-auto w-full">
          {/* Summary Banner in Unified View */}
          <div className="p-4 sm:p-5 rounded-lg bg-surface border border-brand/70 flex items-center justify-between gap-4 flex-wrap">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <ScrollText className="w-5 h-5 text-emerald-400" />
                <h3 className="text-sm sm:text-base font-bold text-white">
                  Birleşik Senaryo Metni
                </h3>
              </div>
              <p className="text-xs text-subtle">
                Tüm sahnelerin tek parça akıcı metin görünümü. Tek tıkla Notlar modülüne aktarabilir veya kopyalayabilirsiniz.
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={handleExportToNotes}
                className="min-h-[44px] px-4 py-2 bg-brand hover:bg-brand-hover text-white text-xs font-bold rounded-lg flex items-center gap-2 transition-all cursor-pointer"
              >
                <FileText className="w-4 h-4" />
                <span>Notlara Ekle (Not Yap)</span>
              </button>

              <button
                onClick={handleCopyFullScript}
                className="min-h-[44px] px-3.5 py-2 bg-surface-2 hover:bg-surface-3 text-body hover:text-white border border-line-strong text-xs font-semibold rounded-lg flex items-center gap-2 transition-colors cursor-pointer"
              >
                <Copy className="w-4 h-4 text-emerald-400" />
                <span>Kopyala</span>
              </button>
            </div>
          </div>

          {/* Unified Document Reader & Editor Body */}
          <div className="bg-surface border border-line rounded-lg p-5 sm:p-5 space-y-6">
            {/* Script Meta Information Header */}
            <div className="border-b border-line pb-4 space-y-2">
              <div className="flex items-center gap-2">
                <PlatformBadge platform={script.targetPlatform} />
                <ScriptStatusBadge status={script.status} />
              </div>
              <h1 className="text-xl sm:text-2xl font-black text-white tracking-tight">
                {script.title}
              </h1>
              <div className="flex items-center gap-4 text-xs text-muted font-mono">
                <span>Toplam Kelime: {overallTiming.wordCount}</span>
                <span>•</span>
                <span className="text-emerald-400 font-bold">⏱ {overallTiming.formattedDuration}</span>
                <span>•</span>
                <span>{script.sections.length} Sahne / Bölüm</span>
              </div>
            </div>

            {/* Concatenated Sections */}
            <div className="space-y-6 divide-y divide-line">
              {script.sections.map((sec, idx) => (
                <div key={sec.id} className="pt-6 first:pt-0 space-y-3">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-mono font-bold text-emerald-400 bg-surface px-2 py-0.5 rounded border border-brand/40">
                        Sahne #{idx + 1}
                      </span>
                      <h3 className="text-sm font-bold text-white">{sec.title}</h3>
                    </div>
                    <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getSectionBadgeColor(sec.type)}`}>
                      {sec.type.toUpperCase()}
                    </span>
                  </div>

                  {/* Director / Camera Cue */}
                  {sec.visualNotes && (
                    <div className="p-3 rounded-lg bg-surface border border-[#1e3448] text-xs text-sky-300 flex items-start gap-2">
                      <Camera className="w-4 h-4 text-sky-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-bold block text-[10px] uppercase text-sky-400/80">Kamera & Görsel Notu</span>
                        <p>{sec.visualNotes}</p>
                      </div>
                    </div>
                  )}

                  {/* Dialogue & Speech Text */}
                  <div className="text-sm text-body leading-relaxed whitespace-pre-wrap font-sans bg-app p-4 rounded-xl border border-line">
                    {sec.content || <span className="text-muted italic">(Bu sahneye henüz konuşma metni yazılmadı)</span>}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
