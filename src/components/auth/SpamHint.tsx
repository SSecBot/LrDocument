import { t } from '@/lib/i18n';
import React from 'react';
import { MailWarning } from 'lucide-react';

/** Shown wherever a code is e-mailed: the message may land in spam / junk / Promotions. */
export function SpamHint() {
  return (
    <div role="note" className="flex items-start gap-2.5 p-3 rounded-lg bg-amber-950/40 border border-amber-700/50 text-xs text-amber-200 leading-relaxed">
      <MailWarning className="w-4 h-4 text-amber-400 shrink-0 mt-px" />
      <p>
        <span className="font-semibold">{t('E-posta gelmedi mi?')}</span>{' '}{t('Kod birkaç dakika içinde gelir. Gelen kutunuzda yoksa')}{' '}
        <strong>{t('Spam / Gereksiz')}</strong>{' '}{t('ve (Gmail’de)')}{' '}<strong>{t('Promosyonlar')}</strong>{' '}{t('klasörüne bakın; orada bulursanız “Spam değil” olarak işaretleyin ki sonraki e-postalar gelen kutunuza düşsün.')}
      </p>
    </div>
  );
}
