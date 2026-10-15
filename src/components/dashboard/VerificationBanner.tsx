'use client';

import React, { useEffect, useState } from 'react';
import { GraduationCap, MailWarning } from 'lucide-react';
import { useAppStore } from '@/store/useAppStore';

/** Reminds about an unconfirmed e-mail or an unverified student status. */
export function VerificationBanner() {
  const { currentUser, openSettings } = useAppStore();
  const [studentPending, setStudentPending] = useState(false);
  const isStudent = currentUser?.accountType === 'STUDENT';

  useEffect(() => {
    if (!isStudent) return;
    fetch('/api/student/verify', { cache: 'no-store' })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => setStudentPending(!!d && !d.verified && d.documentStatus !== 'pending'))
      .catch(() => {});
  }, [isStudent]);

  if (!currentUser || currentUser.memberId) return null;
  const emailMissing = currentUser.emailVerified === false && currentUser.role !== 'ADMIN';
  if (!emailMissing && !studentPending) return null;

  const item = 'flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3 p-3 rounded-lg border text-sm';
  const btn = 'shrink-0 h-9 px-3 rounded-md bg-surface-3 hover:bg-surface-4 text-fg text-xs font-medium';
  return (
    <div className="space-y-2">
      {emailMissing && (
        <div className={`${item} border-amber-500/30 bg-amber-500/5`}>
          <MailWarning className="w-4 h-4 text-amber-300 shrink-0" />
          <p className="flex-1 text-body">E-posta adresiniz doğrulanmadı. Hesabınızı korumak için adresinize gelen kodla doğrulayın.</p>
          <button onClick={() => openSettings('guvenlik')} className={btn}>
            Doğrula
          </button>
        </div>
      )}
      {studentPending && (
        <div className={`${item} border-sky-500/30 bg-sky-500/5`}>
          <GraduationCap className="w-4 h-4 text-sky-300 shrink-0" />
          <p className="flex-1 text-body">Öğrenciliğinizi doğrulayın: üniversite e-postanıza gelen kodla ya da öğrenci belgesiyle.</p>
          <button onClick={() => openSettings('ogrenci')} className={btn}>
            Doğrula
          </button>
        </div>
      )}
    </div>
  );
}
