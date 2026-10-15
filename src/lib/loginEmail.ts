import { prisma } from './prisma';

// A student can sign in with the account e-mail or with the student e-mail confirmed in
// Ayarlar › Güvenlik (StudentProfile.loginEmail). Both kinds of address are unique across accounts.

/** True when the address is an account e-mail or a confirmed student e-mail of another account. */
export async function emailInUse(email: string, exceptUserId?: string): Promise<boolean> {
  const [user, profile] = await Promise.all([
    prisma.user.findUnique({ where: { email }, select: { id: true } }),
    prisma.studentProfile.findFirst({ where: { loginEmail: email }, select: { userId: true } }),
  ]);
  return (!!user && user.id !== exceptUserId) || (!!profile && profile.userId !== exceptUserId);
}

/** The account an address signs in to: the account e-mail first, then a confirmed student e-mail. */
export async function findUserByLoginEmail(email: string) {
  const user = await prisma.user.findUnique({ where: { email } });
  if (user) return user;
  const profile = await prisma.studentProfile.findFirst({ where: { loginEmail: email }, select: { user: true } });
  return profile?.user ?? null;
}
