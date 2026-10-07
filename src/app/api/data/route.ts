import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { handleRouteError } from '@/lib/apiUtils';
import { INITIAL_FOLDERS, INITIAL_FINANCE_CATEGORIES } from '@/data/initialData';

export async function GET() {
  try {
    const session = await requireAuth();
    const userId = session.userId;

    let [folders, categories] = await Promise.all([
      prisma.folder.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
      prisma.financeCategory.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }),
    ]);

    // Lazily seed defaults for accounts created before seeding existed. Concurrent first loads
    // may race on the same ids, so a unique-constraint failure here is harmless.
    if (folders.length === 0) {
      await prisma.folder
        .createMany({
          data: INITIAL_FOLDERS.map((folder) => ({
            id: `${userId}_${folder.id}`,
            userId,
            name: folder.name,
            description: folder.description,
            iconName: folder.iconName,
            isSystem: folder.isSystem || false,
          })),
        })
        .catch(() => undefined);
      folders = await prisma.folder.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
    }

    if (categories.length === 0) {
      await prisma.financeCategory
        .createMany({
          data: INITIAL_FINANCE_CATEGORIES.map((cat) => ({
            id: `${userId}_${cat.id}`,
            userId,
            name: cat.name,
            type: cat.type,
            isSystem: cat.isSystem || false,
          })),
        })
        .catch(() => undefined);
      categories = await prisma.financeCategory.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
    }

    const [dbNotes, dbScripts, dbTasks, dbKanban, dbEvents, dbMedia, dbTransactions] = await Promise.all([
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
      sections: safeJsonParse(s.sections, []),
      tags: safeJsonParse<string[]>(s.tags, []),
      createdAt: s.createdAt.toISOString(),
      updatedAt: s.updatedAt.toISOString(),
    }));

    const tasks = dbTasks.map((t) => ({
      ...t,
      createdAt: t.createdAt.toISOString(),
      completedAt: t.completedAt ? t.completedAt.toISOString() : undefined,
    }));

    const kanbanCards = dbKanban.map((k) => ({
      ...k,
      tags: safeJsonParse<string[]>(k.tags, []),
      createdAt: k.createdAt.toISOString(),
      updatedAt: k.updatedAt.toISOString(),
    }));

    const events = dbEvents.map((e) => ({
      ...e,
      checklist: safeJsonParse(e.checklist, []),
      createdAt: e.createdAt.toISOString(),
    }));

    const mediaItems = dbMedia.map((m) => ({
      ...m,
      tags: safeJsonParse<string[]>(m.tags, []),
      createdAt: m.createdAt.toISOString(),
    }));

    const transactions = dbTransactions.map((tx) => ({
      ...tx,
      currency: tx.currency || 'TRY',
      createdAt: tx.createdAt.toISOString(),
    }));

    const formattedFolders = folders.map((f) => ({
      id: stripUserPrefix(f.id, userId),
      name: f.name,
      description: f.description || undefined,
      iconName: f.iconName || undefined,
      isSystem: f.isSystem,
    }));

    const formattedCategories = categories.map((c) => ({
      id: stripUserPrefix(c.id, userId),
      name: c.name,
      type: c.type,
      isSystem: c.isSystem,
    }));

    return NextResponse.json(
      {
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
      },
      { headers: { 'Cache-Control': 'no-store' } },
    );
  } catch (error) {
    return handleRouteError(error, 'Data fetch error', 'Veriler yüklenirken hata oluştu.');
  }
}

function safeJsonParse<T>(jsonStr: string, fallback: T): T {
  try {
    return JSON.parse(jsonStr);
  } catch {
    return fallback;
  }
}

function stripUserPrefix(id: string, userId: string): string {
  const prefix = `${userId}_`;
  return id.startsWith(prefix) ? id.slice(prefix.length) : id;
}
