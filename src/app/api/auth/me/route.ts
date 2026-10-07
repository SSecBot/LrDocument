import { NextResponse } from 'next/server';
import { cookies } from 'next/headers';
import { clearSessionCookie, COOKIE_NAME, getCurrentSession } from '@/lib/auth';

export async function GET() {
  try {
    const session = await getCurrentSession();

    if (!session) {
      const response = NextResponse.json(
        { authenticated: false, user: null },
        { headers: { 'Cache-Control': 'no-store' } }
      );
      // Drop stale/revoked cookies so the proxy stops treating the visitor as signed in
      // (otherwise /login -> /dashboard -> /login could loop).
      if ((await cookies()).has(COOKIE_NAME)) clearSessionCookie(response);
      return response;
    }

    // Shape matches the client-side UserProfile type (id, not userId); the session-version
    // counter is internal and not exposed.
    const { userId, sv: _sv, ...rest } = session;
    const user = { id: userId, ...rest };

    return NextResponse.json(
      { authenticated: true, user },
      { headers: { 'Cache-Control': 'no-store' } }
    );
  } catch (error) {
    console.error('Session verification error:', error);
    return NextResponse.json({ authenticated: false, user: null }, { status: 500 });
  }
}
