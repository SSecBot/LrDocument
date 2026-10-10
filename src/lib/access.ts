import type { UserProfile } from '@/types';

/** The course tracker is shown to student accounts and to admins. */
export function hasStudentAccess(user: Pick<UserProfile, 'role' | 'accountType'> | null | undefined): boolean {
  return !!user && (user.accountType === 'STUDENT' || user.role === 'ADMIN');
}
