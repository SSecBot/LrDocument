import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { handleRouteError, readJsonObject } from '@/lib/apiUtils';
import { DEFAULT_LANDING, landingContentSchema } from '@/lib/landingContent';
import { getLandingContent, saveLandingContent } from '@/lib/systemSettingsServer';

export async function GET() {
  try {
    await requireAdmin();
    return NextResponse.json({ content: await getLandingContent(), defaults: DEFAULT_LANDING });
  } catch (error) {
    return handleRouteError(error, 'Landing read error', 'Açılış sayfası içeriği okunamadı.');
  }
}

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const body = await readJsonObject(req, 256 * 1024);
    const parsed = landingContentSchema.safeParse(body.content);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json({ error: `Geçersiz içerik: ${issue?.path.join(' › ') ?? ''} — ${issue?.message ?? ''}` }, { status: 400 });
    }
    return NextResponse.json({ success: true, content: await saveLandingContent(parsed.data) });
  } catch (error) {
    return handleRouteError(error, 'Landing save error', 'Açılış sayfası kaydedilemedi.');
  }
}
