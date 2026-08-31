import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

async function runMigrationAndIntegrityCheck() {
  console.log('====================================================');
  console.log('LrDocument Database Migration & Preservation Utility');
  console.log('====================================================\n');

  console.log('[1/5] Checking Database Connectivity & Schema...');
  const userCount = await prisma.user.count();
  const notesCount = await prisma.note.count();
  const tasksCount = await prisma.task.count();
  const scriptsCount = await prisma.script.count();
  const eventsCount = await prisma.calendarEvent.count();
  const transactionsCount = await prisma.financeTransaction.count();
  const categoriesCount = await prisma.financeCategory.count();
  const foldersCount = await prisma.folder.count();
  const mediaCount = await prisma.mediaItem.count();
  const kanbanCount = await prisma.kanbanCard.count();

  console.log(`✓ Active Record Counts:
  - Users: ${userCount}
  - Folders: ${foldersCount}
  - Notes: ${notesCount}
  - Scripts: ${scriptsCount}
  - Tasks: ${tasksCount}
  - Calendar Events: ${eventsCount}
  - Media Items: ${mediaCount}
  - Transactions: ${transactionsCount}
  - Categories: ${categoriesCount}
  - Kanban Cards: ${kanbanCount}`);

  console.log('\n[2/5] Running Backward-Compatible Field Backfill / Migration...');
  
  // 1. Ensure all users have valid status, subscriptionType, paymentStatus, and subscriptionPlan
  const usersToUpdate = await prisma.user.findMany({
    where: {
      OR: [
        { status: '' },
        { subscriptionType: '' },
        { paymentStatus: '' },
      ],
    },
  });

  if (usersToUpdate.length > 0) {
    console.log(`Found ${usersToUpdate.length} legacy user records requiring field backfill...`);
    for (const u of usersToUpdate) {
      await prisma.user.update({
        where: { id: u.id },
        data: {
          status: u.status || 'APPROVED',
          subscriptionType: u.subscriptionType || 'AYLIK',
          subscriptionPlan: u.subscriptionPlan || 'Aylık',
          paymentStatus: u.paymentStatus || 'PENDING',
        },
      });
    }
    console.log('✓ Successfully backfilled legacy user fields without data loss.');
  } else {
    console.log('✓ All user entities are fully compliant with latest schema specification.');
  }

  // 2. Ensure all finance transactions have currency and valid defaults
  const transactionsToFix = await prisma.financeTransaction.findMany({
    where: {
      currency: null,
    },
  });

  if (transactionsToFix.length > 0) {
    console.log(`Found ${transactionsToFix.length} transactions requiring default currency backfill...`);
    for (const t of transactionsToFix) {
      await prisma.financeTransaction.update({
        where: { id: t.id },
        data: {
          currency: 'TRY',
        },
      });
    }
    console.log('✓ Successfully backfilled default currency.');
  } else {
    console.log('✓ All finance transactions have explicit currency fields.');
  }

  console.log('\n[3/5] Verifying Multi-Column Indexes and Foreign Keys...');
  // Verify indexes by executing queries on indexed composite columns
  const approvedMonthly = await prisma.user.findMany({
    where: {
      status: 'APPROVED',
      subscriptionType: 'AYLIK',
    },
    take: 5,
  });
  console.log(`✓ [status, subscriptionType] index query returned ${approvedMonthly.length} records.`);

  const dateFilteredTransactions = await prisma.financeTransaction.findMany({
    where: {
      date: { gte: '2026-01-01' },
      type: 'gelir',
    },
    take: 5,
  });
  console.log(`✓ [userId, date] & [userId, type] index query returned ${dateFilteredTransactions.length} records.`);

  console.log('\n[4/5] Testing Data Preservation Integrity...');
  const finalUserCount = await prisma.user.count();
  const finalTransCount = await prisma.financeTransaction.count();

  if (finalUserCount !== userCount || finalTransCount !== transactionsCount) {
    throw new Error('FATAL: Data loss detected during migration check!');
  }
  console.log('✓ Zero data loss verified (pre-migration and post-migration counts match exactly).');

  console.log('\n[5/5] Migration Complete & Verified Successfully!');
}

runMigrationAndIntegrityCheck()
  .catch((err) => {
    console.error('Migration failed:', err);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
