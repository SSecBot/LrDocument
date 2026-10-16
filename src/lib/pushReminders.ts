import { prisma } from './prisma';
import { decryptRow } from './dataCrypto';
import { sendPush, workspaceDevices, type PushPayload } from './push';
import type { CorpModule } from './corporate';

// ---------------------------------------------------------------------------
// Reminders pushed to phones / computers while the app is closed: overdue tasks, today's events and
// overdue payments. Every reminder is sent once (PushSent); several of the same kind are grouped
// into one notification. Runs every few minutes inside the server process (src/instrumentation.ts),
// only between 08:00 and 22:00 Türkiye time.
// ---------------------------------------------------------------------------

const TZ = 'Europe/Istanbul';

function nowTR() {
  const d = new Date();
  return {
    date: new Intl.DateTimeFormat('en-CA', { timeZone: TZ }).format(d),
    hour: Number(new Intl.DateTimeFormat('en-GB', { timeZone: TZ, hour: '2-digit', hour12: false }).format(d)),
  };
}

interface Item {
  key: string;
  label: string;
}

function group(items: Item[], one: (i: Item) => PushPayload, many: (n: number, list: string) => PushPayload): PushPayload {
  if (items.length === 1) return one(items[0]);
  const list = items.slice(0, 3).map((i) => i.label).join(', ') + (items.length > 3 ? '…' : '');
  return many(items.length, list);
}

async function unsent(keys: string[]): Promise<Set<string>> {
  if (!keys.length) return new Set();
  const done = await prisma.pushSent.findMany({ where: { key: { in: keys } }, select: { key: true } });
  const doneSet = new Set(done.map((d) => d.key));
  return new Set(keys.filter((k) => !doneSet.has(k)));
}

async function deliver(userId: string, module: CorpModule, items: Item[], payload: PushPayload) {
  const devices = await workspaceDevices(userId, module);
  if (!devices.length) return;
  // Mark first: a slow push service must not cause a second copy on the next run.
  await prisma.pushSent.createMany({ data: items.map((i) => ({ key: i.key })) });
  await sendPush(devices, payload);
}

async function remindUser(userId: string, today: string) {
  const [tasks, events, transactions] = await Promise.all([
    prisma.task.findMany({ where: { userId, completed: false, dueDate: { lt: today, not: null } } }),
    prisma.calendarEvent.findMany({ where: { userId, date: today, status: { notIn: ['iptal', 'yayinlandi'] } } }),
    // Same rule as the bell: unconfirmed, not a debt balance, date passed.
    prisma.financeTransaction.findMany({ where: { userId, isConfirmed: false, isDebt: false, date: { lt: today } } }),
  ]);

  // Gecikmiş görevler
  const taskItems = tasks.map((raw) => {
    const t = decryptRow('task', userId, raw);
    return { key: `task-overdue:${t.id}:${t.dueDate}`, label: t.title || 'Başlıksız görev' };
  });
  const newTasks = await unsent(taskItems.map((i) => i.key));
  const tasksToSend = taskItems.filter((i) => newTasks.has(i.key));
  if (tasksToSend.length) {
    await deliver(
      userId,
      'work',
      tasksToSend,
      group(
        tasksToSend,
        (i) => ({ title: 'Görevin süresi geçti', body: i.label, tab: 'tasks', tag: 'lr-overdue-tasks' }),
        (n, list) => ({ title: `${n} görevin süresi geçti`, body: list, tab: 'tasks', tag: 'lr-overdue-tasks' })
      )
    );
  }

  // Bugünkü etkinlikler
  const eventItems = events.map((raw) => {
    const e = decryptRow('calendarEvent', userId, raw);
    return { key: `event-today:${e.id}:${e.date}`, label: `${e.time ? `${e.time} ` : ''}${e.title || 'Etkinlik'}` };
  });
  const newEvents = await unsent(eventItems.map((i) => i.key));
  const eventsToSend = eventItems.filter((i) => newEvents.has(i.key));
  if (eventsToSend.length) {
    await deliver(
      userId,
      'calendar',
      eventsToSend,
      group(
        eventsToSend,
        (i) => ({ title: 'Bugün takviminde', body: i.label, tab: 'calendar', tag: 'lr-today' }),
        (n, list) => ({ title: `Bugün ${n} etkinliğin var`, body: list, tab: 'calendar', tag: 'lr-today' })
      )
    );
  }

  // Vadesi geçen, onaylanmamış ödemeler / tahsilatlar
  const finItems = transactions
    .map((raw) => decryptRow('financeTransaction', userId, raw))
    .map((t) => ({ key: `fin-overdue:${t.id}:${t.date}`, label: `${t.title} (${t.amount.toLocaleString('tr-TR')} ₺)` }));
  const newFin = await unsent(finItems.map((i) => i.key));
  const finToSend = finItems.filter((i) => newFin.has(i.key));
  if (finToSend.length) {
    await deliver(
      userId,
      'finance',
      finToSend,
      group(
        finToSend,
        (i) => ({ title: 'Vadesi geçen işlem', body: i.label, tab: 'finance', tag: 'lr-overdue-finance' }),
        (n, list) => ({ title: `${n} işlemin vadesi geçti`, body: list, tab: 'finance', tag: 'lr-overdue-finance' })
      )
    );
  }
}

let running = false;

/** One pass over every account that has a device subscribed. */
export async function runReminderSweep(opts: { ignoreHours?: boolean } = {}): Promise<void> {
  if (running) return;
  const { date, hour } = nowTR();
  if (!opts.ignoreHours && (hour < 8 || hour >= 22)) return;
  running = true;
  try {
    const owners = await prisma.pushSubscription.findMany({ distinct: ['userId'], select: { userId: true } });
    for (const { userId } of owners) {
      try {
        await remindUser(userId, date);
      } catch (err) {
        console.warn('[push] hatırlatma hatası:', (err as Error).message);
      }
    }
    await prisma.pushSent.deleteMany({ where: { createdAt: { lt: new Date(Date.now() - 90 * 86_400_000) } } });
  } finally {
    running = false;
  }
}
