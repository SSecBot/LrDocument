import { NextResponse, type NextRequest } from 'next/server';
import { jwtVerify } from 'jose';
import { getJwtSecretKey, COOKIE_NAME } from '@/lib/jwtSecret';

interface OptimisticSession {
  status?: string;
  role?: string;
}

const SAFE_METHODS = new Set(['GET', 'HEAD', 'OPTIONS']);

/**
 * Rejects cross-site state-changing API calls (CSRF defence in depth on top of SameSite=Lax cookies).
 * Browsers always send Origin on cross-origin POST/PATCH/DELETE requests.
 */
function isCrossSiteMutation(request: NextRequest): boolean {
  if (SAFE_METHODS.has(request.method)) return false;
  // Modern browsers label every request; a cross-site one is refused even without an Origin header.
  if (request.headers.get('sec-fetch-site') === 'cross-site') return true;
  const origin = request.headers.get('origin');
  if (!origin) return false;
  const host = request.headers.get('x-forwarded-host') || request.headers.get('host');
  try {
    return new URL(origin).host !== host;
  } catch {
    return true;
  }
}

export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (pathname.startsWith('/api/')) {
    if (isCrossSiteMutation(request)) {
      return NextResponse.json({ error: 'Geçersiz istek kaynağı.' }, { status: 403 });
    }
    return NextResponse.next();
  }

  // Optimistic check only — every API route re-validates the session against the database.
  let session: OptimisticSession | null = null;
  const token = request.cookies.get(COOKIE_NAME)?.value;
  if (token) {
    try {
      const { payload } = await jwtVerify(token, getJwtSecretKey(), { algorithms: ['HS256'] });
      session = payload as OptimisticSession;
    } catch {
      session = null;
    }
  }

  const isAuthPage = pathname === '/login' || pathname === '/register';
  const isProtectedPage =
    pathname.startsWith('/dashboard') ||
    pathname.startsWith('/admin') ||
    pathname.startsWith('/settings') ||
    pathname.startsWith('/profile');

  // /login?ekle=1 lets a signed-in user add another account (account switcher).
  const addingAccount = pathname === '/login' && request.nextUrl.searchParams.get('ekle') === '1';
  if (isAuthPage && session?.status === 'APPROVED' && !addingAccount) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  if (isProtectedPage) {
    if (session?.status !== 'APPROVED') {
      return NextResponse.redirect(new URL('/login', request.url));
    }
    if (pathname.startsWith('/admin') && session.role !== 'ADMIN') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    // Every API route (also ids containing a dot, which the pattern below skips) gets the CSRF check.
    '/api/:path*',
    /*
     * Match all request paths except for:
     * - _next/static, _next/image (build assets)
     * - favicon.ico and other files with an extension (public assets)
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\..*).*)',
  ],
};
