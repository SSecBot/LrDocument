import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { prisma } from './prisma';
import { getJwtSecretKey, COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from './jwtSecret';
import { getSystemSettings } from './systemSettingsServer';
import { decryptText } from './dataCrypto';
import { FULL_PERMISSIONS, parsePermissions, type CorpPermissions, type OrgRole } from './corporate';

export interface UserJWTPayload {
  userId: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  subscriptionPlan?: 'Aylık' | 'Tek Seferlik';
  subscriptionType?: 'AYLIK' | 'TEK_SEFERLIK';
  paymentStatus?: 'PENDING' | 'MANUAL_APPROVED' | 'SUCCESSFUL';
  accountType?: 'STANDARD' | 'STUDENT' | 'CORPORATE';
  organization?: string | null;
  seats?: number | null;
  /** Session version; bumping it in the DB invalidates every token issued before. */
  sv?: number;
  /**
   * Kurumsal üye (signed in with a corporate code). `userId` is then the owner's id — the shared
   * data space — and the member's own session version is in `sv`.
   */
  memberId?: string;
  orgRole?: OrgRole;
  permissions?: CorpPermissions;
  /** The login e-mail was confirmed with a code. */
  emailVerified?: boolean;
  twoFactorEnabled?: boolean;
}

const PRESENCE_WRITE_MS = 60_000;
/** A user counts as "live" when seen within this window (the client pings every minute). */
export const LIVE_WINDOW_MS = 2 * 60_000;

export class AuthError extends Error {
  constructor(public readonly status: 401 | 403, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export const PASSWORD_MIN_LENGTH = 8;
// bcrypt only considers the first 72 bytes; reject longer input instead of silently truncating.
export const PASSWORD_MAX_LENGTH = 72;

export function validatePassword(password: unknown, minLength = PASSWORD_MIN_LENGTH): string | null {
  if (typeof password !== 'string' || password.length < minLength) {
    return `Şifre en az ${minLength} karakter olmalıdır.`;
  }
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_LENGTH) {
    return `Şifre en fazla ${PASSWORD_MAX_LENGTH} bayt uzunluğunda olabilir.`;
  }
  return null;
}

/** Password rule for new / changed passwords, using the admin-set minimum length. */
export async function validateNewPassword(password: unknown): Promise<string | null> {
  const { security } = await getSystemSettings();
  return validatePassword(password, Math.max(PASSWORD_MIN_LENGTH, security.passwordMinLength));
}

/** Session lifetime in seconds (Yönetici Paneli › Varsayılanlar › Güvenlik). */
export async function sessionMaxAgeSeconds(): Promise<number> {
  const { security } = await getSystemSettings();
  return Math.round(security.sessionDays * 24 * 60 * 60) || SESSION_MAX_AGE_SECONDS;
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(12);
  return bcrypt.hash(password, salt);
}

// Used to keep response timing similar when the e-mail does not exist (prevents user enumeration).
let dummyHashPromise: Promise<string> | null = null;

export async function comparePassword(password: unknown, hash: string | null | undefined): Promise<boolean> {
  if (typeof password !== 'string' || !password) return false;
  if (typeof hash !== 'string' || !hash.startsWith('$2')) {
    dummyHashPromise ??= hashPassword('timing-equalizer');
    await bcrypt.compare(password, await dummyHashPromise).catch(() => false);
    return false;
  }
  try {
    return await bcrypt.compare(password, hash);
  } catch {
    return false;
  }
}

/**
 * The session cookie carries no personal data: only the opaque user id, the role/status the proxy
 * needs for its optimistic redirect, and the session version. Name, e-mail and plan are always
 * read from the database (see getCurrentSession).
 */
export async function signSessionToken(payload: UserJWTPayload, maxAgeSeconds = SESSION_MAX_AGE_SECONDS): Promise<string> {
  return new SignJWT({
    userId: payload.userId,
    role: payload.role,
    status: payload.status,
    sv: payload.sv ?? 0,
    ...(payload.memberId ? { mid: payload.memberId } : {}),
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${maxAgeSeconds}s`)
    .sign(getJwtSecretKey());
}

export async function verifySessionToken(token: string): Promise<UserJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), { algorithms: ['HS256'] });
    if (typeof payload.userId !== 'string') return null;
    const { mid, ...rest } = payload as Record<string, unknown>;
    return { ...(rest as unknown as UserJWTPayload), ...(typeof mid === 'string' ? { memberId: mid } : {}) };
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, token: string, maxAgeSeconds = SESSION_MAX_AGE_SECONDS) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: maxAgeSeconds,
  });
}

export function clearSessionCookie(response: NextResponse) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: '',
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: 0,
  });
}

let defaultAdminPromise: Promise<void> | null = null;

/**
 * Creates the first admin account from ADMIN_EMAIL / ADMIN_PASSWORD env vars,
 * only when the database has no admin yet. Credentials are never hardcoded.
 */
export function ensureDefaultAdmin(): Promise<void> {
  if (!defaultAdminPromise) {
    defaultAdminPromise = (async () => {
      try {
        const adminCount = await prisma.user.count({ where: { role: 'ADMIN' } });
        if (adminCount > 0) return;

        const adminEmail = process.env.ADMIN_EMAIL?.toLowerCase().trim();
        const adminPassword = process.env.ADMIN_PASSWORD;
        if (!adminEmail || !adminPassword || validatePassword(adminPassword)) {
          console.warn(
            '[auth] Veritabanında yönetici yok. İlk yöneticiyi oluşturmak için ADMIN_EMAIL ve ADMIN_PASSWORD ortam değişkenlerini tanımlayın.'
          );
          return;
        }

        await prisma.user.upsert({
          where: { email: adminEmail },
          update: { role: 'ADMIN', status: 'APPROVED' },
          create: {
            name: 'Yönetici',
            email: adminEmail,
            passwordHash: await hashPassword(adminPassword),
            role: 'ADMIN',
            status: 'APPROVED',
            subscriptionType: 'TEK_SEFERLIK',
            subscriptionPlan: 'Tek Seferlik',
            paymentStatus: 'SUCCESSFUL',
          },
        });
      } catch (error) {
        defaultAdminPromise = null;
        console.error('Error ensuring default admin:', error);
      }
    })();
  }
  return defaultAdminPromise;
}

export async function getCurrentSession(): Promise<UserJWTPayload | null> {
  try {
    const cookieStore = await cookies();
    return await sessionFromToken(cookieStore.get(COOKIE_NAME)?.value);
  } catch {
    return null;
  }
}

/** Validates a session token against the database (also used by long-lived streams). */
export async function sessionFromToken(token: string | undefined): Promise<UserJWTPayload | null> {
  try {
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload) return null;
    if (payload.memberId) return await memberSession(payload);

    const user = await prisma.user.findUnique({
      where: { id: payload.userId },
      select: {
        id: true,
        email: true,
        name: true,
        role: true,
        status: true,
        subscriptionPlan: true,
        subscriptionType: true,
        paymentStatus: true,
        sessionVersion: true,
        accountType: true,
        organization: true,
        seats: true,
        lastSeenAt: true,
        emailVerifiedAt: true,
        twoFactorEnabledAt: true,
      },
    });

    if (!user || user.status !== 'APPROVED') return null;
    if ((payload.sv ?? 0) !== user.sessionVersion) return null;

    // Presence for the admin's live-user count; written at most once a minute per user.
    if (!user.lastSeenAt || Date.now() - user.lastSeenAt.getTime() > PRESENCE_WRITE_MS) {
      prisma.user.update({ where: { id: user.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role === 'ADMIN' ? 'ADMIN' : 'USER',
      status: 'APPROVED',
      subscriptionPlan: (user.subscriptionPlan as 'Aylık' | 'Tek Seferlik') || 'Aylık',
      subscriptionType: (user.subscriptionType as 'AYLIK' | 'TEK_SEFERLIK') || 'AYLIK',
      paymentStatus: (user.paymentStatus as 'PENDING' | 'MANUAL_APPROVED' | 'SUCCESSFUL') || 'PENDING',
      accountType: user.accountType === 'STUDENT' || user.accountType === 'CORPORATE' ? user.accountType : 'STANDARD',
      organization: user.organization,
      seats: user.seats,
      sv: user.sessionVersion,
      emailVerified: !!user.emailVerifiedAt,
      twoFactorEnabled: !!user.twoFactorEnabledAt,
      ...(user.accountType === 'CORPORATE' ? { orgRole: 'OWNER' as const, permissions: FULL_PERMISSIONS } : {}),
    };
  } catch {
    return null;
  }
}

/** Session of a corporate member: valid while the member exists and the owner's account is active. */
async function memberSession(payload: UserJWTPayload): Promise<UserJWTPayload | null> {
  const member = await prisma.orgMember.findUnique({
    where: { id: payload.memberId },
    select: {
      id: true,
      ownerId: true,
      name: true,
      role: true,
      permissions: true,
      sessionVersion: true,
      lastSeenAt: true,
      owner: {
        select: { status: true, accountType: true, organization: true, seats: true, subscriptionPlan: true, subscriptionType: true, paymentStatus: true },
      },
    },
  });
  if (!member || member.ownerId !== payload.userId) return null;
  if (member.owner.status !== 'APPROVED' || member.owner.accountType !== 'CORPORATE') return null;
  if ((payload.sv ?? 0) !== member.sessionVersion) return null;

  if (!member.lastSeenAt || Date.now() - member.lastSeenAt.getTime() > PRESENCE_WRITE_MS) {
    prisma.orgMember.update({ where: { id: member.id }, data: { lastSeenAt: new Date() } }).catch(() => undefined);
  }

  const role: OrgRole = member.role === 'MANAGER' ? 'MANAGER' : 'MEMBER';
  return {
    userId: member.ownerId,
    memberId: member.id,
    email: '',
    name: decryptText(member.ownerId, member.name),
    role: 'USER',
    status: 'APPROVED',
    subscriptionPlan: (member.owner.subscriptionPlan as 'Aylık' | 'Tek Seferlik') || 'Aylık',
    subscriptionType: (member.owner.subscriptionType as 'AYLIK' | 'TEK_SEFERLIK') || 'AYLIK',
    paymentStatus: (member.owner.paymentStatus as 'PENDING' | 'MANUAL_APPROVED' | 'SUCCESSFUL') || 'PENDING',
    accountType: 'CORPORATE',
    organization: member.owner.organization,
    seats: member.owner.seats,
    sv: member.sessionVersion,
    orgRole: role,
    permissions: role === 'MANAGER' ? FULL_PERMISSIONS : parsePermissions(member.permissions),
  };
}

export async function requireAuth(): Promise<UserJWTPayload> {
  const session = await getCurrentSession();
  if (!session) throw new AuthError(401, 'Giriş yapmanız gerekmektedir.');
  return session;
}

/**
 * Actions on the login itself (password, e-mail): not for corporate members, who sign in with the
 * code their owner manages and must never act on the owner's account.
 */
export async function requireAccountOwner(): Promise<UserJWTPayload> {
  const session = await requireAuth();
  if (session.memberId) throw new AuthError(403, 'Bu işlem kurumsal üye hesaplarında kullanılamaz.');
  return session;
}

/** Student tools are available to student accounts and to admins. */
export async function requireStudentAccess(): Promise<UserJWTPayload> {
  const session = await getCurrentSession();
  if (!session) throw new AuthError(401, 'Giriş yapmanız gerekmektedir.');
  if (session.accountType !== 'STUDENT' && session.role !== 'ADMIN') {
    throw new AuthError(403, 'Bu bölüm yalnızca öğrenci hesaplarına açıktır.');
  }
  return session;
}

export async function requireAdmin(): Promise<UserJWTPayload> {
  const session = await getCurrentSession();
  if (!session) throw new AuthError(401, 'Giriş yapmanız gerekmektedir.');
  if (session.role !== 'ADMIN') throw new AuthError(403, 'Yönetici yetkisi gereklidir.');
  return session;
}

export { COOKIE_NAME };
