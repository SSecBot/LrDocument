'use client';

import React, { useState } from 'react';
import { useAppStore, isTransactionOverdue, getEffectiveTransactionPriority } from '@/store/useAppStore';
import { FinanceTransaction, FinanceTransactionType, TaskPriority, CurrencyCode } from '@/types';
import { TransactionModal } from './TransactionModal';
import { CategoryManagerModal } from './CategoryManagerModal';
import {
  Wallet,
  TrendingUp,
  TrendingDown,
  Plus,
  Search,
  Download,
  Calendar,
  Trash2,
  ArrowUpRight,
  ArrowDownRight,
  Repeat,
  Settings,
  AlertTriangle,
  Check,
  ArrowUpDown,
  RefreshCw,
  Coins,
  Sparkles,
} from 'lucide-react';
import { formatTurkishDate, formatCurrencyTRY, toLocalDateString } from '@/lib/utils';
import { formatCurrencyWithCode } from '@/lib/exchangeRates';
import { getTransactionsForMonth, calculateMRRSummary } from '@/lib/recurringFinance';

export const FinanceWorkspace: React.FC = () => {
  const {
    transactions,
    deleteTransaction,
    toggleTransactionConfirmation,
    exchangeRates,
    fetchExchangeRates,
    addToast,
  } = useAppStore();

  const [typeFilter, setTypeFilter] = useState<FinanceTransactionType | 'all'>('all');
  const [statusFilter, setStatusFilter] = useState<'all' | 'recurring' | 'unconfirmed' | 'confirmed'>('all');
  const [priorityFilter, setPriorityFilter] = useState<TaskPriority | 'all'>('all');
  const [currencyFilter, setCurrencyFilter] = useState<CurrencyCode | 'all'>('all');
  const [sortBy, setSortBy] = useState<'priority' | 'date' | 'amount'>('priority');
  const [periodFilter, setPeriodFilter] = useState<'all' | 'this_month' | 'last_month'>('this_month');
  const [searchQuery, setSearchQuery] = useState('');
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [editingTransaction, setEditingTransaction] = useState<FinanceTransaction | null>(null);
  const [isRefreshingRates, setIsRefreshingRates] = useState(false);

  // Dynamic reference months
  const now = new Date();
  const lastMonthDate = new Date(now.getFullYear(), now.getMonth() - 1, 1);
  const targetYear = periodFilter === 'last_month' ? lastMonthDate.getFullYear() : now.getFullYear();
  const targetMonth = periodFilter === 'last_month' ? lastMonthDate.getMonth() : now.getMonth();

  // Get base transactions (projected onto pinned days for target month)
  const baseTransactions = periodFilter === 'all'
    ? transactions
    : getTransactionsForMonth(transactions, targetYear, targetMonth).projectedTransactions;

  const filteredTransactions = baseTransactions.filter((t) => {
    // Type filter
    if (typeFilter !== 'all' && t.type !== typeFilter) return false;

    // Status filter
    if (statusFilter === 'recurring' && !t.isRecurring) return false;
    if (statusFilter === 'unconfirmed' && t.isConfirmed) return false;
    if (statusFilter === 'confirmed' && !t.isConfirmed) return false;

    // Priority filter (checks dynamically elevated priority)
    const effectivePriority = getEffectiveTransactionPriority(t);
    if (priorityFilter !== 'all' && effectivePriority !== priorityFilter) return false;

    // Currency filter
    const trCurrency = t.currency || 'TRY';
    if (currencyFilter !== 'all' && trCurrency !== currencyFilter) return false;

    // Search query
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchCat = t.category.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchCat && !matchDesc) return false;
    }

    return true;
  });

  // Sort transactions based on sortBy state
  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    if (sortBy === 'priority') {
      const priorityOrder: Record<TaskPriority, number> = { yuksek: 3, orta: 2, dusuk: 1 };
      const priorityDiff = priorityOrder[getEffectiveTransactionPriority(b)] - priorityOrder[getEffectiveTransactionPriority(a)];
      if (priorityDiff !== 0) return priorityDiff;
      return new Date(b.date).getTime() - new Date(a.date).getTime();
    }
    if (sortBy === 'amount') {
      return b.amount - a.amount;
    }
    // Default: date
    return new Date(b.date).getTime() - new Date(a.date).getTime();
  });

  // Calculate stats for current filter (All normalized in TRY base)
  const totalIncome = filteredTransactions
    .filter(t => t.type === 'gelir')
    .reduce((sum, t) => sum + t.amount, 0);

  const totalExpense = filteredTransactions
    .filter(t => t.type === 'gider')
    .reduce((sum, t) => sum + t.amount, 0);

  const netBalance = totalIncome - totalExpense;
  const savingsRate = totalIncome > 0 ? Math.round(((totalIncome - totalExpense) / totalIncome) * 100) : 0;

  // Calculate MRR with day-of-month pinning & live exchange rate conversions
  const mrrSummary = calculateMRRSummary(transactions, exchangeRates);
  const recurringIncomeMonthly = mrrSummary.monthlyRecurringIncomeTRY;
  const recurringExpenseMonthly = mrrSummary.monthlyRecurringExpenseTRY;

  const overdueCount = transactions.filter(t => isTransactionOverdue(t)).length;

  const handleRefreshRates = async () => {
    setIsRefreshingRates(true);
    await fetchExchangeRates();
    setIsRefreshingRates(false);
    addToast({
      type: 'success',
      title: 'Kurlar Güncellendi',
      message: 'Canlı döviz kurları başarıyla güncellendi.',
    });
  };

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      addToast({ type: 'warning', title: 'Dışa Aktarılacak Veri Yok', message: 'Filtreye uygun kayıt bulunamadı.' });
      return;
    }

    const headers = ['ID', 'Baslik', 'Tur', 'Kategori', 'Para_Birimi', 'Orijinal_Tutar', 'Uygulanan_Kur', 'Toplam_TL_Tutar', 'Tarih', 'Oncelik', 'Tekrarlayan', 'Onay_Durumu', 'Aciklama'];
    const rows = filteredTransactions.map(t => [
      t.id,
      `"${t.title.replace(/"/g, '""')}"`,
      t.type,
      `"${t.category}"`,
      t.currency || 'TRY',
      t.originalAmount !== undefined ? t.originalAmount : t.amount,
      t.effectiveRate !== undefined ? t.effectiveRate : 1,
      t.amount,
      t.date,
      getEffectiveTransactionPriority(t),
      t.isRecurring ? `Evet (${t.recurringFrequency || 'aylik'})` : 'Hayir',
      t.isConfirmed ? 'Onaylandi' : 'Beklemede',
      `"${(t.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lrdocument_finans_${periodFilter}_${toLocalDateString()}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast({ type: 'success', title: 'CSV İndirildi', message: 'Finansal rapor döviz ve düzenli gelir detaylarıyla dışa aktarıldı.' });
  };

  const getPriorityBadge = (tr: FinanceTransaction) => {
    const isOverdue = isTransactionOverdue(tr);
    const effectivePriority = getEffectiveTransactionPriority(tr);
    const wasElevated = isOverdue && tr.priority !== 'yuksek';

    if (effectivePriority === 'yuksek') {
      return (
        <span
          className={`text-[10px] font-bold px-2 py-0.5 rounded-full border flex items-center gap-1 shrink-0 ${
            isOverdue
              ? 'bg-rose-950/90 text-rose-300 border-rose-600'
              : 'bg-rose-950/70 text-rose-300 border-rose-800/70'
          }`}
          title={wasElevated ? 'Vadesi geçtiği için öncelik otomatik olarak Yüksek yapıldı' : 'Yüksek Öncelikli İşlem'}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span>{wasElevated ? 'Yüksek (Gecikti)' : 'Yüksek Öncelik'}</span>
        </span>
      );
    }

    if (effectivePriority === 'orta') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/50 flex items-center gap-1 shrink-0">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>Orta</span>
        </span>
      );
    }

    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-300 border border-emerald-800/40 flex items-center gap-1 shrink-0">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span>Düşük</span>
      </span>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-app p-4 sm:p-5 md:p-5 space-y-5 sm:space-y-5 select-none">
      <div className="max-w-7xl mx-auto space-y-5 sm:space-y-5">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-lg bg-brand border border-brand-hover flex items-center justify-center shrink-0">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-lg sm:text-xl font-bold text-white tracking-tight flex items-center gap-2">
                Gelir ve Gider Yönetimi
              </h1>
              <p className="text-[11px] sm:text-xs text-muted hidden sm:block">
                Çoklu para birimi (TRY, USD, EUR), düzenli gelir/gider otomasyonu ve canlı kur marjı (+{exchangeRates.markupTRY.toFixed(2)} TL)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="min-h-[44px] flex items-center gap-1.5 px-3 sm:px-3.5 py-2 bg-surface-2 hover:bg-surface-3 active:bg-surface-4 border border-line-strong text-body hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Settings className="w-3.5 h-3.5 text-emerald-400" />
              <span className="hidden sm:inline">Kategoriler</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="min-h-[44px] flex items-center gap-1.5 px-3 sm:px-3.5 py-2 bg-surface-2 hover:bg-surface-3 active:bg-surface-4 border border-line-strong text-body hover:text-white text-xs font-semibold rounded-lg transition-colors cursor-pointer"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV</span>
            </button>

            <button
              onClick={() => {
                setEditingTransaction(null);
                setIsModalOpen(true);
              }}
              className="min-h-[44px] flex items-center gap-1.5 px-3.5 sm:px-4 py-2 bg-brand hover:bg-brand-hover active:bg-brand-active text-white text-xs font-bold rounded-lg transition-all cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>İşlem Ekle</span>
            </button>
          </div>
        </div>

        {/* LIVE EXCHANGE RATE TICKER / BANNER */}
        <div className="p-3.5 sm:p-4 rounded-lg sm:rounded-lg bg-surface border border-brand-line flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-brand-soft border border-emerald-700/60 flex items-center justify-center text-emerald-400 shrink-0">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-bold text-white tracking-tight">
                  Döviz Kurları & +{exchangeRates.markupTRY.toFixed(2)} TL Marj
                </h3>
                <span className="text-[10px] px-1.5 py-0.2 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/80 font-mono">
                  {exchangeRates.isLive ? 'Canlı API' : 'Yedek Kur'}
                </span>
              </div>
              <p className="text-[11px] text-subtle hidden sm:block">
                Yabancı para birimli (USD, EUR) işlemler TL kasasına dönüştürülürken kur marjı uygulanır.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3 flex-wrap">
            {/* USD Card */}
            <div className="px-3 py-1.5 rounded-lg bg-app/90 border border-brand-line text-xs flex items-center gap-1.5">
              <span className="font-bold text-sky-400 font-mono">$ USD</span>
              <span className="text-subtle font-mono">{exchangeRates.USD.toFixed(2)} ₺</span>
              <span className="text-[10px] text-emerald-400 font-bold font-mono">
                → {(exchangeRates.USD + exchangeRates.markupTRY).toFixed(2)} ₺
              </span>
            </div>

            {/* EUR Card */}
            <div className="px-3 py-1.5 rounded-lg bg-app/90 border border-brand-line text-xs flex items-center gap-1.5">
              <span className="font-bold text-purple-400 font-mono">€ EUR</span>
              <span className="text-subtle font-mono">{exchangeRates.EUR.toFixed(2)} ₺</span>
              <span className="text-[10px] text-emerald-400 font-bold font-mono">
                → {(exchangeRates.EUR + exchangeRates.markupTRY).toFixed(2)} ₺
              </span>
            </div>

            {/* Refresh Rates Button */}
            <button
              onClick={handleRefreshRates}
              disabled={isRefreshingRates}
              className="min-h-[44px] px-3 py-2 rounded-lg bg-surface-2 hover:bg-surface-3 text-subtle hover:text-white border border-line-strong transition-all flex items-center gap-1.5 text-xs cursor-pointer"
              title="Döviz kurlarını güncelle"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshingRates ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Yenile</span>
            </button>
          </div>
        </div>

        {/* OVERDUE & UNCONFIRMED ALERTS */}
        {overdueCount > 0 && (
          <div className="p-3.5 sm:p-4 rounded-lg bg-rose-950/40 border border-rose-800/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-rose-200">
                  {overdueCount} Adet Vadesi Geçmiş / Onay Bekleyen Finansal İşlem Var!
                </h4>
                <p className="text-[11px] text-rose-300/80">
                  Geciken kayıtlar otomatik olarak <strong>Yüksek Öncelik</strong> seviyesine yükseltilmiştir.
                </p>
              </div>
            </div>

            <button
              onClick={() => setStatusFilter('unconfirmed')}
              className="min-h-[44px] px-3.5 py-2 bg-rose-900/80 hover:bg-rose-800 text-white text-xs font-bold rounded-lg shrink-0 transition-colors self-start sm:self-auto cursor-pointer"
            >
              Gecikenleri Göster ({overdueCount})
            </button>
          </div>
        )}

        {/* Summary Financial KPI Cards (Stacked on Mobile, 4-col on Desktop) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3.5 sm:gap-4">
          {/* Total Income */}
          <div className="p-4 sm:p-5 rounded-lg sm:rounded-lg bg-surface border border-line space-y-1.5">
            <div className="flex items-center justify-between text-xs text-subtle">
              <span className="font-semibold">Filtrelenen Toplam Gelir</span>
              <div className="w-7 h-7 rounded-lg bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-white font-mono">
              {formatCurrencyTRY(totalIncome)}
            </div>
            <div className="text-[11px] text-muted">
              Sponsorluk, YouTube ve danışmanlık
            </div>
          </div>

          {/* Total Expense */}
          <div className="p-4 sm:p-5 rounded-lg sm:rounded-lg bg-surface border border-line space-y-1.5">
            <div className="flex items-center justify-between text-xs text-subtle">
              <span className="font-semibold">Filtrelenen Toplam Gider</span>
              <div className="w-7 h-7 rounded-lg bg-rose-950/60 border border-rose-800/50 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-rose-300 font-mono">
              {formatCurrencyTRY(totalExpense)}
            </div>
            <div className="text-[11px] text-muted">
              Sunucu, yazılım ve ekipman harcamaları
            </div>
          </div>

          {/* Net Profit / Balance */}
          <div className="p-4 sm:p-5 rounded-lg sm:rounded-lg bg-surface border border-line space-y-1.5">
            <div className="flex items-center justify-between text-xs text-subtle">
              <span className="font-semibold">Net Bakiye & Kar</span>
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center border ${
                netBalance >= 0 ? 'bg-emerald-950/60 border-emerald-800/50' : 'bg-rose-950/60 border-rose-800/50'
              }`}>
                <Wallet className={`w-4 h-4 ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
              </div>
            </div>
            <div className={`text-xl sm:text-2xl font-bold font-mono ${
              netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {formatCurrencyTRY(netBalance)}
            </div>
            <div className="text-[11px] text-muted">
              Tasarruf Oranı: %{savingsRate}
            </div>
          </div>

          {/* Recurring Income (MRR) Summary Card */}
          <div className="p-4 sm:p-5 rounded-lg sm:rounded-lg bg-surface border border-brand/60 space-y-1.5">
            <div className="flex items-center justify-between text-xs text-emerald-300">
              <span className="font-semibold flex items-center gap-1.5">
                <Repeat className="w-3.5 h-3.5 text-emerald-400" />
                <span>Aylık Düzenli Gelir (MRR)</span>
              </span>
              <div className="w-7 h-7 rounded-lg bg-emerald-900/60 border border-emerald-700/50 flex items-center justify-center">
                <Sparkles className="w-4 h-4 text-emerald-300" />
              </div>
            </div>
            <div className="text-xl sm:text-2xl font-bold text-emerald-400 font-mono">
              {formatCurrencyTRY(recurringIncomeMonthly)}
            </div>
            <div className="text-[11px] text-subtle flex items-center justify-between">
              <span>Düzenli Gider: {formatCurrencyTRY(recurringExpenseMonthly)}</span>
              <span className="text-emerald-300 font-bold">
                Net: {formatCurrencyTRY(recurringIncomeMonthly - recurringExpenseMonthly)}
              </span>
            </div>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="bg-surface border border-line rounded-lg sm:rounded-lg p-3 sm:p-4 space-y-3">
          {/* Top Row Filters */}
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
              {/* Type filter buttons */}
              <div className="flex bg-surface-2 p-1 rounded-lg border border-line-strong overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'Tümü' },
                  { id: 'gelir', label: '🟢 Gelir' },
                  { id: 'gider', label: '🔴 Gider' },
                ].map((t) => (
                  <button
                    key={t.id}
                    onClick={() => setTypeFilter(t.id as FinanceTransactionType | 'all')}
                    className={`min-h-[38px] px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      typeFilter === t.id ? 'bg-surface-4 text-fg font-medium' : 'text-subtle hover:text-white'
                    }`}
                  >
                    {t.label}
                  </button>
                ))}
              </div>

              {/* Status / Recurring Filter Buttons */}
              <div className="flex bg-surface-2 p-1 rounded-lg border border-line-strong overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'Tüm Durumlar' },
                  { id: 'recurring', label: '🔄 Düzenli / Tekrarlayan' },
                  { id: 'unconfirmed', label: '⏳ Onay Bekleyen' },
                  { id: 'confirmed', label: '✓ Onaylanan' },
                ].map((s) => (
                  <button
                    key={s.id}
                    onClick={() => setStatusFilter(s.id as typeof statusFilter)}
                    className={`min-h-[38px] px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      statusFilter === s.id ? 'bg-surface-4 text-fg font-medium' : 'text-subtle hover:text-white'
                    }`}
                  >
                    {s.label}
                  </button>
                ))}
              </div>

              {/* Currency Filter Buttons */}
              <div className="flex bg-surface-2 p-1 rounded-lg border border-line-strong overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'Tüm Kurlar' },
                  { id: 'TRY', label: '₺ TRY' },
                  { id: 'USD', label: '$ USD' },
                  { id: 'EUR', label: '€ EUR' },
                ].map((c) => (
                  <button
                    key={c.id}
                    onClick={() => setCurrencyFilter(c.id as CurrencyCode | 'all')}
                    className={`min-h-[38px] px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      currencyFilter === c.id ? 'bg-surface-4 text-fg font-medium' : 'text-subtle hover:text-white'
                    }`}
                  >
                    {c.label}
                  </button>
                ))}
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap w-full lg:w-auto">
              {/* Priority Filter */}
              <div className="flex bg-surface-2 p-1 rounded-lg border border-line-strong overflow-x-auto no-scrollbar">
                {[
                  { id: 'all', label: 'Tüm Öncelikler' },
                  { id: 'yuksek', label: '🔴 Yüksek' },
                  { id: 'orta', label: '🟡 Orta' },
                  { id: 'dusuk', label: '🟢 Düşük' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPriorityFilter(p.id as TaskPriority | 'all')}
                    className={`min-h-[38px] px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      priorityFilter === p.id ? 'bg-surface-4 text-fg font-medium' : 'text-subtle hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>

              {/* Period select */}
              <div className="flex bg-surface-2 p-1 rounded-lg border border-line-strong overflow-x-auto no-scrollbar">
                {[
                  { id: 'this_month', label: 'Bu Ay' },
                  { id: 'last_month', label: 'Geçen Ay' },
                  { id: 'all', label: 'Tüm Zamanlar' },
                ].map((p) => (
                  <button
                    key={p.id}
                    onClick={() => setPeriodFilter(p.id as 'this_month' | 'last_month' | 'all')}
                    className={`min-h-[38px] px-3 py-1 text-xs font-semibold rounded-lg transition-colors whitespace-nowrap cursor-pointer ${
                      periodFilter === p.id ? 'bg-surface-4 text-fg font-medium' : 'text-subtle hover:text-white'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Bottom Row Search & Sort */}
          <div className="flex items-center justify-between gap-3 flex-wrap pt-1 border-t border-line">
            {/* Sort Select */}
            <div className="flex items-center gap-1.5 bg-surface-2 px-3 py-2 rounded-lg border border-line-strong min-h-[44px] flex-1 sm:flex-initial">
              <ArrowUpDown className="w-4 h-4 text-emerald-400 shrink-0" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'priority' | 'date' | 'amount')}
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer pr-1 w-full"
              >
                <option value="priority" className="bg-surface-2">Önceliğe Göre (Yüksek → Düşük)</option>
                <option value="date" className="bg-surface-2">Tarihe Göre (Yeniden Eskiye)</option>
                <option value="amount" className="bg-surface-2">Tutara Göre (Yüksekten Düşüğe)</option>
              </select>
            </div>

            {/* Search Box */}
            <div className="relative flex-1 sm:flex-initial min-w-[220px]">
              <Search className="w-4 h-4 text-muted absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="İşlemlerde ara..."
                className="bg-surface-2 border border-line focus:border-brand rounded-lg pl-9 pr-3 py-2.5 text-xs text-white placeholder-muted focus:outline-none w-full min-h-[44px]"
              />
            </div>
          </div>
        </div>

        {/* Transactions Section: Responsive Stacked Cards on Mobile & Clean Table on Desktop */}
        <div className="bg-surface border border-line rounded-lg sm:rounded-lg overflow-hidden">
          <div className="p-3.5 sm:p-4 border-b border-line flex items-center justify-between">
            <h3 className="text-xs sm:text-sm font-bold text-white tracking-tight">
              İşlem Geçmişi & Planlanan Ödemeler ({sortedTransactions.length})
            </h3>
            <span className="text-[11px] text-muted hidden sm:inline">
              Düzenlemek için kaydın üzerine tıklayın
            </span>
          </div>

          {sortedTransactions.length === 0 ? (
            <div className="p-12 sm:p-16 text-center text-muted text-xs space-y-3">
              <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-lg bg-surface-2 border border-line flex items-center justify-center text-emerald-400 mx-auto">
                <Wallet className="w-6 h-6 sm:w-7 sm:h-7" />
              </div>
              <p className="text-sm sm:text-base font-bold text-white tracking-tight">
                {transactions.length === 0 ? 'Henüz Kayıtlı Bir Finans İşlemi Bulunmuyor' : 'Filtreye Uygun İşlem Bulunamadı'}
              </p>
              <p className="text-xs text-subtle max-w-md mx-auto leading-relaxed">
                {transactions.length === 0
                  ? 'YouTube AdSense gelirleri, sponsorluk ödemeleri veya ekipman giderlerinizi çoklu para birimiyle kaydedin.'
                  : 'Filtreleri sıfırlayarak tüm gelir ve gider geçmişinizi görüntüleyebilirsiniz.'}
              </p>
              {transactions.length === 0 && (
                <button
                  onClick={() => {
                    setEditingTransaction(null);
                    setIsModalOpen(true);
                  }}
                  className="mt-2 px-5 py-2.5 bg-brand hover:bg-brand-hover text-white text-xs font-semibold rounded-lg inline-flex items-center gap-2 transition-all min-h-[44px] cursor-pointer"
                >
                  <Plus className="w-4 h-4" />
                  <span>İlk Finans Kaydını Ekle</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-line">
              {sortedTransactions.map((tr) => {
                const isOverdue = isTransactionOverdue(tr);
                const trCurrency = tr.currency || 'TRY';
                const isForeignCurrency = trCurrency !== 'TRY';

                return (
                  <div
                    key={tr.id}
                    onClick={() => {
                      setEditingTransaction(tr);
                      setIsModalOpen(true);
                    }}
                    className={`p-3.5 sm:p-4 hover:bg-surface-2 active:bg-surface-2 cursor-pointer transition-all flex flex-col md:flex-row md:items-center justify-between gap-3 group ${
                      isOverdue ? 'bg-[#221316]/40 border-l-4 border-rose-500' : ''
                    }`}
                  >
                    {/* Top / Left: Type Icon & Details */}
                    <div className="flex items-start gap-3 min-w-0 flex-1">
                      <div className={`p-2.5 rounded-xl border shrink-0 mt-0.5 ${
                        tr.type === 'gelir'
                          ? 'bg-emerald-950/50 border-emerald-800/40 text-emerald-400'
                          : 'bg-rose-950/50 border-rose-800/40 text-rose-400'
                      }`}>
                        {tr.type === 'gelir' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0 space-y-1.5 flex-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                            {tr.title}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-surface-2 text-subtle border border-line-strong">
                            {tr.category}
                          </span>

                          {isForeignCurrency && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-950/70 text-sky-300 border border-sky-800/60 font-mono">
                              {trCurrency}
                            </span>
                          )}

                          {getPriorityBadge(tr)}

                          {tr.isRecurring && (
                            <span className="text-[10px] px-2.5 py-0.5 rounded-full bg-emerald-950/80 text-emerald-300 border border-emerald-800/60 flex items-center gap-1 font-semibold">
                              <Repeat className="w-3 h-3 text-emerald-400" />
                              <span>{tr.recurringFrequency === 'gunluk' ? 'Günlük Düzenli' : tr.recurringFrequency === 'haftalik' ? 'Haftalık Düzenli' : 'Aylık Düzenli'}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-2.5 sm:gap-3 text-[11px] text-muted flex-wrap">
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3" />
                            <span>{formatTurkishDate(tr.date)}</span>
                          </span>

                          {isForeignCurrency && tr.originalAmount !== undefined && (
                            <span className="text-[11px] font-mono text-amber-400/90 font-medium">
                              Orijinal: {formatCurrencyWithCode(tr.originalAmount, trCurrency)}
                            </span>
                          )}

                          {tr.description && (
                            <span className="truncate max-w-xs text-subtle">
                              {tr.description}
                            </span>
                          )}

                        </div>
                      </div>
                    </div>

                    {/* Bottom on mobile / Right on desktop: Amount & Action Controls */}
                    <div className="flex items-center justify-between md:justify-end gap-3 pt-2 md:pt-0 border-t border-line md:border-t-0 shrink-0">
                      {/* Amount Display */}
                      <div className="text-left md:text-right">
                        <div className={`text-base sm:text-sm font-bold font-mono ${
                          tr.type === 'gelir' ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {tr.type === 'gelir' ? '+' : '-'}{formatCurrencyTRY(tr.amount)}
                        </div>
                        {isForeignCurrency && tr.originalAmount !== undefined && (
                          <div className="text-[10px] text-subtle font-mono">
                            {tr.type === 'gelir' ? '+' : '-'}{formatCurrencyWithCode(tr.originalAmount, trCurrency)}
                          </div>
                        )}
                      </div>

                      {/* Action buttons */}
                      <div className="flex items-center gap-2">
                        {/* Confirmation Toggle Button */}
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleTransactionConfirmation(tr.id);
                          }}
                          className={`min-h-[44px] px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all cursor-pointer ${
                            tr.isConfirmed
                              ? 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/50'
                              : isOverdue
                              ? 'bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border-rose-600/80'
                              : 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border-amber-800/50'
                          }`}
                          title="Onay Durumunu Değiştir"
                        >
                          <Check className="w-3.5 h-3.5" />
                          <span>
                            {tr.isConfirmed
                              ? (tr.type === 'gelir' ? 'Alındı' : 'Ödendi')
                              : isOverdue
                              ? 'Gecikti (Onayla)'
                              : 'Onay Bekliyor'}
                          </span>
                        </button>

                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTransaction(tr.id);
                          }}
                          className="min-h-[44px] min-w-[44px] p-2.5 hover:bg-rose-950/40 active:bg-rose-900/60 text-muted hover:text-rose-400 rounded-lg transition-colors flex items-center justify-center cursor-pointer"
                          title="İşlemi Sil"
                          aria-label="Sil"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* Transaction Add / Edit Modal */}
      <TransactionModal
        isOpen={isModalOpen}
        onClose={() => setIsModalOpen(false)}
        editTransaction={editingTransaction}
      />

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />
    </div>
  );
};
