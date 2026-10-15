import { NextResponse } from 'next/server';
import { z } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAuth } from '@/lib/auth';
import { handleRouteError, rateLimit, readJsonObject, tooManyRequests } from '@/lib/apiUtils';
import { encryptText } from '@/lib/dataCrypto';
import { USER_FEEDBACK_KINDS } from '@/lib/feedback';
import { sealPayload, toFeedbackItem } from '@/lib/feedbackServer';
import { schoolTermsSchema } from '@/lib/academic/schoolCalendar';
import { universityById } from '@/lib/universities';

// Ayarlar › Destek: istek, öneri, hata bildirimi; Ayarlar › Hesap: bireysel hesaba geçiş talebi;
// Ders Takibi › Akademik takvim: "okulum için öner". Everything lands in Yönetici Paneli › Talepler.

const messageSchema = z.object({
  kind: z.enum(USER_FEEDBACK_KINDS),
  subject: z.string().trim().min(3, 'Konu en az 3 karakter olmalı.').max(120, 'Konu en fazla 120 karakter olabilir.'),
  message: z.string().trim().min(10, 'Mesaj en az 10 karakter olmalı.').max(4000, 'Mesaj en fazla 4000 karakter olabilir.'),
  /** Hata bildirimi: the page and device, filled in by the form */
  context: z.string().trim().max(500).optional(),
});

const switchSchema = z.object({
  kind: z.literal('hesap-gecis'),
  message: z.string().trim().max(1000).optional(),
});

const calendarSchema = z.object({
  kind: z.literal('takvim'),
  terms: schoolTermsSchema.min(1, 'En az bir dönem gerekli.'),
  sourceUrl: z.string().trim().url('Kaynak bağlantısı geçerli bir adres olmalı.').max(300).optional().or(z.literal('')),
  message: z.string().trim().max(1000).optional(),
});

const OPEN = { in: ['yeni', 'inceleniyor'] };

export async function GET() {
  try {
    const session = await requireAuth();
    const rows = await prisma.feedback.findMany({
      where: { userId: session.userId, memberId: session.memberId ?? null },
      orderBy: { createdAt: 'desc' },
      take: 50,
    });
    return NextResponse.json({ items: rows.map(toFeedbackItem) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleRouteError(error, 'Feedback list error', 'Talepler alınamadı.');
  }
}

export async function POST(req: Request) {
  try {
    const session = await requireAuth();
    const wait = rateLimit(`feedback:${session.memberId ?? session.userId}`, 10, 60 * 60_000);
    if (wait) return tooManyRequests(wait);
    const body = await readJsonObject(req, 64_000);
    const base = { userId: session.userId, memberId: session.memberId ?? null, authorName: session.name.slice(0, 80) };

    if (body.kind === 'hesap-gecis') {
      const parsed = switchSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Geçersiz talep.' }, { status: 400 });
      if (session.memberId) return NextResponse.json({ error: 'Hesap türünü yalnızca hesap sahibi değiştirebilir.' }, { status: 403 });
      if (session.accountType !== 'STUDENT') return NextResponse.json({ error: 'Bu talep yalnızca öğrenci hesapları içindir.' }, { status: 400 });
      const open = await prisma.feedback.findFirst({ where: { userId: session.userId, kind: 'hesap-gecis', status: OPEN } });
      if (open) return NextResponse.json({ error: 'Bekleyen bir geçiş talebiniz zaten var.' }, { status: 409 });
      const row = await prisma.feedback.create({
        data: {
          ...base,
          kind: 'hesap-gecis',
          subject: 'Öğrenci hesabından bireysel hesaba geçiş',
          message: encryptText(session.userId, parsed.data.message || 'Bireysel hesaba geçmek istiyorum.'),
        },
      });
      return NextResponse.json({ success: true, item: toFeedbackItem(row) }, { status: 201 });
    }

    if (body.kind === 'takvim') {
      const parsed = calendarSchema.safeParse(body);
      if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Geçersiz takvim.' }, { status: 400 });
      const profile = await prisma.studentProfile.findUnique({ where: { userId: session.userId }, select: { universityId: true } });
      const university = universityById(profile?.universityId);
      if (session.accountType !== 'STUDENT' || !university) {
        return NextResponse.json({ error: 'Takvim önermek için öğrenci bilgilerinizde üniversitenizi listeden seçin.' }, { status: 400 });
      }
      const open = await prisma.feedback.findFirst({ where: { userId: session.userId, kind: 'takvim', status: OPEN } });
      const data = {
        ...base,
        kind: 'takvim',
        subject: `${university.name} akademik takvimi`,
        message: encryptText(session.userId, parsed.data.message || 'Okulumun akademik takvimini öneriyorum.'),
        payload: sealPayload(session.userId, { universityId: university.id, universityName: university.name, terms: parsed.data.terms, sourceUrl: parsed.data.sourceUrl || null }),
      };
      // A newer proposal replaces the student's open one.
      const row = open ? await prisma.feedback.update({ where: { id: open.id }, data: { ...data, status: 'yeni' } }) : await prisma.feedback.create({ data });
      return NextResponse.json({ success: true, item: toFeedbackItem(row) }, { status: 201 });
    }

    const parsed = messageSchema.safeParse(body);
    if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0]?.message ?? 'Geçersiz bildirim.' }, { status: 400 });
    const row = await prisma.feedback.create({
      data: {
        ...base,
        kind: parsed.data.kind,
        subject: parsed.data.subject,
        message: encryptText(session.userId, parsed.data.message),
        payload: parsed.data.context ? sealPayload(session.userId, { context: parsed.data.context }) : null,
      },
    });
    return NextResponse.json({ success: true, item: toFeedbackItem(row) }, { status: 201 });
  } catch (error) {
    return handleRouteError(error, 'Feedback create error', 'Gönderilemedi.');
  }
}

/** Withdraws one of the user's own requests that the admin has not answered yet. */
export async function DELETE(req: Request) {
  try {
    const session = await requireAuth();
    const id = new URL(req.url).searchParams.get('id') ?? '';
    const { count } = await prisma.feedback.deleteMany({
      where: { id, userId: session.userId, memberId: session.memberId ?? null, status: 'yeni' },
    });
    if (!count) return NextResponse.json({ error: 'Talep bulunamadı veya incelenmeye başlandı.' }, { status: 404 });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, 'Feedback delete error', 'Geri çekilemedi.');
  }
}
