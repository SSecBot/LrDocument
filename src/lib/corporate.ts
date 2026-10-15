// ---------------------------------------------------------------------------
// Kurumsal çalışma alanı (shared by server and client).
//
// A corporate account works like a Discord server: the owner (opened by the admin) adds people,
// each gets a personal code to sign in with, and everybody works in the owner's shared data space.
// The owner and up to MAX_MANAGERS managers see and edit everything; for other members each module
// is hidden, read-only or editable.
// ---------------------------------------------------------------------------

export const CORP_MODULES = ['notes', 'customers', 'work', 'calendar', 'finance'] as const;
export type CorpModule = (typeof CORP_MODULES)[number];
export type CorpAccess = 'none' | 'view' | 'edit';
export type CorpPermissions = Record<CorpModule, CorpAccess>;
export type OrgRole = 'OWNER' | 'MANAGER' | 'MEMBER';

export const MAX_MANAGERS = 2;

export const CORP_MODULE_LABEL: Record<CorpModule, string> = {
  notes: 'Ortak Notlar',
  customers: 'Müşteriler',
  work: 'Görevler ve Kanban',
  calendar: 'Takvim',
  finance: 'Gelir ve Gider',
};

export const CORP_ACCESS_LABEL: Record<CorpAccess, string> = {
  none: 'Gizli',
  view: 'Görüntüler',
  edit: 'Düzenler',
};

export const ORG_ROLE_LABEL: Record<OrgRole, string> = {
  OWNER: 'Kurum sahibi',
  MANAGER: 'Yönetici',
  MEMBER: 'Üye',
};

export const FULL_PERMISSIONS: CorpPermissions = { notes: 'edit', customers: 'edit', work: 'edit', calendar: 'edit', finance: 'edit' };

/** What a newly added member may do until the owner / a manager changes it. */
export const DEFAULT_MEMBER_PERMISSIONS: CorpPermissions = {
  notes: 'view',
  customers: 'view',
  work: 'edit',
  calendar: 'edit',
  finance: 'none',
};

const ACCESS: CorpAccess[] = ['none', 'view', 'edit'];

export function parsePermissions(raw: unknown): CorpPermissions {
  let obj: unknown = raw;
  if (typeof raw === 'string') {
    try {
      obj = JSON.parse(raw);
    } catch {
      obj = {};
    }
  }
  const src = obj && typeof obj === 'object' && !Array.isArray(obj) ? (obj as Record<string, unknown>) : {};
  const out = { ...DEFAULT_MEMBER_PERMISSIONS };
  for (const m of CORP_MODULES) {
    if (ACCESS.includes(src[m] as CorpAccess)) out[m] = src[m] as CorpAccess;
  }
  return out;
}

/** Data-API entity → module whose permission guards it. */
export const ENTITY_MODULE: Record<string, CorpModule> = {
  note: 'notes',
  folder: 'notes',
  task: 'work',
  kanban: 'work',
  event: 'calendar',
  finance: 'finance',
  category: 'finance',
  customer: 'customers',
};

interface PermissionHolder {
  accountType?: string | null;
  permissions?: CorpPermissions | null;
}

export function isCorporate(user: PermissionHolder | null | undefined): boolean {
  return user?.accountType === 'CORPORATE';
}

/** Non-corporate accounts have every module except Müşteriler (corporate only). */
export function accessOf(user: PermissionHolder | null | undefined, module: CorpModule): CorpAccess {
  if (!user) return 'none';
  if (!isCorporate(user)) return module === 'customers' ? 'none' : 'edit';
  return user.permissions?.[module] ?? 'edit';
}

export const canView = (user: PermissionHolder | null | undefined, module: CorpModule) => accessOf(user, module) !== 'none';
export const canEdit = (user: PermissionHolder | null | undefined, module: CorpModule) => accessOf(user, module) === 'edit';

// Personal corporate codes: "LR-XXXX-XXXX-XXXX" from an alphabet without look-alikes (0/O, 1/I).
export const CODE_ALPHABET = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ';
export const CODE_LENGTH = 12;

/** Upper-cases and strips separators / the "LR" prefix; returns null when it cannot be a code. */
export function normalizeCorporateCode(input: unknown): string | null {
  if (typeof input !== 'string') return null;
  let s = input.toUpperCase().replace(/[^0-9A-Z]/g, '');
  if (s.length === CODE_LENGTH + 2 && s.startsWith('LR')) s = s.slice(2);
  if (s.length !== CODE_LENGTH) return null;
  for (const ch of s) if (!CODE_ALPHABET.includes(ch)) return null;
  return s;
}

export function formatCorporateCode(code: string): string {
  return `LR-${code.slice(0, 4)}-${code.slice(4, 8)}-${code.slice(8, 12)}`;
}
