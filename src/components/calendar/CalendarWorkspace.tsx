'use client';

import React, { useState } from 'react';
import { useAppStore, isTransactionOverdue } from '@/store/useAppStore';
import { CalendarEvent, CalendarEventType, Platform, FinanceTransaction } from '@/types';
import { EventModal } from './EventModal';
import { ExportSyncModal } from './ExportSyncModal';
import { TransactionModal } from '@/components/finance/TransactionModal';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  List,
  Grid,
  CalendarDays,
  Clock,
  GripVertical,
  TrendingUp,
  TrendingDown,
  Check,
  AlertTriangle,
} from 'lucide-react';
import { formatTurkishDate, formatCurrencyTRY } from '@/lib/utils';

export const CalendarWorkspace: React.FC = () => {
  const {
    events,
    tasks,
    transactions,
    rescheduleEvent,
    toggleTransactionConfirmation,
  } = useAppStore();

  const [currentDate, setCurrentDate] = useState<Date>(new Date(2026, 7, 1)); // August 2026
  const [viewMode, setViewMode] = useState<'month' | 'week' | 'list'>('month');
  const [selectedEventType, setSelectedEventType] = useState<CalendarEventType | 'all'>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');

  // Drag and Drop state
  const [dragOverDate, setDragOverDate] = useState<string | null>(null);

  // Modals state
  const [isEventModalOpen, setIsEventModalOpen] = useState(false);
  const [editingEvent, setEditingEvent] = useState<CalendarEvent | null>(null);
  const [selectedDateForNewEvent, setSelectedDateForNewEvent] = useState<string>('');
  const [isExportModalOpen, setIsExportModalOpen] = useState(false);
  const [exportTargetEvent, setExportTargetEvent] = useState<CalendarEvent | undefined>(undefined);

  // Finance modal state
  const [isFinanceModalOpen, setIsFinanceModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null);

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    'Ocak', 'Şubat', 'Mart', 'Nisan', 'Mayıs', 'Haziran',
    'Temmuz', 'Ağustos', 'Eylül', 'Ekim', 'Kasım', 'Aralık'
  ];

  const dayNames = ['Pzt', 'Sal', 'Çar', 'Per', 'Cum', 'Cmt', 'Paz'];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Calendar Grid Calculation
  const firstDayIndex = (new Date(year, month, 1).getDay() + 6) % 7; // Monday = 0
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  // Filtered Events
  const filteredEvents = events.filter((ev) => {
    if (selectedEventType === 'finans') return false;
    if (selectedEventType !== 'all' && (ev.eventType || 'yayin') !== selectedEventType) return false;
    if (selectedPlatform !== 'all' && ev.platform && ev.platform !== selectedPlatform) return false;
    return true;
  });

  // Filtered Finance Transactions
  const filteredTransactions = transactions.filter((tr) => {
    if (selectedEventType !== 'all' && selectedEventType !== 'finans') return false;
    return true;
  });

  const getEventsForDate = (dateStr: string) => {
    return filteredEvents.filter(e => e.date === dateStr);
  };

  const getTransactionsForDate = (dateStr: string) => {
    return filteredTransactions.filter(t => t.date === dateStr);
  };

  const handleCellClick = (dateStr: string) => {
    setSelectedDateForNewEvent(dateStr);
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const handleEventClick = (ev: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEvent(ev);
    setIsEventModalOpen(true);
  };

  const handleTransactionClick = (tr: FinanceTransaction, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingTransaction(tr);
    setIsFinanceModalOpen(true);
  };

  const handleOpenExport = (ev?: CalendarEvent) => {
    setExportTargetEvent(ev);
    setIsExportModalOpen(true);
  };

  // Drag and Drop handlers
  const handleDragStart = (e: React.DragEvent, evId: string) => {
    e.dataTransfer.setData('text/plain', evId);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    if (dragOverDate !== dateStr) {
      setDragOverDate(dateStr);
    }
  };

  const handleDragLeave = (e: React.DragEvent, dateStr: string) => {
    e.preventDefault();
    if (dragOverDate === dateStr) {
      setDragOverDate(null);
    }
  };

  const handleDrop = (e: React.DragEvent, targetDateStr: string) => {
    e.preventDefault();
    setDragOverDate(null);
    const eventId = e.dataTransfer.getData('text/plain');
    if (eventId) {
      rescheduleEvent(eventId, targetDateStr);
    }
  };

  // Helper to check if calendar event is overdue
  const isEventOverdue = (ev: CalendarEvent): boolean => {
    const nowTime = new Date().setHours(0, 0, 0, 0);
    const isPast = new Date(ev.date).getTime() < nowTime;
    if (!isPast) return false;

    if (ev.linkedTaskId) {
      const linkedTask = tasks.find(t => t.id === ev.linkedTaskId);
      if (linkedTask) return !linkedTask.completed;
    }
    return ev.status !== 'yayinlandi';
  };

  const getEventBadgeStyle = (ev: CalendarEvent) => {
    const isOverdue = isEventOverdue(ev);
    if (isOverdue) {
      return 'animate-pulse border-2 border-rose-500 bg-rose-950/85 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.6)] ring-1 ring-rose-400 font-bold';
    }

    const type = ev.eventType || 'yayin';
    if (type === 'gorev') {
      return 'bg-amber-950/80 border-amber-700/70 text-amber-200';
    }
    if (type === 'ozel_gun') {
      return 'bg-emerald-950/80 border-emerald-700/70 text-emerald-200';
    }
    // Social / Video Yayınlar
    if (ev.platform === 'YouTube') return 'bg-red-950/80 border-red-700/70 text-red-200';
    if (ev.platform === 'TikTok') return 'bg-cyan-950/80 border-cyan-700/70 text-cyan-200';
    if (ev.platform === 'Instagram') return 'bg-pink-950/80 border-pink-700/70 text-pink-200';
    return 'bg-blue-950/80 border-blue-700/70 text-blue-200';
  };

  const getTransactionBadgeStyle = (tr: FinanceTransaction) => {
    const isOverdue = isTransactionOverdue(tr);
    if (isOverdue) {
      return 'animate-pulse border-2 border-rose-500 bg-rose-950/85 text-rose-200 shadow-[0_0_12px_rgba(244,63,94,0.6)] ring-1 ring-rose-400 font-bold';
    }

    if (tr.type === 'gelir') {
      return 'bg-emerald-950/80 border-emerald-700/70 text-emerald-300';
    }
    return 'bg-rose-950/70 border-rose-800/60 text-rose-300';
  };

  // Generate 7 days for weekly view (starting from today or reference date in August 2026)
  const getWeekDays = () => {
    const base = new Date(currentDate);
    const dayOfWeek = (base.getDay() + 6) % 7; // Monday = 0
    const monday = new Date(base);
    monday.setDate(base.getDate() - dayOfWeek);

    return Array.from({ length: 7 }).map((_, i) => {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);
      const dateStr = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
      return {
        date: d,
        dateStr,
        dayName: dayNames[i],
        dayNum: d.getDate(),
        monthName: monthNames[d.getMonth()],
      };
    });
  };

  const weekDays = getWeekDays();

  return (
    <div className="flex-1 flex flex-col h-full bg-[#121212] overflow-hidden select-none">
      {/* Top Header & Navigation */}
      <div className="px-4 sm:px-6 py-3.5 bg-[#181818] border-b border-[#282828] flex items-center justify-between gap-3 flex-wrap">
        <div className="flex items-center gap-3 flex-wrap">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#2d5a27] to-[#142812] border border-[#387030] flex items-center justify-center shadow-lg shadow-emerald-950/40 shrink-0">
              <CalendarIcon className="w-5 h-5 text-white" />
            </div>
            <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
              Takvim
            </h2>
          </div>

          {/* Month Navigation */}
          <div className="flex items-center gap-1 bg-[#222] p-1 rounded-xl border border-[#333]">
            <button
              onClick={handlePrevMonth}
              className="min-h-[36px] min-w-[36px] p-2 hover:bg-[#2c2c2c] active:bg-[#383838] rounded-lg text-[#9ca3af] hover:text-white transition-colors flex items-center justify-center"
              title="Önceki Ay"
              aria-label="Önceki Ay"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
            <span className="font-bold text-xs sm:text-sm text-white px-2 sm:px-3 min-w-[110px] sm:min-w-[130px] text-center">
              {monthNames[month]} {year}
            </span>
            <button
              onClick={handleNextMonth}
              className="min-h-[36px] min-w-[36px] p-2 hover:bg-[#2c2c2c] active:bg-[#383838] rounded-lg text-[#9ca3af] hover:text-white transition-colors flex items-center justify-center"
              title="Sonraki Ay"
              aria-label="Sonraki Ay"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          </div>

          <button
            onClick={handleToday}
            className="min-h-[36px] text-xs px-3 py-1.5 bg-[#202020] hover:bg-[#2a2a2a] active:bg-[#333] text-[#d1d5db] border border-[#333] rounded-lg transition-colors font-medium"
          >
            Bugün
          </button>
        </div>

        {/* View Toggle & Actions */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* View Mode Selector */}
          <div className="flex bg-[#222] p-1 rounded-xl border border-[#333]">
            <button
              onClick={() => setViewMode('month')}
              className={`min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'month' ? 'bg-[#2d5a27] text-white shadow-sm' : 'text-[#9ca3af] hover:text-white'
              }`}
              title="Aylık Izgara Görünümü"
            >
              <Grid className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Aylık</span>
            </button>
            <button
              onClick={() => setViewMode('week')}
              className={`min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'week' ? 'bg-[#2d5a27] text-white shadow-sm' : 'text-[#9ca3af] hover:text-white'
              }`}
              title="Haftalık Kompakt Akış"
            >
              <CalendarDays className="w-3.5 h-3.5" />
              <span>Haftalık</span>
            </button>
            <button
              onClick={() => setViewMode('list')}
              className={`min-h-[36px] px-2.5 sm:px-3 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                viewMode === 'list' ? 'bg-[#2d5a27] text-white shadow-sm' : 'text-[#9ca3af] hover:text-white'
              }`}
              title="Ajanda Liste Görünümü"
            >
              <List className="w-3.5 h-3.5" />
              <span className="hidden sm:inline">Ajanda</span>
            </button>
          </div>

          {/* Export / Sync Button */}
          <button
            onClick={() => handleOpenExport()}
            className="min-h-[36px] flex items-center gap-1.5 px-3 py-1.5 bg-[#202820] hover:bg-[#2d5a27]/30 border border-[#2d5a27]/50 text-emerald-300 text-xs font-semibold rounded-xl transition-all"
            title="Apple ve Google Takvim'e aktar"
          >
            <Download className="w-3.5 h-3.5" />
            <span className="hidden md:inline">.ICS Senkronize Et</span>
          </button>

          {/* New Event Button */}
          <button
            onClick={() => {
              setSelectedDateForNewEvent(new Date().toISOString().split('T')[0]);
              setEditingEvent(null);
              setIsEventModalOpen(true);
            }}
            className="min-h-[36px] flex items-center gap-1.5 px-3.5 py-1.5 bg-[#2d5a27] hover:bg-[#387030] text-white text-xs font-semibold rounded-xl shadow-md transition-all"
          >
            <Plus className="w-4 h-4" />
            <span>Etkinlik Ekle</span>
          </button>
        </div>
      </div>

      {/* Filter Toolbar */}
      <div className="px-4 sm:px-6 py-2 bg-[#151515] border-b border-[#242424] flex items-center gap-2 overflow-x-auto no-scrollbar">
        <span className="text-[10px] font-bold text-[#666] uppercase tracking-wider shrink-0 mr-1">
          Filtre:
        </span>
        {[
          { id: 'all', label: 'Tümü' },
          { id: 'yayin', label: '🔴 Yayınlar' },
          { id: 'gorev', label: '🟡 Görevler' },
          { id: 'finans', label: '💰 Finans' },
          { id: 'ozel_gun', label: '🟢 Özel Günler' },
        ].map((t) => (
          <button
            key={t.id}
            onClick={() => setSelectedEventType(t.id as CalendarEventType | 'all')}
            className={`min-h-[34px] px-3 py-1 text-xs font-medium rounded-xl whitespace-nowrap transition-colors border ${
              selectedEventType === t.id
                ? 'bg-[#2d5a27] text-white font-bold border-[#387030] shadow-sm'
                : 'bg-[#1e1e1e] text-[#9ca3af] hover:text-white border-[#2c2c2c] hover:bg-[#252525]'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {/* Main Calendar Content Area */}
      <div className="flex-1 overflow-y-auto p-3 sm:p-6 bg-[#121212]">
        {viewMode === 'month' ? (
          /* Monthly Grid View */
          <div className="max-w-7xl mx-auto h-full flex flex-col bg-[#161616] border border-[#262626] rounded-2xl sm:rounded-3xl overflow-hidden shadow-xl">
            {/* Days Header */}
            <div className="grid grid-cols-7 border-b border-[#262626] bg-[#1a1a1a]">
              {dayNames.map((d, i) => (
                <div
                  key={d}
                  className={`py-2 text-center text-[10px] sm:text-xs font-bold uppercase tracking-wider ${
                    i >= 5 ? 'text-emerald-400/80' : 'text-[#a1a1aa]'
                  }`}
                >
                  {d}
                </div>
              ))}
            </div>

            {/* Dates Grid */}
            <div className="grid grid-cols-7 flex-1 auto-rows-fr divide-x divide-y divide-[#262626]">
              {/* Previous month padding days */}
              {Array.from({ length: firstDayIndex }).map((_, i) => {
                const prevDateNum = daysInPrevMonth - firstDayIndex + i + 1;
                return (
                  <div key={`prev-${i}`} className="bg-[#121212]/50 p-1 sm:p-2 min-h-[75px] sm:min-h-[110px] text-[#444] text-[10px] sm:text-xs">
                    <span className="font-mono">{prevDateNum}</span>
                  </div>
                );
              })}

              {/* Current month days */}
              {Array.from({ length: daysInMonth }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const dayEvents = getEventsForDate(dateStr);
                const dayTransactions = getTransactionsForDate(dateStr);
                const isToday = new Date().toISOString().split('T')[0] === dateStr;
                const isDragTarget = dragOverDate === dateStr;

                return (
                  <div
                    key={dateStr}
                    onClick={() => handleCellClick(dateStr)}
                    onDragOver={(e) => handleDragOver(e, dateStr)}
                    onDragLeave={(e) => handleDragLeave(e, dateStr)}
                    onDrop={(e) => handleDrop(e, dateStr)}
                    className={`p-1 sm:p-2 min-h-[75px] sm:min-h-[110px] cursor-pointer transition-all flex flex-col justify-between group relative overflow-hidden ${
                      isDragTarget
                        ? 'bg-[#203420] ring-2 ring-inset ring-emerald-400'
                        : isToday
                        ? 'bg-[#182318]/40 ring-1 ring-inset ring-[#2d5a27]'
                        : 'bg-[#161616] hover:bg-[#1f1f1f]'
                    }`}
                  >
                    {/* Day number & Quick add */}
                    <div className="flex items-center justify-between pointer-events-none">
                      <span
                        className={`text-[10px] sm:text-xs font-mono font-bold w-5 h-5 sm:w-6 sm:h-6 rounded-full flex items-center justify-center ${
                          isToday
                            ? 'bg-[#2d5a27] text-white shadow-sm'
                            : 'text-[#d1d5db] group-hover:text-white'
                        }`}
                      >
                        {dayNum}
                      </span>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCellClick(dateStr);
                        }}
                        className="opacity-0 group-hover:opacity-100 p-0.5 text-[#71717a] hover:text-emerald-400 transition-opacity pointer-events-auto"
                        title="Etkinlik ekle"
                      >
                        <Plus className="w-3 h-3 sm:w-3.5 sm:h-3.5" />
                      </button>
                    </div>

                    {/* Events & Transactions */}
                    <div className="space-y-0.5 sm:space-y-1 mt-1 flex-1 overflow-y-auto max-h-[85px] pr-0.5">
                      {dayEvents.map((ev) => {
                        const isOverdue = isEventOverdue(ev);

                        return (
                          <div
                            key={ev.id}
                            draggable={true}
                            onDragStart={(e) => handleDragStart(e, ev.id)}
                            onClick={(e) => handleEventClick(ev, e)}
                            className={`p-1 sm:p-1.5 rounded-md sm:rounded-lg border text-[9px] sm:text-[11px] font-semibold truncate transition-all shadow-sm flex items-center gap-1 cursor-grab active:cursor-grabbing select-none ${getEventBadgeStyle(
                              ev
                            )}`}
                            title={`${isOverdue ? '⚠️ [GECİKMİŞ ETKİNLİK] ' : ''}${ev.time || '09:00'} - ${ev.title}`}
                          >
                            {isOverdue ? (
                              <AlertTriangle className="w-2.5 h-2.5 text-rose-300 shrink-0" />
                            ) : (
                              <GripVertical className="w-2 h-2 opacity-50 shrink-0 hidden sm:inline" />
                            )}
                            <span className="font-mono text-[8px] sm:text-[9px] opacity-80 shrink-0">{ev.time || '09:00'}</span>
                            <span className="truncate">{ev.title}</span>
                          </div>
                        );
                      })}

                      {dayTransactions.map((tr) => {
                        const isOverdue = isTransactionOverdue(tr);

                        return (
                          <div
                            key={tr.id}
                            onClick={(e) => handleTransactionClick(tr, e)}
                            className={`p-1 sm:p-1.5 rounded-md sm:rounded-lg border text-[9px] sm:text-[11px] font-semibold truncate transition-all shadow-sm flex items-center justify-between gap-1 select-none ${getTransactionBadgeStyle(
                              tr
                            )}`}
                            title={`${isOverdue ? '⚠️ [GECİKMİŞ] ' : ''}${tr.type === 'gelir' ? '+' : '-'}${formatCurrencyTRY(tr.amount)} - ${tr.title}`}
                          >
                            <div className="flex items-center gap-1 min-w-0">
                              {isOverdue ? (
                                <AlertTriangle className="w-2.5 h-2.5 text-rose-300 shrink-0" />
                              ) : tr.type === 'gelir' ? (
                                <TrendingUp className="w-2 h-2 text-emerald-400 shrink-0" />
                              ) : (
                                <TrendingDown className="w-2 h-2 text-rose-400 shrink-0" />
                              )}
                              <span className="font-mono text-[8px] sm:text-[9px] font-bold">
                                {tr.type === 'gelir' ? '+' : '-'}{tr.amount}₺
                              </span>
                              <span className="truncate text-[8px] sm:text-[10px] opacity-90 hidden sm:inline">{tr.title}</span>
                            </div>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTransactionConfirmation(tr.id);
                              }}
                              className={`p-0.5 rounded text-[8px] font-bold ${
                                tr.isConfirmed ? 'text-emerald-300' : 'text-amber-300'
                              }`}
                              title={tr.isConfirmed ? 'Onaylandı' : 'Onay Bekliyor'}
                            >
                              <Check className="w-2.5 h-2.5" />
                            </button>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : viewMode === 'week' ? (
          /* Compact Weekly View for Mobile & Touch */
          <div className="max-w-4xl mx-auto space-y-4">
            <div className="flex items-center justify-between px-2 text-xs text-[#71717a]">
              <span>Haftalık Akış & Günlük Program</span>
              <span>Kayıt eklemek için güne tıklayın</span>
            </div>

            <div className="space-y-3">
              {weekDays.map((w) => {
                const dayEvents = getEventsForDate(w.dateStr);
                const dayTransactions = getTransactionsForDate(w.dateStr);
                const isToday = new Date().toISOString().split('T')[0] === w.dateStr;
                const totalItems = dayEvents.length + dayTransactions.length;

                return (
                  <div
                    key={w.dateStr}
                    className={`rounded-2xl border transition-all overflow-hidden ${
                      isToday
                        ? 'bg-[#162016] border-[#2d5a27] shadow-lg shadow-emerald-950/30'
                        : 'bg-[#181818] border-[#282828] hover:border-[#333]'
                    }`}
                  >
                    {/* Day Header Bar */}
                    <div
                      onClick={() => handleCellClick(w.dateStr)}
                      className="p-3.5 sm:p-4 bg-[#1e1e1e]/70 border-b border-[#282828] flex items-center justify-between cursor-pointer hover:bg-[#222] transition-colors"
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`w-9 h-9 rounded-xl flex items-center justify-center font-bold text-sm font-mono ${
                            isToday ? 'bg-[#2d5a27] text-white shadow-sm' : 'bg-[#262626] text-[#d1d5db]'
                          }`}
                        >
                          {w.dayNum}
                        </span>
                        <div>
                          <div className="flex items-center gap-2">
                            <h3 className="text-sm font-bold text-white">
                              {w.dayName}, {w.dayNum} {w.monthName}
                            </h3>
                            {isToday && (
                              <span className="text-[10px] px-2 py-0.5 rounded-full bg-emerald-900/60 text-emerald-300 font-bold border border-emerald-700/60">
                                Bugün
                              </span>
                            )}
                          </div>
                          <p className="text-[11px] text-[#71717a]">
                            {totalItems === 0 ? 'Planlanan etkinlik veya ödeme yok' : `${totalItems} kayıt`}
                          </p>
                        </div>
                      </div>

                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          handleCellClick(w.dateStr);
                        }}
                        className="min-h-[38px] px-3 py-1.5 bg-[#252525] hover:bg-[#303030] text-emerald-400 hover:text-white rounded-xl text-xs font-semibold flex items-center gap-1 transition-colors"
                      >
                        <Plus className="w-3.5 h-3.5" />
                        <span>Ekle</span>
                      </button>
                    </div>

                    {/* Day Items List */}
                    <div className="p-3.5 space-y-2">
                      {totalItems === 0 ? (
                        <div className="py-2 text-center text-xs text-[#555]">
                          Bu gün için serbest zaman veya planlanmamış
                        </div>
                      ) : (
                        <>
                          {/* Events */}
                          {dayEvents.map((ev) => {
                            const isOverdue = isEventOverdue(ev);
                            return (
                              <div
                                key={ev.id}
                                onClick={(e) => handleEventClick(ev, e)}
                                className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all flex items-center justify-between gap-3 ${getEventBadgeStyle(
                                  ev
                                )}`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {isOverdue ? (
                                    <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
                                  ) : (
                                    <Clock className="w-3.5 h-3.5 opacity-70 shrink-0" />
                                  )}
                                  <span className="font-mono text-xs opacity-90">{ev.time || '09:00'}</span>
                                  <span className="truncate text-white">{ev.title}</span>
                                </div>
                                <span className="text-[10px] px-2 py-0.5 rounded bg-black/30 font-medium shrink-0">
                                  {ev.eventType === 'yayin' ? (ev.platform || 'Yayın') : ev.eventType === 'gorev' ? 'Görev' : 'Özel Gün'}
                                </span>
                              </div>
                            );
                          })}

                          {/* Transactions */}
                          {dayTransactions.map((tr) => {
                            const isOverdue = isTransactionOverdue(tr);
                            return (
                              <div
                                key={tr.id}
                                onClick={(e) => handleTransactionClick(tr, e)}
                                className={`p-3 rounded-xl border text-xs font-semibold cursor-pointer transition-all flex items-center justify-between gap-3 ${getTransactionBadgeStyle(
                                  tr
                                )}`}
                              >
                                <div className="flex items-center gap-2.5 min-w-0">
                                  {isOverdue ? (
                                    <AlertTriangle className="w-4 h-4 text-rose-300 shrink-0" />
                                  ) : tr.type === 'gelir' ? (
                                    <TrendingUp className="w-4 h-4 text-emerald-400 shrink-0" />
                                  ) : (
                                    <TrendingDown className="w-4 h-4 text-rose-400 shrink-0" />
                                  )}
                                  <span className="truncate">{tr.title} ({tr.category})</span>
                                </div>

                                <div className="flex items-center gap-2 shrink-0">
                                  <span className="font-mono font-bold text-xs">
                                    {tr.type === 'gelir' ? '+' : '-'}{formatCurrencyTRY(tr.amount)}
                                  </span>
                                  <button
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      toggleTransactionConfirmation(tr.id);
                                    }}
                                    className={`min-h-[34px] px-2.5 py-1 rounded-lg text-xs font-bold flex items-center gap-1 ${
                                      tr.isConfirmed ? 'bg-emerald-900/60 text-emerald-300' : 'bg-rose-900 text-rose-200 animate-pulse'
                                    }`}
                                  >
                                    <Check className="w-3 h-3" />
                                    <span>{tr.isConfirmed ? 'Onaylandı' : 'Onayla'}</span>
                                  </button>
                                </div>
                              </div>
                            );
                          })}
                        </>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        ) : (
          /* Agenda / List View */
          <div className="max-w-4xl mx-auto space-y-4">
            {filteredEvents.length === 0 && filteredTransactions.length === 0 ? (
              <div className="p-16 text-center text-[#71717a] text-xs space-y-3">
                <CalendarIcon className="w-12 h-12 mx-auto text-[#333]" />
                <p className="text-sm font-semibold text-white">Bu Filtreye Uygun Etkinlik Bulunamadı</p>
                <p>Yeni bir etkinlik planlamak için yukarıdaki butonu kullanabilirsiniz.</p>
              </div>
            ) : (
              <>
                {/* Events list */}
                {filteredEvents
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((ev) => {
                    const isOverdue = isEventOverdue(ev);

                    return (
                      <div
                        key={ev.id}
                        onClick={() => {
                          setEditingEvent(ev);
                          setIsEventModalOpen(true);
                        }}
                        className={`bg-[#181818] hover:bg-[#202020] border rounded-2xl p-4 sm:p-5 cursor-pointer transition-all shadow-sm space-y-3 group ${
                          isOverdue
                            ? 'animate-pulse border-2 border-rose-500 bg-rose-950/40 shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                            : 'border-[#282828] hover:border-[#387030]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-md border ${
                              isOverdue ? 'bg-rose-950 text-rose-300 border-rose-700 font-extrabold' :
                              ev.eventType === 'yayin' ? 'bg-red-950/60 text-red-300 border-red-800/40' :
                              ev.eventType === 'gorev' ? 'bg-amber-950/60 text-amber-300 border-amber-800/40' :
                              'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                            }`}>
                              {isOverdue ? '⚠️ GECİKMİŞ' : ev.eventType === 'yayin' ? (ev.platform || 'Yayın') : ev.eventType === 'gorev' ? 'Görev Teslimi' : 'Özel Gün'}
                            </span>

                            <div className="flex items-center gap-1.5 text-xs text-[#a1a1aa] font-mono">
                              <Clock className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{formatTurkishDate(ev.date)} • {ev.time || '18:00'}</span>
                            </div>
                          </div>

                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              handleOpenExport(ev);
                            }}
                            className="min-h-[38px] px-3 py-1.5 bg-[#222] hover:bg-[#2d5a27]/30 border border-[#333] hover:border-[#2d5a27] text-xs font-medium text-emerald-300 rounded-xl flex items-center gap-1 transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            <span>Senkronize Et</span>
                          </button>
                        </div>

                        <div>
                          <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                            {ev.title}
                          </h4>
                          {ev.description && (
                            <p className="text-xs text-[#9ca3af] mt-1 leading-relaxed">
                              {ev.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}

                {/* Finance Transactions list */}
                {filteredTransactions
                  .sort((a, b) => new Date(a.date).getTime() - new Date(b.date).getTime())
                  .map((tr) => {
                    const isOverdue = isTransactionOverdue(tr);

                    return (
                      <div
                        key={tr.id}
                        onClick={() => {
                          setEditingTransaction(tr);
                          setIsFinanceModalOpen(true);
                        }}
                        className={`bg-[#181818] hover:bg-[#202020] border rounded-2xl p-4 sm:p-5 cursor-pointer transition-all shadow-sm space-y-3 group ${
                          isOverdue
                            ? 'animate-pulse border-2 border-rose-500 bg-rose-950/40 shadow-[0_0_15px_rgba(244,63,94,0.5)]'
                            : 'border-[#282828] hover:border-[#387030]'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3 flex-wrap">
                          <div className="flex items-center gap-2.5 sm:gap-3 flex-wrap">
                            <span className={`text-xs font-bold px-2.5 py-1 rounded-md border flex items-center gap-1 ${
                              isOverdue ? 'bg-rose-950 text-rose-300 border-rose-700 font-extrabold' :
                              tr.type === 'gelir' ? 'bg-emerald-950/60 text-emerald-300 border-emerald-800/40' :
                              'bg-rose-950/60 text-rose-300 border-rose-800/40'
                            }`}>
                              {tr.type === 'gelir' ? <TrendingUp className="w-3 h-3 text-emerald-400" /> : <TrendingDown className="w-3 h-3 text-rose-400" />}
                              <span>{isOverdue ? '⚠️ GECİKMİŞ' : tr.type === 'gelir' ? 'Finans Gelir' : 'Finans Gider'}</span>
                            </span>

                            <div className="flex items-center gap-1.5 text-xs text-[#a1a1aa] font-mono">
                              <CalendarIcon className="w-3.5 h-3.5 text-emerald-400" />
                              <span>{formatTurkishDate(tr.date)}</span>
                            </div>
                          </div>

                          <div className="flex items-center gap-2">
                            <span className={`text-sm font-extrabold font-mono ${
                              tr.type === 'gelir' ? 'text-emerald-400' : 'text-rose-400'
                            }`}>
                              {tr.type === 'gelir' ? '+' : '-'}{formatCurrencyTRY(tr.amount)}
                            </span>

                            <button
                              onClick={(e) => {
                                e.stopPropagation();
                                toggleTransactionConfirmation(tr.id);
                              }}
                              className={`min-h-[38px] px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1 transition-all ${
                                tr.isConfirmed
                                  ? 'bg-emerald-950/40 text-emerald-300 border-emerald-800/50'
                                  : 'bg-rose-950 text-rose-300 border-rose-700 animate-pulse'
                              }`}
                            >
                              <Check className="w-3 h-3" />
                              <span>{tr.isConfirmed ? 'Onaylandı' : 'Onayla'}</span>
                            </button>
                          </div>
                        </div>

                        <div>
                          <h4 className="text-sm sm:text-base font-bold text-white group-hover:text-emerald-300 transition-colors">
                            {tr.title}
                          </h4>
                          {tr.description && (
                            <p className="text-xs text-[#9ca3af] mt-1 leading-relaxed">
                              {tr.description}
                            </p>
                          )}
                        </div>
                      </div>
                    );
                  })}
              </>
            )}
          </div>
        )}
      </div>

      {/* Event Add & Edit Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        initialDate={selectedDateForNewEvent}
        editEvent={editingEvent}
      />

      {/* Export / Sync Modal */}
      <ExportSyncModal
        isOpen={isExportModalOpen}
        onClose={() => setIsExportModalOpen(false)}
        selectedEvent={exportTargetEvent}
      />

      {/* Finance Transaction Modal */}
      <TransactionModal
        isOpen={isFinanceModalOpen}
        onClose={() => setIsFinanceModalOpen(false)}
        editTransaction={editingTransaction}
      />
    </div>
  );
};
