import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin, ensureDefaultAdmin } from '@/lib/auth';

export async function GET() {
  try {
    await ensureDefaultAdmin();
    await requireAdmin();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        subscriptionPlan: true,
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            notes: true,
            scripts: true,
            tasks: true,
            kanbanCards: true,
            events: true,
            mediaItems: true,
            transactions: true,
          },
        },
      },
      orderBy: [
        { status: 'asc' },
        { createdAt: 'desc' },
      ],
    });

    const pendingCount = users.filter((u) => u.status === 'PENDING').length;
    const approvedCount = users.filter((u) => u.status === 'APPROVED').length;
    const rejectedCount = users.filter((u) => u.status === 'REJECTED').length;

    const totalNotes = await prisma.note.count();
    const totalTasks = await prisma.task.count();
    const totalScripts = await prisma.script.count();

    return NextResponse.json({
      success: true,
      metrics: {
        totalUsers: users.length,
        pendingCount,
        approvedCount,
        rejectedCount,
        totalNotes,
        totalTasks,
        totalScripts,
      },
      users,
    });
  } catch (error: unknown) {
    const err = error as Error;
    if (err.message.includes('Unauthorized') || err.message.includes('Forbidden')) {
      return NextResponse.json({ error: 'Yönetici yetkisi gereklidir.' }, { status: 403 });
    }
    console.error('Admin fetch error:', error);
    return NextResponse.json({ error: 'Kullanıcı listesi alınamadı.' }, { status: 500 });
  }
}
