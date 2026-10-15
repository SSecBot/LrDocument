import { cookies } from 'next/headers';
import { COOKIE_NAME, sessionFromToken } from '@/lib/auth';
import { subscribe } from '@/lib/realtime';

export const dynamic = 'force-dynamic';

const HEARTBEAT_MS = 20_000;

/**
 * Live stream of a corporate workspace's changes (Server-Sent Events). The session is checked
 * again with every heartbeat, so removed members, new codes and changed permissions take effect
 * within seconds.
 */
export async function GET(req: Request) {
  const token = (await cookies()).get(COOKIE_NAME)?.value;
  const session = await sessionFromToken(token);
  if (!session) return new Response(null, { status: 401 });
  if (session.accountType !== 'CORPORATE') return new Response(null, { status: 204 });

  const encoder = new TextEncoder();
  let cleanup = () => {};

  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      const viewer = { accountType: session.accountType, permissions: session.permissions };
      let closed = false;
      const send = (chunk: string) => {
        if (!closed) controller.enqueue(encoder.encode(chunk));
      };
      const unsubscribe = subscribe(session.userId, { send, viewer });

      const heartbeat = setInterval(async () => {
        const current = await sessionFromToken(token).catch(() => null);
        if (!current || current.userId !== session.userId) return cleanup();
        viewer.permissions = current.permissions;
        send(': ping\n\n');
      }, HEARTBEAT_MS);

      cleanup = () => {
        if (closed) return;
        closed = true;
        clearInterval(heartbeat);
        unsubscribe();
        try {
          controller.close();
        } catch {}
      };
      req.signal.addEventListener('abort', cleanup);

      // Reconnect quickly after a dropped connection; the client then reloads what it missed.
      send('retry: 3000\n: connected\n\n');
    },
    cancel() {
      cleanup();
    },
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream; charset=utf-8',
      // no-transform keeps the compression layer from buffering the stream.
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      // Nginx: pass events through immediately instead of buffering them.
      'X-Accel-Buffering': 'no',
    },
  });
}
