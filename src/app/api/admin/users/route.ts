import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { LIVE_WINDOW_MS, requireAdmin } from '@/lib/auth';
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
        organization: true,
        seats: true,
        lastSeenAt: true,
        emailVerifiedAt: true,
        twoFactorEnabledAt: true,
        studentProfile: {
          select: {
            university: true,
            studentEmail: true,
            department: true,
            classYear: true,
            studentNo: true,
            verifiedAt: true,
            verifyMethod: true,
            documentStatus: true,
          },
        },
        studentDocument: { select: { fileName: true, mime: true, uploadedAt: true } },
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            notes: true,
            tasks: true,
            kanbanCards: true,
            events: true,
            mediaItems: true,
            transactions: true,
            orgMembers: true,
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

    // Signed-in users seen within the last two minutes (the app pings once a minute).
    const liveSince = Date.now() - LIVE_WINDOW_MS;
    const liveMembers = await prisma.orgMember.count({
      where: { lastSeenAt: { gte: new Date(liveSince) }, owner: { status: 'APPROVED', accountType: 'CORPORATE' } },
    });
    // Corporate members (code sign-in) count as live users too.
    const liveUsers =
      users.filter((u) => u.status === 'APPROVED' && u.lastSeenAt && u.lastSeenAt.getTime() >= liveSince).length + liveMembers;

    const [totalNotes, totalTasks] = await Promise.all([
      prisma.note.count(),
      prisma.task.count(),
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
        liveUsers,
      },
      users,
    });
  } catch (error) {
    return handleRouteError(error, 'Admin fetch error', 'Kullanıcı listesi alınamadı.');
  }
}
