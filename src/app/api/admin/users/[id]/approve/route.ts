import { after, NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { handleRouteError, requestHost } from '@/lib/apiUtils';
import { siteHostFrom } from '@/lib/mailer';
import { sendNotice } from '@/lib/notices';
import { siteOrigin } from '@/lib/siteUrl';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const user = await prisma.user.findUnique({ where: { id } });
    if (!user) {
      return NextResponse.json({ error: 'Kullanıcı bulunamadı.' }, { status: 404 });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: {
        status: 'APPROVED',
        ...(user.paymentStatus === 'PENDING' ? { paymentStatus: 'MANUAL_APPROVED' } : {}),
      },
      select: { id: true, name: true, email: true, role: true, status: true, paymentStatus: true },
    });

    // "Hesabınız onaylandı" e-mail, like the verification codes (sent after the response).
    if (user.status !== 'APPROVED') {
      const siteHost = siteHostFrom(requestHost(req));
      const loginUrl = `${await siteOrigin()}/login`;
      after(() =>
        sendNotice(
          updatedUser.email,
          {
            subject: 'Hesabınız onaylandı',
            title: `Merhaba ${updatedUser.name}, hesabınız onaylandı`,
            paragraphs: ['LrDocument hesabınız yönetici tarafından onaylandı. Artık e-posta adresiniz ve şifrenizle giriş yapabilirsiniz.'],
            cta: { label: 'Giriş yap', url: loginUrl },
          },
          siteHost
        )
      );
    }

    return NextResponse.json({
      success: true,
      message: `${updatedUser.name} (${updatedUser.email}) hesabı onaylandı; bilgilendirme e-postası gönderiliyor.`,
      user: updatedUser,
    });
  } catch (error) {
    return handleRouteError(error, 'Approve user error', 'Onaylama işlemi başarısız.');
  }
}
