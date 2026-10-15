import { after, NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { handleRouteError, readJsonObject, requestHost } from '@/lib/apiUtils';
import { DECISION_KINDS, FEEDBACK_KIND_LABEL, FEEDBACK_STATUS_LABEL, type FeedbackKind, type FeedbackStatus } from '@/lib/feedback';
import { openPayload, toAdminFeedbackItem } from '@/lib/feedbackServer';
import { schoolTermsSchema, type SchoolTerm } from '@/lib/academic/schoolCalendar';
import { fold } from '@/lib/academic/scheduleParser';
import { getSchoolCalendar, saveSchoolCalendar } from '@/lib/schoolCalendarServer';
import { universityById } from '@/lib/universities';
import { siteHostFrom } from '@/lib/mailer';
import { sendNotice, type Notice } from '@/lib/notices';
import { siteOrigin } from '@/lib/siteUrl';

const bodySchema = z.object({
  status: z.enum(['yeni', 'inceleniyor', 'cozuldu', 'reddedildi']).optional(),
  adminNote: z.string().trim().max(2000).optional(),
  /** Request kinds: approve (apply the change) or reject */
  decision: z.enum(['approve', 'reject']).optional(),
  /** Mail the answer to the user (default: when the item is closed with a note or a decision) */
  notify: z.boolean().optional(),
});

const norm = (s: string) => fold(s).replace(/[^a-z0-9]/g, '');

/** Proposed terms replace the published ones with the same name; the others are kept. */
function mergeTerms(current: SchoolTerm[], proposed: SchoolTerm[]): SchoolTerm[] {
  const out = [...current];
  for (const t of proposed) {
    const i = out.findIndex((x) => norm(x.name) === norm(t.name));
    if (i >= 0) out[i] = { ...t, id: out[i].id };
    else out.push(t);
  }
  return out.sort((a, b) => (a.start ?? '9999').localeCompare(b.start ?? '9999')).slice(-12);
}

export async function PATCH(req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    const admin = await requireAdmin();
    const { id } = await params;
    const parsed = bodySchema.safeParse(await readJsonObject(req, 8192));
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Geçersiz istek.' }, { status: 400 });
    const { decision, adminNote } = parsed.data;

    const row = await prisma.feedback.findUnique({ where: { id }, include: { user: { select: { id: true, name: true, email: true, accountType: true } } } });
    if (!row) return NextResponse.json({ error: 'Talep bulunamadı.' }, { status: 404 });
    const kind = row.kind as FeedbackKind;

    let status = (parsed.data.status ?? row.status) as FeedbackStatus;
    let resultText = '';
    if (decision) {
      if (!DECISION_KINDS.includes(kind)) return NextResponse.json({ error: 'Bu talep türü onay gerektirmez.' }, { status: 400 });
      if (row.status === 'cozuldu' || row.status === 'reddedildi') return NextResponse.json({ error: 'Bu talep zaten sonuçlandı.' }, { status: 409 });
      if (decision === 'approve' && kind === 'hesap-gecis') {
        if (row.user?.accountType !== 'STUDENT') return NextResponse.json({ error: 'Hesap artık öğrenci hesabı değil.' }, { status: 409 });
        // Course data (StudentProfile) is kept, so switching back later loses nothing.
        await prisma.user.update({ where: { id: row.userId }, data: { accountType: 'STANDARD' } });
        resultText = 'Hesabınız bireysel hesaba geçirildi. Ders takibi verileriniz silinmedi; tekrar öğrenci hesabına geçerseniz geri gelir.';
      }
      if (decision === 'approve' && kind === 'takvim') {
        const payload = openPayload(row);
        const university = universityById(typeof payload?.universityId === 'string' ? payload.universityId : null);
        const proposed = schoolTermsSchema.safeParse(payload?.terms);
        if (!university || !proposed.success) return NextResponse.json({ error: 'Önerilen takvim okunamadı.' }, { status: 400 });
        const current = await getSchoolCalendar(university.id);
        const sourceUrl = typeof payload?.sourceUrl === 'string' ? payload.sourceUrl : (current?.sourceUrl ?? null);
        await saveSchoolCalendar(university.id, mergeTerms(current?.terms ?? [], proposed.data), sourceUrl, admin.email);
        resultText = `Önerdiğiniz takvim ${university.name} için yayınlandı; okulunuzdaki tüm öğrencilerin ders takibine otomatik eklenecek. Katkınız için teşekkürler!`;
      }
      status = decision === 'approve' ? 'cozuldu' : 'reddedildi';
    }

    const closing = (status === 'cozuldu' || status === 'reddedildi') && row.status !== status;
    const updated = await prisma.feedback.update({
      where: { id },
      data: {
        status,
        ...(adminNote !== undefined ? { adminNote: adminNote || null } : {}),
        resolvedAt: status === 'cozuldu' || status === 'reddedildi' ? (row.resolvedAt ?? new Date()) : null,
      },
      include: { user: { select: { id: true, name: true, email: true, accountType: true } } },
    });

    // The user hears about the outcome by e-mail (corporate members have no address of their own).
    const notify = parsed.data.notify ?? (closing && (!!decision || !!updated.adminNote));
    if (notify && row.user && !row.memberId) {
      const note = updated.adminNote ? `Yönetici notu: ${updated.adminNote}` : '';
      const outcome =
        kind === 'hesap-gecis'
          ? status === 'cozuldu'
            ? resultText
            : 'Bireysel hesaba geçiş talebiniz onaylanmadı; hesabınız öğrenci hesabı olarak devam ediyor.'
          : kind === 'takvim'
            ? status === 'cozuldu'
              ? resultText
              : 'Önerdiğiniz akademik takvim yayınlanmadı.'
            : `“${row.subject}” başlıklı bildiriminizin durumu: ${FEEDBACK_STATUS_LABEL[status]}.`;
      const notice: Notice = {
        subject: `${FEEDBACK_KIND_LABEL[kind]}: ${FEEDBACK_STATUS_LABEL[status]}`,
        title: `Merhaba ${row.user.name},`,
        paragraphs: [outcome, note].filter(Boolean),
        cta: { label: 'LrDocument’i aç', url: `${await siteOrigin()}/dashboard` },
      };
      const to = row.user.email;
      const siteHost = siteHostFrom(requestHost(req));
      after(() => sendNotice(to, notice, siteHost));
    }

    return NextResponse.json({ success: true, item: toAdminFeedbackItem(updated) });
  } catch (error) {
    return handleRouteError(error, 'Admin feedback update error', 'Talep güncellenemedi.');
  }
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  try {
    await requireAdmin();
    const { id } = await params;
    await prisma.feedback.deleteMany({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, 'Admin feedback delete error', 'Talep silinemedi.');
  }
}
