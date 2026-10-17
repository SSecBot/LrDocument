import { prisma } from './prisma';
import { decryptRow, decryptText } from './dataCrypto';
import { sendPush, workspaceDevices, type PushPayload } from './push';
import type { CorpModule } from './corporate';
import { isTransactionActiveOnDate } from './recurringFinance';
import { academicDataSchema } from './academic/schema';
import { hasCalendar, isHoliday } from './academic/grading';
import type { FinanceTransaction } from '@/types';

// ---------------------------------------------------------------------------
// Reminders pushed to phones, tablets and computers while the app is closed:
//   • görev: last day is today / deadline passed
//   • ödeme / tahsilat: date is today / date passed (also recurring ones and kredi ödeme günü)
//   • takvim: today's events
//   • öğrenci: a class starts in CLASS_LEAD_MIN minutes, exams today
// Every reminder is sent once (PushSent); several of the same kind are grouped into one notification.
// Runs every few minutes inside the server process (src/instrumentation.ts). Day reminders go out only
// between 08:00 and 22:00 Türkiye time; class reminders follow the timetable.
// ---------------------------------------------------------------------------

const TZ = 'Europe/Istanbul';
/** Minutes before a class starts that its reminder is sent. */
export const CLASS_LEAD_MIN = 15;

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
  many: (n: number, list: string) => PushPayload
): Promise<number> {
  const items = await unsent(all);
  if (!items.length) return 0;
  const devices = await workspaceDevices(userId, module);
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

  // Görevler: son gün bugün / süresi geçti
  const taskRows = tasks.map((raw) => decryptRow('task', userId, raw));
  const label = (t: { title: string }) => t.title || 'Başlıksız görev';
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

  // Ödemeler ve tahsilatlar
  const fin = transactions.map((raw) => decryptRow('financeTransaction', userId, raw));
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
    (i) => ({ title: 'Bugün ödeme günü', body: i.label, tab: 'finance', tag: 'lr-due-finance' }),
    (n, list) => ({ title: `Bugün ${n} ödeme / tahsilat günü`, body: list, tab: 'finance', tag: 'lr-due-finance' })
  );
  sent += await remind(
    userId,
    'finance',
    overdue,
    (i) => ({ title: 'Ödeme tarihi geçti', body: i.label, tab: 'finance', tag: 'lr-overdue-finance' }),
    (n, list) => ({ title: `${n} ödemenin tarihi geçti`, body: list, tab: 'finance', tag: 'lr-overdue-finance' })
  );
  return sent;
}

const toMin = (hhmm: string) => {
  const [h, m] = hhmm.split(':').map(Number);
  return h * 60 + (m || 0);
};

/** Öğrenci: a class of the active term starts soon; exams today (with the day reminders). */
async function studentReminders(userId: string, now: Now, withDay: boolean): Promise<number> {
  const profile = await prisma.studentProfile.findUnique({ where: { userId }, select: { data: true } });
  if (!profile) return 0;
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
  if (inTerm && (!holiday || holiday.half)) {
    const soon: Item[] = [];
    for (const c of data.courses) {
      if (c.termId !== term.id) continue;
      for (const s of c.sessions) {
        if (s.day !== now.weekday || (holiday?.half && s.start >= '13:00')) continue;
        const left = toMin(s.start) - now.minutes;
        if (left <= 0 || left > CLASS_LEAD_MIN) continue;
        soon.push({ key: `class:${c.id}:${s.id}:${now.date}`, label: `${s.start} ${c.code ? `${c.code} ` : ''}${c.name}${s.room ? ` · ${s.room}` : ''}` });
      }
    }
    sent += await remind(
      userId,
      null,
      soon,
      (i) => ({ title: 'Ders başlıyor', body: i.label, tab: 'academic', tag: 'lr-class' }),
      (n, list) => ({ title: `${n} ders başlıyor`, body: list, tab: 'academic', tag: 'lr-class' })
    );
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
        total += await studentReminders(userId, now, withDay);
      } catch (err) {
        console.warn('[push] hatırlatma hatası:', (err as Error).message);
      }
    }
    await prisma.pushSent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 90 * 86_400_000) } } });
    const value = JSON.stringify({ lastRunAt: new Date().toISOString(), lastSent: total });
    await prisma.systemSetting.upsert({ where: { key: SWEEP_KEY }, update: { value }, create: { key: SWEEP_KEY, value } });
  } finally {
    running = false;
  }
  return total;
}
