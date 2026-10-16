// Runs once when the server starts (see node_modules/next/dist/docs, instrumentation.md).
// Starts the reminder sweep that pushes notifications to phones and computers (src/lib/pushReminders.ts).

const SWEEP_MS = 5 * 60_000;

export async function register() {
  if (process.env.NEXT_RUNTIME !== 'nodejs' || process.env.NEXT_PHASE === 'phase-production-build') return;
  const { runReminderSweep } = await import('./lib/pushReminders');
  // Test hooks: PUSH_SWEEP_FIRST_MS (first run delay), PUSH_SWEEP_ANY_HOUR=1 (ignore 08:00–22:00).
  const ignoreHours = process.env.PUSH_SWEEP_ANY_HOUR === '1';
  const run = () => runReminderSweep({ ignoreHours }).catch((err) => console.warn('[push] hatırlatmalar çalışmadı:', err));
  setTimeout(run, Number(process.env.PUSH_SWEEP_FIRST_MS) || 30_000);
  setInterval(run, SWEEP_MS).unref?.();
}
