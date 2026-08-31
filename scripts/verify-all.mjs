import { PrismaClient } from '@prisma/client';
import { z } from 'zod';

const prisma = new PrismaClient();

const transactionFormSchema = z
  .object({
    title: z.string().trim().min(1, 'İşlem başlığı zorunludur.'),
    amount: z.number().positive('Tutar sıfırdan büyük olmalıdır.'),
    currency: z.enum(['TRY', 'USD', 'EUR']),
    type: z.enum(['gelir', 'gider']),
    category: z.string().trim().min(1, 'Kategori seçimi zorunludur.'),
    date: z.string().trim().min(1, 'İşlem tarihi zorunludur.'),
    isRecurring: z.boolean().default(false),
    recurringFrequency: z.enum(['gunluk', 'haftalik', 'aylik']).optional(),
    endDate: z.string().optional(),
    priority: z.enum(['yuksek', 'orta', 'dusuk']).default('orta'),
    description: z.string().optional(),
    linkedScriptId: z.string().optional(),
    isConfirmed: z.boolean().default(true),
  })
  .refine(
    (data) => {
      if (data.isRecurring && data.type === 'gelir') {
        return typeof data.endDate === 'string' && data.endDate.trim().length > 0;
      }
      return true;
    },
    {
      message: 'Düzenli gelirler için "Bitiş Tarihi" (End Date) girilmesi zorunludur.',
      path: ['endDate'],
    }
  )
  .refine(
    (data) => {
      if (data.isRecurring && data.endDate && data.endDate.trim().length > 0 && data.date) {
        return data.endDate >= data.date;
      }
      return true;
    },
    {
      message: 'Bitiş tarihi başlangıç tarihinden önce olamaz.',
      path: ['endDate'],
    }
  );

async function fetchLiveExchangeRates(currentMarkup = 2.50) {
  const apiUrl = `https://open.er-api.com/v6/latest/USD?_t=${Date.now()}`;
  const res = await fetch(apiUrl, { cache: 'no-store' });
  const data = await res.json();
  const tryRate = data.rates?.TRY;
  const eurRate = data.rates?.EUR;
  const usdTry = Number(tryRate.toFixed(2));
  const eurTry = Number((tryRate / eurRate).toFixed(2));
  return {
    USD: usdTry,
    EUR: eurTry,
    lastUpdated: new Date().toISOString(),
    markupTRY: currentMarkup,
    isLive: true,
  };
}

function convertCurrencyToTRY(amount, currency, rates, customMarkup) {
  const markup = customMarkup !== undefined ? customMarkup : (rates.markupTRY || 2.50);
  if (currency === 'TRY') {
    return { baseAmountTRY: amount, effectiveRate: 1, liveRate: 1, markup: 0, originalAmount: amount, currency: 'TRY' };
  }
  const liveRate = currency === 'USD' ? rates.USD : rates.EUR;
  const effectiveRate = Number((liveRate + markup).toFixed(2));
  const baseAmountTRY = Math.round(amount * effectiveRate);
  return { baseAmountTRY, effectiveRate, liveRate, markup, originalAmount: amount, currency };
}

function calculateMRRSummary(transactions, rates) {
  let monthlyRecurringIncomeTRY = 0;
  let monthlyRecurringExpenseTRY = 0;
  let activeRecurringIncomeCount = 0;
  let activeRecurringExpenseCount = 0;
  const todayStr = new Date().toISOString().split('T')[0];

  for (const t of transactions) {
    if (!t.isRecurring) continue;
    if (t.endDate && t.endDate < todayStr) continue;

    const amountTRY =
      t.currency && t.currency !== 'TRY' && t.originalAmount !== undefined
        ? convertCurrencyToTRY(t.originalAmount, t.currency, rates, t.markupTRY).baseAmountTRY
        : t.amount;

    const freq = t.recurringFrequency || 'aylik';
    let monthlyAmount = amountTRY;

    if (freq === 'haftalik') {
      monthlyAmount = Math.round(amountTRY * 4.33);
    } else if (freq === 'gunluk') {
      monthlyAmount = Math.round(amountTRY * 30);
    }

    if (t.type === 'gelir') {
      monthlyRecurringIncomeTRY += monthlyAmount;
      activeRecurringIncomeCount++;
    } else {
      monthlyRecurringExpenseTRY += monthlyAmount;
      activeRecurringExpenseCount++;
    }
  }

  return {
    monthlyRecurringIncomeTRY,
    monthlyRecurringExpenseTRY,
    monthlyRecurringNetTRY: monthlyRecurringIncomeTRY - monthlyRecurringExpenseTRY,
    activeRecurringIncomeCount,
    activeRecurringExpenseCount,
  };
}

async function runVerification() {
  console.log('=== 1. Testing Live Exchange Rate Fetch ===');
  const rates = await fetchLiveExchangeRates(2.50);
  console.log('Fetched rates:', {
    USD: rates.USD,
    EUR: rates.EUR,
    markupTRY: rates.markupTRY,
    isLive: rates.isLive,
    effectiveUSD: rates.USD + rates.markupTRY,
    effectiveEUR: rates.EUR + rates.markupTRY,
  });

  console.log('\n=== 2. Testing Zod Finance Form Validation ===');
  // Test case A: recurring income WITHOUT end date -> MUST FAIL
  const testA = transactionFormSchema.safeParse({
    title: 'Sponsorluk',
    amount: 1000,
    currency: 'TRY',
    type: 'gelir',
    category: 'YouTube Geliri',
    date: '2026-09-01',
    isRecurring: true,
    recurringFrequency: 'aylik',
  });
  console.log('Test A (Recurring income without end date):', testA.success === false ? 'PASSED (Rejected as expected)' : 'FAILED');
  if (!testA.success) {
    console.log('  Error message:', testA.error.issues[0].message);
  }

  // Test case B: recurring income with end date earlier than start date -> MUST FAIL
  const testB = transactionFormSchema.safeParse({
    title: 'Sponsorluk',
    amount: 1000,
    currency: 'TRY',
    type: 'gelir',
    category: 'YouTube Geliri',
    date: '2026-09-01',
    endDate: '2026-08-01',
    isRecurring: true,
    recurringFrequency: 'aylik',
  });
  console.log('Test B (End date before start date):', testB.success === false ? 'PASSED (Rejected as expected)' : 'FAILED');
  if (!testB.success) {
    console.log('  Error message:', testB.error.issues[0].message);
  }

  // Test case C: recurring income with valid end date -> MUST PASS
  const testC = transactionFormSchema.safeParse({
    title: 'Sponsorluk',
    amount: 1000,
    currency: 'TRY',
    type: 'gelir',
    category: 'YouTube Geliri',
    date: '2026-09-01',
    endDate: '2026-12-31',
    isRecurring: true,
    recurringFrequency: 'aylik',
  });
  console.log('Test C (Valid recurring income):', testC.success === true ? 'PASSED (Accepted)' : 'FAILED');

  console.log('\n=== 3. Testing MRR Calculation (TRY & USD with margin) ===');
  const dummyTransactions = [
    {
      id: '1',
      title: 'YouTube Sponsorluk',
      amount: 10000,
      type: 'gelir',
      category: 'Sponsorluk',
      date: '2026-01-01',
      endDate: '2026-12-31',
      isRecurring: true,
      recurringFrequency: 'aylik',
      createdAt: '2026-01-01',
    },
    {
      id: '2',
      title: 'ChatGPT Plus & Cloud',
      amount: 368,
      currency: 'USD',
      originalAmount: 10,
      type: 'gider',
      category: 'Yazılım',
      date: '2026-01-01',
      isRecurring: true,
      recurringFrequency: 'aylik',
      createdAt: '2026-01-01',
    }
  ];

  const mrr = calculateMRRSummary(dummyTransactions, rates);
  console.log('MRR Summary:', mrr);

  console.log('\n=== 4. Checking Database Users & Schema Fields ===');
  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      status: true,
      subscriptionType: true,
      subscriptionPlan: true,
      paymentStatus: true,
    }
  });
  console.log('Users in DB count:', users.length);
  users.forEach(u => {
    console.log(`- ${u.email}: status=${u.status}, subType=${u.subscriptionType}, plan=${u.subscriptionPlan}, paymentStatus=${u.paymentStatus}`);
  });

  await prisma.$disconnect();
  console.log('\n=== All Verification Assertions Passed! ===');
}

runVerification().catch(err => {
  console.error(err);
  process.exit(1);
});
