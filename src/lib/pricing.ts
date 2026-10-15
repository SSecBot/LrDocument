import { DEFAULT_SYSTEM_SETTINGS, type SystemSettings } from './systemSettings';

export type SubscriptionPlanName = 'Aylık' | 'Tek Seferlik';
/** STANDARD = bireysel, STUDENT = üniversite öğrencisi, CORPORATE = kurumsal (kişi sayısına göre). */
export type AccountType = 'STANDARD' | 'STUDENT' | 'CORPORATE';
export type PricingSettings = SystemSettings['pricing'];

export const ACCOUNT_TYPES: AccountType[] = ['STANDARD', 'CORPORATE', 'STUDENT'];
export const ACCOUNT_TYPE_LABEL: Record<AccountType, string> = {
  STANDARD: 'Bireysel',
  CORPORATE: 'Kurumsal',
  STUDENT: 'Öğrenci',
};

export function normalizeAccountType(value: unknown): AccountType {
  return value === 'STUDENT' || value === 'CORPORATE' ? value : 'STANDARD';
}

/** Seat count clamped to the admin's limits (only meaningful for Kurumsal). */
export function clampSeats(seats: unknown, pricing: PricingSettings = DEFAULT_SYSTEM_SETTINGS.pricing): number {
  const n = Math.round(Number(seats));
  if (!Number.isFinite(n)) return pricing.corporateMinSeats;
  return Math.min(pricing.corporateMaxSeats, Math.max(pricing.corporateMinSeats, n));
}

/** Price of one seat in whole lira. */
export function seatPrice(
  plan: SubscriptionPlanName,
  accountType: AccountType = 'STANDARD',
  pricing: PricingSettings = DEFAULT_SYSTEM_SETTINGS.pricing
): number {
  const base = plan === 'Tek Seferlik' ? pricing.lifetime : pricing.monthly;
  if (accountType === 'STUDENT') return Math.floor((base * (100 - pricing.studentDiscountPercent)) / 100);
  if (accountType === 'CORPORATE') return Math.round((base * pricing.corporatePercent) / 100);
  return base;
}

/**
 * Total price: Kurumsal = kişi sayısı × normal fiyatın %corporatePercent'i
 * (monthly per month, or once for lifetime access).
 */
export function planPrice(
  plan: SubscriptionPlanName,
  accountType: AccountType = 'STANDARD',
  pricing: PricingSettings = DEFAULT_SYSTEM_SETTINGS.pricing,
  seats = 1
): number {
  const one = seatPrice(plan, accountType, pricing);
  return accountType === 'CORPORATE' ? one * clampSeats(seats, pricing) : one;
}

export const formatTL = (n: number) => `${n.toLocaleString('tr-TR')} TL`;

export function formatPlanPrice(plan: SubscriptionPlanName, accountType: AccountType = 'STANDARD', pricing?: PricingSettings, seats?: number): string {
  return formatTL(planPrice(plan, accountType, pricing, seats));
}

export function planLabel(plan: SubscriptionPlanName, accountType: AccountType = 'STANDARD', pricing?: PricingSettings, seats?: number): string {
  const name = plan === 'Tek Seferlik' ? 'Ömür Boyu' : 'Aylık';
  const suffix = accountType === 'CORPORATE' ? ` · ${clampSeats(seats, pricing)} kişi` : '';
  return `${name} (${formatPlanPrice(plan, accountType, pricing, seats)}${suffix})`;
}
