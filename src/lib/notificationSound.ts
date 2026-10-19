'use client';

// ---------------------------------------------------------------------------
// Bildirim sesi: played when a new notification arrives while LrDocument is open (also in the
// background). "default" is a short chime made with Web Audio (no file); "custom" is the sound the
// person uploaded (stored encrypted on the server, kept only in memory here).
//
// Notifications shown by the phone / computer while the app is closed use the system sound: browsers
// do not let a site choose that sound.
// ---------------------------------------------------------------------------

export type SoundChoice = 'off' | 'default' | 'custom';

let lastPlayed = 0;
let customUrl: { id: string; url: string } | null = null;
let audioCtx: AudioContext | null = null;

function chime(volume: number) {
  const Ctx = window.AudioContext ?? (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!Ctx) return;
  audioCtx ??= new Ctx();
  const ctx = audioCtx;
  void ctx.resume().catch(() => {});
  const now = ctx.currentTime;
  // Two soft notes (E6 → A6), like a small bell.
  [
    [1318.5, 0],
    [1760, 0.13],
  ].forEach(([freq, at]) => {
    const osc = ctx.createOscillator();
    const gain = ctx.createGain();
    osc.type = 'sine';
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.0001, now + at);
    gain.gain.exponentialRampToValueAtTime(Math.max(0.0002, 0.25 * volume), now + at + 0.02);
    gain.gain.exponentialRampToValueAtTime(0.0001, now + at + 0.45);
    osc.connect(gain).connect(ctx.destination);
    osc.start(now + at);
    osc.stop(now + at + 0.5);
  });
}

async function customSound(fileId: string): Promise<string | null> {
  if (customUrl?.id === fileId) return customUrl.url;
  const res = await fetch(`/api/files/${encodeURIComponent(fileId)}`, { cache: 'no-store' }).catch(() => null);
  if (!res?.ok) return null;
  if (customUrl) URL.revokeObjectURL(customUrl.url);
  customUrl = { id: fileId, url: URL.createObjectURL(await res.blob()) };
  return customUrl.url;
}

/** Forgets the downloaded custom sound (after it was replaced or on sign-out). */
export function resetNotificationSound() {
  if (customUrl) URL.revokeObjectURL(customUrl.url);
  customUrl = null;
}

/**
 * Plays the chosen sound. `force` ignores the short pause between sounds (the "Dene" button).
 * Browsers only allow sound after the person has interacted with the page once.
 */
export async function playNotificationSound(choice: SoundChoice, fileId: string | null, volume: number, force = false) {
  if (typeof window === 'undefined' || choice === 'off') return;
  const now = Date.now();
  if (!force && now - lastPlayed < 3000) return;
  lastPlayed = now;
  const v = Math.min(1, Math.max(0, volume));
  try {
    if (choice === 'custom' && fileId) {
      const url = await customSound(fileId);
      if (url) {
        const audio = new Audio(url);
        audio.volume = v;
        await audio.play();
        return;
      }
    }
    chime(v);
  } catch {
    // Autoplay blocked (no interaction yet) or an unplayable file: stay silent.
  }
}
