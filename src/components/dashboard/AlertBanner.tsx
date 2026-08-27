'use client';

import React, { useState } from 'react';
import { useAppStore, isTaskOverdue, isTransactionOverdue } from '@/store/useAppStore';
import {
  AlertTriangle,
  Clock,
  Calendar,
  X,
  ChevronRight,
  Check,
  TrendingUp,
  TrendingDown,
} from 'lucide-react';
import { formatTurkishDate, formatCurrencyTRY } from '@/lib/utils';

export const AlertBanner: React.FC = () => {
  const {
    tasks,
    events,
    transactions,
    toggleTask,
    toggleTransactionConfirmation,
    setActiveTab,
  } = useAppStore();

  const [isDismissed, setIsDismissed] = useState(false);

  const todayStr = new Date().toISOString().split('T')[0];
  const nowTime = new Date().setHours(0, 0, 0, 0);

  // 1. Overdue uncompleted tasks
  const overdueTasks = tasks.filter((t) => isTaskOverdue(t));

  // 2. Today's pending tasks
  const todayTasks = tasks.filter((t) => {
    if (t.completed || !t.dueDate) return false;
    return t.dueDate === todayStr;
  });

  // 3. Overdue / pending release events
  const overdueEvents = events.filter((ev) => {
    if (ev.status === 'yayinlandi') return false;
    return new Date(ev.date).getTime() <= nowTime;
  });

  // 4. Overdue unconfirmed financial transactions
  const overdueTransactions = transactions.filter((t) => isTransactionOverdue(t));

  const totalAlertCount = overdueTasks.length + todayTasks.length + overdueEvents.length + overdueTransactions.length;

  if (isDismissed || totalAlertCount === 0) return null;

  return (
    <div className="bg-gradient-to-r from-[#2a171a] via-[#1f1418] to-[#1a1816] border border-rose-500/40 rounded-2xl sm:rounded-3xl p-4 sm:p-5 shadow-2xl space-y-3.5 animate-fade-in relative overflow-hidden">
      {/* Top Banner Bar */}
      <div className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-rose-500/20 border border-rose-500/40 text-rose-300 animate-pulse shrink-0">
            <AlertTriangle className="w-5 h-5" />
          </div>
          <div>
            <div className="flex items-center gap-2 flex-wrap">
              <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">Geciken & Acil Eylem Bildirimleri</h3>
              <span className="bg-rose-950 text-rose-300 text-[10px] font-extrabold px-2 py-0.5 rounded-full border border-rose-700/60 font-mono">
                {totalAlertCount} Bildirim
              </span>
            </div>
            <p className="text-[11px] sm:text-xs text-[#d1d5db] mt-0.5">
              Teslim tarihi geçen görevler veya onaylanmamış finansal ödemeler bulunmaktadır.
            </p>
          </div>
        </div>

        <button
          onClick={() => setIsDismissed(true)}
          className="min-h-[38px] min-w-[38px] p-2 rounded-xl bg-[#241a1c] hover:bg-[#342426] text-[#9ca3af] hover:text-white transition-colors flex items-center justify-center shrink-0"
          title="Bildirimi Gizle"
          aria-label="Gizle"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Alert Item Cards List */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2.5 sm:gap-3 pt-1">
        {/* Overdue Financial Items */}
        {overdueTransactions.map((tr) => (
          <div
            key={tr.id}
            className="p-3 bg-[#241216]/95 border border-rose-600/70 rounded-2xl flex items-start justify-between gap-2.5 shadow-md animate-pulse"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-300 uppercase tracking-wider mb-1">
                {tr.type === 'gelir' ? (
                  <TrendingUp className="w-3 h-3 text-emerald-400" />
                ) : (
                  <TrendingDown className="w-3 h-3 text-rose-400" />
                )}
                <span>Gecikmiş {tr.type === 'gelir' ? 'Gelir' : 'Ödeme'}</span>
              </div>
              <h4 className="text-xs font-semibold text-white truncate">{tr.title}</h4>
              <p className="text-[11px] font-mono font-bold text-rose-300 mt-0.5">
                {formatCurrencyTRY(tr.amount)}
              </p>
            </div>

            <button
              onClick={() => toggleTransactionConfirmation(tr.id)}
              className="min-h-[36px] px-3 py-1.5 bg-[#2d5a27] hover:bg-[#387030] text-white border border-[#387030] rounded-xl text-xs font-bold transition-all shrink-0 flex items-center gap-1 shadow-sm"
              title={tr.type === 'gelir' ? 'Gelir Geldi (Onayla)' : 'Gider Ödendi (Onayla)'}
            >
              <Check className="w-3.5 h-3.5" />
              <span className="text-[10px]">{tr.type === 'gelir' ? 'Tahsil Et' : 'Öde'}</span>
            </button>
          </div>
        ))}

        {/* Overdue Tasks */}
        {overdueTasks.map((t) => (
          <div
            key={t.id}
            className="p-3 bg-[#181113]/90 border border-rose-900/50 rounded-2xl flex items-start justify-between gap-2.5 shadow-sm"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-rose-400 uppercase tracking-wider mb-1">
                <Clock className="w-3 h-3" />
                <span>Gecikmiş Görev</span>
              </div>
              <h4 className="text-xs font-semibold text-white truncate">{t.title}</h4>
            </div>

            <button
              onClick={() => toggleTask(t.id)}
              className="min-h-[36px] min-w-[36px] p-2 bg-emerald-950/40 hover:bg-[#2d5a27] text-emerald-300 hover:text-white border border-emerald-800/40 rounded-xl text-xs transition-colors shrink-0 flex items-center justify-center"
              title="Görevi Tamamla"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* Today's Tasks */}
        {todayTasks.map((t) => (
          <div
            key={t.id}
            className="p-3 bg-[#1c1811]/90 border border-amber-900/50 rounded-2xl flex items-start justify-between gap-2.5 shadow-sm"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-amber-400 uppercase tracking-wider mb-1">
                <Calendar className="w-3 h-3" />
                <span>Bugünün Görevi</span>
              </div>
              <h4 className="text-xs font-semibold text-white truncate">{t.title}</h4>
            </div>

            <button
              onClick={() => toggleTask(t.id)}
              className="min-h-[36px] min-w-[36px] p-2 bg-emerald-950/40 hover:bg-[#2d5a27] text-emerald-300 hover:text-white border border-emerald-800/40 rounded-xl text-xs transition-colors shrink-0 flex items-center justify-center"
              title="Görevi Tamamla"
            >
              <Check className="w-3.5 h-3.5" />
            </button>
          </div>
        ))}

        {/* Overdue / Due Today Releases */}
        {overdueEvents.map((ev) => (
          <div
            key={ev.id}
            className="p-3 bg-[#18131d]/90 border border-purple-900/50 rounded-2xl flex items-start justify-between gap-2.5 shadow-sm"
          >
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 text-[10px] font-bold text-purple-400 uppercase tracking-wider mb-1">
                <Calendar className="w-3 h-3" />
                <span>Bekleyen Yayın ({formatTurkishDate(ev.date)})</span>
              </div>
              <h4 className="text-xs font-semibold text-white truncate">{ev.title}</h4>
            </div>

            <button
              onClick={() => setActiveTab('calendar')}
              className="min-h-[36px] p-1.5 px-2.5 bg-purple-950/40 hover:bg-purple-900/60 text-purple-300 border border-purple-800/40 rounded-xl text-xs transition-colors shrink-0 flex items-center gap-1"
            >
              <span>Takvim</span>
              <ChevronRight className="w-3 h-3" />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
};
