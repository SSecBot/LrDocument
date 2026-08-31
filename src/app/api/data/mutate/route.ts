import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';

export async function POST(req: NextRequest) {
  try {
    const session = await requireAuth();
    const userId = session.userId;
    const body = await req.json();
    const { entity, action, id, data } = body;

    if (!entity || !action) {
      return NextResponse.json({ error: 'Geçersiz parametreler.' }, { status: 400 });
    }

    switch (entity) {
      case 'note': {
        if (action === 'create' || action === 'upsert') {
          const res = await prisma.note.upsert({
            where: { id: data.id },
            update: {
              title: data.title ?? '',
              content: data.content ?? '',
              folder: data.folder ?? 'genel',
              tags: JSON.stringify(data.tags ?? []),
              isFavorite: Boolean(data.isFavorite),
              isPinned: Boolean(data.isPinned),
            },
            create: {
              id: data.id,
              userId,
              title: data.title ?? '',
              content: data.content ?? '',
              folder: data.folder ?? 'genel',
              tags: JSON.stringify(data.tags ?? []),
              isFavorite: Boolean(data.isFavorite),
              isPinned: Boolean(data.isPinned),
            },
          });
          return NextResponse.json({ success: true, item: res });
        } else if (action === 'delete') {
          await prisma.note.deleteMany({ where: { id, userId } });
          return NextResponse.json({ success: true });
        }
        break;
      }

      case 'script': {
        if (action === 'create' || action === 'upsert') {
          const res = await prisma.script.upsert({
            where: { id: data.id },
            update: {
              title: data.title ?? '',
              targetPlatform: data.targetPlatform ?? 'YouTube',
              status: data.status ?? 'fikir',
              sections: JSON.stringify(data.sections ?? []),
              speakingRateWPM: Number(data.speakingRateWPM ?? 130),
              linkedNoteId: data.linkedNoteId ?? null,
              tags: JSON.stringify(data.tags ?? []),
            },
            create: {
              id: data.id,
              userId,
              title: data.title ?? '',
              targetPlatform: data.targetPlatform ?? 'YouTube',
              status: data.status ?? 'fikir',
              sections: JSON.stringify(data.sections ?? []),
              speakingRateWPM: Number(data.speakingRateWPM ?? 130),
              linkedNoteId: data.linkedNoteId ?? null,
              tags: JSON.stringify(data.tags ?? []),
            },
          });
          return NextResponse.json({ success: true, item: res });
        } else if (action === 'delete') {
          await prisma.script.deleteMany({ where: { id, userId } });
          return NextResponse.json({ success: true });
        }
        break;
      }

      case 'task': {
        if (action === 'create' || action === 'upsert') {
          const res = await prisma.task.upsert({
            where: { id: data.id },
            update: {
              title: data.title ?? '',
              description: data.description ?? null,
              completed: Boolean(data.completed),
              priority: data.priority ?? 'orta',
              dueDate: data.dueDate ?? null,
              linkedNoteId: data.linkedNoteId ?? null,
              linkedScriptId: data.linkedScriptId ?? null,
              completedAt: data.completedAt ? new Date(data.completedAt) : null,
            },
            create: {
              id: data.id,
              userId,
              title: data.title ?? '',
              description: data.description ?? null,
              completed: Boolean(data.completed),
              priority: data.priority ?? 'orta',
              dueDate: data.dueDate ?? null,
              linkedNoteId: data.linkedNoteId ?? null,
              linkedScriptId: data.linkedScriptId ?? null,
              completedAt: data.completedAt ? new Date(data.completedAt) : null,
            },
          });
          return NextResponse.json({ success: true, item: res });
        } else if (action === 'delete') {
          await prisma.task.deleteMany({ where: { id, userId } });
          return NextResponse.json({ success: true });
        }
        break;
      }

      case 'kanban': {
        if (action === 'create' || action === 'upsert') {
          const res = await prisma.kanbanCard.upsert({
            where: { id: data.id },
            update: {
              title: data.title ?? '',
              description: data.description ?? null,
              projectType: data.projectType ?? 'genel',
              columnId: data.columnId ?? 'fikir',
              priority: data.priority ?? 'orta',
              dueDate: data.dueDate ?? null,
              tags: JSON.stringify(data.tags ?? []),
              linkedScriptId: data.linkedScriptId ?? null,
              linkedNoteId: data.linkedNoteId ?? null,
            },
            create: {
              id: data.id,
              userId,
              title: data.title ?? '',
              description: data.description ?? null,
              projectType: data.projectType ?? 'genel',
              columnId: data.columnId ?? 'fikir',
              priority: data.priority ?? 'orta',
              dueDate: data.dueDate ?? null,
              tags: JSON.stringify(data.tags ?? []),
              linkedScriptId: data.linkedScriptId ?? null,
              linkedNoteId: data.linkedNoteId ?? null,
            },
          });
          return NextResponse.json({ success: true, item: res });
        } else if (action === 'delete') {
          await prisma.kanbanCard.deleteMany({ where: { id, userId } });
          return NextResponse.json({ success: true });
        }
        break;
      }

      case 'event': {
        if (action === 'create' || action === 'upsert') {
          const res = await prisma.calendarEvent.upsert({
            where: { id: data.id },
            update: {
              title: data.title ?? '',
              description: data.description ?? null,
              date: data.date ?? '',
              time: data.time ?? null,
              durationMinutes: Number(data.durationMinutes ?? 30),
              eventType: data.eventType ?? 'gorev',
              platform: data.platform ?? null,
              linkedScriptId: data.linkedScriptId ?? null,
              linkedNoteId: data.linkedNoteId ?? null,
              linkedTaskId: data.linkedTaskId ?? null,
              status: data.status ?? 'planlandi',
              checklist: JSON.stringify(data.checklist ?? []),
            },
            create: {
              id: data.id,
              userId,
              title: data.title ?? '',
              description: data.description ?? null,
              date: data.date ?? '',
              time: data.time ?? null,
              durationMinutes: Number(data.durationMinutes ?? 30),
              eventType: data.eventType ?? 'gorev',
              platform: data.platform ?? null,
              linkedScriptId: data.linkedScriptId ?? null,
              linkedNoteId: data.linkedNoteId ?? null,
              linkedTaskId: data.linkedTaskId ?? null,
              status: data.status ?? 'planlandi',
              checklist: JSON.stringify(data.checklist ?? []),
            },
          });
          return NextResponse.json({ success: true, item: res });
        } else if (action === 'delete') {
          await prisma.calendarEvent.deleteMany({ where: { id, userId } });
          return NextResponse.json({ success: true });
        }
        break;
      }

      case 'media': {
        if (action === 'create' || action === 'upsert') {
          const res = await prisma.mediaItem.upsert({
            where: { id: data.id },
            update: {
              title: data.title ?? '',
              description: data.description ?? null,
              type: data.type ?? 'image',
              url: data.url ?? '',
              thumbnailUrl: data.thumbnailUrl ?? null,
              linkedNoteId: data.linkedNoteId ?? null,
              linkedScriptId: data.linkedScriptId ?? null,
              tags: JSON.stringify(data.tags ?? []),
            },
            create: {
              id: data.id,
              userId,
              title: data.title ?? '',
              description: data.description ?? null,
              type: data.type ?? 'image',
              url: data.url ?? '',
              thumbnailUrl: data.thumbnailUrl ?? null,
              linkedNoteId: data.linkedNoteId ?? null,
              linkedScriptId: data.linkedScriptId ?? null,
              tags: JSON.stringify(data.tags ?? []),
            },
          });
          return NextResponse.json({ success: true, item: res });
        } else if (action === 'delete') {
          await prisma.mediaItem.deleteMany({ where: { id, userId } });
          return NextResponse.json({ success: true });
        }
        break;
      }

      case 'finance': {
        if (action === 'create' || action === 'upsert') {
          const res = await prisma.financeTransaction.upsert({
            where: { id: data.id },
            update: {
              title: data.title ?? '',
              amount: Number(data.amount ?? 0),
              type: data.type ?? 'gelir',
              category: data.category ?? 'Genel',
              date: data.date ?? '',
              endDate: data.endDate ?? null,
              currency: data.currency ?? 'TRY',
              originalAmount: data.originalAmount ? Number(data.originalAmount) : null,
              exchangeRate: data.exchangeRate ? Number(data.exchangeRate) : null,
              markupTRY: data.markupTRY ? Number(data.markupTRY) : null,
              effectiveRate: data.effectiveRate ? Number(data.effectiveRate) : null,
              description: data.description ?? null,
              linkedScriptId: data.linkedScriptId ?? null,
              isRecurring: Boolean(data.isRecurring),
              recurringFrequency: data.recurringFrequency ?? null,
              isConfirmed: Boolean(data.isConfirmed),
              dueDate: data.dueDate ?? null,
              priority: data.priority ?? 'orta',
            },
            create: {
              id: data.id,
              userId,
              title: data.title ?? '',
              amount: Number(data.amount ?? 0),
              type: data.type ?? 'gelir',
              category: data.category ?? 'Genel',
              date: data.date ?? '',
              endDate: data.endDate ?? null,
              currency: data.currency ?? 'TRY',
              originalAmount: data.originalAmount ? Number(data.originalAmount) : null,
              exchangeRate: data.exchangeRate ? Number(data.exchangeRate) : null,
              markupTRY: data.markupTRY ? Number(data.markupTRY) : null,
              effectiveRate: data.effectiveRate ? Number(data.effectiveRate) : null,
              description: data.description ?? null,
              linkedScriptId: data.linkedScriptId ?? null,
              isRecurring: Boolean(data.isRecurring),
              recurringFrequency: data.recurringFrequency ?? null,
              isConfirmed: Boolean(data.isConfirmed),
              dueDate: data.dueDate ?? null,
              priority: data.priority ?? 'orta',
            },
          });
          return NextResponse.json({ success: true, item: res });
        } else if (action === 'delete') {
          await prisma.financeTransaction.deleteMany({ where: { id, userId } });
          return NextResponse.json({ success: true });
        }
        break;
      }

      case 'folder': {
        const folderDbId = `${userId}_${id || data?.id}`;
        if (action === 'create' || action === 'upsert') {
          const res = await prisma.folder.upsert({
            where: { id: folderDbId },
            update: {
              name: data.name ?? '',
              description: data.description ?? null,
              iconName: data.iconName ?? 'Folder',
            },
            create: {
              id: folderDbId,
              userId,
              name: data.name ?? '',
              description: data.description ?? null,
              iconName: data.iconName ?? 'Folder',
              isSystem: Boolean(data.isSystem),
            },
          });
          return NextResponse.json({ success: true, item: res });
        } else if (action === 'delete') {
          await prisma.folder.deleteMany({ where: { id: folderDbId, userId } });
          return NextResponse.json({ success: true });
        }
        break;
      }

      case 'category': {
        const catDbId = `${userId}_${id || data?.id}`;
        if (action === 'create' || action === 'upsert') {
          const res = await prisma.financeCategory.upsert({
            where: { id: catDbId },
            update: {
              name: data.name ?? '',
              type: data.type ?? 'gelir',
            },
            create: {
              id: catDbId,
              userId,
              name: data.name ?? '',
              type: data.type ?? 'gelir',
              isSystem: Boolean(data.isSystem),
            },
          });
          return NextResponse.json({ success: true, item: res });
        } else if (action === 'delete') {
          await prisma.financeCategory.deleteMany({ where: { id: catDbId, userId } });
          return NextResponse.json({ success: true });
        }
        break;
      }

      default:
        return NextResponse.json({ error: `Bilinmeyen varlık türü: ${entity}` }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('Unauthorized')) {
      return NextResponse.json({ error: 'Giriş yapmanız gerekmektedir.' }, { status: 401 });
    }
    console.error('Data mutate error:', error);
    return NextResponse.json({ error: 'Veri kaydedilirken hata oluştu.' }, { status: 500 });
  }
}
