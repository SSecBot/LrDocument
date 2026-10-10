export type SubscriptionPlanName = 'Aylık' | 'Tek Seferlik';
export type AccountType = 'STANDARD' | 'STUDENT';

const BASE_PRICES: Record<SubscriptionPlanName, number> = {
  Aylık: 100,
  'Tek Seferlik': 1999,
};

/** University students pay half price (rounded down to a whole lira). */
export function planPrice(plan: SubscriptionPlanName, accountType: AccountType = 'STANDARD'): number {
  const base = BASE_PRICES[plan];
  return accountType === 'STUDENT' ? Math.floor(base / 2) : base;
}

export function formatPlanPrice(plan: SubscriptionPlanName, accountType: AccountType = 'STANDARD'): string {
  return `${planPrice(plan, accountType)} TL`;
}

export function planLabel(plan: SubscriptionPlanName, accountType: AccountType = 'STANDARD'): string {
  const name = plan === 'Tek Seferlik' ? 'Ömür Boyu' : 'Aylık';
  return `${name} (${formatPlanPrice(plan, accountType)})`;
}
