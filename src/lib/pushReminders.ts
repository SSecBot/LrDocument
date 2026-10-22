import { prisma } from './prisma';
import { decryptBytes, decryptRow, decryptText, encryptBytes } from './dataCrypto';
import { packFile, unpackFile } from './storedFiles';
import { personDevices, sendPush, workspaceDevices, type PushPayload } from './push';
import type { CorpModule } from './corporate';
import { isTransactionActiveOnDate } from './recurringFinance';
import { academicDataSchema } from './academic/schema';
import { hasCalendar, isHoliday } from './academic/grading';
import { courseStudyStats, studyWarning } from './academic/study';
import type { FinanceTransaction } from '@/types';
import { DEFAULT_PREFERENCES, parsePreferences } from './preferences';

// ---------------------------------------------------------------------------
// Reminders pushed to phones, tablets and computers while the app is closed:
//   • görev: last day is today / deadline passed; at its saat when one is set
//   • ödeme / tahsilat: date is today / date passed (also recurring ones and kredi ödeme günü)
//   • takvim: today's events
//   • öğrenci: a class reminder at the time chosen in Ayarlar (default 15 minutes before), exams today,
//     and the start / end of each slot of the ders çalışma takvimi
// Every reminder is sent once (PushSent); several of the same kind are grouped into one notification.
// Runs every few minutes inside the server process (src/instrumentation.ts). Day reminders go out only
// between 08:00 and 22:00 Türkiye time; class reminders follow the timetable.
// ---------------------------------------------------------------------------

const TZ = 'Europe/Istanbul';
/** A reminder whose moment passed less than this long ago is still sent (the sweep runs every 5 minutes). */
const CLASS_WINDOW_MIN = 10;

export function nowTR(d = new Date()) {
  const parts = Object.fromEntries(
    new Intl.DateTimeFormat('en-GB', { timeZone: TZ, year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', weekday: 'short', hour12: false })
      .formatToParts(d)
      .map((p) => [p.type, p.value])
  );
  const hour = Number(parts.hour) % 24;
  return {
    date: `${parts.year}-${parts.month}-${parts.day}`,
    hour,
    minutes: hour * 60 + Number(parts.minute),
    /** 0 = Pazartesi … 6 = Pazar */
    weekday: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].indexOf(parts.weekday),
  };
}
type Now = ReturnType<typeof nowTR>;

interface Item {
  key: string;
  label: string;
  /** Classes: minutes until the start (negative once it started) */
  left?: number;
}

function group(items: Item[], one: (i: Item) => PushPayload, many: (n: number, list: string) => PushPayload): PushPayload {
  if (items.length === 1) return one(items[0]);
  const list = items.slice(0, 3).map((i) => i.label).join(', ') + (items.length > 3 ? '…' : '');
  return many(items.length, list);
}

async function unsent(items: Item[]): Promise<Item[]> {
  if (!items.length) return [];
  const done = await prisma.pushSent.findMany({ where: { key: { in: items.map((i) => i.key) } }, select: { key: true } });
  const doneSet = new Set(done.map((d) => d.key));
  return items.filter((i) => !doneSet.has(i.key));
}

/** Sends the not yet sent items of one kind as one notification. */
async function remind(
  userId: string,
  module: CorpModule | null,
  all: Item[],
  one: (i: Item) => PushPayload,
  many: (n: number, list: string) => PushPayload,
  /** Kurumsal "Şahsi" records: only this person's devices ("owner" or a member id) */
  who?: string
): Promise<number> {
  const items = await unsent(all);
  if (!items.length) return 0;
  const devices = who ? await personDevices(userId, who) : await workspaceDevices(userId, module);
  if (!devices.length) return 0;
  // Mark first: a slow push service must not cause a second copy on the next run.
  await prisma.pushSent.createMany({ data: items.map((i) => ({ key: i.key })) });
  return sendPush(devices, group(items, one, many));
}

const money = (t: { amount: number }) => `${t.amount.toLocaleString('tr-TR', { maximumFractionDigits: 2 })} ₺`;

/** Görevler, ödemeler, takvim: once a day (08:00–22:00). */
async function dayReminders(userId: string, today: string): Promise<number> {
  let sent = 0;
  const [tasks, events, transactions] = await Promise.all([
    prisma.task.findMany({ where: { userId, completed: false, dueDate: { lte: today, not: null } } }),
    prisma.calendarEvent.findMany({ where: { userId, date: today, status: { notIn: ['iptal', 'yayinlandi'] } } }),
    prisma.financeTransaction.findMany({
      where: { userId, OR: [{ isConfirmed: false, date: { lte: today } }, { isRecurring: true }, { isDebt: true }] },
    }),
  ]);

  // Görevler: son gün bugün / süresi geçti (a task with a saat also gets its own reminder at that time)
  const taskRows = tasks.map((raw) => decryptRow('task', userId, raw));
  const label = (t: { title: string; dueTime?: string | null }) => `${t.dueTime ? `${t.dueTime} ` : ''}${t.title || 'Başlıksız görev'}`;
  sent += await remind(
    userId,
    'work',
    taskRows.filter((t) => t.dueDate === today).map((t) => ({ key: `task-due:${t.id}:${t.dueDate}`, label: label(t) })),
    (i) => ({ title: 'Görevin son günü bugün', body: i.label, tab: 'tasks', tag: 'lr-due-tasks' }),
    (n, list) => ({ title: `${n} görevin son günü bugün`, body: list, tab: 'tasks', tag: 'lr-due-tasks' })
  );
  sent += await remind(
    userId,
    'work',
    taskRows.filter((t) => t.dueDate! < today).map((t) => ({ key: `task-overdue:${t.id}:${t.dueDate}`, label: label(t) })),
    (i) => ({ title: 'Görevin süresi geçti', body: i.label, tab: 'tasks', tag: 'lr-overdue-tasks' }),
    (n, list) => ({ title: `${n} görevin süresi geçti`, body: list, tab: 'tasks', tag: 'lr-overdue-tasks' })
  );

  // Bugünkü etkinlikler
  sent += await remind(
    userId,
    'calendar',
    events
      .map((raw) => decryptRow('calendarEvent', userId, raw))
      .map((e) => ({ key: `event-today:${e.id}:${e.date}`, label: `${e.time ? `${e.time} ` : ''}${e.title || 'Etkinlik'}` })),
    (i) => ({ title: 'Bugün takviminde', body: i.label, tab: 'calendar', tag: 'lr-today' }),
    (n, list) => ({ title: `Bugün ${n} etkinliğin var`, body: list, tab: 'calendar', tag: 'lr-today' })
  );

  // Ödemeler ve tahsilatlar: the shared ones, and each person's "Şahsi Finans" separately.
  const fin = transactions.map((raw) => decryptRow('financeTransaction', userId, raw));
  for (const who of new Set(fin.map((t) => t.personalOf ?? ''))) {
    sent += await financeReminders(userId, today, fin.filter((t) => (t.personalOf ?? '') === who), who || undefined);
  }
  return sent;
}

type FinRow = Awaited<ReturnType<typeof prisma.financeTransaction.findMany>>[number];

async function financeReminders(userId: string, today: string, fin: FinRow[], who?: string): Promise<number> {
  let sent = 0;
  const tab = who ? 'personalFinance' : 'finance';
  const dueToday: Item[] = [];
  const overdue: Item[] = [];
  for (const t of fin) {
    const what = t.type === 'gelir' ? 'tahsilat' : 'ödeme';
    if (t.isDebt) {
      // Kredi / borç: `date` is the next payment day; it moves a month on with "Asgariyi öde".
      if (t.amount <= 0) continue;
      if (t.date === today) dueToday.push({ key: `debt-due:${t.id}:${t.date}`, label: `${t.title} (kredi / borç ödemesi)` });
      else if (t.date < today) overdue.push({ key: `debt-overdue:${t.id}:${t.date}`, label: `${t.title} (kredi / borç ödemesi)` });
    } else if (t.isRecurring) {
      // Tekrarlayan: the day it comes round (daily ones would be noise).
      if (t.recurringFrequency !== 'gunluk' && isTransactionActiveOnDate(t as unknown as FinanceTransaction, today)) {
        dueToday.push({ key: `fin-due:${t.id}:${today}`, label: `${t.title} — ${money(t)} ${what}` });
      }
    } else if (!t.isConfirmed) {
      if (t.date === today) dueToday.push({ key: `fin-due:${t.id}:${t.date}`, label: `${t.title} — ${money(t)} ${what}` });
      else if (t.date < today) overdue.push({ key: `fin-overdue:${t.id}:${t.date}`, label: `${t.title} — ${money(t)} ${what}` });
    }
  }
  sent += await remind(
    userId,
    'finance',
    dueToday,
    (i) => ({ title: 'Bugün ödeme günü', body: i.label, tab, tag: 'lr-due-finance' }),
    (n, list) => ({ title: `Bugün ${n} ödeme / tahsilat günü`, body: list, tab, tag: 'lr-due-finance' }),
    who
  );
  sent += await remind(
    userId,
    'finance',
    overdue,
    (i) => ({ title: 'Ödeme tarihi geçti', body: i.label, tab, tag: 'lr-overdue-finance' }),
    (n, list) => ({ title: `${n} ödemenin tarihi geçti`, body: list, tab, tag: 'lr-overdue-finance' }),
    who
  );
  return sent;
}

/** Görev with a saat: a reminder at that time on its due day (any hour, like class reminders). */
async function taskTimeReminders(userId: string, now: Now): Promise<number> {
  const tasks = await prisma.task.findMany({ where: { userId, completed: false, dueDate: now.date, dueTime: { not: null } } });
  const due: Item[] = [];
  for (const raw of tasks) {
    const t = decryptRow('task', userId, raw);
    const since = now.minutes - toMin(t.dueTime!);
    if (since < 0 || since >= CLASS_WINDOW_MIN) continue;
    due.push({ key: `task-time:${t.id}:${t.dueDate}:${t.dueTime}`, label: `${t.dueTime} ${t.title || 'Başlıksız görev'}` });
  }
  return remind(
    userId,
    'work',
    due,
    (i) => ({ title: 'Görevin saati geldi', body: i.label, tab: 'tasks', tag: 'lr-task-time' }),
    (n, list) => ({ title: `${n} görevin saati geldi`, body: list, tab: 'tasks', tag: 'lr-task-time' })
  );
}

/** Title from the real minutes left (the sweep runs every few minutes, so it may differ from the setting). */
function classTitle(left: number, n: number): string {
  const what = n > 1 ? `${n} ders` : 'Ders';
  if (left > 0) return `${what} ${left} dakika sonra başlıyor`;
  if (left === 0) return `${what} başlıyor`;
  return `${what} ${-left} dakika önce başladı`;
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

/** Öğrenci: a class of the active term starts soon; exams today (with the day reminders). */
async function studentReminders(userId: string, now: Now, withDay: boolean): Promise<number> {
  const [profile, user] = await Promise.all([
    prisma.studentProfile.findUnique({ where: { userId }, select: { data: true } }),
    prisma.user.findUnique({ where: { id: userId }, select: { preferences: true } }),
  ]);
  if (!profile) return 0;
  let lead: number | null = DEFAULT_PREFERENCES.classReminderMinutes;
  try {
    if (user?.preferences) lead = parsePreferences(JSON.parse(decryptText(userId, user.preferences) || '{}')).classReminderMinutes;
  } catch {}
  let data;
  try {
    const parsed = academicDataSchema.safeParse(JSON.parse(decryptText(userId, profile.data) || '{}'));
    if (!parsed.success) return 0;
    data = parsed.data;
  } catch {
    return 0;
  }
  const term = data.terms.find((t) => t.id === data.activeTermId);
  if (!term) return 0;
  let sent = 0;

  // Classes: not outside the term's calendar, not on holidays / exam weeks / arife afternoons.
  const inTerm = !hasCalendar(term) || (now.date >= term.start && now.date <= term.end);
  const holiday = inTerm ? isHoliday(now.date, term) : undefined;
  if (lead !== null && inTerm && (!holiday || holiday.half)) {
    const soon: Item[] = [];
    for (const c of data.courses) {
      if (c.termId !== term.id) continue;
      for (const s of c.sessions) {
        if (s.day !== now.weekday || (holiday?.half && s.start >= '13:00')) continue;
        // Reminder moment = start − lead; sent by the first sweep at or after it.
        const since = now.minutes - (toMin(s.start) - lead);
        if (since < 0 || since >= CLASS_WINDOW_MIN) continue;
        soon.push({
          key: `class:${c.id}:${s.id}:${now.date}`,
          label: `${s.start} ${c.code ? `${c.code} ` : ''}${c.name}${s.room ? ` · ${s.room}` : ''}`,
          left: toMin(s.start) - now.minutes,
        });
      }
    }
    sent += await remind(
      userId,
      null,
      soon,
      (i) => ({ title: classTitle(i.left ?? lead, 1), body: i.label, tab: 'academic', tag: 'lr-class' }),
      (n, list) => ({ title: classTitle(Math.min(...soon.map((x) => x.left ?? lead)), n), body: list, tab: 'academic', tag: 'lr-class' })
    );
  }

  // Ders çalışma takvimi: when a study slot starts and when it ends (any day of the term).
  const study = data.study;
  if (study && study.reminders !== false && (!hasCalendar(term) || (now.date >= term.start && now.date <= term.end))) {
    const courses = new Map(data.courses.map((c) => [c.id, c]));
    const starting: Item[] = [];
    const ending: Item[] = [];
    for (const s of study.sessions) {
      const course = courses.get(s.courseId);
      if (s.termId !== term.id || s.day !== now.weekday || !course || s.since > now.date) continue;
      const name = `${course.code ? `${course.code} ` : ''}${course.name}`;
      const label = `${s.start}–${s.end} ${name}`;
      const sinceStart = now.minutes - toMin(s.start);
      if (sinceStart >= 0 && sinceStart < CLASS_WINDOW_MIN) starting.push({ key: `study-start:${s.id}:${now.date}`, label });
      const sinceEnd = now.minutes - toMin(s.end);
      if (sinceEnd >= 0 && sinceEnd < CLASS_WINDOW_MIN) ending.push({ key: `study-end:${s.id}:${now.date}:${s.courseId}`, label });
    }
    sent += await remind(
      userId,
      null,
      starting,
      (i) => ({ title: 'Ders çalışma vakti', body: i.label, tab: 'academic', tag: 'lr-study' }),
      (n, list) => ({ title: `${n} ders çalışması başlıyor`, body: list, tab: 'academic', tag: 'lr-study' })
    );
    if (ending.length) {
      // The end notice also says when too much study time was missed (%40 rule).
      // Today's slots are left out: the student has not had a chance to mark them yet.
      const stats = courseStudyStats(data, term, data.courses.filter((c) => c.termId === term.id), { date: now.date, minutes: 0 });
      const warnings = ending
        .map((i) => stats.find((s) => s.course.id === i.key.split(':')[3]))
        .filter((s): s is NonNullable<typeof s> => !!s && s.warn)
        .map((s) => studyWarning(s));
      const extra = warnings.length
        ? `\n${[...new Set(warnings)].join('\n')}`
        : '\nÇalıştıysanız Ders Takibi › Çalışma takviminden işaretleyin.';
      sent += await remind(
        userId,
        null,
        ending,
        (i) => ({ title: 'Ders çalışması bitti', body: `${i.label}${extra}`, tab: 'academic', tag: 'lr-study-end' }),
        (n, list) => ({ title: `${n} ders çalışması bitti`, body: `${list}${extra}`, tab: 'academic', tag: 'lr-study-end' })
      );
    }
  }

  if (withDay) {
    const courseName = new Map(data.courses.map((c) => [c.id, c.name]));
    sent += await remind(
      userId,
      null,
      (data.exams ?? [])
        .filter((e) => e.date === now.date)
        .map((e) => ({
          key: `exam-today:${e.id}:${e.date}`,
          label: `${e.start ? `${e.start} ` : ''}${e.title || (e.courseId && courseName.get(e.courseId)) || 'Sınav'}${e.room ? ` · ${e.room}` : ''}`,
        })),
      (i) => ({ title: 'Bugün sınavın var', body: i.label, tab: 'academic', tag: 'lr-exam' }),
      (n, list) => ({ title: `Bugün ${n} sınavın var`, body: list, tab: 'academic', tag: 'lr-exam' })
    );
  }
  return sent;
}

/** Uploaded files that never became (or no longer are) a note's PDF, after a day. */
async function cleanupOrphanFiles() {
  const old = await prisma.storedFile.findMany({ where: { purpose: 'note', createdAt: { lt: new Date(Date.now() - 86_400_000) } }, select: { id: true, userId: true } });
  if (!old.length) return;
  const used = new Set(
    (await prisma.note.findMany({ where: { fileId: { in: old.map((f) => f.id) } }, select: { fileId: true } })).map((n) => n.fileId)
  );
  const orphans = old.filter((f) => !used.has(f.id)).map((f) => f.id);
  if (orphans.length) await prisma.storedFile.deleteMany({ where: { id: { in: orphans } } });
}

/**
 * Files stored before compression existed are compressed a few at a time, so the database and its
 * backups shrink without slowing the server down.
 */
async function compressOldFiles() {
  const rows = await prisma.storedFile.findMany({ where: { compression: null }, orderBy: { createdAt: 'asc' }, take: 5 });
  for (const f of rows) {
    try {
      const plain = await unpackFile(decryptBytes(f.userId, Buffer.from(f.data)), null);
      const packed = await packFile(plain);
      // Not worth it: mark as checked ("none") so it is not tried again.
      await prisma.storedFile.update({
        where: { id: f.id },
        data: packed.compression ? { compression: 'br', data: new Uint8Array(encryptBytes(f.userId, packed.data)) } : { compression: 'none' },
      });
    } catch {
      await prisma.storedFile.update({ where: { id: f.id }, data: { compression: 'none' } }).catch(() => {});
    }
  }
}

let running = false;
const SWEEP_KEY = 'pushSweep';

/** Last finished run (shown in Yönetici Paneli). Stored in the DB: the timer and the routes may run in separate bundles. */
export async function getSweepInfo(): Promise<{ lastRunAt: string | null; lastSent: number }> {
  try {
    const row = await prisma.systemSetting.findUnique({ where: { key: SWEEP_KEY } });
    return row ? JSON.parse(row.value) : { lastRunAt: null, lastSent: 0 };
  } catch {
    return { lastRunAt: null, lastSent: 0 };
  }
}

/**
 * One pass over every account that has a device subscribed. Returns the notifications delivered.
 * `ignoreHours`: day reminders also outside 08:00–22:00 (admin "şimdi çalıştır", tests).
 */
export async function runReminderSweep(opts: { ignoreHours?: boolean; now?: Date } = {}): Promise<number> {
  if (running) return 0;
  const now = nowTR(opts.now);
  const withDay = !!opts.ignoreHours || (now.hour >= 8 && now.hour < 22);
  running = true;
  let total = 0;
  try {
    const owners = await prisma.pushSubscription.findMany({ distinct: ['userId'], select: { userId: true } });
    for (const { userId } of owners) {
      try {
        if (withDay) total += await dayReminders(userId, now.date);
        total += await taskTimeReminders(userId, now);
        total += await studentReminders(userId, now, withDay);
      } catch (err) {
        console.warn('[push] hatırlatma hatası:', (err as Error).message);
      }
    }
    await prisma.pushSent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 90 * 86_400_000) } } });
    await cleanupOrphanFiles().catch(() => {});
    await compressOldFiles().catch(() => {});
    const value = JSON.stringify({ lastRunAt: new Date().toISOString(), lastSent: total });
    await prisma.systemSetting.upsert({ where: { key: SWEEP_KEY }, update: { value }, create: { key: SWEEP_KEY, value } });
  } finally {
    running = false;
  }
  return total;
}
