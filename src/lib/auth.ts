import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import type { NextResponse } from 'next/server';
import { prisma } from './prisma';
import { getJwtSecretKey, COOKIE_NAME, SESSION_MAX_AGE_SECONDS } from './jwtSecret';

export interface UserJWTPayload {
  userId: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  subscriptionPlan?: 'Aylık' | 'Tek Seferlik';
  subscriptionType?: 'AYLIK' | 'TEK_SEFERLIK';
  paymentStatus?: 'PENDING' | 'MANUAL_APPROVED' | 'SUCCESSFUL';
  accountType?: 'STANDARD' | 'STUDENT';
  /** Session version; bumping it in the DB invalidates every token issued before. */
  sv?: number;
}

export class AuthError extends Error {
  constructor(public readonly status: 401 | 403, message: string) {
    super(message);
    this.name = 'AuthError';
  }
}

export const PASSWORD_MIN_LENGTH = 8;
// bcrypt only considers the first 72 bytes; reject longer input instead of silently truncating.
export const PASSWORD_MAX_LENGTH = 72;

export function validatePassword(password: unknown): string | null {
  if (typeof password !== 'string' || password.length < PASSWORD_MIN_LENGTH) {
    return `Şifre en az ${PASSWORD_MIN_LENGTH} karakter olmalıdır.`;
  }
  if (new TextEncoder().encode(password).length > PASSWORD_MAX_LENGTH) {
    return `Şifre en fazla ${PASSWORD_MAX_LENGTH} bayt uzunluğunda olabilir.`;
  }
  return null;
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

export async function signSessionToken(payload: UserJWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime(`${SESSION_MAX_AGE_SECONDS}s`)
    .sign(getJwtSecretKey());
}

export async function verifySessionToken(token: string): Promise<UserJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, getJwtSecretKey(), { algorithms: ['HS256'] });
    if (typeof payload.userId !== 'string') return null;
    return payload as unknown as UserJWTPayload;
  } catch {
    return null;
  }
}

export function setSessionCookie(response: NextResponse, token: string) {
  response.cookies.set({
    name: COOKIE_NAME,
    value: token,
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
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
    const token = cookieStore.get(COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifySessionToken(token);
    if (!payload) return null;

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
      },
    });

    if (!user || user.status !== 'APPROVED') return null;
    if ((payload.sv ?? 0) !== user.sessionVersion) return null;

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role === 'ADMIN' ? 'ADMIN' : 'USER',
      status: 'APPROVED',
      subscriptionPlan: (user.subscriptionPlan as 'Aylık' | 'Tek Seferlik') || 'Aylık',
      subscriptionType: (user.subscriptionType as 'AYLIK' | 'TEK_SEFERLIK') || 'AYLIK',
      paymentStatus: (user.paymentStatus as 'PENDING' | 'MANUAL_APPROVED' | 'SUCCESSFUL') || 'PENDING',
      accountType: user.accountType === 'STUDENT' ? 'STUDENT' : 'STANDARD',
      sv: user.sessionVersion,
    };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<UserJWTPayload> {
  const session = await getCurrentSession();
  if (!session) throw new AuthError(401, 'Giriş yapmanız gerekmektedir.');
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
