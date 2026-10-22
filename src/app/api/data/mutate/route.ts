import { after, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { BadRequestError, handleRouteError, rateLimit, readJsonObject, tooManyRequests } from '@/lib/apiUtils';
import { decryptText, encryptRow, type EncryptedModel } from '@/lib/dataCrypto';
import { ENTITY_MODULE, accessOf } from '@/lib/corporate';
import { publish, toClientShape } from '@/lib/realtime';
import { sendPush, workspaceDevices } from '@/lib/push';

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
function rate(v: unknown, max: number): number | null {
  const n = optFloat(v);
  return n === null ? null : Math.min(max, Math.max(0, n));
}
function ref(v: unknown): string | null {
  return typeof v === 'string' && v !== '' && v.length <= MAX_ID ? v : null;
}

const PRIORITIES = ['yuksek', 'orta', 'dusuk'] as const;

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
function date(v: unknown, fallback: string): string {
  return typeof v === 'string' && DATE_RE.test(v) ? v : fallback;
}
/**
 * Customer payments: one entry per paid month of the commitment. `by` (who recorded it) is kept from
 * the stored entry and set by the server for new ones; the client cannot change it.
 */
function payments(v: unknown, ctx?: MutateContext): string {
  const list = Array.isArray(v) ? v : [];
  const out: { month: string; paidAt: string; amount: number; by?: string }[] = [];
  const seen = new Set<string>();
  for (const p of list.slice(0, 600)) {
    if (!p || typeof p !== 'object') continue;
    const { month, paidAt, amount } = p as Record<string, unknown>;
    if (typeof month !== 'string' || !/^\d{4}-\d{2}$/.test(month) || seen.has(month)) continue;
    seen.add(month);
    // Payments stored before authors were recorded keep no author ('').
    const by = ctx?.paymentAuthors.has(month) ? ctx.paymentAuthors.get(month) : ctx?.author;
    out.push({ month, paidAt: date(paidAt, `${month}-01`), amount: Math.max(0, float(amount, 0)), ...(by ? { by } : {}) });
  }
  return JSON.stringify(out);
}

// ---------------------------------------------------------------------------
// Entity definitions. `fields` maps client data to DB columns (never userId/id).
// ---------------------------------------------------------------------------
type Delegate = {
  findUnique: (args: { where: { id: string }; select: Record<string, true> }) => Promise<{ userId: string; personalOf?: string | null } | null>;
  upsert: (args: { where: { id: string }; update: Row; create: Row }) => Promise<Row>;
  deleteMany: (args: { where: Row }) => Promise<unknown>;
  count: (args: { where: { userId: string } }) => Promise<number>;
};

/** Records of one kind an account may keep; stops a script from filling the disk. */
const MAX_ROWS_PER_ENTITY = 20_000;

/** Who is saving, and (customers) who recorded the payments already stored. */
interface MutateContext {
  author: string;
  paymentAuthors: Map<string, string>;
}

interface EntityDef {
  delegate: () => Delegate;
  /** Model name for at-rest encryption of its text fields. */
  model: EncryptedModel;
  fields: (d: Row, ctx: MutateContext) => Row;
  /** Extra fields only set on creation. */
  createOnly?: (d: Row, ctx: MutateContext) => Row;
  /** Folder / category ids are namespaced per user in the DB. */
  namespaced?: boolean;
  /** Kurumsal "Şahsi" space: the entity can also be a private record of one person. */
  personal?: boolean;
}

/** Note kinds: Markdown text, a spreadsheet (JSON in `content`) or a stored PDF (`fileId`). */
const NOTE_KINDS = ['text', 'table', 'pdf'] as const;
/** A spreadsheet note keeps its cells as JSON, which may be larger than a text note. */
const MAX_TABLE = 2_500_000;

const ENTITIES: Record<string, EntityDef> = {
  note: {
    delegate: () => prisma.note as unknown as Delegate,
    model: 'note',
    personal: true,
    fields: (d) => ({
      title: text(d.title, MAX_TITLE),
      content: text(d.content, d.kind === 'table' ? MAX_TABLE : MAX_TEXT),
      kind: oneOf(d.kind, NOTE_KINDS, 'text'),
      fileId: ref(d.fileId),
      // '' = not in any folder (new accounts have no folders, only the Favoriler view).
      folder: text(d.folder, MAX_ID),
      tags: tags(d.tags),
      isFavorite: Boolean(d.isFavorite),
      isPinned: Boolean(d.isPinned),
    }),
  },

  task: {
    delegate: () => prisma.task as unknown as Delegate,
    model: 'task',
    fields: (d) => ({
      title: text(d.title, MAX_TITLE),
      description: optText(d.description, MAX_SHORT),
      completed: Boolean(d.completed),
      priority: oneOf(d.priority, PRIORITIES, 'orta'),
      // Görev süresi aralığı: a start day only makes sense before (or on) the due day.
      startDate:
        typeof d.startDate === 'string' && DATE_RE.test(d.startDate) && typeof d.dueDate === 'string' && DATE_RE.test(d.dueDate) && d.startDate <= d.dueDate
          ? d.startDate
          : null,
      dueDate: optText(d.dueDate, 40),
      // Saat: only together with a due day.
      dueTime: typeof d.dueDate === 'string' && DATE_RE.test(d.dueDate) && typeof d.dueTime === 'string' && TIME_RE.test(d.dueTime) ? d.dueTime : null,
      linkedNoteId: ref(d.linkedNoteId),
      completedAt: optDate(d.completedAt),
    }),
    createOnly: (_d, ctx) => ({ createdBy: ctx.author }),
  },
  kanban: {
    delegate: () => prisma.kanbanCard as unknown as Delegate,
    model: 'kanbanCard',
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
    createOnly: (_d, ctx) => ({ createdBy: ctx.author }),
  },
  event: {
    delegate: () => prisma.calendarEvent as unknown as Delegate,
    model: 'calendarEvent',
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
    createOnly: (_d, ctx) => ({ createdBy: ctx.author }),
  },
  finance: {
    delegate: () => prisma.financeTransaction as unknown as Delegate,
    model: 'financeTransaction',
    personal: true,
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
        ? oneOf(d.recurringFrequency, ['gunluk', 'haftalik', 'aylik', 'yillik'] as const, 'aylik')
        : null,
      isConfirmed: Boolean(d.isConfirmed),
      dueDate: optText(d.dueDate, 40),
      priority: oneOf(d.priority, PRIORITIES, 'orta'),
      // Kredi / borç: interest and minimum payment are monthly percentages.
      isDebt: d.type === 'gider' && Boolean(d.isDebt),
      monthlyInterestRate: d.type === 'gider' && d.isDebt ? rate(d.monthlyInterestRate, 50) : null,
      minPaymentRate: d.type === 'gider' && d.isDebt ? rate(d.minPaymentRate, 100) : null,
    }),
    createOnly: (_d, ctx) => ({ createdBy: ctx.author }),
  },
  customer: {
    delegate: () => prisma.customer as unknown as Delegate,
    model: 'customer',
    fields: (d, ctx) => {
      const startDate = date(d.startDate, new Date().toISOString().slice(0, 10));
      const endDate = date(d.endDate, startDate);
      return {
        name: text(d.name, 200) || 'Adsız müşteri',
        contactName: optText(d.contactName, 200),
        phone: optText(d.phone, 40),
        email: optText(d.email, 254),
        address: optText(d.address, 1000),
        monthlyFee: Math.max(0, float(d.monthlyFee, 0)),
        paymentDay: int(d.paymentDay, 1, 1, 31),
        startDate,
        endDate: endDate < startDate ? startDate : endDate,
        payments: payments(d.payments, ctx),
        notes: optText(d.notes, MAX_SHORT),
      };
    },
    createOnly: (_d, ctx) => ({ createdBy: ctx.author }),
  },
  folder: {
    namespaced: true,
    personal: true,
    delegate: () => prisma.folder as unknown as Delegate,
    model: 'folder',
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
    model: 'financeCategory',
    fields: (d) => ({
      name: text(d.name, 128),
      type: oneOf(d.type, ['gelir', 'gider'] as const, 'gelir'),
    }),
    createOnly: (d) => ({ isSystem: Boolean(d.isSystem) }),
  },
};

const TRY = (n: unknown) => `${(Number(n) || 0).toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺`;

/** Notification text for a teammate's new record or newly recorded customer payment (null: none). */
function activityPush(entity: string, plain: Row, existingCtx: MutateContext | null, by: string): { title: string; body: string; tab: string } | null {
  const title = String(plain.title ?? '');
  if (entity === 'customer') {
    if (!existingCtx) return { title: `${by} yeni müşteri ekledi`, body: String(plain.name ?? ''), tab: 'customers' };
    let added: { month: string; amount: number }[] = [];
    try {
      added = (JSON.parse(String(plain.payments)) as { month: string; amount: number }[]).filter((p) => !existingCtx.paymentAuthors.has(p.month));
    } catch {}
    if (!added.length) return null;
    return { title: `${by} ödeme kaydetti`, body: `${plain.name} · ${TRY(added.reduce((sum, p) => sum + p.amount, 0))}`, tab: 'customers' };
  }
  if (existingCtx) return null; // only new records
  switch (entity) {
    case 'task':
      return { title: `${by} yeni görev ekledi`, body: title, tab: 'tasks' };
    case 'kanban':
      return { title: `${by} panoya kart ekledi`, body: title, tab: 'tasks' };
    case 'event':
      return { title: `${by} takvime etkinlik ekledi`, body: `${title} · ${plain.date ?? ''}`, tab: 'calendar' };
    case 'note':
      return { title: `${by} yeni not ekledi`, body: title || 'Başlıksız not', tab: 'notes' };
    case 'finance':
      return { title: `${by} yeni ${plain.type === 'gider' ? 'gider' : 'gelir'} kaydı ekledi`, body: `${title} · ${TRY(plain.amount)}`, tab: 'finance' };
    default:
      return null;
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    const userId = session.userId;

    const wait = rateLimit(`mutate:${session.memberId ?? userId}`, 600, 60_000);
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

    // Kurumsal "Şahsi Notlar / Şahsi Finans": a private record of the person signed in, outside the
    // shared space (and outside the team permissions). Everything else follows the permissions:
    // the owner / managers may edit everything, members per module (see Kurum page).
    // Müşteriler exists only for corporate accounts (accessOf returns 'none' otherwise).
    const personal = body.personal === true;
    if (personal && (!def.personal || session.accountType !== 'CORPORATE')) {
      return NextResponse.json({ error: 'Şahsi kayıt yalnızca kurumsal hesapta kullanılabilir.' }, { status: 400 });
    }
    const personalOf = personal ? (session.memberId ?? 'owner') : null;
    if (!personal && accessOf(session, ENTITY_MODULE[entity as string]) !== 'edit') {
      return NextResponse.json({ error: 'Bu bölümde değişiklik yapma yetkiniz yok.' }, { status: 403 });
    }

    const rawId = typeof body.id === 'string' && body.id ? body.id : data.id;
    if (typeof rawId !== 'string' || !rawId || rawId.length > MAX_ID) {
      return NextResponse.json({ error: 'Geçersiz kayıt kimliği.' }, { status: 400 });
    }
    const dbId = def.namespaced ? `${userId}_${rawId}` : rawId;
    const delegate = def.delegate();

    // Push the change to the account's other open tabs and devices (kurumsal: the whole team).
    const origin = (req.headers.get('x-client-id') ?? '').slice(0, 64);
    const broadcast = (payload?: Record<string, unknown>) => {
      publish(userId, { entity: entity as string, action, id: rawId, data: payload, by: session.name, origin, ...(personalOf ? { personalOf } : {}) });
    };
    // Shared records and each person's private ones are separate: neither can reach the other.
    const scope = def.personal ? { personalOf } : {};

    if (action === 'delete') {
      const note = entity === 'note' ? await prisma.note.findFirst({ where: { id: dbId, userId, ...scope }, select: { fileId: true } }) : null;
      await delegate.deleteMany({ where: { id: dbId, userId, ...scope } });
      // A PDF note's file goes with it (unless another note still shows it).
      if (note?.fileId && (await prisma.note.count({ where: { userId, fileId: note.fileId } })) === 0) {
        await prisma.storedFile.deleteMany({ where: { id: note.fileId, userId } });
      }
      broadcast();
      return NextResponse.json({ success: true });
    }

    // Ownership check: an id that belongs to another user (or to another space) must never be updated.
    const existing = await delegate.findUnique({ where: { id: dbId }, select: def.personal ? { userId: true, personalOf: true } : { userId: true } });
    if (existing && (existing.userId !== userId || (def.personal && (existing.personalOf ?? null) !== personalOf))) {
      return NextResponse.json({ error: 'Bu kayda erişim yetkiniz yok.' }, { status: 403 });
    }

    if (!existing && (await delegate.count({ where: { userId } })) >= MAX_ROWS_PER_ENTITY) {
      return NextResponse.json({ error: 'Bu bölümdeki kayıt sınırına ulaşıldı. Eski kayıtları silip tekrar deneyin.' }, { status: 409 });
    }

    const ctx: MutateContext = { author: session.name.slice(0, 80), paymentAuthors: new Map() };
    if (entity === 'customer' && existing) {
      // Keep who recorded each already-stored payment.
      const row = await prisma.customer.findUnique({ where: { id: dbId }, select: { payments: true } });
      try {
        const stored = JSON.parse(decryptText(userId, row?.payments ?? '') || '[]') as { month?: string; by?: string }[];
        for (const p of stored) if (p.month) ctx.paymentAuthors.set(p.month, p.by ?? '');
      } catch {}
    }
    const plain = def.fields(data, ctx);
    const created = existing ? {} : (def.createOnly?.(data, ctx) ?? {});
    const fields = encryptRow(def.model, userId, plain);
    await delegate.upsert({
      where: { id: dbId },
      update: fields,
      create: { id: dbId, userId, ...fields, ...created, ...scope },
    });

    // Kurumsal: teammates' phones and computers get a notification, even with the app closed.
    if (session.accountType === 'CORPORATE' && !personal) {
      const push = activityPush(entity as string, plain, existing ? ctx : null, session.name);
      if (push) {
        const entityModule = ENTITY_MODULE[entity as string];
        after(async () => sendPush(await workspaceDevices(userId, entityModule, { memberId: session.memberId ?? null }), { ...push, tag: `act-${entity}-${rawId}` }));
      }
    }

    const now = new Date().toISOString();
    broadcast({
      ...toClientShape({ ...plain, ...created }),
      id: rawId,
      updatedAt: now,
      ...(existing ? {} : { createdAt: now }),
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, 'Data mutate error', 'Veri kaydedilirken hata oluştu.');
  }
}
