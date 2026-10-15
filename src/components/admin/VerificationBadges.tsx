'use client';

import React from 'react';
import { BadgeCheck, FileText, MailWarning, ShieldCheck } from 'lucide-react';
import type { AdminUserItem } from '@/types';

export type VerificationAction = 'verify-email' | 'student-approve' | 'student-reject' | 'student-revoke' | 'reset-2fa';

const chip = 'inline-flex items-center gap-1 px-1.5 py-0.5 rounded text-[10px] font-medium border';
const act = 'text-[10px] underline underline-offset-2 hover:text-fg disabled:opacity-50';

/** E-mail / student verification and 2FA state of a user, with the admin's manual actions. */
export function VerificationBadges({
  user,
  busy,
  onAction,
}: {
  user: AdminUserItem;
  busy: boolean;
  onAction: (user: AdminUserItem, action: VerificationAction) => void;
}) {
  const sp = user.studentProfile;
  const doc = user.studentDocument;
  return (
    <div className="mt-1.5 flex flex-wrap items-center gap-1.5 text-muted">
      {user.emailVerifiedAt ? (
        <span className={`${chip} border-emerald-500/30 text-emerald-300`} title={`E-posta doğrulandı: ${new Date(user.emailVerifiedAt).toLocaleString('tr-TR')}`}>
          <BadgeCheck className="w-3 h-3" /> E-posta
        </span>
      ) : (
        <span className="inline-flex items-center gap-1.5">
          <span className={`${chip} border-amber-500/30 text-amber-300`}>
            <MailWarning className="w-3 h-3" /> E-posta doğrulanmadı
          </span>
          <button className={act} disabled={busy} onClick={() => onAction(user, 'verify-email')} title="Kod ulaşmıyorsa e-postayı doğrulanmış sayın">
            Doğrulanmış say
          </button>
        </span>
      )}

      {user.twoFactorEnabledAt && (
        <span className="inline-flex items-center gap-1.5">
          <span className={`${chip} border-sky-500/30 text-sky-300`}>
            <ShieldCheck className="w-3 h-3" /> 2 adımlı
          </span>
          <button className={act} disabled={busy} onClick={() => onAction(user, 'reset-2fa')} title="Telefonunu kaybeden kullanıcı için">
            Sıfırla
          </button>
        </span>
      )}

      {user.accountType === 'STUDENT' && sp && (
        sp.verifiedAt ? (
          <span className="inline-flex items-center gap-1.5">
            <span className={`${chip} border-emerald-500/30 text-emerald-300`}>
              <BadgeCheck className="w-3 h-3" /> Öğrenci ({sp.verifyMethod === 'document' ? 'belge' : 'e-posta'})
            </span>
            <button className={act} disabled={busy} onClick={() => onAction(user, 'student-revoke')}>
              Kaldır
            </button>
          </span>
        ) : sp.documentStatus === 'pending' && doc ? (
          <span className="inline-flex flex-wrap items-center gap-1.5">
            <span className={`${chip} border-amber-500/30 text-amber-300`}>
              <FileText className="w-3 h-3" /> Belge bekliyor
            </span>
            <a className={act} href={`/api/admin/users/${encodeURIComponent(user.id)}/student-document`} target="_blank" rel="noopener noreferrer">
              {doc.mime === 'application/pdf' ? 'İndir' : 'Görüntüle'}
            </a>
            <button className={`${act} text-emerald-300`} disabled={busy} onClick={() => onAction(user, 'student-approve')}>
              Onayla
            </button>
            <button className={`${act} text-rose-300`} disabled={busy} onClick={() => onAction(user, 'student-reject')}>
              Reddet
            </button>
          </span>
        ) : (
          <span className="inline-flex items-center gap-1.5">
            <span className={`${chip} border-line-strong text-subtle`}>Öğrenci doğrulanmadı{sp.documentStatus === 'rejected' ? ' · belge reddedildi' : ''}</span>
            <button className={act} disabled={busy} onClick={() => onAction(user, 'student-approve')} title="Öğrenciliği elle doğrula">
              Doğrula
            </button>
          </span>
        )
      )}
    </div>
  );
}
