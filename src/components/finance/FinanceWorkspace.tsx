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
  Video,
  Repeat,
  Settings,
  AlertTriangle,
  Check,
  ArrowUpDown,
  RefreshCw,
  Coins,
} from 'lucide-react';
import { formatTurkishDate, formatCurrencyTRY } from '@/lib/utils';
import { formatCurrencyWithCode } from '@/lib/exchangeRates';

export const FinanceWorkspace: React.FC = () => {
  const {
    transactions,
    deleteTransaction,
    toggleTransactionConfirmation,
    scripts,
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

  // Period filtering calculation
  const currentMonthPrefix = `2026-08`; // Reference month
  const lastMonthPrefix = `2026-07`;

  const filteredTransactions = transactions.filter((t) => {
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

    // Period filter
    if (periodFilter === 'this_month' && !t.date.startsWith(currentMonthPrefix)) return false;
    if (periodFilter === 'last_month' && !t.date.startsWith(lastMonthPrefix)) return false;

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

  const pendingConfirmationCount = transactions.filter(t => !t.isConfirmed).length;
  const overdueCount = transactions.filter(t => isTransactionOverdue(t)).length;

  const handleRefreshRates = async () => {
    setIsRefreshingRates(true);
    await fetchExchangeRates();
    setIsRefreshingRates(false);
  };

  const handleExportCSV = () => {
    if (filteredTransactions.length === 0) {
      addToast({ type: 'warning', title: 'Dışa Aktarılacak Veri Yok', message: 'Filtreye uygun kayıt bulunamadı.' });
      return;
    }

    const headers = ['ID', 'Baslik', 'Tur', 'Kategori', 'Para_Birimi', 'Orijinal_Tutar', 'Uygulanan_Kur', 'Toplam_TL_Tutar', 'Tarih', 'Oncelik', 'Onay_Durumu', 'Aciklama'];
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
      t.isConfirmed ? 'Onaylandi' : 'Beklemede',
      `"${(t.description || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [headers.join(';'), ...rows.map(r => r.join(';'))].join('\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.setAttribute('href', url);
    link.setAttribute('download', `lrdocument_finans_${periodFilter}_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);

    addToast({ type: 'success', title: 'CSV İndirildi', message: 'Finansal rapor döviz detaylarıyla dışa aktarıldı.' });
  };

  const getPriorityBadge = (tr: FinanceTransaction) => {
    const isOverdue = isTransactionOverdue(tr);
    const effectivePriority = getEffectiveTransactionPriority(tr);
    const wasElevated = isOverdue && tr.priority !== 'yuksek';

    if (effectivePriority === 'yuksek') {
      return (
        <span
          className={`text-[10px] font-extrabold px-2 py-0.5 rounded-full border flex items-center gap-1 ${
            isOverdue
              ? 'bg-rose-950/90 text-rose-300 border-rose-600 shadow-sm animate-pulse'
              : 'bg-rose-950/70 text-rose-300 border-rose-800/70'
          }`}
          title={wasElevated ? 'Vadesi geçtiği için öncelik otomatik olarak Yüksek yapıldı' : 'Yüksek Öncelikli İşlem'}
        >
          <span className="w-1.5 h-1.5 rounded-full bg-rose-500" />
          <span>{wasElevated ? 'Yüksek (Gecikti - Yükseltildi)' : 'Yüksek Öncelik'}</span>
        </span>
      );
    }

    if (effectivePriority === 'orta') {
      return (
        <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-950/60 text-amber-300 border border-amber-800/50 flex items-center gap-1">
          <span className="w-1.5 h-1.5 rounded-full bg-amber-500" />
          <span>Orta Öncelik</span>
        </span>
      );
    }

    return (
      <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-emerald-950/50 text-emerald-300 border border-emerald-800/40 flex items-center gap-1">
        <span className="w-1.5 h-1.5 rounded-full bg-emerald-500" />
        <span>Düşük Öncelik</span>
      </span>
    );
  };

  return (
    <div className="flex-1 overflow-y-auto bg-[#121212] p-6 md:p-8 space-y-6 select-none">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top Header */}
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-[#2d5a27] to-[#142812] border border-[#387030] flex items-center justify-center shadow-lg shadow-emerald-950/40">
              <Wallet className="w-5 h-5 text-white" />
            </div>
            <div>
              <h1 className="text-xl font-extrabold text-white tracking-tight flex items-center gap-2">
                Gelir ve Gider Yönetimi
              </h1>
              <p className="text-xs text-[#71717a]">
                Çoklu para birimi (TRY, USD, EUR), canlı kur marjı (+2.50 TL) ve bütçe planlaması
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 flex-wrap">
            <button
              onClick={() => setIsCategoryModalOpen(true)}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#202020] hover:bg-[#282828] border border-[#333] text-[#d1d5db] hover:text-white text-xs font-semibold rounded-xl transition-colors"
            >
              <Settings className="w-3.5 h-3.5 text-emerald-400" />
              <span>Kategorileri Yönet</span>
            </button>

            <button
              onClick={handleExportCSV}
              className="flex items-center gap-1.5 px-3.5 py-2 bg-[#202020] hover:bg-[#282828] border border-[#333] text-[#d1d5db] hover:text-white text-xs font-semibold rounded-xl transition-colors"
            >
              <Download className="w-3.5 h-3.5 text-emerald-400" />
              <span>CSV İndir</span>
            </button>

            <button
              onClick={() => {
                setEditingTransaction(null);
                setIsModalOpen(true);
              }}
              className="flex items-center gap-1.5 px-4 py-2 bg-[#2d5a27] hover:bg-[#387030] text-white text-xs font-bold rounded-xl shadow-lg shadow-emerald-950/50 transition-all"
            >
              <Plus className="w-4 h-4" />
              <span>Yeni İşlem Ekle</span>
            </button>
          </div>
        </div>

        {/* LIVE EXCHANGE RATE TICKER / BANNER (PROMPT 6 REQUIREMENT) */}
        <div className="p-4 rounded-3xl bg-gradient-to-r from-[#161e16] via-[#1a241a] to-[#161e16] border border-[#2a4428] flex items-center justify-between gap-4 flex-wrap shadow-md">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-xl bg-[#223820] border border-emerald-700/60 flex items-center justify-center text-emerald-400 shrink-0">
              <Coins className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="text-xs font-extrabold text-white tracking-tight">
                  Canlı Döviz Kurları & Otomatik +{exchangeRates.markupTRY.toFixed(2)} TL Marj
                </h3>
                <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-emerald-950 text-emerald-300 border border-emerald-800/80 font-mono">
                  {exchangeRates.isLive ? 'Canlı API' : 'Yedek Kur'}
                </span>
              </div>
              <p className="text-[11px] text-[#9ca3af]">
                Yabancı para birimli (USD, EUR) işlemler kasaya dönüştürülürken +{exchangeRates.markupTRY.toFixed(2)} TL kur marjı uygulanır.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-3 flex-wrap">
            {/* USD Card */}
            <div className="px-3.5 py-2 rounded-2xl bg-[#141414]/90 border border-[#283828] text-xs flex items-center gap-2">
              <span className="font-bold text-sky-400 font-mono">$ USD/TRY</span>
              <span className="text-[#a1a1aa] font-mono">{exchangeRates.USD.toFixed(2)} ₺</span>
              <span className="text-[10px] text-emerald-400 font-bold font-mono">
                → {(exchangeRates.USD + exchangeRates.markupTRY).toFixed(2)} ₺
              </span>
            </div>

            {/* EUR Card */}
            <div className="px-3.5 py-2 rounded-2xl bg-[#141414]/90 border border-[#283828] text-xs flex items-center gap-2">
              <span className="font-bold text-purple-400 font-mono">€ EUR/TRY</span>
              <span className="text-[#a1a1aa] font-mono">{exchangeRates.EUR.toFixed(2)} ₺</span>
              <span className="text-[10px] text-emerald-400 font-bold font-mono">
                → {(exchangeRates.EUR + exchangeRates.markupTRY).toFixed(2)} ₺
              </span>
            </div>

            {/* Refresh Rates Button */}
            <button
              onClick={handleRefreshRates}
              disabled={isRefreshingRates}
              className="p-2 rounded-xl bg-[#202020] hover:bg-[#2a2a2a] text-[#a1a1aa] hover:text-white border border-[#333] transition-all flex items-center gap-1.5 text-xs"
              title="Döviz kurlarını internetten güncelle"
            >
              <RefreshCw className={`w-3.5 h-3.5 text-emerald-400 ${isRefreshingRates ? 'animate-spin' : ''}`} />
              <span className="hidden sm:inline">Kurları Güncelle</span>
            </button>
          </div>
        </div>

        {/* OVERDUE & UNCONFIRMED ALERTS */}
        {overdueCount > 0 && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/80 flex items-center justify-between gap-4 animate-pulse">
            <div className="flex items-center gap-3">
              <AlertTriangle className="w-5 h-5 text-rose-400 shrink-0" />
              <div>
                <h4 className="text-xs font-bold text-rose-200">
                  {overdueCount} Adet Vadesi Geçmiş / Onay Bekleyen Finansal İşlem Var!
                </h4>
                <p className="text-[11px] text-rose-300/80">
                  Planlanan ödeme veya gelir tarihi geçmiş kayıtlar otomatik olarak <strong>Yüksek Öncelik</strong> seviyesine yükseltilmiştir. İşlemleri onaylayarak güncelleyin.
                </p>
              </div>
            </div>

            <button
              onClick={() => setStatusFilter('unconfirmed')}
              className="px-3 py-1.5 bg-rose-900/80 hover:bg-rose-800 text-white text-xs font-bold rounded-xl shrink-0 transition-colors"
            >
              Gecikenleri Göster ({overdueCount})
            </button>
          </div>
        )}

        {/* Summary Financial KPI Cards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          {/* Total Income */}
          <div className="p-5 rounded-3xl bg-[#161616] border border-[#262626] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-[#9ca3af]">
              <span className="font-semibold">Filtrelenen Toplam Gelir</span>
              <div className="w-7 h-7 rounded-xl bg-emerald-950/60 border border-emerald-800/50 flex items-center justify-center">
                <TrendingUp className="w-4 h-4 text-emerald-400" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-white font-mono">
              {formatCurrencyTRY(totalIncome)}
            </div>
            <div className="text-[11px] text-[#71717a]">
              Sponsorluk, YouTube AdSense ve danışmanlık
            </div>
          </div>

          {/* Total Expense */}
          <div className="p-5 rounded-3xl bg-[#161616] border border-[#262626] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-[#9ca3af]">
              <span className="font-semibold">Filtrelenen Toplam Gider</span>
              <div className="w-7 h-7 rounded-xl bg-rose-950/60 border border-rose-800/50 flex items-center justify-center">
                <TrendingDown className="w-4 h-4 text-rose-400" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-rose-300 font-mono">
              {formatCurrencyTRY(totalExpense)}
            </div>
            <div className="text-[11px] text-[#71717a]">
              Sunucu, yazılım ve stüdyo donanım harcamaları
            </div>
          </div>

          {/* Net Profit / Balance */}
          <div className="p-5 rounded-3xl bg-[#161616] border border-[#262626] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-[#9ca3af]">
              <span className="font-semibold">Net Bakiye & Kar</span>
              <div className={`w-7 h-7 rounded-xl flex items-center justify-center border ${
                netBalance >= 0 ? 'bg-emerald-950/60 border-emerald-800/50' : 'bg-rose-950/60 border-rose-800/50'
              }`}>
                <Wallet className={`w-4 h-4 ${netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'}`} />
              </div>
            </div>
            <div className={`text-2xl font-extrabold font-mono ${
              netBalance >= 0 ? 'text-emerald-400' : 'text-rose-400'
            }`}>
              {formatCurrencyTRY(netBalance)}
            </div>
            <div className="text-[11px] text-[#71717a]">
              Tasarruf Oranı: %{savingsRate}
            </div>
          </div>

          {/* Pending Confirmations */}
          <div className="p-5 rounded-3xl bg-[#161616] border border-[#262626] shadow-sm space-y-2">
            <div className="flex items-center justify-between text-xs text-[#9ca3af]">
              <span className="font-semibold">Onay Bekleyen İşlemler</span>
              <div className="w-7 h-7 rounded-xl bg-amber-950/60 border border-amber-800/50 flex items-center justify-center">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
              </div>
            </div>
            <div className="text-2xl font-extrabold text-amber-300 font-mono">
              {pendingConfirmationCount}
            </div>
            <div className="text-[11px] text-[#71717a]">
              {overdueCount > 0 ? `⚠️ ${overdueCount} tanesi vadesi geçmiş durumda` : 'Tüm işlemler plan dahilinde'}
            </div>
          </div>
        </div>

        {/* Filters Toolbar */}
        <div className="bg-[#161616] border border-[#262626] rounded-3xl p-4 flex items-center justify-between gap-4 flex-wrap shadow-sm">
          <div className="flex items-center gap-2 flex-wrap">
            {/* Type filter buttons */}
            <div className="flex bg-[#202020] p-1 rounded-xl border border-[#333]">
              {[
                { id: 'all', label: 'Tümü' },
                { id: 'gelir', label: '🟢 Gelirler' },
                { id: 'gider', label: '🔴 Giderler' },
              ].map((t) => (
                <button
                  key={t.id}
                  onClick={() => setTypeFilter(t.id as FinanceTransactionType | 'all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    typeFilter === t.id ? 'bg-[#2d5a27] text-white' : 'text-[#9ca3af] hover:text-white'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>

            {/* Currency Filter Buttons (Prompt 6 Requirement) */}
            <div className="flex bg-[#202020] p-1 rounded-xl border border-[#333]">
              {[
                { id: 'all', label: 'Tüm Para Birimleri' },
                { id: 'TRY', label: '₺ TRY' },
                { id: 'USD', label: '$ USD' },
                { id: 'EUR', label: '€ EUR' },
              ].map((c) => (
                <button
                  key={c.id}
                  onClick={() => setCurrencyFilter(c.id as CurrencyCode | 'all')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    currencyFilter === c.id ? 'bg-[#2d5a27] text-white' : 'text-[#9ca3af] hover:text-white'
                  }`}
                >
                  {c.label}
                </button>
              ))}
            </div>

            {/* Priority Filter Buttons */}
            <div className="flex bg-[#202020] p-1 rounded-xl border border-[#333]">
              {[
                { id: 'all', label: 'Tüm Öncelikler' },
                { id: 'yuksek', label: '🔴 Yüksek' },
                { id: 'orta', label: '🟡 Orta' },
                { id: 'dusuk', label: '🟢 Düşük' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPriorityFilter(p.id as TaskPriority | 'all')}
                  className={`px-2.5 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    priorityFilter === p.id ? 'bg-[#2d5a27] text-white' : 'text-[#9ca3af] hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>

            {/* Status buttons */}
            <div className="flex bg-[#202020] p-1 rounded-xl border border-[#333]">
              {[
                { id: 'all', label: 'Tüm Durumlar' },
                { id: 'recurring', label: '🔁 Düzenli' },
                { id: 'unconfirmed', label: '⏳ Onay Bekleyen' },
                { id: 'confirmed', label: '✓ Onaylanan' },
              ].map((s) => (
                <button
                  key={s.id}
                  onClick={() => setStatusFilter(s.id as 'all' | 'recurring' | 'unconfirmed' | 'confirmed')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    statusFilter === s.id ? 'bg-[#2d5a27] text-white' : 'text-[#9ca3af] hover:text-white'
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>

            {/* Period select */}
            <div className="flex bg-[#202020] p-1 rounded-xl border border-[#333]">
              {[
                { id: 'this_month', label: 'Ağustos 2026' },
                { id: 'last_month', label: 'Temmuz 2026' },
                { id: 'all', label: 'Tüm Zamanlar' },
              ].map((p) => (
                <button
                  key={p.id}
                  onClick={() => setPeriodFilter(p.id as 'this_month' | 'last_month' | 'all')}
                  className={`px-3 py-1.5 text-xs font-semibold rounded-lg transition-colors ${
                    periodFilter === p.id ? 'bg-[#2d5a27] text-white' : 'text-[#9ca3af] hover:text-white'
                  }`}
                >
                  {p.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {/* Sort Select */}
            <div className="flex items-center gap-1.5 bg-[#202020] px-2.5 py-1 rounded-xl border border-[#333]">
              <ArrowUpDown className="w-3.5 h-3.5 text-emerald-400" />
              <select
                value={sortBy}
                onChange={(e) => setSortBy(e.target.value as 'priority' | 'date' | 'amount')}
                className="bg-transparent text-xs text-white focus:outline-none cursor-pointer pr-1"
              >
                <option value="priority" className="bg-[#202020]">Önceliğe Göre (Yüksek → Düşük)</option>
                <option value="date" className="bg-[#202020]">Tarihe Göre (Yeniden Eskiye)</option>
                <option value="amount" className="bg-[#202020]">Tutara Göre (Yüksekten Düşüğe)</option>
              </select>
            </div>

            {/* Search Box */}
            <div className="relative">
              <Search className="w-3.5 h-3.5 text-[#71717a] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Finans kayıtlarında ara..."
                className="bg-[#202020] border border-[#2e2e2e] focus:border-[#2d5a27] rounded-xl pl-8 pr-3 py-1.5 text-xs text-white placeholder-[#71717a] focus:outline-none w-48"
              />
            </div>
          </div>
        </div>

        {/* Transactions Table / List */}
        <div className="bg-[#161616] border border-[#262626] rounded-3xl overflow-hidden shadow-xl">
          <div className="p-4 border-b border-[#242424] flex items-center justify-between">
            <h3 className="text-sm font-bold text-white tracking-tight">
              İşlem Geçmişi & Planlanan Ödemeler ({sortedTransactions.length})
            </h3>
            <span className="text-xs text-[#71717a]">
              Kayıtları düzenlemek için üzerine tıklayabilirsiniz
            </span>
          </div>

          {sortedTransactions.length === 0 ? (
            <div className="p-16 text-center text-[#71717a] text-xs space-y-4">
              <div className="w-14 h-14 rounded-2xl bg-[#1f1f1f] border border-[#2e2e2e] flex items-center justify-center text-emerald-400 mx-auto shadow-inner">
                <Wallet className="w-7 h-7" />
              </div>
              <p className="text-base font-bold text-white tracking-tight">
                {transactions.length === 0 ? 'Henüz Kayıtlı Bir Finans İşlemi Bulunmuyor' : 'Filtreye Uygun İşlem Bulunamadı'}
              </p>
              <p className="text-xs text-[#9ca3af] max-w-md mx-auto leading-relaxed">
                {transactions.length === 0
                  ? 'YouTube AdSense gelirleri, sponsorluk ödemeleri veya yazılım/ekipman giderlerinizi çoklu para birimiyle (TL, USD, EUR) kaydedin.'
                  : 'Filtreleri sıfırlayarak tüm gelir ve gider geçmişinizi görüntüleyebilirsiniz.'}
              </p>
              {transactions.length === 0 && (
                <button
                  onClick={() => {
                    setEditingTransaction(null);
                    setIsModalOpen(true);
                  }}
                  className="mt-2 px-5 py-2.5 bg-[#2d5a27] hover:bg-[#387030] text-white text-xs font-semibold rounded-xl shadow-lg shadow-emerald-950/50 inline-flex items-center gap-2 transition-all"
                >
                  <Plus className="w-4 h-4" />
                  <span>İlk Gelir veya Gider Kaydını Ekle</span>
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-[#242424]">
              {sortedTransactions.map((tr) => {
                const isOverdue = isTransactionOverdue(tr);
                const linkedScript = tr.linkedScriptId ? scripts.find(s => s.id === tr.linkedScriptId) : null;
                const trCurrency = tr.currency || 'TRY';
                const isForeignCurrency = trCurrency !== 'TRY';

                return (
                  <div
                    key={tr.id}
                    onClick={() => {
                      setEditingTransaction(tr);
                      setIsModalOpen(true);
                    }}
                    className={`p-4 hover:bg-[#1f1f1f] cursor-pointer transition-all flex items-center justify-between gap-4 group ${
                      isOverdue ? 'bg-[#221316]/40 border-l-4 border-rose-500' : ''
                    }`}
                  >
                    {/* Left: Type Icon & Info */}
                    <div className="flex items-center gap-3.5 min-w-0 flex-1">
                      <div className={`p-2.5 rounded-2xl border shrink-0 ${
                        tr.type === 'gelir'
                          ? 'bg-emerald-950/50 border-emerald-800/40 text-emerald-400'
                          : 'bg-rose-950/50 border-rose-800/40 text-rose-400'
                      }`}>
                        {tr.type === 'gelir' ? <ArrowUpRight className="w-4 h-4" /> : <ArrowDownRight className="w-4 h-4" />}
                      </div>

                      <div className="min-w-0 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs font-bold text-white group-hover:text-emerald-300 transition-colors truncate">
                            {tr.title}
                          </h4>
                          <span className="text-[10px] px-2 py-0.5 rounded-full bg-[#242424] text-[#a1a1aa] border border-[#333]">
                            {tr.category}
                          </span>

                          {/* Currency Badge */}
                          {isForeignCurrency && (
                            <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-sky-950/70 text-sky-300 border border-sky-800/60 font-mono">
                              {trCurrency}
                            </span>
                          )}

                          {/* Priority Badge */}
                          {getPriorityBadge(tr)}

                          {tr.isRecurring && (
                            <span className="text-[10px] px-2 py-0.5 rounded-full bg-sky-950/60 text-sky-300 border border-sky-800/50 flex items-center gap-1">
                              <Repeat className="w-2.5 h-2.5" />
                              <span>{tr.recurringFrequency === 'gunluk' ? 'Günlük' : tr.recurringFrequency === 'haftalik' ? 'Haftalık' : 'Aylık'}</span>
                            </span>
                          )}
                        </div>

                        <div className="flex items-center gap-3 text-[11px] text-[#71717a] flex-wrap">
                          <span className="flex items-center gap-1 font-mono">
                            <Calendar className="w-3 h-3" />
                            <span>{formatTurkishDate(tr.date)}</span>
                          </span>

                          {/* Foreign Currency Breakdown Tag */}
                          {isForeignCurrency && tr.originalAmount !== undefined && (
                            <span className="text-[11px] font-mono text-amber-400/90 font-medium">
                              Orijinal: {formatCurrencyWithCode(tr.originalAmount, trCurrency)} (Kullanan Kur: {tr.effectiveRate?.toFixed(2) || '—'} ₺)
                            </span>
                          )}

                          {tr.description && (
                            <span className="truncate max-w-xs text-[#888]">
                              {tr.description}
                            </span>
                          )}

                          {linkedScript && (
                            <span className="flex items-center gap-1 text-emerald-400/80">
                              <Video className="w-3 h-3" />
                              <span>[{linkedScript.targetPlatform}] {linkedScript.title}</span>
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Right: Amount & Confirmation Button */}
                    <div className="flex items-center gap-4 shrink-0">
                      {/* Amount */}
                      <div className="text-right">
                        <div className={`text-sm font-extrabold font-mono ${
                          tr.type === 'gelir' ? 'text-emerald-400' : 'text-rose-400'
                        }`}>
                          {tr.type === 'gelir' ? '+' : '-'}{formatCurrencyTRY(tr.amount)}
                        </div>
                        {isForeignCurrency && tr.originalAmount !== undefined && (
                          <div className="text-[10px] text-[#888] font-mono">
                            {tr.type === 'gelir' ? '+' : '-'}{formatCurrencyWithCode(tr.originalAmount, trCurrency)}
                          </div>
                        )}
                      </div>

                      {/* Confirmation Toggle Button */}
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          toggleTransactionConfirmation(tr.id);
                        }}
                        className={`px-3 py-1.5 rounded-xl text-xs font-bold border flex items-center gap-1.5 transition-all ${
                          tr.isConfirmed
                            ? 'bg-emerald-950/40 hover:bg-emerald-900/60 text-emerald-300 border-emerald-800/50'
                            : isOverdue
                            ? 'bg-rose-950/70 hover:bg-rose-900/80 text-rose-300 border-rose-600/80 animate-pulse'
                            : 'bg-amber-950/40 hover:bg-amber-900/60 text-amber-300 border-amber-800/50'
                        }`}
                        title="Onay Durumunu Değiştir"
                      >
                        <Check className="w-3.5 h-3.5" />
                        <span>
                          {tr.isConfirmed
                            ? (tr.type === 'gelir' ? 'Gelir Alındı' : 'Ödendi')
                            : isOverdue
                            ? (tr.type === 'gelir' ? 'Gecikti (Onayla)' : 'Vadesi Geçti (Öde)')
                            : (tr.type === 'gelir' ? 'Gelir Bekliyor' : 'Ödeme Bekliyor')}
                        </span>
                      </button>

                      {/* Action buttons */}
                      <div className="flex items-center gap-1">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteTransaction(tr.id);
                          }}
                          className="p-2 hover:bg-rose-950/40 text-[#71717a] hover:text-rose-400 rounded-xl transition-colors"
                          title="İşlemi Sil"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
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
