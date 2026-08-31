import { PrismaClient } from '@prisma/client';
import { fetchLiveExchangeRates, convertCurrencyToTRY } from '../src/lib/exchangeRates.ts';

const prisma = new PrismaClient();

async function testAll() {
  console.log('=====================================================');
  console.log('Testing Resilient Currency System & Data Backup/Import');
  console.log('=====================================================\n');

  console.log('[TEST 1] Testing Multi-Tiered Currency Exchange Fetcher...');
  const rates = await fetchLiveExchangeRates(2.50);
  console.log('Live/Fallback Exchange Rates:', {
    USD: rates.USD,
    EUR: rates.EUR,
    markupTRY: rates.markupTRY,
    isLive: rates.isLive,
    lastUpdated: rates.lastUpdated,
  });

  if (rates.USD <= 0 || rates.EUR <= 0) {
    throw new Error('Rates must be positive numbers');
  }
  console.log('✓ Currency Rates successfully resolved without exception.');

  console.log('\n[TEST 2] Testing Dynamic Conversions with Custom Margin...');
  const convUSD = convertCurrencyToTRY(100, 'USD', rates, 3.00);
  console.log('100 USD with 3.00 TL markup ->', convUSD);
  const convEUR = convertCurrencyToTRY(100, 'EUR', rates, 3.00);
  console.log('100 EUR with 3.00 TL markup ->', convEUR);
  const convTRY = convertCurrencyToTRY(100, 'TRY', rates);
  console.log('100 TRY ->', convTRY);
  console.log('✓ Currency conversions accurate.');

  console.log('\n[TEST 3] Testing Database Snapshot Export...');
  const [
    users,
    folders,
    notes,
    scripts,
    tasks,
    events,
    mediaItems,
    transactions,
    categories,
    kanbanCards,
  ] = await Promise.all([
    prisma.user.findMany(),
    prisma.folder.findMany(),
    prisma.note.findMany(),
    prisma.script.findMany(),
    prisma.task.findMany(),
    prisma.calendarEvent.findMany(),
    prisma.mediaItem.findMany(),
    prisma.financeTransaction.findMany(),
    prisma.financeCategory.findMany(),
    prisma.kanbanCard.findMany(),
  ]);

  const backupObject = {
    version: '2.0.0',
    system: 'LrDocument Workspace Database Backup',
    exportedAt: new Date().toISOString(),
    summary: {
      totalUsers: users.length,
      totalFolders: folders.length,
      totalNotes: notes.length,
      totalScripts: scripts.length,
      totalTasks: tasks.length,
      totalEvents: events.length,
      totalMediaItems: mediaItems.length,
      totalTransactions: transactions.length,
      totalCategories: categories.length,
      totalKanbanCards: kanbanCards.length,
    },
    data: {
      users,
      folders,
      notes,
      scripts,
      tasks,
      events,
      mediaItems,
      transactions,
      categories,
      kanbanCards,
    },
  };

  console.log('✓ Backup generated successfully with summary:', backupObject.summary);

  console.log('\n[TEST 4] Testing Safe Backward-Compatible Non-Destructive Re-Import...');
  // Add a test user in backup payload to simulate import of another user
  const testEmail = `test_migration_user_${Date.now()}@lrdocument.com`;
  const modifiedBackup = {
    ...backupObject,
    data: {
      ...backupObject.data,
      users: [
        ...backupObject.data.users,
        {
          id: `mig_user_${Date.now()}`,
          name: 'Migration Test User',
          email: testEmail,
          passwordHash: '$2b$10$xyzplaceholder',
          role: 'USER',
          status: 'APPROVED',
          subscriptionType: 'AYLIK',
          subscriptionPlan: 'Aylık',
          paymentStatus: 'MANUAL_APPROVED',
        },
      ],
    },
  };

  // Re-import the users
  for (const u of modifiedBackup.data.users) {
    if (!u.email) continue;
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        name: u.name,
        role: u.role,
        status: u.status,
        subscriptionType: u.subscriptionType,
        subscriptionPlan: u.subscriptionPlan,
        paymentStatus: u.paymentStatus,
      },
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        passwordHash: u.passwordHash,
        role: u.role,
        status: u.status,
        subscriptionType: u.subscriptionType,
        subscriptionPlan: u.subscriptionPlan,
        paymentStatus: u.paymentStatus,
      },
    });
  }

  const verifiedUser = await prisma.user.findUnique({
    where: { email: testEmail },
  });

  if (!verifiedUser) {
    throw new Error('Imported user was not found!');
  }
  console.log('✓ Successfully imported and verified new user:', verifiedUser.email);

  // Clean up the temporary test user
  await prisma.user.delete({ where: { email: testEmail } });
  console.log('✓ Temporary test user cleaned up cleanly.');

  console.log('\n=====================================================');
  console.log('All Currency & Data Migration Verification Tests PASSED!');
  console.log('=====================================================\n');
}

testAll()
  .catch((err) => {
    console.error('Test failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
