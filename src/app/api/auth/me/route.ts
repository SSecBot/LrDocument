import { NextResponse } from 'next/server';
import { getCurrentSession, ensureDefaultAdmin } from '@/lib/auth';

export async function GET() {
  try {
    await ensureDefaultAdmin();
    const session = await getCurrentSession();

    if (!session) {
      return NextResponse.json({
        authenticated: false,
        user: null,
      });
    }

    return NextResponse.json({
      authenticated: true,
      user: session,
    });
  } catch (error) {
    console.error('Session verification error:', error);
    return NextResponse.json(
      { authenticated: false, user: null },
      { status: 500 }
    );
  }
}
