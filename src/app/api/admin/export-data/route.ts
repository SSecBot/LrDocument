import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, ensureDefaultAdmin } from '@/lib/auth';

export async function GET() {
  try {
    await ensureDefaultAdmin();
    await requireAdmin();

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
      prisma.user.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      prisma.folder.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      prisma.note.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      prisma.script.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      prisma.task.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      prisma.calendarEvent.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      prisma.mediaItem.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      prisma.financeTransaction.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      prisma.financeCategory.findMany({
        orderBy: { createdAt: 'asc' },
      }),
      prisma.kanbanCard.findMany({
        orderBy: { createdAt: 'asc' },
      }),
    ]);

    const backupPayload = {
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

    const dateStr = new Date().toISOString().replace(/[:.]/g, '-');
    const filename = `lrdocument_backup_${dateStr}.json`;

    return new NextResponse(JSON.stringify(backupPayload, null, 2), {
      status: 200,
      headers: {
        'Content-Type': 'application/json; charset=utf-8',
        'Content-Disposition': `attachment; filename="${filename}"`,
        'Cache-Control': 'no-store, no-cache, must-revalidate',
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('Unauthorized') || err.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Yönetici yetkisi gereklidir.' }, { status: 403 });
    }
    console.error('Data export error:', error);
    return NextResponse.json({ error: 'Veritabanı yedeği alınırken bir hata oluştu.' }, { status: 500 });
  }
}
