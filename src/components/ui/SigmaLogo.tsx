import React from 'react';

interface SigmaLogoProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  className?: string;
  withContainer?: boolean;
  animateGlow?: boolean;
}

export function SigmaLogo({
  size = 'md',
  className = '',
  withContainer = true,
  animateGlow = false,
}: SigmaLogoProps) {
  const sizeMap = {
    xs: { container: 'w-7 h-7 rounded-lg', icon: 'w-3.5 h-3.5' },
    sm: { container: 'w-8 h-8 rounded-xl', icon: 'w-4 h-4' },
    md: { container: 'w-10 h-10 rounded-xl', icon: 'w-5 h-5' },
    lg: { container: 'w-12 h-12 rounded-2xl', icon: 'w-6 h-6' },
    xl: { container: 'w-16 h-16 rounded-3xl', icon: 'w-8 h-8' },
  };

  const currentSize = sizeMap[size];

  // SVG mathematical Sigma symbol (Σ) with clean geometric lines
  const sigmaSvg = (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${currentSize.icon} text-emerald-400 fill-current drop-shadow-[0_0_8px_rgba(52,211,153,0.3)] transition-all`}
    >
      <path
        d="M19 5H6.5L13 12L6.5 19H19V21H4.5V19.5L11.5 12L4.5 4.5V3H19V5Z"
        stroke="currentColor"
        strokeWidth="0.75"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );

  if (!withContainer) {
    return <div className={`inline-flex items-center justify-center ${className}`}>{sigmaSvg}</div>;
  }

  return (
    <div
      className={`relative inline-flex items-center justify-center bg-gradient-to-br from-[#244222] via-[#1a3319] to-[#0f1f0e] border border-[#386b34]/60 shadow-lg shadow-emerald-950/40 text-emerald-300 ${
        currentSize.container
      } ${animateGlow ? 'ring-2 ring-emerald-500/30 ring-offset-2 ring-offset-[#0d0e12]' : ''} ${className}`}
    >
      {sigmaSvg}
    </div>
  );
}

interface SigmaBrandProps {
  size?: 'sm' | 'md' | 'lg';
  subtitle?: string;
  showBadge?: boolean;
  className?: string;
}

export function SigmaBrand({
  size = 'md',
  subtitle = 'Matematik & İçerik Üretim Alanı',
  showBadge = true,
  className = '',
}: SigmaBrandProps) {
  const isLarge = size === 'lg';
  const isSmall = size === 'sm';

  return (
    <div className={`flex items-center gap-3 select-none ${className}`}>
      <SigmaLogo size={isLarge ? 'lg' : isSmall ? 'sm' : 'md'} />
      <div>
        <div className="flex items-center gap-2">
          <span className={`font-extrabold tracking-tight text-white ${isLarge ? 'text-xl' : isSmall ? 'text-sm' : 'text-base'}`}>
            LrDocument
          </span>
          {showBadge && (
            <span className="text-[10px] uppercase font-bold text-emerald-400 bg-emerald-950/80 px-1.5 py-0.5 rounded border border-emerald-800/60 shadow-sm">
              PRO
            </span>
          )}
        </div>
        {subtitle && (
          <p className={`text-[#84a98c] font-medium tracking-tight ${isLarge ? 'text-xs' : 'text-[11px]'}`}>
            {subtitle}
          </p>
        )}
      </div>
    </div>
  );
}
