import { NextResponse } from 'next/server';
import { requireAdmin } from '@/lib/auth';
import { handleRouteError, readJsonObject } from '@/lib/apiUtils';
import { systemSettingsSchema } from '@/lib/systemSettings';
import { saveSystemSettings } from '@/lib/systemSettingsServer';

export async function PUT(req: Request) {
  try {
    await requireAdmin();
    const body = await readJsonObject(req);
    const parsed = systemSettingsSchema.safeParse(body.settings);
    if (!parsed.success) {
      const issue = parsed.error.issues[0];
      return NextResponse.json(
        { error: `Geçersiz değer: ${issue?.path.join(' › ') ?? ''} — ${issue?.message ?? ''}` },
        { status: 400 }
      );
    }
    const settings = await saveSystemSettings(parsed.data);
    return NextResponse.json({ success: true, settings });
  } catch (error) {
    return handleRouteError(error, 'Settings save error', 'Ayarlar kaydedilemedi.');
  }
}
