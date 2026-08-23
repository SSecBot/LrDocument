'use client';

import React from 'react';
import { useAppStore } from '@/store/useAppStore';
import { PlatformBadge, ScriptStatusBadge, PriorityBadge } from '@/components/ui/Badge';
import { AlertBanner } from './AlertBanner';
import {
  FileText,
  Video,
  CheckSquare,
  Calendar,
  Image as ImageIcon,
  Wallet,
  Plus,
  Sparkles,
  ArrowRight,
  Clock,
  Layers,
  Star,
  TrendingUp,
  Kanban,
} from 'lucide-react';
import { formatTurkishDate, getRelativeTimeTurkish, formatCurrencyTRY } from '@/lib/utils';

export const DashboardOverview: React.FC = () => {
  const {
    notes,
    scripts,
    tasks,
    kanbanCards,
    events,
    mediaItems,
    transactions,
    setActiveTab,
    setActiveNoteId,
    setActiveScriptId,
    addNote,
    addScript,
    addTask,
  } = useAppStore();

  const totalNotes = notes.length;
  const readyScripts = scripts.filter(s => s.status === 'yayina_hazir' || s.status === 'senaryo_hazir').length;
  const pendingTasks = tasks.filter(t => !t.completed).length;
  const upcomingEvents = events.length;
  const inProgressKanban = kanbanCards.filter(c => c.columnId === 'devam_ediyor' || c.columnId === 'yapilacak').length;

  const totalIncome = transactions.filter(t => t.type === 'gelir').reduce((sum, t) => sum + t.amount, 0);
  const totalExpense = transactions.filter(t => t.type === 'gider').reduce((sum, t) => sum + t.amount, 0);
  const netBalance = totalIncome - totalExpense;

  const recentNotes = [...notes].sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime()).slice(0, 3);
  const upcomingReleaseEvents = [...events].sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime()).slice(0, 3);

  return (
    <div className="flex-1 overflow-y-auto bg-[#121212] p-6 md:p-10 space-y-6">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* Overdue & Pending Alert Banner */}
        <AlertBanner />

        {/* Welcome Hero Banner */}
        <div className="relative overflow-hidden bg-gradient-to-r from-[#182318] via-[#1a1a1a] to-[#161616] border border-[#2d5a27]/40 rounded-3xl p-6 md:p-8 shadow-2xl">
          <div className="relative z-10 space-y-3 max-w-2xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[#2d5a27]/30 border border-[#2d5a27]/60 text-emerald-300 text-xs font-semibold">
              <Sparkles className="w-3.5 h-3.5 text-yellow-300" />
              <span>LrDocument Çalışma Alanı</span>
            </div>
            <h1 className="text-2xl md:text-3xl font-extrabold text-white tracking-tight leading-tight">
              İçerik, Araştırma & Üretim Yönetim Merkezi
            </h1>
            <p className="text-sm text-[#d1d5db] leading-relaxed">
              Zengin matematik notları yazın, video konuşma sürelerini hesaplayın, medya varlıklarınızı depolayın, evrensel Kanban panosunda projelerinizi yönetin ve bütçenizi takip edin.
            </p>
          </div>

          <div className="flex items-center gap-3 pt-4 relative z-10 flex-wrap">
            <button
              onClick={() => {
                const id = addNote();
                setActiveNoteId(id);
                setActiveTab('notes');
              }}
              className="px-4 py-2.5 bg-[#2d5a27] hover:bg-[#387030] text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/60 flex items-center gap-2 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni Not Başlat</span>
            </button>

            <button
              onClick={() => {
                const id = addScript();
                setActiveScriptId(id);
                setActiveTab('scripts');
              }}
              className="px-4 py-2.5 bg-[#222] hover:bg-[#2c2c2c] border border-[#383838] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all"
            >
              <Video className="w-4 h-4 text-emerald-400" />
              <span>Yeni Video Senaryosu</span>
            </button>

            <button
              onClick={() => setActiveTab('kanban')}
              className="px-4 py-2.5 bg-[#202020] hover:bg-[#282828] border border-[#333] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all"
            >
              <Kanban className="w-4 h-4 text-emerald-400" />
              <span>Kanban Panosunu Aç</span>
            </button>

            <button
              onClick={() => setActiveTab('finance')}
              className="px-4 py-2.5 bg-[#202020] hover:bg-[#282828] border border-[#333] text-white text-xs font-bold rounded-xl flex items-center gap-2 transition-all"
            >
              <Wallet className="w-4 h-4 text-emerald-400" />
              <span>Gelir ve Gideri Aç</span>
            </button>
          </div>
        </div>

        {/* 7 Metric Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 xl:grid-cols-7 gap-3.5">
          {/* Notes Metric */}
          <div
            onClick={() => setActiveTab('notes')}
            className="bg-[#181818] hover:bg-[#202020] border border-[#282828] hover:border-[#2d5a27] rounded-2xl p-4 cursor-pointer transition-all shadow-sm space-y-1.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">Notlar</span>
              <div className="p-1.5 bg-[#202820] border border-[#2d5a27]/40 rounded-lg text-emerald-400">
                <FileText className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-white">{totalNotes}</div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>Notlara git</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </div>
          </div>

          {/* Scripts Metric */}
          <div
            onClick={() => setActiveTab('scripts')}
            className="bg-[#181818] hover:bg-[#202020] border border-[#282828] hover:border-[#2d5a27] rounded-2xl p-4 cursor-pointer transition-all shadow-sm space-y-1.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">Senaryolar</span>
              <div className="p-1.5 bg-[#142028] border border-[#1e3a4e] rounded-lg text-sky-400">
                <Video className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-white">{scripts.length}</div>
            <div className="text-[11px] text-sky-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>{readyScripts} hazır</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </div>
          </div>

          {/* Kanban Metric */}
          <div
            onClick={() => setActiveTab('kanban')}
            className="bg-[#181818] hover:bg-[#202020] border border-[#282828] hover:border-[#2d5a27] rounded-2xl p-4 cursor-pointer transition-all shadow-sm space-y-1.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">Kanban</span>
              <div className="p-1.5 bg-[#202820] border border-[#2d5a27]/40 rounded-lg text-emerald-400">
                <Kanban className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-white">{kanbanCards.length}</div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>{inProgressKanban} aktif</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </div>
          </div>

          {/* Media Metric */}
          <div
            onClick={() => setActiveTab('media')}
            className="bg-[#181818] hover:bg-[#202020] border border-[#282828] hover:border-[#2d5a27] rounded-2xl p-4 cursor-pointer transition-all shadow-sm space-y-1.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">Medya</span>
              <div className="p-1.5 bg-[#281424] border border-[#4e1e44] rounded-lg text-pink-400">
                <ImageIcon className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-white">{mediaItems.length}</div>
            <div className="text-[11px] text-pink-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>Çizim & Galeri</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </div>
          </div>

          {/* Tasks Metric */}
          <div
            onClick={() => setActiveTab('tasks')}
            className="bg-[#181818] hover:bg-[#202020] border border-[#282828] hover:border-[#2d5a27] rounded-2xl p-4 cursor-pointer transition-all shadow-sm space-y-1.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">Görevler</span>
              <div className="p-1.5 bg-[#282014] border border-[#4e3a1e] rounded-lg text-amber-400">
                <CheckSquare className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-white">{pendingTasks}</div>
            <div className="text-[11px] text-amber-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>Yapılacaklar</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </div>
          </div>

          {/* Calendar Metric */}
          <div
            onClick={() => setActiveTab('calendar')}
            className="bg-[#181818] hover:bg-[#202020] border border-[#282828] hover:border-[#2d5a27] rounded-2xl p-4 cursor-pointer transition-all shadow-sm space-y-1.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">Takvim</span>
              <div className="p-1.5 bg-[#201828] border border-[#3e1e4e] rounded-lg text-purple-400">
                <Calendar className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-extrabold text-white">{upcomingEvents}</div>
            <div className="text-[11px] text-purple-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>Planlananlar</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </div>
          </div>

          {/* Finance Metric */}
          <div
            onClick={() => setActiveTab('finance')}
            className="bg-[#181818] hover:bg-[#202020] border border-[#282828] hover:border-[#2d5a27] rounded-2xl p-4 cursor-pointer transition-all shadow-sm space-y-1.5 group"
          >
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-semibold text-[#9ca3af] uppercase tracking-wider">Net Bakiye</span>
              <div className="p-1.5 bg-[#182818] border border-[#2d5a27]/50 rounded-lg text-emerald-400">
                <Wallet className="w-3.5 h-3.5" />
              </div>
            </div>
            <div className="text-xl font-extrabold font-mono text-emerald-400">
              {formatCurrencyTRY(netBalance)}
            </div>
            <div className="text-[11px] text-emerald-400 flex items-center gap-1 group-hover:translate-x-1 transition-transform">
              <span>Finans Paneli</span>
              <ArrowRight className="w-2.5 h-2.5" />
            </div>
          </div>
        </div>

        {/* 2 Column Quick Highlights: Notes & Releases */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
          {/* Recent Notes */}
          <div className="bg-[#161616] border border-[#262626] rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <FileText className="w-5 h-5 text-emerald-400" />
                <h2 className="text-base font-bold text-white tracking-tight">Son Düzenlenen Notlar</h2>
              </div>
              <button
                onClick={() => setActiveTab('notes')}
                className="text-xs text-emerald-400 hover:underline flex items-center gap-1 font-medium"
              >
                <span>Tümünü Gör</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3">
              {recentNotes.length === 0 ? (
                <div className="text-center py-8 text-[#71717a] text-xs space-y-2">
                  <p>Henüz kayıtlı bir not bulunmuyor.</p>
                  <button
                    onClick={() => {
                      const id = addNote();
                      setActiveNoteId(id);
                      setActiveTab('notes');
                    }}
                    className="text-emerald-400 hover:underline font-semibold text-xs inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Yeni Not Başlat</span>
                  </button>
                </div>
              ) : (
                recentNotes.map((note) => (
                  <div
                    key={note.id}
                    onClick={() => {
                      setActiveNoteId(note.id);
                      setActiveTab('notes');
                    }}
                    className="p-3.5 rounded-2xl bg-[#1d1d1d] hover:bg-[#252525] border border-[#2e2e2e] cursor-pointer transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                          {note.title}
                        </h4>
                        {note.isPinned && <span className="text-[10px] text-amber-400">📌</span>}
                        {note.isFavorite && <Star className="w-3 h-3 text-amber-400 fill-amber-400 shrink-0" />}
                      </div>
                      <p className="text-[11px] text-[#71717a] mt-0.5">
                        {getRelativeTimeTurkish(note.updatedAt)} • {note.folder}
                      </p>
                    </div>

                    <div className="flex items-center gap-1.5">
                      {note.tags.slice(0, 2).map(tag => (
                        <span key={tag} className="text-[10px] px-2 py-0.5 rounded-full bg-[#282828] text-[#9ca3af] hidden sm:inline">
                          #{tag}
                        </span>
                      ))}
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Upcoming Calendar Releases */}
          <div className="bg-[#161616] border border-[#262626] rounded-3xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Calendar className="w-5 h-5 text-purple-400" />
                <h2 className="text-base font-bold text-white tracking-tight">Yaklaşan Yayın Takvimi</h2>
              </div>
              <button
                onClick={() => setActiveTab('calendar')}
                className="text-xs text-purple-400 hover:underline flex items-center gap-1 font-medium"
              >
                <span>Takvimi Aç</span>
                <ArrowRight className="w-3 h-3" />
              </button>
            </div>

            <div className="space-y-3">
              {upcomingReleaseEvents.length === 0 ? (
                <div className="text-center py-8 text-[#71717a] text-xs space-y-2">
                  <p>Planlanmış yaklaşan etkinlik bulunmuyor.</p>
                  <button
                    onClick={() => setActiveTab('calendar')}
                    className="text-purple-400 hover:underline font-semibold text-xs inline-flex items-center gap-1"
                  >
                    <Plus className="w-3 h-3" />
                    <span>Yeni Etkinlik Planla</span>
                  </button>
                </div>
              ) : (
                upcomingReleaseEvents.map((ev) => (
                  <div
                    key={ev.id}
                    onClick={() => setActiveTab('calendar')}
                    className="p-3.5 rounded-2xl bg-[#1d1d1d] hover:bg-[#252525] border border-[#2e2e2e] cursor-pointer transition-all flex items-center justify-between gap-3 group"
                  >
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2">
                        {ev.platform && <PlatformBadge platform={ev.platform} size="sm" />}
                        <h4 className="text-xs font-bold text-white group-hover:text-purple-300 transition-colors truncate">
                          {ev.title}
                        </h4>
                      </div>
                      <p className="text-[11px] text-[#71717a] mt-0.5 flex items-center gap-1">
                        <Clock className="w-3 h-3 text-purple-400" />
                        <span>{formatTurkishDate(ev.date)} • {ev.time || '18:00'}</span>
                      </p>
                    </div>

                    <span className="text-[10px] px-2.5 py-1 rounded-lg font-medium bg-purple-950/40 text-purple-300 border border-purple-800/40 shrink-0">
                      {ev.eventType === 'yayin' ? 'Yayın' : ev.eventType === 'gorev' ? 'Görev' : 'Özel Gün'}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
