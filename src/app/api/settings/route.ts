import { NextResponse } from 'next/server';
import { handleRouteError } from '@/lib/apiUtils';
import { getSystemSettings } from '@/lib/systemSettingsServer';

/** Public system defaults (prices, rates, form defaults). Contains no secrets. */
export async function GET() {
  try {
    return NextResponse.json({ settings: await getSystemSettings() }, { headers: { 'Cache-Control': 'no-store' } });
  } catch (error) {
    return handleRouteError(error, 'Settings read error', 'Ayarlar okunamadı.');
  }
}
