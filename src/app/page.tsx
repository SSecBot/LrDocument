import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  BookOpen,
  Building2,
  CalendarDays,
  CalendarRange,
  FileText,
  FileUp,
  GraduationCap,
  Kanban,
  ListChecks,
  Lock,
  ShieldCheck,
  Sigma,
  Smartphone,
  Users,
  Wallet,
} from 'lucide-react';
import { SigmaLogo } from '@/components/ui/SigmaLogo';
import { LandingNav } from '@/components/landing/LandingNav';
import { PricingPlans } from '@/components/landing/PricingPlans';
import { getLandingContent, getSystemSettings } from '@/lib/systemSettingsServer';
import type { LandingIcon } from '@/lib/landingContent';

// Texts (Yönetici Paneli › Açılış sayfası) and prices come from the database: render per request.
export const dynamic = 'force-dynamic';

const ICONS: Record<LandingIcon, React.ElementType> = {
  GraduationCap,
  FileText,
  ListChecks,
  Kanban,
  CalendarDays,
  CalendarRange,
  Wallet,
  FileUp,
  BellRing,
  ShieldCheck,
  Smartphone,
  Sigma,
  BookOpen,
  Building2,
  Users,
  Lock,
};
const TRUST_ICONS = [ShieldCheck, Smartphone, FileUp, Lock];

export default async function LandingPage() {
  const [{ pricing }, c] = await Promise.all([getSystemSettings(), getLandingContent()]);
  const discount = pricing.studentDiscountPercent;
  const hasFaq = c.faq.visible && c.faq.items.length > 0;
  const nav: [string, string][] = [];
  if (c.features.visible) nav.push(['#ozellikler', c.features.eyebrow || 'Özellikler']);
  if (c.students.visible) nav.push(['#ogrenciler', 'Öğrenciler']);
  if (c.pricing.visible) nav.push(['#fiyatlar', c.pricing.eyebrow || 'Fiyatlar']);
  if (hasFaq) nav.push(['#sss', c.faq.eyebrow || 'SSS']);
  const preview = c.hero.showPreview;

  return (
    <div className="min-h-dvh bg-app text-fg overflow-x-clip">
      <LandingNav links={nav} />

      <main>
        {/* Hero */}
        <section className="relative">
          <div
            className={`relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-16 grid gap-12 lg:gap-10 items-center ${
              preview ? 'lg:grid-cols-[1.05fr_1fr]' : ''
            }`}
          >
            <div className={`space-y-6 text-center ${preview ? 'lg:text-left' : 'max-w-3xl mx-auto'}`}>
              {c.hero.eyebrow && (
                <p className="inline-flex items-center gap-2 min-h-7 px-3 rounded-full border border-brand-line bg-brand-soft text-[12px] text-brand-light">
                  <Sigma className="w-3.5 h-3.5" /> {c.hero.eyebrow}
                </p>
              )}
              <h1 className="text-[2.1rem] leading-[1.15] sm:text-5xl sm:leading-[1.1] font-semibold tracking-tight text-fg">
                {c.hero.title} {c.hero.highlight && <span className="text-brand-light">{c.hero.highlight}</span>}
              </h1>
              {c.hero.subtitle && (
                <p className={`text-base sm:text-lg text-subtle leading-relaxed max-w-xl mx-auto ${preview ? 'lg:mx-0' : ''}`}>
                  {c.hero.subtitle}
                </p>
              )}
              <div className={`flex flex-col sm:flex-row gap-3 justify-center ${preview ? 'lg:justify-start' : ''}`}>
                <Link
                  href="/register"
                  className="h-12 px-6 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-medium inline-flex items-center justify-center gap-2"
                >
                  {c.hero.primaryCta} <ArrowRight className="w-4 h-4" />
                </Link>
                {c.hero.secondaryCta && (
                  <Link
                    href="/register?ogrenci=1"
                    className="h-12 px-6 rounded-xl bg-surface-2 hover:bg-surface-3 border border-line text-fg text-sm font-medium inline-flex items-center justify-center gap-2"
                  >
                    <GraduationCap className="w-4 h-4 text-brand-light" /> {c.hero.secondaryCta}
                    {discount > 0 ? `, %${discount} indirim` : ''}
                  </Link>
                )}
              </div>
              {c.hero.trustPoints.length > 0 && (
                <ul className={`flex flex-wrap justify-center gap-x-5 gap-y-2 text-[12px] text-muted ${preview ? 'lg:justify-start' : ''}`}>
                  {c.hero.trustPoints.filter(Boolean).map((t, i) => {
                    const Icon = TRUST_ICONS[i % TRUST_ICONS.length];
                    return (
                      <li key={i} className="inline-flex items-center gap-1.5">
                        <Icon className="w-3.5 h-3.5" /> {t}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {preview && <ProductPreview />}
          </div>
        </section>

        {c.features.visible && c.features.items.length > 0 && (
          <section id="ozellikler" className="scroll-mt-20 border-t border-line/70">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
              <SectionTitle eyebrow={c.features.eyebrow} title={c.features.title} text={c.features.text} />
              <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {c.features.items.map(({ icon, title, text }, i) => {
                  const Icon = ICONS[icon];
                  return (
                    <div key={i} className={`rounded-2xl border p-5 ${i === 0 ? 'border-brand-line bg-brand-soft/40' : 'border-line bg-surface'}`}>
                      <div className="w-9 h-9 rounded-lg bg-surface-3 border border-line-strong flex items-center justify-center">
                        <Icon className="w-[18px] h-[18px] text-brand-light" />
                      </div>
                      <h3 className="mt-4 text-[15px] font-semibold text-fg">{title}</h3>
                      <p className="mt-1.5 text-[13px] leading-relaxed text-subtle">{text}</p>
                    </div>
                  );
                })}
              </div>
            </div>
          </section>
        )}

        {c.students.visible && (
          <section id="ogrenciler" className="scroll-mt-20 border-t border-line/70 bg-surface/40">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid lg:grid-cols-2 gap-12">
              <div>
                <SectionTitle align="left" eyebrow={c.students.eyebrow} title={c.students.title} text={c.students.text} />
                <ul className="mt-8 space-y-3">
                  {c.students.points.filter(Boolean).map((p, i) => (
                    <li key={i} className="flex gap-3 text-[14px] text-body leading-relaxed">
                      <span className="mt-2 w-1.5 h-1.5 rounded-full bg-brand-light shrink-0" />
                      {p}
                    </li>
                  ))}
                </ul>
              </div>
              <ol className="space-y-3 self-center">
                {c.students.steps.map(({ icon, title, text }, i) => {
                  const Icon = ICONS[icon];
                  return (
                    <li key={i} className="rounded-2xl border border-line bg-surface p-5 flex gap-4">
                      <span className="shrink-0 w-9 h-9 rounded-full bg-brand-soft border border-brand-line text-brand-light text-sm font-semibold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div>
                        <h3 className="text-[15px] font-semibold text-fg inline-flex items-center gap-2">
                          <Icon className="w-4 h-4 text-subtle" /> {title}
                        </h3>
                        <p className="mt-1.5 text-[13px] text-subtle leading-relaxed">{text}</p>
                      </div>
                    </li>
                  );
                })}
              </ol>
            </div>
          </section>
        )}

        {c.pricing.visible && (
          <section id="fiyatlar" className="scroll-mt-20 border-t border-line/70">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 space-y-10">
              <SectionTitle eyebrow={c.pricing.eyebrow} title={c.pricing.title} text={c.pricing.text} />
              <PricingPlans pricing={pricing} />
            </div>
          </section>
        )}

        {hasFaq && (
          <section id="sss" className="scroll-mt-20 border-t border-line/70">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
              <SectionTitle eyebrow={c.faq.eyebrow} title={c.faq.title} />
              <div className="mt-8 divide-y divide-line border-y border-line">
                {c.faq.items.map(({ q, a }, i) => (
                  <details key={i} className="group py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-fg [&::-webkit-details-marker]:hidden">
                      {q}
                      <span className="text-subtle transition-transform group-open:rotate-45 text-xl leading-none">+</span>
                    </summary>
                    <p className="mt-3 text-[14px] text-subtle leading-relaxed whitespace-pre-line">{a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

        {c.cta.visible && (
          <section className="border-t border-line/70">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
              <div className="rounded-3xl border border-brand-line bg-brand-soft/60 px-6 py-10 sm:px-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 className="text-2xl font-semibold tracking-tight text-fg">{c.cta.title}</h2>
                  {c.cta.text && <p className="mt-2 text-sm text-subtle">{c.cta.text}</p>}
                </div>
                <Link
                  href="/register"
                  className="h-12 px-6 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-medium inline-flex items-center justify-center gap-2 shrink-0"
                >
                  {c.cta.button} <ArrowRight className="w-4 h-4" />
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-line/70 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div className="flex items-center gap-2.5">
            <SigmaLogo size="xs" />
            <span className="text-body font-medium">LrDocument</span>
            {c.footer.note && <span>· {c.footer.note}</span>}
          </div>
          <nav className="flex items-center gap-5" aria-label="Alt menü">
            <Link href="/login" className="hover:text-fg">
              Giriş
            </Link>
            <Link href="/register" className="hover:text-fg">
              Kayıt
            </Link>
            {hasFaq && (
              <a href="#sss" className="hover:text-fg">
                SSS
              </a>
            )}
          </nav>
          <p>
            Made by{' '}
            <a href="https://digivideas.com" target="_blank" rel="noopener noreferrer" className="text-brand-light hover:text-fg underline underline-offset-4">
              Digivideas
            </a>{' '}
            and lrion&apos;s
          </p>
        </div>
      </footer>
    </div>
  );
}

function SectionTitle({ eyebrow, title, text, align = 'center' }: { eyebrow: string; title: string; text?: string; align?: 'center' | 'left' }) {
  return (
    <div className={align === 'center' ? 'text-center max-w-2xl mx-auto' : ''}>
      <p className="text-[12px] font-medium uppercase tracking-[0.14em] text-brand-light">{eyebrow}</p>
      <h2 className="mt-3 text-2xl sm:text-[2rem] sm:leading-tight font-semibold tracking-tight text-fg">{title}</h2>
      {text && <p className="mt-3 text-[15px] text-subtle leading-relaxed">{text}</p>}
    </div>
  );
}

/** Static mock of the student overview: tomorrow's classes, an exam countdown and attendance. */
function ProductPreview() {
  const sessions = [
    { time: '08:00–10:00', name: 'Analiz III', room: 'D-201', color: '#5b9a65' },
    { time: '10:00–12:00', name: 'Lineer Cebir II', room: 'D-104', color: '#6b8fc4' },
    { time: '13:00–15:00', name: 'Diferansiyel Denklemler', room: 'Amfi 2', color: '#c49a5b' },
  ];
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-label="Ders takibi ekran önizlemesi" role="img">
      <div className="rounded-2xl border border-line-strong bg-surface shadow-2xl shadow-black/40 overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 h-9 border-b border-line bg-surface-2">
          <span className="w-2.5 h-2.5 rounded-full bg-surface-4" />
          <span className="w-2.5 h-2.5 rounded-full bg-surface-4" />
          <span className="w-2.5 h-2.5 rounded-full bg-surface-4" />
          <span className="ml-3 text-[11px] text-muted">Genel bakış</span>
        </div>
        <div className="p-4 grid gap-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              ['Dönem ort.', '3.12', 'text-emerald-300'],
              ['AGNO', '2.94', 'text-fg'],
              ['Vize', '4 gün', 'text-amber-300'],
            ].map(([label, value, tone]) => (
              <div key={label} className="rounded-lg border border-line bg-surface-2 px-3 py-2">
                <p className="text-[10px] text-muted">{label}</p>
                <p className={`text-lg font-semibold tabular-nums ${tone}`}>{value}</p>
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-line">
            <div className="flex items-center justify-between px-3 h-9 border-b border-line">
              <span className="text-[12px] font-medium text-fg">Yarın — Salı</span>
              <span className="text-[10px] px-1.5 py-0.5 rounded bg-surface-3 text-subtle">17:00 sonrası</span>
            </div>
            <ul className="divide-y divide-line">
              {sessions.map((s) => (
                <li key={s.name} className="flex items-center gap-3 px-3 py-2">
                  <span className="w-1 h-7 rounded-full" style={{ backgroundColor: s.color }} />
                  <div className="min-w-0">
                    <p className="text-[12px] text-fg truncate">{s.name}</p>
                    <p className="text-[10px] text-muted">{s.time} • {s.room}</p>
                  </div>
                </li>
              ))}
            </ul>
          </div>
          <div className="rounded-lg border border-line px-3 py-2.5 space-y-2">
            <div className="flex items-center justify-between text-[11px]">
              <span className="text-body">Devamsızlık — Analiz III</span>
              <span className="text-muted tabular-nums">6 / 16 saat</span>
            </div>
            <div className="h-1.5 rounded-full bg-surface-3 overflow-hidden">
              <div className="h-full w-[37%] rounded-full bg-brand-light" />
            </div>
            <p className="text-[10px] text-muted">29 Ekim ve ara sınav haftası hesaba katılmadı.</p>
          </div>
        </div>
      </div>
      <div className="hidden sm:flex absolute -bottom-5 -left-5 items-center gap-2 rounded-xl border border-line-strong bg-surface-2 px-3 py-2 shadow-xl shadow-black/40">
        <span className="font-mono text-[12px] text-body">∫₀¹ x² dx = ⅓</span>
        <span className="text-[10px] text-muted">KaTeX</span>
      </div>
    </div>
  );
}
