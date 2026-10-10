import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { handleRouteError } from '@/lib/apiUtils';

export async function GET() {
  try {
    await requireAdmin();

    const users = await prisma.user.findMany({
      select: {
        id: true,
        name: true,
        email: true,
        role: true,
        status: true,
        subscriptionPlan: true,
        subscriptionType: true,
        paymentStatus: true,
        accountType: true,
        studentProfile: {
          select: { university: true, studentEmail: true, department: true, classYear: true, studentNo: true },
        },
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

    const [totalNotes, totalTasks, totalScripts] = await Promise.all([
      prisma.note.count(),
      prisma.task.count(),
      prisma.script.count(),
    ]);

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
  } catch (error) {
    return handleRouteError(error, 'Admin fetch error', 'Kullanıcı listesi alınamadı.');
  }
}
