import { NextRequest, NextResponse } from 'next/server';
import { ZodError } from 'zod';
import { prisma } from '@/lib/prisma';
import { requireAdmin } from '@/lib/auth';
import { handleRouteError, readJsonObject } from '@/lib/apiUtils';
import { universityById } from '@/lib/universities';
import { getSchoolCalendar, saveSchoolCalendar } from '@/lib/schoolCalendarServer';

type Ctx = { params: Promise<{ id: string }> };

async function university(ctx: Ctx) {
  const { id } = await ctx.params;
  return universityById(id);
}

export async function GET(_req: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();
    const u = await university(ctx);
    if (!u) return NextResponse.json({ error: 'Üniversite bulunamadı.' }, { status: 404 });
    return NextResponse.json({ university: u, calendar: await getSchoolCalendar(u.id) }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleRouteError(error, 'Admin university error', 'Takvim alınamadı.');
  }
}

/** Publishes the calendar; students of the university get it the next time their data loads. */
export async function PUT(req: NextRequest, ctx: Ctx) {
  try {
    const admin = await requireAdmin();
    const u = await university(ctx);
    if (!u) return NextResponse.json({ error: 'Üniversite bulunamadı.' }, { status: 404 });
    const body = await readJsonObject(req, 200_000);
    const sourceUrl = typeof body.sourceUrl === 'string' && /^https?:\/\/\S+$/.test(body.sourceUrl.trim()) ? body.sourceUrl.trim().slice(0, 300) : null;
    const calendar = await saveSchoolCalendar(u.id, body.terms, sourceUrl, admin.email);
    return NextResponse.json({ success: true, calendar, message: `${u.name} akademik takvimi yayınlandı.` });
  } catch (error) {
    if (error instanceof ZodError) return NextResponse.json({ error: error.issues[0]?.message ?? 'Takvim geçersiz.' }, { status: 400 });
    return handleRouteError(error, 'Admin university save error', 'Takvim kaydedilemedi.');
  }
}

/** Unpublishes. Dates already copied into students' terms stay (they can edit them). */
export async function DELETE(_req: NextRequest, ctx: Ctx) {
  try {
    await requireAdmin();
    const u = await university(ctx);
    if (!u) return NextResponse.json({ error: 'Üniversite bulunamadı.' }, { status: 404 });
    await prisma.universityCalendar.deleteMany({ where: { universityId: u.id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return handleRouteError(error, 'Admin university delete error', 'Takvim kaldırılamadı.');
  }
}
