import { NextResponse } from 'next/server';
import { randomBytes } from 'crypto';
import { prisma } from '@/lib/prisma';
import { hashPassword, requireAdmin } from '@/lib/auth';
import { handleRouteError, normalizeEmail, readJsonObject } from '@/lib/apiUtils';

// Full backups (all users, inline images) are much larger than ordinary requests.
const MAX_BACKUP_BYTES = 200 * 1024 * 1024;
import { academicDataSchema } from '@/lib/academic/schema';
import { catalogFields, universityById } from '@/lib/universities';
import { emailInUse } from '@/lib/loginEmail';
import { saveSchoolCalendar } from '@/lib/schoolCalendarServer';
import { createHash } from 'crypto';
import { decryptText, encryptBytes, encryptRow, encryptText, type EncryptedModel } from '@/lib/dataCrypto';
import { MAX_FILE_BYTES, fileTypeFor, packFile, unpackFile, type FilePurpose } from '@/lib/storedFiles';

type Row = Record<string, unknown>;

const str = (v: unknown, fallback = ''): string => (typeof v === 'string' ? v : fallback);
const optStr = (v: unknown): string | null => (typeof v === 'string' && v !== '' ? v : null);
const num = (v: unknown, fallback: number): number => {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
};
const optNum = (v: unknown): number | null =>
  v === undefined || v === null || v === '' || !Number.isFinite(Number(v)) ? null : Number(v);
const jsonStr = (v: unknown): string => (typeof v === 'string' ? v : JSON.stringify(Array.isArray(v) ? v : []));
const date = (v: unknown): Date => {
  const d = typeof v === 'string' || typeof v === 'number' ? new Date(v) : new Date(NaN);
  return isNaN(d.getTime()) ? new Date() : d;
};
const optDate = (v: unknown): Date | null => (v ? date(v) : null);
const oneOf = <T extends string>(v: unknown, allowed: readonly T[], fallback: T): T =>
  allowed.includes(v as T) ? (v as T) : fallback;

const asRows = (v: unknown): Row[] =>
  Array.isArray(v) ? v.filter((r): r is Row => !!r && typeof r === 'object' && !Array.isArray(r)) : [];

type Delegate = {
  findUnique: (args: { where: { id: string }; select: { userId: true } }) => Promise<{ userId: string } | null>;
  upsert: (args: { where: { id: string }; update: Row; create: Row }) => Promise<unknown>;
};

/**
 * Upserts rows owned by users. Rows whose user does not exist are skipped, and an existing row
 * that belongs to a different user is never overwritten.
 */
async function importOwnedRows(
  rows: Row[],
  delegate: Delegate,
  userIdMap: Map<string, string>,
  mapFields: (r: Row) => Row,
  model?: EncryptedModel
): Promise<number> {
  let count = 0;
  for (const r of rows) {
    const backupUserId = str(r.userId);
    const userId = userIdMap.get(backupUserId);
    let id = str(r.id);
    if (!id || !userId) continue;
    // Folder / category ids are namespaced as `${userId}_<id>`; re-namespace them for remapped users.
    if (userId !== backupUserId && id.startsWith(`${backupUserId}_`)) {
      id = `${userId}_${id.slice(backupUserId.length + 1)}`;
    }

    const existing = await delegate.findUnique({ where: { id }, select: { userId: true } });
    if (existing && existing.userId !== userId) continue;

    // Stored encrypted with the (possibly remapped) owner's key.
    const fields = model ? encryptRow(model, userId, mapFields(r)) : mapFields(r);
    await delegate.upsert({
      where: { id },
      update: fields,
      create: { id, userId, ...fields, createdAt: date(r.createdAt) },
    });
    count++;
  }
  return count;
}

export async function POST(req: Request) {
  try {
    const session = await requireAdmin();
    const body = await readJsonObject(req, MAX_BACKUP_BYTES);

    if (!body.data || typeof body.data !== 'object' || Array.isArray(body.data)) {
      return NextResponse.json(
        { error: 'Geçersiz yedekleme dosyası formatı. "data" nesnesi bulunamadı.' },
        { status: 400 }
      );
    }
    const data = body.data as Row;

    const summary = {
      importedFiles: 0,
      importedSecretNotes: 0,
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
      importedStudentProfiles: 0,
      importedCustomers: 0,
    };

    // Backup user id -> actual DB user id (an account with the same e-mail may already exist under another id).
    const userIdMap = new Map<string, string>();
    const existingUsers = await prisma.user.findMany({ select: { id: true } });
    existingUsers.forEach((u) => userIdMap.set(u.id, u.id));

    // 1. Users (parent of all data)
    for (const u of asRows(data.users)) {
      const email = normalizeEmail(u.email);
      if (!email) continue;

      const backupHash = typeof u.passwordHash === 'string' && u.passwordHash.startsWith('$2') ? u.passwordHash : null;
      const fields = {
        name: str(u.name, 'Kullanıcı').slice(0, 80) || 'Kullanıcı',
        role: oneOf(u.role, ['USER', 'ADMIN'] as const, 'USER'),
        status: oneOf(u.status, ['PENDING', 'APPROVED', 'REJECTED'] as const, 'APPROVED'),
        subscriptionType: oneOf(u.subscriptionType, ['AYLIK', 'TEK_SEFERLIK', 'VIP'] as const, 'AYLIK'),
        subscriptionPlan: oneOf(u.subscriptionPlan, ['Aylık', 'Tek Seferlik', 'VIP'] as const, 'Aylık'),
        paymentStatus: oneOf(u.paymentStatus, ['PENDING', 'MANUAL_APPROVED', 'SUCCESSFUL', 'WAIVED'] as const, 'PENDING'),
        accountType: oneOf(u.accountType, ['STANDARD', 'STUDENT', 'CORPORATE'] as const, 'STANDARD'),
        organization: optStr(u.organization)?.slice(0, 120) ?? null,
        seats: optNum(u.seats) === null ? null : Math.max(1, Math.round(optNum(u.seats)!)),
        // A verified address stays verified after a restore (2FA secrets are server-bound and are not restored).
        ...(typeof u.emailVerifiedAt === 'string' && !Number.isNaN(Date.parse(u.emailVerifiedAt)) ? { emailVerifiedAt: new Date(u.emailVerifiedAt) } : {}),
      };

      const existing = await prisma.user.findUnique({ where: { email } });
      let saved;
      if (existing) {
        // Never let a backup demote, lock out or change the password of the admin running the import.
        const isSelf = existing.id === session.userId;
        saved = await prisma.user.update({
          where: { id: existing.id },
          data: isSelf
            ? { name: fields.name }
            : { ...fields, ...(backupHash ? { passwordHash: backupHash, sessionVersion: { increment: 1 } } : {}) },
        });
      } else {
        const backupId = str(u.id);
        const idTaken = backupId ? await prisma.user.findUnique({ where: { id: backupId } }) : null;
        saved = await prisma.user.create({
          data: {
            ...(backupId && !idTaken ? { id: backupId } : {}),
            email,
            ...fields,
            // Without a valid hash the account gets an unguessable password; an admin can reset it later.
            passwordHash: backupHash || (await hashPassword(randomBytes(32).toString('base64url').slice(0, 64))),
            createdAt: date(u.createdAt),
          },
        });
      }
      if (str(u.id)) userIdMap.set(str(u.id), saved.id);
      summary.importedUsers++;
    }

    summary.importedFolders = await importOwnedRows(asRows(data.folders), prisma.folder as unknown as Delegate, userIdMap, (f) => ({
      name: str(f.name, 'Klasör'),
      description: optStr(f.description),
      iconName: str(f.iconName, 'Folder'),
      isSystem: Boolean(f.isSystem),
      // Kurumsal "Şahsi" records stay private after a restore.
      personalOf: optStr(f.personalOf),
    }), 'folder');

    summary.importedNotes = await importOwnedRows(asRows(data.notes), prisma.note as unknown as Delegate, userIdMap, (n) => ({
      title: str(n.title),
      content: str(n.content),
      folder: str(n.folder, 'genel'),
      tags: jsonStr(n.tags),
      isFavorite: Boolean(n.isFavorite),
      isPinned: Boolean(n.isPinned),
      kind: oneOf(n.kind, ['text', 'table', 'pdf'] as const, 'text'),
      fileId: optStr(n.fileId),
      personalOf: optStr(n.personalOf),
    }), 'note');

    summary.importedScripts = await importOwnedRows(asRows(data.scripts), prisma.script as unknown as Delegate, userIdMap, (s) => ({
      title: str(s.title),
      targetPlatform: str(s.targetPlatform, 'YouTube'),
      status: str(s.status, 'fikir'),
      sections: jsonStr(s.sections),
      speakingRateWPM: Math.round(num(s.speakingRateWPM, 130)) || 130,
      linkedNoteId: optStr(s.linkedNoteId),
      tags: jsonStr(s.tags),
    }));

    summary.importedTasks = await importOwnedRows(asRows(data.tasks), prisma.task as unknown as Delegate, userIdMap, (t) => ({
      title: str(t.title),
      description: optStr(t.description),
      completed: Boolean(t.completed),
      priority: str(t.priority, 'orta'),
      startDate: optStr(t.startDate),
      dueDate: optStr(t.dueDate),
      linkedNoteId: optStr(t.linkedNoteId),
      linkedScriptId: optStr(t.linkedScriptId),
      completedAt: optDate(t.completedAt),
      createdBy: optStr(t.createdBy),
    }), 'task');

    summary.importedEvents = await importOwnedRows(asRows(data.events), prisma.calendarEvent as unknown as Delegate, userIdMap, (e) => ({
      title: str(e.title),
      description: optStr(e.description),
      date: str(e.date),
      time: optStr(e.time),
      durationMinutes: Math.round(num(e.durationMinutes, 30)) || 30,
      eventType: str(e.eventType, 'gorev'),
      platform: optStr(e.platform),
      linkedScriptId: optStr(e.linkedScriptId),
      linkedNoteId: optStr(e.linkedNoteId),
      linkedTaskId: optStr(e.linkedTaskId),
      status: str(e.status, 'planlandi'),
      checklist: jsonStr(e.checklist),
      createdBy: optStr(e.createdBy),
    }), 'calendarEvent');

    summary.importedMediaItems = await importOwnedRows(asRows(data.mediaItems), prisma.mediaItem as unknown as Delegate, userIdMap, (m) => ({
      title: str(m.title),
      description: optStr(m.description),
      type: str(m.type, 'image'),
      url: str(m.url),
      thumbnailUrl: optStr(m.thumbnailUrl),
      linkedNoteId: optStr(m.linkedNoteId),
      linkedScriptId: optStr(m.linkedScriptId),
      tags: jsonStr(m.tags),
    }));

    summary.importedTransactions = await importOwnedRows(asRows(data.transactions), prisma.financeTransaction as unknown as Delegate, userIdMap, (t) => ({
      title: str(t.title),
      amount: num(t.amount, 0),
      type: str(t.type, 'gelir'),
      category: str(t.category, 'Genel'),
      date: str(t.date),
      endDate: optStr(t.endDate),
      currency: str(t.currency, 'TRY'),
      originalAmount: optNum(t.originalAmount),
      exchangeRate: optNum(t.exchangeRate),
      markupTRY: optNum(t.markupTRY),
      effectiveRate: optNum(t.effectiveRate),
      description: optStr(t.description),
      linkedScriptId: optStr(t.linkedScriptId),
      isRecurring: Boolean(t.isRecurring),
      recurringFrequency: optStr(t.recurringFrequency),
      isConfirmed: Boolean(t.isConfirmed),
      dueDate: optStr(t.dueDate),
      priority: str(t.priority, 'orta'),
      isDebt: Boolean(t.isDebt),
      monthlyInterestRate: optNum(t.monthlyInterestRate),
      minPaymentRate: optNum(t.minPaymentRate),
      createdBy: optStr(t.createdBy),
      personalOf: optStr(t.personalOf),
    }), 'financeTransaction');

    summary.importedCategories = await importOwnedRows(asRows(data.categories), prisma.financeCategory as unknown as Delegate, userIdMap, (c) => ({
      name: str(c.name, 'Kategori'),
      type: str(c.type, 'gelir'),
      isSystem: Boolean(c.isSystem),
    }), 'financeCategory');

    summary.importedKanbanCards = await importOwnedRows(asRows(data.kanbanCards), prisma.kanbanCard as unknown as Delegate, userIdMap, (k) => ({
      title: str(k.title),
      description: optStr(k.description),
      projectType: str(k.projectType, 'genel'),
      columnId: str(k.columnId, 'fikir'),
      priority: str(k.priority, 'orta'),
      dueDate: optStr(k.dueDate),
      tags: jsonStr(k.tags),
      linkedScriptId: optStr(k.linkedScriptId),
      linkedNoteId: optStr(k.linkedNoteId),
      createdBy: optStr(k.createdBy),
    }), 'kanbanCard');

    summary.importedCustomers = await importOwnedRows(asRows(data.customers), prisma.customer as unknown as Delegate, userIdMap, (c) => ({
      name: str(c.name, 'Müşteri'),
      contactName: optStr(c.contactName),
      phone: optStr(c.phone),
      email: optStr(c.email),
      address: optStr(c.address),
      monthlyFee: Math.max(0, num(c.monthlyFee, 0)),
      paymentDay: Math.min(31, Math.max(1, Math.round(num(c.paymentDay, 1)))),
      startDate: str(c.startDate).slice(0, 10),
      endDate: str(c.endDate).slice(0, 10),
      payments: jsonStr(c.payments),
      notes: optStr(c.notes),
      createdBy: optStr(c.createdBy),
    }), 'customer');

    // PDF notes' files: checked (type, size, hash) and encrypted again with this server's key.
    for (const f of asRows(data.storedFiles)) {
      const userId = userIdMap.get(str(f.userId));
      const id = str(f.id);
      const purpose: FilePurpose = f.purpose === 'sound' ? 'sound' : 'note';
      const found = fileTypeFor(purpose, str(f.mime));
      if (!userId || !/^[a-f0-9]{32}$/.test(id) || !found) continue;
      let bytes: Buffer;
      try {
        bytes = await unpackFile(Buffer.from(str(f.data), 'base64'), f.encoding === 'br' ? 'br' : null);
      } catch {
        continue; // damaged entry
      }
      const type = found.type;
      if (!bytes.length || bytes.length > MAX_FILE_BYTES || !type.check(bytes)) continue;
      const sha256 = createHash('sha256').update(bytes).digest('hex');
      if (str(f.sha256) && str(f.sha256) !== sha256) continue;
      const existing = await prisma.storedFile.findUnique({ where: { id }, select: { userId: true } });
      if (existing && existing.userId !== userId) continue;
      const packed = await packFile(bytes);
      const row = {
        personalOf: optStr(f.personalOf),
        purpose,
        name: encryptText(userId, str(f.name, 'belge.pdf').slice(0, 200)),
        mime: found.mime,
        size: bytes.length,
        sha256,
        compression: packed.compression ?? 'none',
        data: new Uint8Array(encryptBytes(userId, packed.data)),
      };
      await prisma.storedFile.upsert({ where: { id }, update: row, create: { id, userId, ...row, createdAt: date(f.createdAt) } });
      summary.importedFiles++;
    }

    // Gizli notlar: the vault and its notes stay encrypted with the user's own password.
    for (const v of asRows(data.secretVaults)) {
      const userId = userIdMap.get(str(v.userId));
      if (!userId || !str(v.salt) || !/^v1\./.test(str(v.check))) continue;
      const row = { salt: str(v.salt).slice(0, 64), check: str(v.check).slice(0, 400), iterations: Math.round(num(v.iterations, 600000)) };
      await prisma.secretVault.upsert({ where: { userId }, update: row, create: { userId, ...row } });
    }
    for (const n of asRows(data.secretNotes)) {
      const userId = userIdMap.get(str(n.userId));
      const id = str(n.id);
      const payload = str(n.payload);
      if (!userId || !/^[A-Za-z0-9_-]{1,64}$/.test(id) || !/^v1\.[A-Za-z0-9_-]{16}\.[A-Za-z0-9_-]+$/.test(payload) || payload.length > 1_500_000) continue;
      const existing = await prisma.secretNote.findUnique({ where: { id }, select: { userId: true } });
      if (existing && existing.userId !== userId) continue;
      await prisma.secretNote.upsert({
        where: { id },
        update: { payload: encryptText(userId, payload) },
        create: { id, userId, payload: encryptText(userId, payload), createdAt: date(n.createdAt) },
      });
      summary.importedSecretNotes++;
    }

    // Student profiles are 1:1 with users, keyed by userId.
    for (const sp of asRows(data.studentProfiles)) {
      const userId = userIdMap.get(str(sp.userId));
      if (!userId) continue;
      let academic = '{}';
      try {
        // Older backups may contain values encrypted with this server's key for the original owner.
        const raw = decryptText(str(sp.userId), str(sp.data, '{}')) || '{}';
        const parsed = academicDataSchema.safeParse(JSON.parse(raw));
        if (parsed.success) academic = JSON.stringify(parsed.data);
      } catch {
        academic = '{}';
      }
      const school = catalogFields({ universityId: optStr(sp.universityId), university: str(sp.university).slice(0, 120) });
      // A confirmed student sign-in address is kept unless another account uses it here.
      const loginEmail = normalizeEmail(sp.loginEmail);
      const fields = {
        ...school,
        loginEmail: loginEmail && !(await emailInUse(loginEmail, userId)) ? loginEmail : null,
        studentEmail: str(sp.studentEmail).slice(0, 254),
        department: str(sp.department).slice(0, 120),
        classYear: Math.min(7, Math.max(0, Math.round(num(sp.classYear, 1)))),
        studentNo: optStr(sp.studentNo),
        data: academic,
      };
      const stored = encryptRow('studentProfile', userId, fields);
      await prisma.studentProfile.upsert({ where: { userId }, update: stored, create: { userId, ...stored } });
      summary.importedStudentProfiles++;
    }

    for (const cal of asRows(data.universityCalendars)) {
      const university = universityById(str(cal.universityId));
      if (!university) continue;
      try {
        await saveSchoolCalendar(university.id, JSON.parse(str(cal.terms, '[]')), optStr(cal.sourceUrl), str(cal.updatedBy, 'yedek'));
      } catch {
        // An invalid calendar in the backup is skipped; the admin can publish it again.
      }
    }

    return NextResponse.json({
      success: true,
      message: 'Veritabanı yedeği başarıyla içeri aktarıldı ve senkronize edildi.',
      summary,
    });
  } catch (error) {
    return handleRouteError(error, 'Data import error', 'Veriler içe aktarılırken bir hata oluştu.');
  }
}
