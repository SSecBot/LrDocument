import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { handleRouteError } from '@/lib/apiUtils';
import { toAdminFeedbackItem } from '@/lib/feedbackServer';

/** Yönetici Paneli › Talepler: open items first, newest first. */
export async function GET() {
  try {
    await requireAdmin();
    const rows = await prisma.feedback.findMany({
      orderBy: { createdAt: 'desc' },
      take: 300,
      include: { user: { select: { id: true, name: true, email: true, accountType: true } } },
    });
    const items = rows.map(toAdminFeedbackItem);
    const rank = (s: string) => (s === 'yeni' ? 0 : s === 'inceleniyor' ? 1 : 2);
    items.sort((a, b) => rank(a.status) - rank(b.status) || b.createdAt.localeCompare(a.createdAt));
    return NextResponse.json({ items, openCount: items.filter((i) => rank(i.status) < 2).length }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleRouteError(error, 'Admin feedback list error', 'Talepler alınamadı.');
  }
}
