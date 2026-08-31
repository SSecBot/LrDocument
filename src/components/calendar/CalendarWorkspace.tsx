'use client';

import React, { useState, useRef, useEffect } from 'react';
import { useAppStore, isTransactionOverdue, isTaskOverdue, getEffectiveTaskPriority } from '@/store/useAppStore';
import { CalendarEvent, CalendarEventType, Platform, FinanceTransaction, Task } from '@/types';
import { EventModal } from './EventModal';
import { ExportSyncModal } from './ExportSyncModal';
import { TransactionModal } from '@/components/finance/TransactionModal';
import { parseICS } from '@/lib/icsParser';
import {
  Calendar as CalendarIcon,
  ChevronLeft,
  ChevronRight,
  Plus,
  Download,
  Upload,
  List,
  Grid,
  CalendarDays,
  Clock,
  GripVertical,
  TrendingUp,
  TrendingDown,
  Check,
  AlertTriangle,
  FileText,
  Video,
  CheckSquare,
  Sparkles,
  X,
  Layers,
  ScrollText,
  ChevronDown,
  Wallet,
} from 'lucide-react';
import { formatTurkishDate, formatCurrencyTRY } from '@/lib/utils';
import { isTransactionActiveOnDate } from '@/lib/recurringFinance';

export const CalendarWorkspace: React.FC = () => {
  const {
    events,
    tasks,
    transactions,
    notes,
    scripts,
    rescheduleEvent,
    toggleTransactionConfirmation,
    toggleTask,
    addEvent,
    addTask,
    addToast,
    setActiveTab,
    setActiveNoteId,
    setActiveScriptId,
  } = useAppStore();

  const now = new Date();
  const [currentDate, setCurrentDate] = useState<Date>(new Date(now.getFullYear(), now.getMonth(), 1));
  const [selectedDayDate, setSelectedDayDate] = useState<string>(now.toISOString().split('T')[0]);
  const [viewMode, setViewMode] = useState<'month' | 'scroll' | 'week' | 'list'>('month');
  const [selectedEventType, setSelectedEventType] = useState<CalendarEventType | 'all'>('all');
  const [selectedPlatform, setSelectedPlatform] = useState<Platform | 'all'>('all');
  const [isDayPanelOpen, setIsDayPanelOpen] = useState(true);

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

  // File upload input ref
  const fileInputRef = useRef<HTMLInputElement>(null);
  const scrollContainerRef = useRef<HTMLDivElement>(null);

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
    const today = new Date();
    setCurrentDate(new Date(today.getFullYear(), today.getMonth(), 1));
    setSelectedDayDate(today.toISOString().split('T')[0]);
  };

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
    return filteredTransactions.filter(t => isTransactionActiveOnDate(t, dateStr));
  };

  const getTasksForDate = (dateStr: string) => {
    return tasks.filter(t => t.dueDate === dateStr);
  };

  const getNotesForDate = (dateStr: string) => {
    return notes.filter(n => n.updatedAt.startsWith(dateStr) || n.createdAt.startsWith(dateStr));
  };

  const handleCellClick = (dateStr: string) => {
    setSelectedDayDate(dateStr);
    setIsDayPanelOpen(true);
  };

  const handleQuickAddEventOnSelectedDay = () => {
    setSelectedDateForNewEvent(selectedDayDate);
    setEditingEvent(null);
    setIsEventModalOpen(true);
  };

  const handleEventClick = (ev: CalendarEvent, e: React.MouseEvent) => {
    e.stopPropagation();
    setEditingEvent(ev);
    setSelectedDayDate(ev.date);
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

  // ICS File Upload Handler
  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      try {
        const text = event.target?.result as string;
        const parsed = parseICS(text);
        if (parsed.length === 0) {
          addToast({
            type: 'warning',
            title: 'Etkinlik Bulunamadı',
            message: 'Yüklenen .ics dosyasında geçerli VEVENT kaydı bulunamadı.',
          });
          return;
        }

        let addedCount = 0;
        for (const item of parsed) {
          addEvent(item);
          addedCount++;
        }

        addToast({
          type: 'success',
          title: 'Takvim İçe Aktarıldı',
          message: `${addedCount} adet takvim etkinliği başarıyla takviminize eklendi.`,
        });

        if (parsed[0]?.date) {
          const firstDate = new Date(parsed[0].date);
          setCurrentDate(new Date(firstDate.getFullYear(), firstDate.getMonth(), 1));
          setSelectedDayDate(parsed[0].date);
        }
      } catch (err) {
        addToast({
          type: 'error',
          title: 'İçe Aktarma Hatası',
          message: 'Dosya okunurken bir hata oluştu. Lütfen geçerli bir .ics dosyası seçin.',
        });
      }
    };
    reader.readAsText(file);
    e.target.value = '';
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
      setSelectedDayDate(targetDateStr);
    }
  };

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
    if (ev.platform === 'YouTube') return 'bg-red-950/80 border-red-700/70 text-red-200';
    if (ev.platform === 'TikTok') return 'bg-cyan-950/80 border-cyan-700/70 text-cyan-200';
    if (ev.platform === 'Instagram') return 'bg-pink-950/80 border-pink-700/70 text-pink-200';
    return 'bg-blue-950/80 border-blue-700/70 text-blue-200';
  };

  // Multi-month continuous scroll generator (6 months around current)
  const getMonthsForContinuousScroll = () => {
    const baseYear = currentDate.getFullYear();
    const baseMonth = currentDate.getMonth();

    const months = [];
    for (let offset = -2; offset <= 4; offset++) {
      const d = new Date(baseYear, baseMonth + offset, 1);
      const mYear = d.getFullYear();
      const mMonth = d.getMonth();
      const firstDay = (new Date(mYear, mMonth, 1).getDay() + 6) % 7;
      const totalDays = new Date(mYear, mMonth + 1, 0).getDate();

      months.push({
        year: mYear,
        month: mMonth,
        monthName: monthNames[mMonth],
        firstDay,
        totalDays,
      });
    }
    return months;
  };

  // Selected Day Items
  const selectedDayEvents = getEventsForDate(selectedDayDate);
  const selectedDayTasks = getTasksForDate(selectedDayDate);
  const selectedDayTransactions = getTransactionsForDate(selectedDayDate);
  const selectedDayNotes = getNotesForDate(selectedDayDate);

  const isToday = selectedDayDate === new Date().toISOString().split('T')[0];

  return (
    <div className="flex-1 flex h-full bg-[#121212] overflow-hidden select-none">
      {/* Hidden File Input for .ICS Upload */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".ics,text/calendar"
        className="hidden"
      />

      {/* Main Calendar View Area */}
      <div className="flex-1 flex flex-col h-full overflow-hidden border-r border-[#242424]">
        {/* Top Header & Navigation Bar */}
        <div className="px-4 sm:px-6 py-3.5 bg-[#181818] border-b border-[#282828] flex items-center justify-between gap-3 flex-wrap shrink-0">
          <div className="flex items-center gap-3 flex-wrap">
            <div className="flex items-center gap-2.5">
              <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-2xl bg-gradient-to-br from-[#2d5a27] to-[#142812] border border-[#387030] flex items-center justify-center shadow-lg shadow-emerald-950/40 shrink-0">
                <CalendarIcon className="w-5 h-5 text-white" />
              </div>
              <div>
                <h2 className="text-lg sm:text-xl font-extrabold text-white tracking-tight">
                  Takvim
                </h2>
                <p className="text-[10px] text-[#71717a] hidden sm:block">
                  Akıcı zaman çizelgesi & .ICS desteği
                </p>
              </div>
            </div>

            {/* Month Navigation */}
            {viewMode !== 'scroll' ? (
              <div className="flex items-center gap-1 bg-[#222] p-1 rounded-xl border border-[#333]">
                <button
                  onClick={handlePrevMonth}
                  className="min-h-[38px] min-w-[38px] p-2 hover:bg-[#2c2c2c] active:bg-[#383838] rounded-lg text-[#9ca3af] hover:text-white transition-colors flex items-center justify-center cursor-pointer"
                  title="Önceki Ay"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>
                <span className="font-bold text-xs sm:text-sm text-white px-2 sm:px-3 min-w-[110px] sm:min-w-[130px] text-center">
                  {monthNames[month]} {year}
                </span>
                <button
                  onClick={handleNextMonth}
                  className="min-h-[38px] min-w-[38px] p-2 hover:bg-[#2c2c2c] active:bg-[#383838] rounded-lg text-[#9ca3af] hover:text-white transition-colors flex items-center justify-center cursor-pointer"
                  title="Sonraki Ay"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <div className="px-3 py-1.5 bg-[#202820] border border-[#2d5a27]/60 rounded-xl text-xs font-bold text-emerald-300 flex items-center gap-1.5">
                <ScrollText className="w-3.5 h-3.5 text-emerald-400" />
                <span>Akıcı Zaman Çizelgesi Modu</span>
              </div>
            )}

            <button
              onClick={handleToday}
              className="min-h-[38px] px-3 py-1 bg-[#202020] hover:bg-[#282828] active:bg-[#303030] text-[#d1d5db] hover:text-white border border-[#333] text-xs font-semibold rounded-xl transition-colors cursor-pointer"
            >
              Bugün
            </button>
          </div>

          {/* Right Toolbar: Views, Import, Export, Add */}
          <div className="flex items-center gap-2 flex-wrap">
            {/* View switcher */}
            <div className="flex bg-[#202020] p-1 rounded-xl border border-[#333]">
              <button
                onClick={() => setViewMode('month')}
                className={`min-h-[36px] px-2.5 sm:px-3 py-1 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'month' ? 'bg-[#2d5a27] text-white font-bold' : 'text-[#9ca3af] hover:text-white'
                }`}
                title="Klasik Ay Görünümü"
              >
                <Grid className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Ay</span>
              </button>

              <button
                onClick={() => setViewMode('scroll')}
                className={`min-h-[36px] px-2.5 sm:px-3 py-1 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'scroll' ? 'bg-[#2d5a27] text-white font-bold shadow-sm' : 'text-[#9ca3af] hover:text-white'
                }`}
                title="Akıcı Zaman Çizelgesi Görünümü"
              >
                <ScrollText className="w-3.5 h-3.5 text-emerald-300" />
                <span className="hidden sm:inline">Zaman Çizelgesi</span>
              </button>

              <button
                onClick={() => setViewMode('week')}
                className={`min-h-[36px] px-2.5 sm:px-3 py-1 text-xs font-medium rounded-lg flex items-center gap-1 transition-colors cursor-pointer ${
                  viewMode === 'week' ? 'bg-[#2d5a27] text-white font-bold' : 'text-[#9ca3af] hover:text-white'
                }`}
                title="Hafta Görünümü"
              >
                <CalendarDays className="w-3.5 h-3.5" />
                <span className="hidden sm:inline">Hafta</span>
              </button>
            </div>

            {/* .ICS File Import Button */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="min-h-[44px] flex items-center gap-1.5 px-3 py-2 bg-[#202020] hover:bg-[#282828] border border-[#333] text-[#d1d5db] hover:text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              title=".ICS Takvim Dosyası Yükle ve İçe Aktar"
            >
              <Upload className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">.ICS Yükle</span>
            </button>

            {/* Export modal trigger */}
            <button
              onClick={() => handleOpenExport()}
              className="min-h-[44px] flex items-center gap-1.5 px-3 py-2 bg-[#202020] hover:bg-[#282828] border border-[#333] text-[#d1d5db] hover:text-white text-xs font-semibold rounded-xl transition-colors cursor-pointer"
              title="Dışa Aktar / Senkronize Et"
            >
              <Download className="w-4 h-4 text-emerald-400" />
              <span className="hidden sm:inline">Dışa Aktar</span>
            </button>

            {/* Quick Add Event */}
            <button
              onClick={handleQuickAddEventOnSelectedDay}
              className="min-h-[44px] flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-[#2d5a27] hover:bg-[#387030] active:bg-[#244c1f] text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/50 transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Etkinlik Ekle</span>
            </button>
          </div>
        </div>

        {/* View Mode 1: Classic Month Grid */}
        {viewMode === 'month' && (
          <div className="flex-1 flex flex-col overflow-hidden p-3 sm:p-4">
            {/* Days of week header */}
            <div className="grid grid-cols-7 gap-1.5 mb-1.5 text-center shrink-0">
              {dayNames.map((d, i) => (
                <div key={d} className={`text-xs font-bold py-1.5 ${i >= 5 ? 'text-emerald-400' : 'text-[#9ca3af]'}`}>
                  {d}
                </div>
              ))}
            </div>

            {/* Month Day Cells */}
            <div className="flex-1 grid grid-cols-7 gap-1.5 sm:gap-2 auto-rows-fr overflow-y-auto">
              {/* Previous Month Padding */}
              {Array.from({ length: (new Date(year, month, 1).getDay() + 6) % 7 }).map((_, i) => {
                const prevDays = new Date(year, month, 0).getDate();
                const dayNum = prevDays - ((new Date(year, month, 1).getDay() + 6) % 7) + i + 1;
                return (
                  <div key={`prev-${i}`} className="bg-[#161616]/40 border border-[#222] rounded-xl sm:rounded-2xl p-1.5 sm:p-2 opacity-35">
                    <span className="text-[11px] text-[#555] font-mono">{dayNum}</span>
                  </div>
                );
              })}

              {/* Current Month Days */}
              {Array.from({ length: new Date(year, month + 1, 0).getDate() }).map((_, i) => {
                const dayNum = i + 1;
                const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                const dayEvents = getEventsForDate(dateStr);
                const dayTasks = getTasksForDate(dateStr);
                const dayTrans = getTransactionsForDate(dateStr);
                const isSelected = selectedDayDate === dateStr;
                const isCurrentToday = dateStr === new Date().toISOString().split('T')[0];
                const isDragOver = dragOverDate === dateStr;

                return (
                  <div
                    key={dateStr}
                    onClick={() => handleCellClick(dateStr)}
                    onDragOver={(e) => handleDragOver(e, dateStr)}
                    onDragLeave={(e) => handleDragLeave(e, dateStr)}
                    onDrop={(e) => handleDrop(e, dateStr)}
                    className={`rounded-xl sm:rounded-2xl p-1.5 sm:p-2.5 flex flex-col justify-between transition-all cursor-pointer min-h-[85px] sm:min-h-[100px] border ${
                      isSelected
                        ? 'bg-[#1a2b1a] border-emerald-500 shadow-md ring-2 ring-emerald-500/40'
                        : isDragOver
                        ? 'bg-[#223820] border-emerald-400 ring-2 ring-emerald-400/60'
                        : 'bg-[#181818] hover:bg-[#202020] border-[#262626] hover:border-[#383838]'
                    }`}
                  >
                    {/* Date Header Number & Indicator count */}
                    <div className="flex items-center justify-between">
                      <span
                        className={`text-xs font-mono font-bold w-6 h-6 rounded-full flex items-center justify-center ${
                          isCurrentToday
                            ? 'bg-emerald-500 text-black font-extrabold shadow-sm'
                            : isSelected
                            ? 'bg-emerald-800 text-white'
                            : 'text-[#d1d5db]'
                        }`}
                      >
                        {dayNum}
                      </span>

                      <div className="flex items-center gap-1">
                        {dayTasks.length > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-amber-400" title={`${dayTasks.length} Görev`} />
                        )}
                        {dayTrans.length > 0 && (
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-400" title={`${dayTrans.length} Finans İşlemi`} />
                        )}
                      </div>
                    </div>

                    {/* Events list preview */}
                    <div className="space-y-1 my-1 flex-1 overflow-hidden">
                      {dayEvents.slice(0, 2).map((ev) => (
                        <div
                          key={ev.id}
                          draggable
                          onDragStart={(e) => handleDragStart(e, ev.id)}
                          onClick={(e) => handleEventClick(ev, e)}
                          className={`text-[10px] px-1.5 py-0.5 rounded-md truncate font-medium border flex items-center gap-1 ${getEventBadgeStyle(ev)}`}
                          title={`${ev.time || '10:00'} - ${ev.title}`}
                        >
                          <span className="truncate">{ev.title}</span>
                        </div>
                      ))}
                      {dayEvents.length > 2 && (
                        <span className="text-[9px] text-emerald-400 font-mono block pl-1">
                          +{dayEvents.length - 2} daha
                        </span>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {/* View Mode 2: Continuous Smooth Scroll Timeline View */}
        {viewMode === 'scroll' && (
          <div ref={scrollContainerRef} className="flex-1 overflow-y-auto p-4 space-y-6 scroll-smooth">
            {getMonthsForContinuousScroll().map((m) => (
              <div key={`${m.year}-${m.month}`} className="space-y-3 bg-[#151515] p-4 sm:p-5 rounded-3xl border border-[#242424]">
                {/* Sticky Month Header */}
                <div className="sticky top-0 z-10 bg-[#151515]/95 backdrop-blur-md py-2 border-b border-[#282828] flex items-center justify-between">
                  <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight flex items-center gap-2">
                    <CalendarDays className="w-5 h-5 text-emerald-400" />
                    <span>{m.monthName} {m.year}</span>
                  </h3>
                  <span className="text-xs text-[#71717a] font-mono">{m.totalDays} Gün</span>
                </div>

                {/* Day Grid Header */}
                <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-bold text-[#71717a]">
                  {dayNames.map((d, i) => (
                    <span key={d} className={i >= 5 ? 'text-emerald-400' : ''}>{d}</span>
                  ))}
                </div>

                {/* Continuous Month Grid */}
                <div className="grid grid-cols-7 gap-1.5 sm:gap-2">
                  {/* Padding */}
                  {Array.from({ length: m.firstDay }).map((_, pi) => (
                    <div key={`p-${pi}`} className="h-16 rounded-xl bg-transparent" />
                  ))}

                  {/* Days */}
                  {Array.from({ length: m.totalDays }).map((_, di) => {
                    const dayNum = di + 1;
                    const dateStr = `${m.year}-${String(m.month + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
                    const dayEvents = getEventsForDate(dateStr);
                    const dayTasks = getTasksForDate(dateStr);
                    const dayTrans = getTransactionsForDate(dateStr);
                    const isSelected = selectedDayDate === dateStr;
                    const isCurrentToday = dateStr === new Date().toISOString().split('T')[0];

                    return (
                      <div
                        key={dateStr}
                        onClick={() => handleCellClick(dateStr)}
                        className={`min-h-[58px] sm:min-h-[70px] p-2 rounded-2xl border transition-all cursor-pointer flex flex-col justify-between ${
                          isSelected
                            ? 'bg-[#1e301e] border-emerald-500 shadow-md ring-2 ring-emerald-500/40'
                            : 'bg-[#1a1a1a] hover:bg-[#222] border-[#282828]'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span
                            className={`text-xs font-mono font-bold w-5 h-5 rounded-full flex items-center justify-center ${
                              isCurrentToday ? 'bg-emerald-500 text-black font-extrabold' : 'text-white'
                            }`}
                          >
                            {dayNum}
                          </span>

                          <div className="flex items-center gap-1">
                            {dayEvents.length > 0 && <span className="w-2 h-2 rounded-full bg-emerald-400" />}
                            {dayTasks.length > 0 && <span className="w-2 h-2 rounded-full bg-amber-400" />}
                            {dayTrans.length > 0 && <span className="w-2 h-2 rounded-full bg-sky-400" />}
                          </div>
                        </div>

                        {dayEvents.length > 0 && (
                          <div className="text-[10px] text-emerald-300 truncate font-medium">
                            {dayEvents[0].title}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        )}

        {/* View Mode 3: Week View */}
        {viewMode === 'week' && (
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
              {Array.from({ length: 7 }).map((_, i) => {
                const base = new Date(currentDate);
                const dayOfWeek = (base.getDay() + 6) % 7;
                const monday = new Date(base);
                monday.setDate(base.getDate() - dayOfWeek + i);
                const dateStr = monday.toISOString().split('T')[0];

                const dayEvents = getEventsForDate(dateStr);
                const dayTasks = getTasksForDate(dateStr);
                const dayTrans = getTransactionsForDate(dateStr);
                const isSelected = selectedDayDate === dateStr;

                return (
                  <div
                    key={dateStr}
                    onClick={() => handleCellClick(dateStr)}
                    className={`p-3.5 rounded-2xl border transition-all cursor-pointer space-y-3 ${
                      isSelected
                        ? 'bg-[#1a2e1a] border-emerald-500 ring-2 ring-emerald-500/40'
                        : 'bg-[#181818] hover:bg-[#202020] border-[#282828]'
                    }`}
                  >
                    <div className="border-b border-[#282828] pb-2">
                      <span className="text-xs font-bold text-[#888] block">{dayNames[i]}</span>
                      <span className="text-sm font-extrabold text-white font-mono">{formatTurkishDate(dateStr)}</span>
                    </div>

                    <div className="space-y-2">
                      {dayEvents.map(ev => (
                        <div
                          key={ev.id}
                          onClick={(e) => handleEventClick(ev, e)}
                          className={`p-2 rounded-xl text-xs border truncate ${getEventBadgeStyle(ev)}`}
                        >
                          <p className="font-bold truncate">{ev.title}</p>
                          <span className="text-[10px] opacity-80">{ev.time || '10:00'}</span>
                        </div>
                      ))}
                      {dayTasks.map(t => (
                        <div key={t.id} className="p-2 rounded-xl text-xs bg-amber-950/40 border border-amber-800/40 text-amber-300">
                          <p className="font-bold truncate">Görev: {t.title}</p>
                        </div>
                      ))}
                      {dayEvents.length === 0 && dayTasks.length === 0 && (
                        <p className="text-[11px] text-[#666] italic">Kayıt yok</p>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>

      {/* Interactive Right-Side Day Details Panel */}
      {isDayPanelOpen && (
        <div className="w-80 sm:w-96 bg-[#161616] border-l border-[#242424] flex flex-col h-full shrink-0 shadow-2xl z-20 animate-fade-in">
          {/* Day Panel Header */}
          <div className="p-4 sm:p-5 border-b border-[#242424] bg-[#181818] space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-400 bg-[#2d5a27]/30 px-2 py-0.5 rounded-full border border-[#2d5a27]/50">
                {isToday ? '🌟 Bugün' : 'Seçili Gün'}
              </span>
              <button
                onClick={() => setIsDayPanelOpen(false)}
                className="p-1 rounded-lg text-[#71717a] hover:text-white hover:bg-[#252525] transition-colors md:hidden"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-white tracking-tight">
                {formatTurkishDate(selectedDayDate)}
              </h3>
              <p className="text-xs text-[#71717a] font-mono">{selectedDayDate}</p>
            </div>

            {/* Quick Action Button for this day */}
            <div className="pt-2 flex items-center gap-2">
              <button
                onClick={handleQuickAddEventOnSelectedDay}
                className="flex-1 min-h-[38px] px-3 py-1.5 bg-[#2d5a27] hover:bg-[#387030] text-white text-xs font-bold rounded-xl flex items-center justify-center gap-1.5 shadow-sm transition-all cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Etkinlik Ekle</span>
              </button>

              <button
                onClick={() => {
                  addTask({
                    title: 'Yeni Günlük Görev',
                    dueDate: selectedDayDate,
                    completed: false,
                    priority: 'orta',
                  });
                  addToast({ type: 'success', title: 'Görev Eklendi', message: `${selectedDayDate} tarihine görev kaydedildi.` });
                }}
                className="min-h-[38px] px-3 py-1.5 bg-[#222] hover:bg-[#2a2a2a] text-[#d1d5db] hover:text-white border border-[#333] text-xs font-semibold rounded-xl flex items-center justify-center gap-1 transition-colors cursor-pointer"
                title="Güne Görev Ekle"
              >
                <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                <span>+ Görev</span>
              </button>
            </div>
          </div>

          {/* Day Activities List Content */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4 divide-y divide-[#222]">
            {/* Scheduled Calendar Events */}
            <div className="space-y-2">
              <h4 className="text-xs font-bold text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CalendarDays className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Yayınlar & Etkinlikler</span>
                </span>
                <span className="text-[10px] text-[#71717a] font-mono">({selectedDayEvents.length})</span>
              </h4>

              {selectedDayEvents.length === 0 ? (
                <p className="text-xs text-[#666] italic py-1">Bu güne planlanmış etkinlik yok.</p>
              ) : (
                selectedDayEvents.map(ev => (
                  <div
                    key={ev.id}
                    onClick={() => {
                      setEditingEvent(ev);
                      setIsEventModalOpen(true);
                    }}
                    className="p-3 rounded-2xl bg-[#1d1d1d] hover:bg-[#242424] border border-[#2e2e2e] transition-all cursor-pointer space-y-1.5 group"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <h5 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors">
                        {ev.title}
                      </h5>
                      <span className={`text-[10px] px-2 py-0.5 rounded-full border ${getEventBadgeStyle(ev)}`}>
                        {ev.platform || 'Yayın'}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-[#71717a]">
                      <Clock className="w-3 h-3 text-emerald-400" />
                      <span>{ev.time || '10:00'} ({ev.durationMinutes || 45} dk)</span>
                    </div>

                    {ev.description && (
                      <p className="text-[11px] text-[#9ca3af] line-clamp-2">{ev.description}</p>
                    )}
                  </div>
                ))
              )}
            </div>

            {/* Due Tasks for this day */}
            <div className="pt-3 space-y-2">
              <h4 className="text-xs font-bold text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <CheckSquare className="w-3.5 h-3.5 text-amber-400" />
                  <span>Teslim Edilecek Görevler</span>
                </span>
                <span className="text-[10px] text-[#71717a] font-mono">({selectedDayTasks.length})</span>
              </h4>

              {selectedDayTasks.length === 0 ? (
                <p className="text-xs text-[#666] italic py-1">Bu gün için bekleyen görev yok.</p>
              ) : (
                selectedDayTasks.map(t => (
                  <div
                    key={t.id}
                    className="p-2.5 rounded-xl bg-[#1a1a1a] border border-[#282828] flex items-center justify-between gap-2"
                  >
                    <div className="flex items-center gap-2 min-w-0">
                      <button
                        onClick={() => toggleTask(t.id)}
                        className={`w-4 h-4 rounded flex items-center justify-center border ${
                          t.completed ? 'bg-emerald-600 border-emerald-500 text-white' : 'border-[#444]'
                        }`}
                      >
                        {t.completed && <Check className="w-3 h-3" />}
                      </button>
                      <span className={`text-xs truncate ${t.completed ? 'line-through text-[#666]' : 'text-white'}`}>
                        {t.title}
                      </span>
                    </div>
                    <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#242424] text-amber-300 font-bold shrink-0">
                      {t.priority}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Financial transactions on this day */}
            <div className="pt-3 space-y-2">
              <h4 className="text-xs font-bold text-white flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <Wallet className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Finansal İşlemler</span>
                </span>
                <span className="text-[10px] text-[#71717a] font-mono">({selectedDayTransactions.length})</span>
              </h4>

              {selectedDayTransactions.length === 0 ? (
                <p className="text-xs text-[#666] italic py-1">Bu tarihte finans kaydı yok.</p>
              ) : (
                selectedDayTransactions.map(tr => (
                  <div
                    key={tr.id}
                    onClick={() => {
                      setEditingTransaction(tr);
                      setIsFinanceModalOpen(true);
                    }}
                    className="p-2.5 rounded-xl bg-[#1a1a1a] hover:bg-[#222] border border-[#282828] cursor-pointer flex items-center justify-between gap-2"
                  >
                    <div className="truncate">
                      <span className="text-xs font-bold text-white block truncate">{tr.title}</span>
                      <span className="text-[10px] text-[#71717a]">{tr.category}</span>
                    </div>
                    <span className={`text-xs font-bold font-mono ${tr.type === 'gelir' ? 'text-emerald-400' : 'text-rose-400'}`}>
                      {tr.type === 'gelir' ? '+' : '-'}{formatCurrencyTRY(tr.amount)}
                    </span>
                  </div>
                ))
              )}
            </div>

            {/* Notes linked or updated on this day */}
            {selectedDayNotes.length > 0 && (
              <div className="pt-3 space-y-2">
                <h4 className="text-xs font-bold text-white flex items-center justify-between">
                  <span className="flex items-center gap-1.5">
                    <FileText className="w-3.5 h-3.5 text-purple-400" />
                    <span>Günün Notları</span>
                  </span>
                  <span className="text-[10px] text-[#71717a] font-mono">({selectedDayNotes.length})</span>
                </h4>

                {selectedDayNotes.map(n => (
                  <div
                    key={n.id}
                    onClick={() => {
                      setActiveNoteId(n.id);
                      setActiveTab('notes');
                    }}
                    className="p-2.5 rounded-xl bg-[#1a1a1a] hover:bg-[#222] border border-[#282828] cursor-pointer flex items-center justify-between"
                  >
                    <span className="text-xs text-white truncate">{n.title}</span>
                    <span className="text-[10px] text-emerald-400 font-bold">Aç →</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Event Add/Edit Modal */}
      <EventModal
        isOpen={isEventModalOpen}
        onClose={() => setIsEventModalOpen(false)}
        editEvent={editingEvent}
        initialDate={selectedDateForNewEvent || selectedDayDate}
      />

      {/* Export & Sync Modal */}
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
