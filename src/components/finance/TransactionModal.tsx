import React, { useState } from 'react';
import { FinanceTransaction, FinanceTransactionType, RecurringFrequency, TaskPriority, CurrencyCode } from '@/types';
import { useAppStore } from '@/store/useAppStore';
import { Modal } from '@/components/ui/Modal';
import { CategoryManagerModal } from './CategoryManagerModal';
import {
  TrendingUp,
  TrendingDown,
  Repeat,
  CheckCircle2,
  Settings,
  AlertCircle,
  RefreshCw,
  Coins,
  Calendar,
  Landmark,
} from 'lucide-react';
import { minimumPayment, monthlyInterest, payoffPlan } from '@/lib/debt';
import { formatCurrencyTRY } from '@/lib/utils';
import { FREQ_LABEL } from '@/lib/recurringFinance';
import { convertCurrencyToTRY } from '@/lib/exchangeRates';
import { transactionFormSchema } from '@/lib/validations/finance';
import { toLocalDateString } from '@/lib/utils';

interface TransactionModalProps {
  isOpen: boolean;
  onClose: () => void;
  editTransaction?: FinanceTransaction | null;
  /** New record opened from "Krediler ve borçlar": starts as a kredi / borç (gider). */
  preset?: 'debt';
}

export const TransactionModal: React.FC<TransactionModalProps> = ({
  isOpen,
  onClose,
  editTransaction,
  preset,
}) => {
  const {
    addTransaction,
    updateTransaction,
    financeCategories,
    exchangeRates,
    fetchExchangeRates,
    systemSettings,
  } = useAppStore();
  const DEBT_CATEGORY = 'Kredi / Borç';

  const [type, setType] = useState<FinanceTransactionType>('gelir');
  const [title, setTitle] = useState('');
  const [amount, setAmount] = useState<number | ''>('');
  const [currency, setCurrency] = useState<CurrencyCode>('TRY');
  const [markupTRY, setMarkupTRY] = useState<number>(0);
  const [category, setCategory] = useState<string>('');
  const [date, setDate] = useState(toLocalDateString());
  const [endDate, setEndDate] = useState<string>('');
  const [priority, setPriority] = useState<TaskPriority>('orta');
  const [description, setDescription] = useState('');
  const [isRecurring, setIsRecurring] = useState(false);
  const [recurringFrequency, setRecurringFrequency] = useState<RecurringFrequency>('aylik');
  const [isConfirmed, setIsConfirmed] = useState(true);
  const [isCategoryModalOpen, setIsCategoryModalOpen] = useState(false);
  const [formErrors, setFormErrors] = useState<Record<string, string>>({});
  const [isDebt, setIsDebt] = useState(false);
  const [interestRate, setInterestRate] = useState<number | ''>(systemSettings.finance.loanMonthlyInterestRate);
  const [minRate, setMinRate] = useState<number | ''>(systemSettings.finance.loanMinPaymentRate);

  const availableCategories = financeCategories.filter(c => c.type === type);
  // What the list shows is what gets saved: an empty choice means the first category of this type.
  const shownCategory = category || availableCategories[0]?.name || '';

  // Reset the form whenever the modal is (re)opened or a different record is edited.
  // Adjusting state during render (instead of in an effect) avoids a flash of stale values.
  const resetKey = `${isOpen}:${editTransaction?.id ?? `new-${preset ?? ''}`}`;
  const [prevResetKey, setPrevResetKey] = useState<string | null>(null);
  if (resetKey !== prevResetKey) {
    setPrevResetKey(resetKey);
    setFormErrors({});
    if (editTransaction) {
      setType(editTransaction.type);
      setTitle(editTransaction.title);
      setCurrency(editTransaction.currency || 'TRY');
      setAmount(editTransaction.originalAmount ?? editTransaction.amount);
      setMarkupTRY(editTransaction.markupTRY ?? exchangeRates.markupTRY ?? 0);
      setCategory(editTransaction.category);
      setDate(editTransaction.date);
      setEndDate(editTransaction.endDate || '');
      setPriority(editTransaction.priority || 'orta');
      setDescription(editTransaction.description || '');
      setIsRecurring(editTransaction.isRecurring || false);
      setRecurringFrequency(editTransaction.recurringFrequency || 'aylik');
      setIsConfirmed(editTransaction.isConfirmed ?? true);
      setIsDebt(!!editTransaction.isDebt);
      setInterestRate(editTransaction.monthlyInterestRate ?? systemSettings.finance.loanMonthlyInterestRate);
      setMinRate(editTransaction.minPaymentRate ?? systemSettings.finance.loanMinPaymentRate);
    } else {
      const startType: FinanceTransactionType = preset === 'debt' ? 'gider' : 'gelir';
      setType(startType);
      setTitle('');
      setAmount('');
      setCurrency(systemSettings.finance.defaultCurrency);
      setMarkupTRY(exchangeRates.markupTRY ?? 0);
      setIsDebt(preset === 'debt');
      setInterestRate(systemSettings.finance.loanMonthlyInterestRate);
      setMinRate(systemSettings.finance.loanMinPaymentRate);
      setCategory(financeCategories.find((c) => c.type === startType)?.name || '');
      setDate(toLocalDateString());
      setEndDate('');
      setPriority('orta');
      setDescription('');
      setIsRecurring(false);
      setRecurringFrequency('aylik');
      setIsConfirmed(true);
    }
  }

  const handleTypeChange = (newType: FinanceTransactionType) => {
    setType(newType);
    if (newType === 'gelir') setIsDebt(false);
    const defaultCat = financeCategories.find(c => c.type === newType)?.name || '';
    setCategory(defaultCat);
    setFormErrors((prev) => {
      const next = { ...prev };
      delete next.type;
      delete next.endDate;
      return next;
    });
  };

  // Real-time conversion preview calculation
  const numericAmount = amount === '' ? 0 : Number(amount);
  const conversion = convertCurrencyToTRY(numericAmount, currency, exchangeRates, markupTRY);
  const debtMode = type === 'gider' && isDebt;
  const rateNum = interestRate === '' ? 0 : Number(interestRate);
  const minRateNum = minRate === '' ? 0 : Number(minRate);
  const debtBalance = conversion.baseAmountTRY;
  const debtInterest = monthlyInterest(debtBalance, rateNum);
  const debtMinimum = minimumPayment(debtBalance, rateNum, minRateNum);
  const debtPlan = payoffPlan(debtBalance, rateNum, debtMinimum);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();

    const validationResult = transactionFormSchema.safeParse({
      title: title.trim(),
      amount: numericAmount,
      currency,
      type,
      category: debtMode ? DEBT_CATEGORY : shownCategory || (type === 'gelir' ? 'Genel gelir' : 'Genel gider'),
      date,
      endDate: !debtMode && isRecurring ? (endDate.trim() || undefined) : undefined,
      isRecurring: !debtMode && isRecurring,
      recurringFrequency: !debtMode && isRecurring ? recurringFrequency : undefined,
      priority,
      description: description.trim() || undefined,
      // An open debt is "not yet paid off".
      isConfirmed: debtMode ? false : isConfirmed,
    });

    if (debtMode && (rateNum < 0 || rateNum > 50 || minRateNum < 0 || minRateNum > 100)) {
      setFormErrors({ rates: 'Aylık faiz %0–50, asgari ödeme %0–100 arasında olmalıdır.' });
      return;
    }
    const debtFields = debtMode
      ? { isDebt: true, monthlyInterestRate: rateNum, minPaymentRate: minRateNum }
      : { isDebt: false, monthlyInterestRate: null, minPaymentRate: null };

    if (!validationResult.success) {
      const errors: Record<string, string> = {};
      validationResult.error.issues.forEach((issue) => {
        const fieldName = issue.path[0] as string;
        if (fieldName && !errors[fieldName]) {
          errors[fieldName] = issue.message;
        }
      });
      setFormErrors(errors);
      return;
    }

    setFormErrors({});

    const validatedData = validationResult.data;

    if (editTransaction) {
      updateTransaction(editTransaction.id, {
        title: validatedData.title,
        amount: conversion.baseAmountTRY,
        originalAmount: numericAmount,
        currency,
        exchangeRate: conversion.liveRate,
        markupTRY: conversion.markup,
        effectiveRate: conversion.effectiveRate,
        type: validatedData.type,
        category: validatedData.category,
        date: validatedData.date,
        endDate: isRecurring ? validatedData.endDate : undefined,
        priority: validatedData.priority,
        description: validatedData.description,
        isRecurring: validatedData.isRecurring,
        recurringFrequency: validatedData.isRecurring ? validatedData.recurringFrequency : undefined,
        isConfirmed: validatedData.isConfirmed,
        ...debtFields,
      });
    } else {
      addTransaction({
        title: validatedData.title,
        amount: conversion.baseAmountTRY,
        originalAmount: numericAmount,
        currency,
        exchangeRate: conversion.liveRate,
        markupTRY: conversion.markup,
        effectiveRate: conversion.effectiveRate,
        type: validatedData.type,
        category: validatedData.category,
        date: validatedData.date,
        endDate: isRecurring ? validatedData.endDate : undefined,
        priority: validatedData.priority,
        description: validatedData.description,
        isRecurring: validatedData.isRecurring,
        recurringFrequency: validatedData.isRecurring ? validatedData.recurringFrequency : undefined,
        isConfirmed: validatedData.isConfirmed,
        ...debtFields,
      });
    }

    onClose();
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={editTransaction ? 'Finans Kaydını Düzenle' : 'Yeni Gelir / Gider Kaydı Ekle'}
        subtitle="Çoklu para birimi (TRY, USD, EUR), canlı kur marjı ve bütçe planlaması"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Top Form-Level Validation Alert */}
          {Object.keys(formErrors).length > 0 && (
            <div className="p-3 rounded-lg bg-rose-950/60 border border-rose-800/80 text-rose-200 text-xs flex items-start gap-2 animate-fade-in">
              <AlertCircle className="w-4 h-4 text-rose-400 shrink-0 mt-0.5" />
              <div className="space-y-0.5">
                <span className="font-bold block">Lütfen aşağıdaki form hatalarını düzeltiniz:</span>
                <ul className="list-disc list-inside text-[11px] space-y-0.5">
                  {Object.values(formErrors).map((msg, idx) => (
                    <li key={idx}>{msg}</li>
                  ))}
                </ul>
              </div>
            </div>
          )}

          {/* Type selector (Gelir vs Gider) */}
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => handleTypeChange('gelir')}
              className={`p-2.5 sm:p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                type === 'gelir'
                  ? 'bg-brand-soft border-brand text-emerald-300'
                  : 'bg-surface-2 border-line text-subtle hover:text-white'
              }`}
            >
              <TrendingUp className="w-4 h-4 text-emerald-400" />
              <span>+ Gelir Kaydı</span>
            </button>

            <button
              type="button"
              onClick={() => handleTypeChange('gider')}
              className={`p-2.5 sm:p-3 rounded-xl border text-xs font-bold flex items-center justify-center gap-2 transition-all ${
                type === 'gider'
                  ? 'bg-rose-950/60 border-rose-800/80 text-rose-300'
                  : 'bg-surface-2 border-line text-subtle hover:text-white'
              }`}
            >
              <TrendingDown className="w-4 h-4 text-rose-400" />
              <span>- Gider Kaydı</span>
            </button>
          </div>

          {type === 'gider' && (
            <div className="flex rounded-md border border-line bg-surface-2 p-0.5" role="group" aria-label="Gider türü">
              {(
                [
                  [false, 'Normal gider'],
                  [true, 'Kredi / borç'],
                ] as const
              ).map(([value, label]) => (
                <button
                  key={label}
                  type="button"
                  aria-pressed={isDebt === value}
                  onClick={() => setIsDebt(value)}
                  className={`flex-1 h-8 rounded text-xs transition-colors inline-flex items-center justify-center gap-1.5 ${
                    isDebt === value ? 'bg-surface-4 text-fg' : 'text-subtle hover:text-fg'
                  }`}
                >
                  {value && <Landmark className="w-3.5 h-3.5" />}
                  {label}
                </button>
              ))}
            </div>
          )}

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-white mb-1">İşlem Başlığı *</label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => {
                setTitle(e.target.value);
                if (formErrors.title) setFormErrors((prev) => ({ ...prev, title: '' }));
              }}
              placeholder={type === 'gelir' ? 'Örn: Yurtdışı Sponsorluk Hakedişi ($ USD)' : 'Örn: Claude API + AWS Cloud Render (€ EUR)'}
              className={`w-full bg-surface-2 border rounded-lg px-3.5 py-2 text-xs sm:text-sm text-white focus:outline-none ${
                formErrors.title ? 'border-rose-500' : 'border-line-strong focus:border-brand'
              }`}
            />
            {formErrors.title && (
              <p className="text-[11px] text-rose-400 font-semibold mt-1">{formErrors.title}</p>
            )}
          </div>

          {/* Currency Selector & Amount */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                <Coins className="w-3.5 h-3.5 text-amber-400" />
                <span>{debtMode ? 'Kalan borç *' : 'Para Birimi & Tutar *'}</span>
              </label>

              {/* Currency Selector Tabs */}
              <div className="flex bg-surface-2 p-0.5 rounded-lg border border-line-strong">
                {(['TRY', 'USD', 'EUR'] as const).map((curr) => (
                  <button
                    key={curr}
                    type="button"
                    onClick={() => setCurrency(curr)}
                    className={`px-2.5 py-1 text-xs font-bold rounded-md transition-all ${
                      currency === curr
                        ? 'bg-surface-4 text-fg font-medium'
                        : 'text-subtle hover:text-white'
                    }`}
                  >
                    {curr === 'TRY' ? '₺ TRY' : curr === 'USD' ? '$ USD' : '€ EUR'}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 sm:items-end gap-2.5">
              <div>
                <div className="relative">
                  <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-sm font-bold text-muted">
                    {currency === 'TRY' ? '₺' : currency === 'USD' ? '$' : '€'}
                  </span>
                  <input
                    type="number"
                    required
                    min="0.01"
                    step="any"
                    value={amount}
                    onChange={(e) => {
                      setAmount(e.target.value === '' ? '' : Number(e.target.value));
                      if (formErrors.amount) setFormErrors((prev) => ({ ...prev, amount: '' }));
                    }}
                    placeholder="0.00"
                    className={`w-full bg-surface-2 border rounded-lg pl-8 pr-3.5 py-2 text-xs sm:text-sm font-mono text-white focus:outline-none ${
                      formErrors.amount ? 'border-rose-500' : 'border-line-strong focus:border-brand'
                    }`}
                  />
                </div>
                {formErrors.amount && (
                  <p className="text-[11px] text-rose-400 font-semibold mt-1">{formErrors.amount}</p>
                )}
              </div>

              {debtMode ? (
                <div>
                  <label className="block text-xs font-semibold text-white mb-1">Kategori</label>
                  <div className="h-[34px] px-3 flex items-center rounded-lg bg-surface-2 border border-line text-xs text-subtle">{DEBT_CATEGORY}</div>
                </div>
              ) : (
              <div>
                <div className="flex items-center justify-between mb-1">
                  <label className="text-xs font-semibold text-white">Kategori *</label>
                  <button
                    type="button"
                    onClick={() => setIsCategoryModalOpen(true)}
                    className="text-[11px] text-emerald-400 hover:underline flex items-center gap-1 font-medium"
                  >
                    <Settings className="w-3 h-3" />
                    <span>Yönet</span>
                  </button>
                </div>
                <select
                  value={shownCategory}
                  onChange={(e) => setCategory(e.target.value)}
                  className="w-full bg-surface-2 border border-line-strong focus:border-brand rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
                >
                  {availableCategories.map((c) => (
                    <option key={c.id} value={c.name}>
                      {c.name}
                    </option>
                  ))}
                  {/* A record whose category was renamed or deleted keeps it. */}
                  {shownCategory && !availableCategories.some((c) => c.name === shownCategory) && <option value={shownCategory}>{shownCategory}</option>}
                  {!shownCategory && <option value="">{type === 'gelir' ? 'Genel gelir' : 'Genel gider'}</option>}
                </select>
              </div>
              )}
            </div>
          </div>

          {debtMode && (
            <div className="p-3 rounded-lg bg-surface border border-line space-y-3">
              <div className="grid grid-cols-2 gap-2.5">
                <label className="block">
                  <span className="block text-xs font-semibold text-white mb-1">Aylık faiz (%)</span>
                  <input
                    type="number"
                    min="0"
                    max="50"
                    step="0.01"
                    value={interestRate}
                    onChange={(e) => setInterestRate(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-surface-2 border border-line-strong focus:border-brand rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none"
                  />
                </label>
                <label className="block">
                  <span className="block text-xs font-semibold text-white mb-1">Asgari ödeme (%)</span>
                  <input
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={minRate}
                    onChange={(e) => setMinRate(e.target.value === '' ? '' : Number(e.target.value))}
                    className="w-full bg-surface-2 border border-line-strong focus:border-brand rounded-lg px-3 py-2 text-xs text-white font-mono focus:outline-none"
                  />
                </label>
              </div>
              <dl className="grid grid-cols-2 gap-x-3 gap-y-1 text-xs">
                <dt className="text-muted">Bu ayın faizi</dt>
                <dd className="text-right font-mono text-body">{formatCurrencyTRY(debtInterest)}</dd>
                <dt className="text-muted">Asgari ödeme</dt>
                <dd className="text-right font-mono text-fg">{formatCurrencyTRY(debtMinimum)}</dd>
              </dl>
              <p className="text-[11px] text-subtle">
                {debtBalance <= 0
                  ? 'Kalan borcu girin.'
                  : debtPlan
                    ? `Her ay ${formatCurrencyTRY(debtMinimum)} ödenirse borç yaklaşık ${debtPlan.months} ayda kapanır; toplam faiz ${formatCurrencyTRY(debtPlan.totalInterest)}.`
                    : 'Asgari ödeme faizi karşılamıyor; bu tutarla borç kapanmaz.'}{' '}
                Varsayılan oranları yönetici belirler; bu borç için değiştirebilirsiniz.
              </p>
            </div>
          )}

          {/* Live Exchange Rate Banner (USD & EUR) */}
          {currency !== 'TRY' && (
            <div className="p-3 rounded-lg bg-surface border border-brand/60 space-y-2 animate-fade-in">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-1.5 text-xs font-bold text-emerald-300">
                  <Coins className="w-4 h-4 text-emerald-400" />
                  <span>Canlı Kur & Özel Marj</span>
                </div>
                <button
                  type="button"
                  onClick={() => fetchExchangeRates()}
                  className="text-[10px] text-subtle hover:text-white flex items-center gap-1 bg-surface-2 px-2 py-0.5 rounded-md border border-line-strong"
                  title="Canlı Kurları Yenile"
                >
                  <RefreshCw className="w-3 h-3 text-emerald-400" />
                  <span>Kuru Güncelle</span>
                </button>
              </div>

              {/* Rate Breakdown Grid */}
              <div className="grid grid-cols-3 gap-1.5 text-center">
                <div className="p-1.5 rounded-lg bg-surface border border-line">
                  <span className="text-[9px] text-muted block">Canlı Kur</span>
                  <span className="text-xs font-mono font-bold text-white">
                    1 {currency} = {conversion.liveRate.toFixed(2)} ₺
                  </span>
                </div>

                <div className="p-1.5 rounded-lg bg-surface border border-line">
                  <span className="text-[9px] text-muted block">Özel Marj</span>
                  <div className="flex items-center justify-center gap-1 font-mono font-bold text-amber-400 text-xs">
                    <span>+</span>
                    <input
                      type="number"
                      min="0"
                      max="10"
                      step="0.1"
                      value={markupTRY}
                      onChange={(e) => setMarkupTRY(Number(e.target.value) || 0)}
                      className="w-10 bg-transparent text-center border-b border-amber-500/50 focus:outline-none text-xs"
                    />
                    <span>₺</span>
                  </div>
                </div>

                <div className="p-1.5 rounded-lg bg-brand-soft border border-brand-hover">
                  <span className="text-[9px] text-emerald-400 block">Uygulanan</span>
                  <span className="text-xs font-mono font-bold text-emerald-300">
                    {conversion.effectiveRate.toFixed(2)} ₺
                  </span>
                </div>
              </div>

              {/* Conversion Result Preview */}
              <div className="pt-1.5 border-t border-brand-line flex items-center justify-between text-xs">
                <span className="text-subtle text-[11px]">Hesaplanan TL Karşılığı:</span>
                <span className="font-mono font-bold text-xs sm:text-sm text-emerald-400">
                  ₺{conversion.baseAmountTRY.toLocaleString('tr-TR')} TRY
                </span>
              </div>
            </div>
          )}

          {/* Date & Priority */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            <div>
              <label className="block text-xs font-semibold text-white mb-1">
                {debtMode ? 'Sonraki ödeme tarihi *' : isRecurring ? 'Başlangıç Tarihi *' : 'İşlem / Vade Tarihi *'}
              </label>
              <input
                type="date"
                required
                value={date}
                onChange={(e) => {
                  setDate(e.target.value);
                  if (formErrors.date) setFormErrors((prev) => ({ ...prev, date: '' }));
                }}
                className={`w-full bg-surface-2 border rounded-lg px-3 py-2 text-xs text-white focus:outline-none ${
                  formErrors.date ? 'border-rose-500' : 'border-line-strong focus:border-brand'
                }`}
              />
              {formErrors.date && (
                <p className="text-[11px] text-rose-400 font-semibold mt-1">{formErrors.date}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-white mb-1 flex items-center gap-1">
                <AlertCircle className="w-3.5 h-3.5 text-amber-400" />
                <span>Öncelik Derecesi</span>
              </label>
              <select
                value={priority}
                onChange={(e) => setPriority(e.target.value as TaskPriority)}
                className="w-full bg-surface-2 border border-line-strong focus:border-brand rounded-lg px-3 py-2 text-xs text-white focus:outline-none"
              >
                <option value="yuksek">Yüksek — kira, fatura</option>
                <option value="orta">Orta — düzenli giderler</option>
                <option value="dusuk">Düşük — isteğe bağlı</option>
              </select>
            </div>
          </div>

          {/* Recurring Transaction Support & Mandatory End Date */}
          {!debtMode && (
          <div className="p-3 sm:p-3.5 rounded-lg bg-surface border border-line space-y-3">
            <div className="flex items-center justify-between">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={isRecurring}
                  onChange={(e) => {
                    setIsRecurring(e.target.checked);
                    if (!e.target.checked) {
                      setFormErrors((prev) => {
                        const next = { ...prev };
                        delete next.endDate;
                        return next;
                      });
                    }
                  }}
                  className="w-4 h-4 rounded text-emerald-600 focus:ring-0 bg-surface-2 border-line-strong cursor-pointer"
                />
                <div className="flex items-center gap-1.5 text-xs font-bold text-white">
                  <Repeat className="w-3.5 h-3.5 text-emerald-400" />
                  <span>Düzenli / Tekrarlayan İşlem (Abonelik, Maaş, Düzenli Gelir)</span>
                </div>
              </label>
            </div>

            {isRecurring && (
              <div className="pt-2 border-t border-line space-y-3 animate-fade-in">
                <div className="flex items-center gap-x-3 gap-y-2 flex-wrap">
                  <span className="text-xs text-subtle">Tekrarlama Sıklığı:</span>
                  {(['gunluk', 'haftalik', 'aylik', 'yillik'] as const).map((freq) => (
                    <label key={freq} className="flex items-center gap-1.5 text-xs text-white cursor-pointer min-h-[32px]">
                      <input
                        type="radio"
                        name="recurringFrequency"
                        value={freq}
                        checked={recurringFrequency === freq}
                        onChange={() => setRecurringFrequency(freq)}
                        className="text-emerald-500 bg-surface-2 border-line-strong"
                      />
                      <span>{FREQ_LABEL[freq]}</span>
                    </label>
                  ))}
                </div>

                {/* MANDATORY END DATE FIELD FOR RECURRING INCOME */}
                <div className="pt-2 border-t border-line">
                  <div className="flex items-center justify-between mb-1">
                    <label className="text-xs font-semibold text-white flex items-center gap-1.5">
                      <Calendar className="w-3.5 h-3.5 text-emerald-400" />
                      <span>Bitiş Tarihi (Vade Sonu)</span>
                      <span className="text-[10px] text-muted font-normal">(isteğe bağlı)</span>
                    </label>
                  </div>

                  <input
                    type="date"
                    value={endDate}
                    min={date}
                    onChange={(e) => {
                      setEndDate(e.target.value);
                      if (formErrors.endDate) {
                        setFormErrors((prev) => {
                          const next = { ...prev };
                          delete next.endDate;
                          return next;
                        });
                      }
                    }}
                    className={`w-full bg-surface-2 border rounded-lg px-3 py-2 text-xs text-white focus:outline-none ${
                      formErrors.endDate ? 'border-rose-500 focus:border-rose-500' : 'border-line-strong focus:border-brand'
                    }`}
                  />

                  {formErrors.endDate ? (
                    <p className="text-[11px] text-rose-400 font-semibold mt-1 flex items-center gap-1">
                      <AlertCircle className="w-3 h-3 shrink-0" />
                      <span>{formErrors.endDate}</span>
                    </p>
                  ) : (
                    <p className="text-[10px] text-subtle mt-1">Boş bırakılırsa süresiz tekrarlar (ör. maaş, kira).</p>
                  )}
                </div>
              </div>
            )}
          </div>
          )}

          {/* Confirmation Toggle */}
          {!debtMode && (
          <div className="p-3 rounded-lg bg-surface border border-line flex items-center justify-between">
            <div className="space-y-0.5">
              <span className="text-xs font-bold text-white flex items-center gap-1.5">
                <CheckCircle2 className={`w-4 h-4 ${isConfirmed ? 'text-emerald-400' : 'text-muted'}`} />
                {type === 'gelir' ? 'Gelir Geldi (Onayla)' : 'Gider Ödendi (Onayla)'}
              </span>
              <p className="text-[11px] text-muted">
                İşlem hesaba geçtiğinde veya ödendiğinde onaylayın.
              </p>
            </div>

            <label className="relative inline-flex items-center cursor-pointer shrink-0 ml-3">
              <input
                type="checkbox"
                checked={isConfirmed}
                onChange={(e) => setIsConfirmed(e.target.checked)}
                className="sr-only peer"
              />
              <div className="w-11 h-6 bg-surface-4 peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-brand"></div>
            </label>
          </div>
          )}

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-white mb-1">Açıklama & Notlar</label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={2}
              placeholder="Fatura no, döviz işlem referansı veya ek ayrıntılar..."
              className="w-full bg-surface-2 border border-line-strong focus:border-brand rounded-lg p-3 text-xs text-white focus:outline-none resize-none"
            />
          </div>

          {/* Footer Actions */}
          <div className="modal-actions flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-surface-2 hover:bg-surface-3 text-xs font-medium text-body rounded-lg transition-colors"
            >
              İptal
            </button>
            <button
              type="submit"
              className="px-5 py-2 bg-brand hover:bg-brand-hover text-xs font-semibold text-white rounded-lg transition-all cursor-pointer"
            >
              {editTransaction ? 'Değişiklikleri Kaydet' : 'İşlemi Kaydet'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Category Manager Modal */}
      <CategoryManagerModal
        isOpen={isCategoryModalOpen}
        onClose={() => setIsCategoryModalOpen(false)}
      />
    </>
  );
};
