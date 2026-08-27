import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { INITIAL_FOLDERS, INITIAL_FINANCE_CATEGORIES } from '@/data/initialData';

export async function GET() {
  try {
    const session = await requireAuth();
    const userId = session.userId;

    let folders = await prisma.folder.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (folders.length === 0) {
      for (const folder of INITIAL_FOLDERS) {
        await prisma.folder.create({
          data: {
            id: `${userId}_${folder.id}`,
            userId,
            name: folder.name,
            description: folder.description,
            iconName: folder.iconName,
            isSystem: folder.isSystem || false,
          },
        });
      }
      folders = await prisma.folder.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });
    }

    let categories = await prisma.financeCategory.findMany({
      where: { userId },
      orderBy: { createdAt: 'asc' },
    });

    if (categories.length === 0) {
      for (const cat of INITIAL_FINANCE_CATEGORIES) {
        await prisma.financeCategory.create({
          data: {
            id: `${userId}_${cat.id}`,
            userId,
            name: cat.name,
            type: cat.type,
            isSystem: cat.isSystem || false,
          },
        });
      }
      categories = await prisma.financeCategory.findMany({
        where: { userId },
        orderBy: { createdAt: 'asc' },
      });
    }

    const [dbNotes, dbScripts, dbTasks, dbKanban, dbEvents, dbMedia, dbTransactions] =
      await Promise.all([
        prisma.note.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }),
        prisma.script.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }),
        prisma.task.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
        prisma.kanbanCard.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }),
        prisma.calendarEvent.findMany({ where: { userId }, orderBy: { date: 'asc' } }),
        prisma.mediaItem.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }),
        prisma.financeTransaction.findMany({ where: { userId }, orderBy: { date: 'desc' } }),
      ]);

    const notes = dbNotes.map((n) => ({
      ...n,
      tags: safeJsonParse<string[]>(n.tags, []),
      createdAt: n.createdAt.toISOString(),
      updatedAt: n.updatedAt.toISOString(),
    }));

    const scripts = dbScripts.map((s) => ({
      ...s,
      targetPlatform: s.targetPlatform as any,
      status: s.status as any,
      sections: safeJsonParse(s.sections, []),
      tags: safeJsonParse<string[]>(s.tags, []),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    const tasks = dbTasks.map((t) => ({
      ...t,
      priority: t.priority as any,
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt ? t.completedAt.toISOString() : undefined,
    }));

    const kanbanCards = dbKanban.map((k) => ({
      ...k,
      columnId: k.columnId as any,
      priority: k.priority as any,
      tags: safeJsonParse<string[]>(k.tags, []),
      createdAt: k.createdAt.toISOString(),
      updatedAt: k.updatedAt.toISOString(),
    }));

    const events = dbEvents.map((e) => ({
      ...e,
      eventType: e.eventType as any,
      platform: e.platform as any,
      status: e.status as any,
      checklist: safeJsonParse(e.checklist, []),
      createdAt: e.createdAt.toISOString(),
    }));

    const mediaItems = dbMedia.map((m) => ({
      ...m,
      type: m.type as any,
      tags: safeJsonParse<string[]>(m.tags, []),
      createdAt: m.createdAt.toISOString(),
    }));

    const transactions = dbTransactions.map((tx) => ({
      ...tx,
      type: tx.type as any,
      currency: (tx.currency || 'TRY') as any,
      priority: tx.priority as any,
      recurringFrequency: tx.recurringFrequency as any,
      createdAt: tx.createdAt.toISOString(),
    }));

    const formattedFolders = folders.map((f) => ({
      id: f.id.replace(`${userId}_`, ''),
      name: f.name,
      description: f.description || undefined,
      iconName: f.iconName || undefined,
      isSystem: f.isSystem,
    }));

    const formattedCategories = categories.map((c) => ({
      id: c.id.replace(`${userId}_`, ''),
      name: c.name,
      type: c.type as any,
      isSystem: c.isSystem,
    }));

    return NextResponse.json({
      success: true,
      data: {
        notes,
        scripts,
        tasks,
        kanbanCards,
        events,
        mediaItems,
        transactions,
        financeCategories: formattedCategories,
        folders: formattedFolders,
      },
    });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekmektedir.' }, { status: 401 });
    }
    console.error('Data fetch error:', error);
    return NextResponse.json({ error: 'Veriler yüklenirken hata oluştu.' }, { status: 500 });
  }
}

function safeJsonParse<T>(jsonStr: string, fallback: T): T {
  try {
    return JSON.parse(jsonStr);
  } catch {
    return fallback;
  }
}
