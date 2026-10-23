import { t } from '@/lib/i18n';
import React from 'react';

/**
 * "iyzico ile Öde" and the accepted card brands (Visa, Mastercard), shown in the footer, under the
 * prices and below the legal texts as the payment provider requires. Drawn inline so no third-party
 * image is loaded.
 */
export function PaymentLogos({ className = '' }: { className?: string }) {
  return (
    <div className={`flex items-center gap-2 ${className}`} aria-label={t('iyzico ile öde; kabul edilen kartlar: Visa ve Mastercard')}>
      <span className="h-7 px-2.5 rounded-md bg-white flex items-center gap-1 shadow-sm" title="iyzico ile Öde">
        <svg viewBox="0 0 104 20" className="h-[14px] w-auto" role="img" aria-label="iyzico ile Öde">
          <text x="0" y="15" fontFamily="Arial, Helvetica, sans-serif" fontSize="17" fontWeight="700" fill="#1E64FF" letterSpacing="-0.3">
            iyzico
          </text>
          <text x="54" y="15" fontFamily="Arial, Helvetica, sans-serif" fontSize="13" fontWeight="600" fill="#1F2937">
            ile Öde
          </text>
        </svg>
      </span>
      <span className="h-7 w-11 rounded-md bg-white flex items-center justify-center shadow-sm" title="Visa">
        <svg viewBox="0 0 48 16" className="h-[11px] w-auto" role="img" aria-label="Visa">
          <text x="24" y="13.5" textAnchor="middle" fontFamily="Arial, Helvetica, sans-serif" fontSize="16" fontWeight="900" fontStyle="italic" fill="#1A1F71" letterSpacing="0.5">
            VISA
          </text>
        </svg>
      </span>
      <span className="h-7 w-11 rounded-md bg-white flex items-center justify-center shadow-sm" title="Mastercard">
        <svg viewBox="0 0 32 20" className="h-[18px] w-auto" role="img" aria-label="Mastercard">
          <circle cx="11" cy="10" r="8" fill="#EB001B" />
          <circle cx="21" cy="10" r="8" fill="#F79E1B" />
          <path d="M16 3.76a8 8 0 0 1 0 12.48a8 8 0 0 1 0-12.48z" fill="#FF5F00" />
        </svg>
      </span>
    </div>
  );
}
