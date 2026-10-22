import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { handleRouteError } from '@/lib/apiUtils';
import { INITIAL_FINANCE_CATEGORIES } from '@/data/initialData';
import { decryptRow, decryptText, encryptRow } from '@/lib/dataCrypto';
import { encryptLegacyRows } from '@/lib/encryptLegacy';
import { parsePreferences } from '@/lib/preferences';
import { canView, type CorpModule } from '@/lib/corporate';
import { readMemberPreferences } from '@/lib/memberPreferences';

export async function GET() {
  try {
    const session = await requireAuth();
    const userId = session.userId;

    const user = await prisma.user.findUnique({ where: { id: userId }, select: { preferences: true, dataEncryptedAt: true } });
    // Accounts created before at-rest encryption: encrypt their existing rows once.
    if (user && !user.dataEncryptedAt) await encryptLegacyRows(userId);

    let categories = await prisma.financeCategory.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
    // Lazily seed finance categories for accounts created before seeding existed. Concurrent first
    // loads may race on the same ids, so a unique-constraint failure here is harmless.
    // (Note folders are not seeded: new accounts start with only the built-in “Favoriler” view.)
    if (categories.length === 0) {
      await prisma.financeCategory
        .createMany({
          data: INITIAL_FINANCE_CATEGORIES.map((cat) =>
            encryptRow('financeCategory', userId, {
              id: `${userId}_${cat.id}`,
              userId,
              name: cat.name,
              type: cat.type,
              isSystem: cat.isSystem || false,
            })
          ),
        })
        .catch(() => undefined);
      categories = await prisma.financeCategory.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } });
    }

    // Kurumsal: modules the member may not see are never sent (nor loaded).
    const may = (m: CorpModule) => canView(session, m);
    const none = Promise.resolve([] as never[]);
    if (!may('finance')) categories = [];
    // Shared space only; the "Şahsi" records of each person are loaded separately below.
    const shared = { userId, personalOf: null };
    const [folders, dbNotes, dbTasks, dbKanban, dbEvents, dbTransactions, dbCustomers] = await Promise.all([
      may('notes') ? prisma.folder.findMany({ where: shared, orderBy: { createdAt: 'asc' } }) : none,
      may('notes') ? prisma.note.findMany({ where: shared, orderBy: { updatedAt: 'desc' } }) : none,
      may('work') ? prisma.task.findMany({ where: { userId }, orderBy: { createdAt: 'desc' } }) : none,
      may('work') ? prisma.kanbanCard.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } }) : none,
      may('calendar') ? prisma.calendarEvent.findMany({ where: { userId }, orderBy: { date: 'asc' } }) : none,
      may('finance') ? prisma.financeTransaction.findMany({ where: shared, orderBy: { date: 'desc' } }) : none,
      may('customers') ? prisma.customer.findMany({ where: { userId }, orderBy: { createdAt: 'asc' } }) : none,
    ]);

    const customers = dbCustomers.map((raw) => {
      const c = decryptRow('customer', userId, raw);
      return {
        ...c,
        payments: safeJsonParse(c.payments, []),
        createdAt: c.createdAt.toISOString(),
        updatedAt: c.updatedAt.toISOString(),
      };
    });

    const noteOut = (raw: (typeof dbNotes)[number]) => {
      const n = decryptRow('note', userId, raw);
      return {
        ...n,
        tags: safeJsonParse<string[]>(n.tags, []),
        fileId: n.fileId ?? undefined,
        createdAt: n.createdAt.toISOString(),
        updatedAt: n.updatedAt.toISOString(),
      };
    };
    const notes = dbNotes.map(noteOut);

    const tasks = dbTasks.map((raw) => {
      const t = decryptRow('task', userId, raw);
      return {
        ...t,
        createdAt: t.createdAt.toISOString(),
        completedAt: t.completedAt ? t.completedAt.toISOString() : undefined,
      };
    });

    const kanbanCards = dbKanban.map((raw) => {
      const k = decryptRow('kanbanCard', userId, raw);
      return {
        ...k,
        tags: safeJsonParse<string[]>(k.tags, []),
        createdAt: k.createdAt.toISOString(),
        updatedAt: k.updatedAt.toISOString(),
      };
    });

    const events = dbEvents.map((raw) => {
      const e = decryptRow('calendarEvent', userId, raw);
      return { ...e, checklist: safeJsonParse(e.checklist, []), createdAt: e.createdAt.toISOString() };
    });

    const txOut = (raw: (typeof dbTransactions)[number]) => {
      const tx = decryptRow('financeTransaction', userId, raw);
      // Empty columns are left out (as in live updates), so the app sees `undefined`, not `null`.
      const set = Object.fromEntries(Object.entries(tx).filter(([, v]) => v !== null));
      return { ...set, currency: tx.currency || 'TRY', createdAt: tx.createdAt.toISOString() };
    };
    const transactions = dbTransactions.map(txOut);

    const folderOut = (raw: (typeof folders)[number]) => {
      const f = decryptRow('folder', userId, raw);
      return {
        id: stripUserPrefix(f.id, userId),
        name: f.name,
        description: f.description || undefined,
        iconName: f.iconName || undefined,
        isSystem: f.isSystem,
      };
    };
    const formattedFolders = folders.map(folderOut);

    // Kurumsal "Şahsi Notlar / Şahsi Finans": this person's private records (owner or member).
    let personal = null;
    if (session.accountType === 'CORPORATE') {
      const mine = { userId, personalOf: session.memberId ?? 'owner' };
      const [pf, pn, pt] = await Promise.all([
        prisma.folder.findMany({ where: mine, orderBy: { createdAt: 'asc' } }),
        prisma.note.findMany({ where: mine, orderBy: { updatedAt: 'desc' } }),
        prisma.financeTransaction.findMany({ where: mine, orderBy: { date: 'desc' } }),
      ]);
      personal = { folders: pf.map(folderOut), notes: pn.map(noteOut), transactions: pt.map(txOut) };
    }

    const formattedCategories = categories.map((raw) => {
      const c = decryptRow('financeCategory', userId, raw);
      return { id: stripUserPrefix(c.id, userId), name: c.name, type: c.type, isSystem: c.isSystem };
    });

    let preferences: unknown = {};
    try {
      if (session.memberId) preferences = await readMemberPreferences(session.memberId);
      else preferences = user?.preferences ? JSON.parse(decryptText(userId, user.preferences) || '{}') : {};
    } catch {
      preferences = {};
    }

    return NextResponse.json(
      {
        success: true,
        data: {
          notes,
          tasks,
          kanbanCards,
          events,
          transactions,
          customers,
          financeCategories: formattedCategories,
          folders: formattedFolders,
          personal,
          preferences: parsePreferences(preferences),
        },
      },
      { headers: { 'Cache-Control': 'no-store' } }
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
