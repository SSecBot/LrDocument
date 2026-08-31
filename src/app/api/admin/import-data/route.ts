import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, ensureDefaultAdmin } from '@/lib/auth';

interface ImportPayload {
  version?: string;
  data?: {
    users?: any[];
    folders?: any[];
    notes?: any[];
    scripts?: any[];
    tasks?: any[];
    events?: any[];
    mediaItems?: any[];
    transactions?: any[];
    categories?: any[];
    kanbanCards?: any[];
  };
}

export async function POST(req: Request) {
  try {
    await ensureDefaultAdmin();
    await requireAdmin();

    const body: ImportPayload = await req.json();

    if (!body || !body.data || typeof body.data !== 'object') {
      return NextResponse.json(
        { error: 'Geçersiz yedekleme dosyası formatı. "data" nesnesi bulunamadı.' },
        { status: 400 }
      );
    }

    const {
      users = [],
      folders = [],
      notes = [],
      scripts = [],
      tasks = [],
      events = [],
      mediaItems = [],
      transactions = [],
      categories = [],
      kanbanCards = [],
    } = body.data;

    const summary = {
      importedUsers: 0,
      importedFolders: 0,
      importedNotes: 0,
      importedScripts: 0,
      importedTasks: 0,
      importedEvents: 0,
      importedMediaItems: 0,
      importedTransactions: 0,
      importedCategories: 0,
      importedKanbanCards: 0,
    };

    // 1. Non-destructively upsert Users first (parent of all data)
    for (const u of users) {
      if (!u.email) continue;
      await prisma.user.upsert({
        where: { email: u.email },
        update: {
          name: u.name || 'Kullanıcı',
          role: u.role || 'USER',
          status: u.status || 'APPROVED',
          subscriptionType: u.subscriptionType || 'AYLIK',
          subscriptionPlan: u.subscriptionPlan || 'Aylık',
          paymentStatus: u.paymentStatus || 'PENDING',
          ...(u.passwordHash ? { passwordHash: u.passwordHash } : {}),
        },
        create: {
          id: u.id || undefined,
          name: u.name || 'Kullanıcı',
          email: u.email,
          passwordHash: u.passwordHash || '$2b$10$defaultHashPlaceholder',
          role: u.role || 'USER',
          status: u.status || 'APPROVED',
          subscriptionType: u.subscriptionType || 'AYLIK',
          subscriptionPlan: u.subscriptionPlan || 'Aylık',
          paymentStatus: u.paymentStatus || 'PENDING',
          createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
        },
      });
      summary.importedUsers++;
    }

    // 2. Folders
    for (const f of folders) {
      if (!f.id || !f.userId) continue;
      const userExists = await prisma.user.findUnique({ where: { id: f.userId } });
      if (!userExists) continue;

      await prisma.folder.upsert({
        where: { id: f.id },
        update: {
          name: f.name,
          description: f.description ?? null,
          iconName: f.iconName ?? 'Folder',
          isSystem: Boolean(f.isSystem),
        },
        create: {
          id: f.id,
          userId: f.userId,
          name: f.name,
          description: f.description ?? null,
          iconName: f.iconName ?? 'Folder',
          isSystem: Boolean(f.isSystem),
          createdAt: f.createdAt ? new Date(f.createdAt) : new Date(),
        },
      });
      summary.importedFolders++;
    }

    // 3. Notes
    for (const n of notes) {
      if (!n.id || !n.userId) continue;
      const userExists = await prisma.user.findUnique({ where: { id: n.userId } });
      if (!userExists) continue;

      await prisma.note.upsert({
        where: { id: n.id },
        update: {
          title: n.title,
          content: n.content ?? '',
          folder: n.folder ?? 'genel',
          tags: typeof n.tags === 'string' ? n.tags : JSON.stringify(n.tags || []),
          isFavorite: Boolean(n.isFavorite),
          isPinned: Boolean(n.isPinned),
        },
        create: {
          id: n.id,
          userId: n.userId,
          title: n.title,
          content: n.content ?? '',
          folder: n.folder ?? 'genel',
          tags: typeof n.tags === 'string' ? n.tags : JSON.stringify(n.tags || []),
          isFavorite: Boolean(n.isFavorite),
          isPinned: Boolean(n.isPinned),
          createdAt: n.createdAt ? new Date(n.createdAt) : new Date(),
        },
      });
      summary.importedNotes++;
    }

    // 4. Scripts
    for (const s of scripts) {
      if (!s.id || !s.userId) continue;
      const userExists = await prisma.user.findUnique({ where: { id: s.userId } });
      if (!userExists) continue;

      await prisma.script.upsert({
        where: { id: s.id },
        update: {
          title: s.title,
          targetPlatform: s.targetPlatform ?? 'YouTube',
          status: s.status ?? 'fikir',
          sections: typeof s.sections === 'string' ? s.sections : JSON.stringify(s.sections || []),
          speakingRateWPM: Number(s.speakingRateWPM) || 130,
          linkedNoteId: s.linkedNoteId ?? null,
          tags: typeof s.tags === 'string' ? s.tags : JSON.stringify(s.tags || []),
        },
        create: {
          id: s.id,
          userId: s.userId,
          title: s.title,
          targetPlatform: s.targetPlatform ?? 'YouTube',
          status: s.status ?? 'fikir',
          sections: typeof s.sections === 'string' ? s.sections : JSON.stringify(s.sections || []),
          speakingRateWPM: Number(s.speakingRateWPM) || 130,
          linkedNoteId: s.linkedNoteId ?? null,
          tags: typeof s.tags === 'string' ? s.tags : JSON.stringify(s.tags || []),
          createdAt: s.createdAt ? new Date(s.createdAt) : new Date(),
        },
      });
      summary.importedScripts++;
    }

    // 5. Tasks
    for (const t of tasks) {
      if (!t.id || !t.userId) continue;
      const userExists = await prisma.user.findUnique({ where: { id: t.userId } });
      if (!userExists) continue;

      await prisma.task.upsert({
        where: { id: t.id },
        update: {
          title: t.title,
          description: t.description ?? null,
          completed: Boolean(t.completed),
          priority: t.priority ?? 'orta',
          dueDate: t.dueDate ?? null,
          linkedNoteId: t.linkedNoteId ?? null,
          linkedScriptId: t.linkedScriptId ?? null,
          completedAt: t.completedAt ? new Date(t.completedAt) : null,
        },
        create: {
          id: t.id,
          userId: t.userId,
          title: t.title,
          description: t.description ?? null,
          completed: Boolean(t.completed),
          priority: t.priority ?? 'orta',
          dueDate: t.dueDate ?? null,
          linkedNoteId: t.linkedNoteId ?? null,
          linkedScriptId: t.linkedScriptId ?? null,
          completedAt: t.completedAt ? new Date(t.completedAt) : null,
          createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
        },
      });
      summary.importedTasks++;
    }

    // 6. Calendar Events
    for (const e of events) {
      if (!e.id || !e.userId) continue;
      const userExists = await prisma.user.findUnique({ where: { id: e.userId } });
      if (!userExists) continue;

      await prisma.calendarEvent.upsert({
        where: { id: e.id },
        update: {
          title: e.title,
          description: e.description ?? null,
          date: e.date,
          time: e.time ?? null,
          durationMinutes: Number(e.durationMinutes) || 30,
          eventType: e.eventType ?? 'gorev',
          platform: e.platform ?? null,
          linkedScriptId: e.linkedScriptId ?? null,
          linkedNoteId: e.linkedNoteId ?? null,
          linkedTaskId: e.linkedTaskId ?? null,
          status: e.status ?? 'planlandi',
          checklist: typeof e.checklist === 'string' ? e.checklist : JSON.stringify(e.checklist || []),
        },
        create: {
          id: e.id,
          userId: e.userId,
          title: e.title,
          description: e.description ?? null,
          date: e.date,
          time: e.time ?? null,
          durationMinutes: Number(e.durationMinutes) || 30,
          eventType: e.eventType ?? 'gorev',
          platform: e.platform ?? null,
          linkedScriptId: e.linkedScriptId ?? null,
          linkedNoteId: e.linkedNoteId ?? null,
          linkedTaskId: e.linkedTaskId ?? null,
          status: e.status ?? 'planlandi',
          checklist: typeof e.checklist === 'string' ? e.checklist : JSON.stringify(e.checklist || []),
          createdAt: e.createdAt ? new Date(e.createdAt) : new Date(),
        },
      });
      summary.importedEvents++;
    }

    // 7. Media Items
    for (const m of mediaItems) {
      if (!m.id || !m.userId) continue;
      const userExists = await prisma.user.findUnique({ where: { id: m.userId } });
      if (!userExists) continue;

      await prisma.mediaItem.upsert({
        where: { id: m.id },
        update: {
          title: m.title,
          description: m.description ?? null,
          type: m.type ?? 'image',
          url: m.url,
          thumbnailUrl: m.thumbnailUrl ?? null,
          linkedNoteId: m.linkedNoteId ?? null,
          linkedScriptId: m.linkedScriptId ?? null,
          tags: typeof m.tags === 'string' ? m.tags : JSON.stringify(m.tags || []),
        },
        create: {
          id: m.id,
          userId: m.userId,
          title: m.title,
          description: m.description ?? null,
          type: m.type ?? 'image',
          url: m.url,
          thumbnailUrl: m.thumbnailUrl ?? null,
          linkedNoteId: m.linkedNoteId ?? null,
          linkedScriptId: m.linkedScriptId ?? null,
          tags: typeof m.tags === 'string' ? m.tags : JSON.stringify(m.tags || []),
          createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
        },
      });
      summary.importedMediaItems++;
    }

    // 8. Finance Transactions
    for (const t of transactions) {
      if (!t.id || !t.userId) continue;
      const userExists = await prisma.user.findUnique({ where: { id: t.userId } });
      if (!userExists) continue;

      await prisma.financeTransaction.upsert({
        where: { id: t.id },
        update: {
          title: t.title,
          amount: Number(t.amount) || 0,
          type: t.type ?? 'gelir',
          category: t.category ?? 'Genel',
          date: t.date,
          endDate: t.endDate ?? null,
          currency: t.currency ?? 'TRY',
          originalAmount: t.originalAmount !== undefined && t.originalAmount !== null ? Number(t.originalAmount) : null,
          exchangeRate: t.exchangeRate !== undefined && t.exchangeRate !== null ? Number(t.exchangeRate) : null,
          markupTRY: t.markupTRY !== undefined && t.markupTRY !== null ? Number(t.markupTRY) : null,
          effectiveRate: t.effectiveRate !== undefined && t.effectiveRate !== null ? Number(t.effectiveRate) : null,
          description: t.description ?? null,
          linkedScriptId: t.linkedScriptId ?? null,
          isRecurring: Boolean(t.isRecurring),
          recurringFrequency: t.recurringFrequency ?? null,
          isConfirmed: Boolean(t.isConfirmed),
          dueDate: t.dueDate ?? null,
          priority: t.priority ?? 'orta',
        },
        create: {
          id: t.id,
          userId: t.userId,
          title: t.title,
          amount: Number(t.amount) || 0,
          type: t.type ?? 'gelir',
          category: t.category ?? 'Genel',
          date: t.date,
          endDate: t.endDate ?? null,
          currency: t.currency ?? 'TRY',
          originalAmount: t.originalAmount !== undefined && t.originalAmount !== null ? Number(t.originalAmount) : null,
          exchangeRate: t.exchangeRate !== undefined && t.exchangeRate !== null ? Number(t.exchangeRate) : null,
          markupTRY: t.markupTRY !== undefined && t.markupTRY !== null ? Number(t.markupTRY) : null,
          effectiveRate: t.effectiveRate !== undefined && t.effectiveRate !== null ? Number(t.effectiveRate) : null,
          description: t.description ?? null,
          linkedScriptId: t.linkedScriptId ?? null,
          isRecurring: Boolean(t.isRecurring),
          recurringFrequency: t.recurringFrequency ?? null,
          isConfirmed: Boolean(t.isConfirmed),
          dueDate: t.dueDate ?? null,
          priority: t.priority ?? 'orta',
          createdAt: t.createdAt ? new Date(t.createdAt) : new Date(),
        },
      });
      summary.importedTransactions++;
    }

    // 9. Finance Categories
    for (const c of categories) {
      if (!c.id || !c.userId) continue;
      const userExists = await prisma.user.findUnique({ where: { id: c.userId } });
      if (!userExists) continue;

      await prisma.financeCategory.upsert({
        where: { id: c.id },
        update: {
          name: c.name,
          type: c.type ?? 'gelir',
          isSystem: Boolean(c.isSystem),
        },
        create: {
          id: c.id,
          userId: c.userId,
          name: c.name,
          type: c.type ?? 'gelir',
          isSystem: Boolean(c.isSystem),
          createdAt: c.createdAt ? new Date(c.createdAt) : new Date(),
        },
      });
      summary.importedCategories++;
    }

    // 10. Kanban Cards
    for (const k of kanbanCards) {
      if (!k.id || !k.userId) continue;
      const userExists = await prisma.user.findUnique({ where: { id: k.userId } });
      if (!userExists) continue;

      await prisma.kanbanCard.upsert({
        where: { id: k.id },
        update: {
          title: k.title,
          description: k.description ?? null,
          projectType: k.projectType ?? 'genel',
          columnId: k.columnId ?? 'fikir',
          priority: k.priority ?? 'orta',
          dueDate: k.dueDate ?? null,
          tags: typeof k.tags === 'string' ? k.tags : JSON.stringify(k.tags || []),
          linkedScriptId: k.linkedScriptId ?? null,
          linkedNoteId: k.linkedNoteId ?? null,
        },
        create: {
          id: k.id,
          userId: k.userId,
          title: k.title,
          description: k.description ?? null,
          projectType: k.projectType ?? 'genel',
          columnId: k.columnId ?? 'fikir',
          priority: k.priority ?? 'orta',
          dueDate: k.dueDate ?? null,
          tags: typeof k.tags === 'string' ? k.tags : JSON.stringify(k.tags || []),
          linkedScriptId: k.linkedScriptId ?? null,
          linkedNoteId: k.linkedNoteId ?? null,
          createdAt: k.createdAt ? new Date(k.createdAt) : new Date(),
        },
      });
      summary.importedKanbanCards++;
    }

    return NextResponse.json({
      success: true,
      message: 'Veritabanı yedeği başarıyla içeri aktarıldı ve senkronize edildi.',
      summary,
    });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('Unauthorized') || err.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Yönetici yetkisi gereklidir.' }, { status: 403 });
    }
    console.error('Data import error:', error);
    return NextResponse.json(
      { error: 'Veriler içe aktarılırken bir hata oluştu: ' + err.message },
      { status: 500 }
    );
  }
}
