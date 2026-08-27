import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { prisma } from './prisma';

const JWT_SECRET_STRING = process.env.JWT_SECRET || 'lrdocument_super_secret_jwt_key_2026_production';
const JWT_SECRET = new TextEncoder().encode(JWT_SECRET_STRING);
const COOKIE_NAME = 'lr_session';

export interface UserJWTPayload {
  userId: string;
  email: string;
  name: string;
  role: 'ADMIN' | 'USER';
  status: 'PENDING' | 'APPROVED' | 'REJECTED';
  subscriptionPlan?: 'Aylık' | 'Tek Seferlik';
}

export async function hashPassword(password: string): Promise<string> {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
}

export async function comparePassword(password: string, hash: string): Promise<boolean> {
  if (typeof password !== 'string' || typeof hash !== 'string' || !password || !hash) {
    return false;
  }
  return bcrypt.compare(password, hash);
}

export async function signSessionToken(payload: UserJWTPayload): Promise<string> {
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('30d')
    .sign(JWT_SECRET);
}

export async function verifySessionToken(token: string): Promise<UserJWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as UserJWTPayload;
  } catch {
    return null;
  }
}

export async function ensureDefaultAdmin() {
  try {
    const adminEmail = 'admin@lrdocument.com';
    const existingAdmin = await prisma.user.findUnique({
      where: { email: adminEmail },
    });

    if (!existingAdmin) {
      const passwordHash = await hashPassword('Admin123!');
      await prisma.user.create({
        data: {
          name: 'Master Admin',
          email: adminEmail,
          passwordHash,
          role: 'ADMIN',
          status: 'APPROVED',
          subscriptionPlan: 'Tek Seferlik',
        },
      });
    }
  } catch (error) {
    console.error('Error ensuring default admin:', error);
  }
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
      select: { id: true, email: true, name: true, role: true, status: true, subscriptionPlan: true },
    });

    if (!user || user.status !== 'APPROVED') {
      return null;
    }

    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      role: user.role as 'ADMIN' | 'USER',
      status: user.status as 'APPROVED',
      subscriptionPlan: (user.subscriptionPlan as 'Aylık' | 'Tek Seferlik') || 'Aylık',
    };
  } catch {
    return null;
  }
}

export async function requireAuth(): Promise<UserJWTPayload> {
  const session = await getCurrentSession();
  if (!session) {
    throw new Error('Unauthorized');
  }
  return session;
}

export async function requireAdmin(): Promise<UserJWTPayload> {
  const session = await getCurrentSession();
  if (!session || session.role !== 'ADMIN') {
    throw new Error('Forbidden: Admin access required');
  }
  return session;
}

export { COOKIE_NAME };
