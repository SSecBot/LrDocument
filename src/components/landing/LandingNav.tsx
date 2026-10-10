'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { ArrowRight, Menu, X } from 'lucide-react';
import { SigmaLogo } from '@/components/ui/SigmaLogo';

const LINKS = [
  ['#ozellikler', 'Özellikler'],
  ['#ogrenciler', 'Öğrenciler'],
  ['#fiyatlar', 'Fiyatlar'],
  ['#sss', 'SSS'],
] as const;

/** Top bar of the landing page; only asks the server whether a session exists (no user data). */
export function LandingNav() {
  const [authed, setAuthed] = useState<boolean | null>(null);
  const [open, setOpen] = useState(false);

  useEffect(() => {
    const ctrl = new AbortController();
    fetch('/api/auth/me', { signal: ctrl.signal, cache: 'no-store' })
      .then((r) => r.json())
      .then((d: { authenticated?: boolean }) => setAuthed(!!d.authenticated))
      .catch(() => setAuthed(false));
    return () => ctrl.abort();
  }, []);

  return (
    <header className="sticky top-0 z-40 border-b border-line/70 bg-app/85 backdrop-blur-xl pt-[env(safe-area-inset-top)]">
      <div className="max-w-6xl mx-auto px-4 sm:px-6 h-16 flex items-center justify-between gap-3">
        <Link href="/" className="flex items-center gap-2.5 min-w-0" aria-label="LrDocument ana sayfa">
          <SigmaLogo size="sm" />
          <span className="font-semibold tracking-tight text-fg">LrDocument</span>
        </Link>

        <nav className="hidden md:flex items-center gap-7 text-[13px] text-subtle" aria-label="Sayfa bölümleri">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href} className="hover:text-fg transition-colors">
              {label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 shrink-0">
          {authed ? (
            <Link href="/dashboard" className="h-9 px-4 rounded-lg bg-brand hover:bg-brand-hover text-white text-[13px] font-medium inline-flex items-center gap-1.5">
              Panele git <ArrowRight className="w-4 h-4" />
            </Link>
          ) : (
            <>
              <Link href="/login" className="h-9 px-3 sm:px-4 rounded-lg text-[13px] text-body hover:text-fg hover:bg-surface-2 inline-flex items-center">
                Giriş
              </Link>
              <Link href="/register" className="h-9 px-3 sm:px-4 rounded-lg bg-brand hover:bg-brand-hover text-white text-[13px] font-medium inline-flex items-center">
                Kayıt ol
              </Link>
            </>
          )}
          <button
            type="button"
            className="md:hidden h-9 w-9 rounded-lg inline-flex items-center justify-center text-subtle hover:text-fg hover:bg-surface-2"
            onClick={() => setOpen((o) => !o)}
            aria-expanded={open}
            aria-label={open ? 'Menüyü kapat' : 'Menüyü aç'}
          >
            {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>
      {open && (
        <nav className="md:hidden border-t border-line/70 px-4 py-2 grid" aria-label="Sayfa bölümleri">
          {LINKS.map(([href, label]) => (
            <a key={href} href={href} onClick={() => setOpen(false)} className="py-3 text-sm text-body border-b border-line/50 last:border-0">
              {label}
            </a>
          ))}
        </nav>
      )}
    </header>
  );
}
