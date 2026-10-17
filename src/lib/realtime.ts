import { canView, ENTITY_MODULE, type CorpPermissions } from './corporate';

// ---------------------------------------------------------------------------
// Live updates (Server-Sent Events): every open tab and device of an account — and, in a corporate
// workspace, of the whole team — keeps one stream; a saved change is pushed to the other tabs at
// once, filtered by each viewer's permissions. The hub lives in this process's memory, which fits
// the single pm2 process the app is deployed as. (Several processes would need a shared broker.)
// ---------------------------------------------------------------------------

export interface RealtimeEvent {
  entity: string;
  action: 'create' | 'upsert' | 'delete';
  id: string;
  /** The saved record in client shape (absent for deletes). */
  data?: Record<string, unknown>;
  /** Display name of the person who made the change. */
  by: string;
  /** Tab that made the change; it ignores its own echo. */
  origin: string;
}

interface Listener {
  send: (chunk: string) => void;
  /** Ends the stream (used when the account opens more streams than allowed). */
  close?: () => void;
  viewer: { accountType?: string | null; permissions?: CorpPermissions | null };
}

type Hub = Map<string, Set<Listener>>;
const g = globalThis as unknown as { __lrRealtimeHub?: Hub };
const hub: Hub = (g.__lrRealtimeHub ??= new Map());

/** Open streams per account (a corporate team shares one); the oldest is closed beyond this. */
const MAX_STREAMS_PER_ACCOUNT = 100;

export function subscribe(ownerId: string, listener: Listener): () => void {
  let set = hub.get(ownerId);
  if (!set) hub.set(ownerId, (set = new Set()));
  while (set.size >= MAX_STREAMS_PER_ACCOUNT) {
    const oldest = set.values().next().value!;
    set.delete(oldest);
    try {
      oldest.close?.();
    } catch {}
  }
  set.add(listener);
  return () => {
    set.delete(listener);
    if (set.size === 0 && hub.get(ownerId) === set) hub.delete(ownerId);
  };
}

export function publish(ownerId: string, event: RealtimeEvent) {
  const set = hub.get(ownerId);
  if (!set) return;
  const mod = ENTITY_MODULE[event.entity];
  const chunk = `data: ${JSON.stringify(event)}\n\n`;
  for (const l of set) {
    if (mod && !canView(l.viewer, mod)) continue;
    try {
      l.send(chunk);
    } catch {
      // A closed stream is removed by its own cleanup.
    }
  }
}

const JSON_FIELDS = new Set(['tags', 'checklist', 'payments']);

/** DB-shaped (sanitized, unencrypted) fields → the shape the client keeps in its store. */
export function toClientShape(fields: Record<string, unknown>): Record<string, unknown> {
  const out: Record<string, unknown> = {};
  for (const [k, v] of Object.entries(fields)) {
    if (v instanceof Date) out[k] = v.toISOString();
    else if (JSON_FIELDS.has(k) && typeof v === 'string') {
      try {
        out[k] = JSON.parse(v);
      } catch {
        out[k] = [];
      }
    } else out[k] = v === null ? undefined : v;
  }
  return out;
}
