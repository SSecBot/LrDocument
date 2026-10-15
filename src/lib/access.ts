import type { UserProfile } from '@/types';

/**
 * The course tracker belongs to student accounts. An admin account works like an individual
 * (bireysel) account plus Yönetici Paneli; set the admin's account type to Öğrenci to use it.
 */
export function hasStudentAccess(user: Pick<UserProfile, 'accountType'> | null | undefined): boolean {
  return user?.accountType === 'STUDENT';
}
