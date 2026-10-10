import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { BadRequestError, handleRouteError, rateLimit, readJsonObject, tooManyRequests } from '@/lib/apiUtils';
import { isSafeMediaUrl } from '@/lib/safeUrl';

type Row = Record<string, unknown>;

// ---------------------------------------------------------------------------
// Field sanitizers — every value written to the DB passes through one of these.
// ---------------------------------------------------------------------------
const MAX_ID = 128;
const MAX_TITLE = 500;
const MAX_TEXT = 200_000; // long notes
const MAX_SHORT = 5_000;

function text(v: unknown, max: number, fallback = ''): string {
  if (typeof v !== 'string') return fallback;
  return v.length > max ? v.slice(0, max) : v;
}
function optText(v: unknown, max: number): string | null {
  return typeof v === 'string' && v !== '' ? text(v, max) : null;
}
function oneOf<T extends string>(v: unknown, allowed: readonly T[], fallback: T): T {
  return allowed.includes(v as T) ? (v as T) : fallback;
}
function int(v: unknown, fallback: number, min: number, max: number): number {
  const n = Math.round(Number(v));
  if (!Number.isFinite(n)) return fallback;
  return Math.min(max, Math.max(min, n));
}
function float(v: unknown, fallback: number): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
function optFloat(v: unknown): number | null {
  if (v === undefined || v === null || v === '') return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : null;
}
function optDate(v: unknown): Date | null {
  if (!v) return null;
  const d = new Date(v as string);
  return isNaN(d.getTime()) ? null : d;
}
function jsonArray(v: unknown, maxLength = MAX_TEXT): string {
  const json = JSON.stringify(Array.isArray(v) ? v : []);
  if (json.length > maxLength) throw new BadRequestError('Gönderilen veri çok büyük.');
  return json;
}
function tags(v: unknown): string {
  const list = Array.isArray(v) ? v.filter((t): t is string => typeof t === 'string').slice(0, 50) : [];
  return JSON.stringify(list.map((t) => t.slice(0, 64)));
}
function ref(v: unknown): string | null {
  return typeof v === 'string' && v !== '' && v.length <= MAX_ID ? v : null;
}

const PRIORITIES = ['yuksek', 'orta', 'dusuk'] as const;

// ---------------------------------------------------------------------------
// Entity definitions. `fields` maps client data to DB columns (never userId/id).
// ---------------------------------------------------------------------------
type Delegate = {
  findUnique: (args: { where: { id: string }; select: { userId: true } }) => Promise<{ userId: string } | null>;
  upsert: (args: { where: { id: string }; update: Row; create: Row }) => Promise<Row>;
  deleteMany: (args: { where: { id: string; userId: string } }) => Promise<unknown>;
};

interface EntityDef {
  delegate: () => Delegate;
  fields: (d: Row) => Row;
  /** Extra fields only set on creation. */
  createOnly?: (d: Row) => Row;
  /** Folder / category ids are namespaced per user in the DB. */
  namespaced?: boolean;
}

const ENTITIES: Record<string, EntityDef> = {
  note: {
    delegate: () => prisma.note as unknown as Delegate,
    fields: (d) => ({
      title: text(d.title, MAX_TITLE),
      content: text(d.content, MAX_TEXT),
      folder: text(d.folder, MAX_ID, 'genel') || 'genel',
      tags: tags(d.tags),
      isFavorite: Boolean(d.isFavorite),
      isPinned: Boolean(d.isPinned),
    }),
  },

  task: {
    delegate: () => prisma.task as unknown as Delegate,
    fields: (d) => ({
      title: text(d.title, MAX_TITLE),
      description: optText(d.description, MAX_SHORT),
      completed: Boolean(d.completed),
      priority: oneOf(d.priority, PRIORITIES, 'orta'),
      dueDate: optText(d.dueDate, 40),
      linkedNoteId: ref(d.linkedNoteId),
      completedAt: optDate(d.completedAt),
    }),
  },
  kanban: {
    delegate: () => prisma.kanbanCard as unknown as Delegate,
    fields: (d) => ({
      title: text(d.title, MAX_TITLE),
      description: optText(d.description, MAX_SHORT),
      projectType: text(d.projectType, 64, 'genel') || 'genel',
      columnId: oneOf(d.columnId, ['fikir', 'yapilacak', 'devam_ediyor', 'inceleme', 'tamamlandi'] as const, 'fikir'),
      priority: oneOf(d.priority, PRIORITIES, 'orta'),
      dueDate: optText(d.dueDate, 40),
      tags: tags(d.tags),
      linkedNoteId: ref(d.linkedNoteId),
    }),
  },
  event: {
    delegate: () => prisma.calendarEvent as unknown as Delegate,
    fields: (d) => ({
      title: text(d.title, MAX_TITLE),
      description: optText(d.description, MAX_SHORT),
      date: text(d.date, 40),
      time: optText(d.time, 10),
      durationMinutes: int(d.durationMinutes, 30, 0, 7 * 24 * 60),
      eventType: oneOf(d.eventType, ['yayin', 'gorev', 'ozel_gun', 'finans'] as const, 'gorev'),
      platform: optText(d.platform, 32),
      linkedNoteId: ref(d.linkedNoteId),
      linkedTaskId: ref(d.linkedTaskId),
      status: oneOf(d.status, ['planlandi', 'hazirlaniyor', 'yayinlandi', 'iptal'] as const, 'planlandi'),
      checklist: jsonArray(d.checklist, MAX_SHORT * 4),
    }),
  },
  media: {
    delegate: () => prisma.mediaItem as unknown as Delegate,
    fields: (d) => {
      const url = text(d.url, 2_000_000).trim();
      if (!isSafeMediaUrl(url)) {
        throw new BadRequestError('Geçersiz medya bağlantısı. Yalnızca http(s) veya görsel verisi kabul edilir.');
      }
      const thumbnailUrl = optText(d.thumbnailUrl, 2048);
      return {
        title: text(d.title, MAX_TITLE),
        description: optText(d.description, MAX_SHORT),
        type: oneOf(d.type, ['image', 'sketch', 'video_link', 'diagram'] as const, 'image'),
        url,
        thumbnailUrl: thumbnailUrl && isSafeMediaUrl(thumbnailUrl) ? thumbnailUrl : null,
        linkedNoteId: ref(d.linkedNoteId),
        tags: tags(d.tags),
      };
    },
  },
  finance: {
    delegate: () => prisma.financeTransaction as unknown as Delegate,
    fields: (d) => ({
      title: text(d.title, MAX_TITLE),
      amount: float(d.amount, 0),
      type: oneOf(d.type, ['gelir', 'gider'] as const, 'gelir'),
      category: text(d.category, 128, 'Genel') || 'Genel',
      date: text(d.date, 40),
      endDate: optText(d.endDate, 40),
      currency: oneOf(d.currency, ['TRY', 'USD', 'EUR'] as const, 'TRY'),
      originalAmount: optFloat(d.originalAmount),
      exchangeRate: optFloat(d.exchangeRate),
      markupTRY: optFloat(d.markupTRY),
      effectiveRate: optFloat(d.effectiveRate),
      description: optText(d.description, MAX_SHORT),
      isRecurring: Boolean(d.isRecurring),
      recurringFrequency: d.recurringFrequency
        ? oneOf(d.recurringFrequency, ['gunluk', 'haftalik', 'aylik'] as const, 'aylik')
        : null,
      isConfirmed: Boolean(d.isConfirmed),
      dueDate: optText(d.dueDate, 40),
      priority: oneOf(d.priority, PRIORITIES, 'orta'),
    }),
  },
  folder: {
    namespaced: true,
    delegate: () => prisma.folder as unknown as Delegate,
    fields: (d) => ({
      name: text(d.name, 128),
      description: optText(d.description, MAX_SHORT),
      iconName: text(d.iconName, 64, 'Folder') || 'Folder',
    }),
    createOnly: (d) => ({ isSystem: Boolean(d.isSystem) }),
  },
  category: {
    namespaced: true,
    delegate: () => prisma.financeCategory as unknown as Delegate,
    fields: (d) => ({
      name: text(d.name, 128),
      type: oneOf(d.type, ['gelir', 'gider'] as const, 'gelir'),
    }),
    createOnly: (d) => ({ isSystem: Boolean(d.isSystem) }),
  },
};

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    const userId = session.userId;

    const wait = rateLimit(`mutate:${userId}`, 600, 60_000);
    if (wait) return tooManyRequests(wait);

    const body = await readJsonObject(req);
    const { entity, action } = body;
    const data = (body.data && typeof body.data === 'object' && !Array.isArray(body.data) ? body.data : {}) as Row;

    const def = typeof entity === 'string' && Object.hasOwn(ENTITIES, entity) ? ENTITIES[entity] : undefined;
    if (!def) {
      return NextResponse.json({ error: 'Bilinmeyen varlık türü.' }, { status: 400 });
    }
    if (action !== 'create' && action !== 'upsert' && action !== 'delete') {
      return NextResponse.json({ error: 'Geçersiz işlem.' }, { status: 400 });
    }

    const rawId = typeof body.id === 'string' && body.id ? body.id : data.id;
    if (typeof rawId !== 'string' || !rawId || rawId.length > MAX_ID) {
      return NextResponse.json({ error: 'Geçersiz kayıt kimliği.' }, { status: 400 });
    }
    const dbId = def.namespaced ? `${userId}_${rawId}` : rawId;
    const delegate = def.delegate();

    if (action === 'delete') {
      await delegate.deleteMany({ where: { id: dbId, userId } });
      return NextResponse.json({ success: true });
    }

    // Ownership check: an id that belongs to another user must never be updated.
    const existing = await delegate.findUnique({ where: { id: dbId }, select: { userId: true } });
    if (existing && existing.userId !== userId) {
      return NextResponse.json({ error: 'Bu kayda erişim yetkiniz yok.' }, { status: 403 });
    }

    const fields = def.fields(data);
    const item = await delegate.upsert({
      where: { id: dbId },
      update: fields,
      create: { id: dbId, userId, ...fields, ...(def.createOnly?.(data) ?? {}) },
    });

    return NextResponse.json({ success: true, item });
  } catch (error) {
    return handleRouteError(error, 'Data mutate error', 'Veri kaydedilirken hata oluştu.');
  }
}
