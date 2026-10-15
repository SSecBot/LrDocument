import React from 'react';
import type { Metadata } from 'next';
import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  BookOpen,
  Building2,
  CalendarDays,
  CalendarRange,
  Check,
  FileText,
  FileUp,
  GraduationCap,
  Kanban,
  KeyRound,
  ListChecks,
  Lock,
  MailCheck,
  ShieldCheck,
  Sigma,
  Smartphone,
  UserCheck,
  Users,
  Wallet,
  Zap,
} from 'lucide-react';
import { SigmaLogo } from '@/components/ui/SigmaLogo';
import { LandingNav } from '@/components/landing/LandingNav';
import { PricingPlans } from '@/components/landing/PricingPlans';
import { getLandingContent, getSystemSettings } from '@/lib/systemSettingsServer';
import { siteOrigin } from '@/lib/siteUrl';
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
  KeyRound,
  MailCheck,
  Zap,
  UserCheck,
};
const TRUST_ICONS = [ShieldCheck, Smartphone, FileUp, Lock];

/** The three accents of the design system, cycled through lists: orange, green, blue. */
const ACCENTS = [
  { text: 'text-brand-light', chip: 'bg-brand-soft border-brand-line', dot: 'bg-brand-light' },
  { text: 'text-emerald-300', chip: 'bg-emerald-500/10 border-emerald-500/25', dot: 'bg-emerald-400' },
  { text: 'text-sky-300', chip: 'bg-sky-500/10 border-sky-500/25', dot: 'bg-sky-400' },
] as const;

export async function generateMetadata(): Promise<Metadata> {
  const [{ seo }, origin] = await Promise.all([getLandingContent(), siteOrigin()]);
  return {
    metadataBase: new URL(origin),
    title: { absolute: seo.title },
    description: seo.description,
    keywords: seo.keywords.split(',').map((k) => k.trim()).filter(Boolean),
    alternates: { canonical: '/' },
    openGraph: {
      type: 'website',
      locale: 'tr_TR',
      url: '/',
      siteName: 'LrDocument',
      title: seo.title,
      description: seo.description,
    },
    twitter: { card: 'summary_large_image', title: seo.title, description: seo.description },
    robots: { index: true, follow: true },
  };
}

/** schema.org data for rich results; `<` is escaped so content cannot close the script tag. */
function JsonLd({ data }: { data: unknown }) {
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, '\\u003c') }} />;
}

export default async function LandingPage() {
  const [{ pricing }, c, origin] = await Promise.all([getSystemSettings(), getLandingContent(), siteOrigin()]);
  const discount = pricing.studentDiscountPercent;
  const hasFaq = c.faq.visible && c.faq.items.length > 0;
  const nav: [string, string][] = [];
  if (c.features.visible) nav.push(['#ozellikler', c.features.eyebrow || 'Özellikler']);
  if (c.students.visible) nav.push(['#ogrenciler', 'Öğrenciler']);
  if (c.corporate.visible) nav.push(['#kurumsal', c.corporate.eyebrow || 'Kurumsal']);
  if (c.pricing.visible) nav.push(['#fiyatlar', c.pricing.eyebrow || 'Fiyatlar']);
  if (hasFaq) nav.push(['#sss', c.faq.eyebrow || 'SSS']);
  const preview = c.hero.showPreview;

  const structured = [
    { '@context': 'https://schema.org', '@type': 'Organization', name: 'LrDocument', url: origin, logo: `${origin}/icon.svg` },
    { '@context': 'https://schema.org', '@type': 'WebSite', name: 'LrDocument', url: origin, inLanguage: 'tr-TR', description: c.seo.description },
    {
      '@context': 'https://schema.org',
      '@type': 'SoftwareApplication',
      name: 'LrDocument',
      applicationCategory: 'EducationalApplication',
      operatingSystem: 'Web, iOS, Android, Windows, macOS',
      description: c.seo.description,
      url: origin,
      inLanguage: 'tr-TR',
      offers: [
        { '@type': 'Offer', name: 'Aylık', price: pricing.monthly, priceCurrency: 'TRY' },
        { '@type': 'Offer', name: 'Ömür boyu', price: pricing.lifetime, priceCurrency: 'TRY' },
      ],
    },
    ...(hasFaq
      ? [
          {
            '@context': 'https://schema.org',
            '@type': 'FAQPage',
            mainEntity: c.faq.items.map(({ q, a }) => ({ '@type': 'Question', name: q, acceptedAnswer: { '@type': 'Answer', text: a } })),
          },
        ]
      : []),
  ];

  const audiences = [
    c.students.visible && { href: '#ogrenciler', icon: GraduationCap, title: 'Öğrenciler', text: 'Devamsızlık, not ortalaması, sınav takvimi ve ders programı tek yerde.', accent: ACCENTS[2] },
    { href: '#ozellikler', icon: Sigma, title: 'Bireysel', text: 'LaTeX notlar, görevler, Kanban, takvim ve bütçe; telefonda da masaüstünde de.', accent: ACCENTS[0] },
    c.corporate.visible && { href: '#kurumsal', icon: Building2, title: 'Kurumsal', text: 'Ekibe kodla giriş, anlık ortak notlar, müşteri ve ödeme takibi, izinler.', accent: ACCENTS[1] },
  ].filter(Boolean) as { href: string; icon: React.ElementType; title: string; text: string; accent: (typeof ACCENTS)[number] }[];

  return (
    <div className="min-h-dvh bg-app text-fg overflow-x-clip">
      {structured.map((d, i) => (
        <JsonLd key={i} data={d} />
      ))}
      <LandingNav links={nav} />

      <main id="icerik">
        {/* Hero */}
        <section aria-labelledby="hero-baslik" className="relative">
          <div
            className={`relative max-w-6xl mx-auto px-4 sm:px-6 pt-12 sm:pt-20 pb-14 sm:pb-16 grid gap-12 lg:gap-10 items-center ${
              preview ? 'lg:grid-cols-[1.05fr_1fr]' : ''
            }`}
          >
            <div className={`space-y-6 text-center ${preview ? 'lg:text-left' : 'max-w-3xl mx-auto'}`}>
              {c.hero.eyebrow && (
                <p className="inline-flex items-center gap-2 min-h-7 px-3 rounded-full border border-brand-line bg-brand-soft text-[12px] text-brand-light">
                  <Sigma className="w-3.5 h-3.5" aria-hidden="true" /> {c.hero.eyebrow}
                </p>
              )}
              <h1 id="hero-baslik" className="text-[2rem] leading-[1.15] sm:text-5xl sm:leading-[1.1] font-semibold tracking-tight text-fg text-balance">
                {c.hero.title} {c.hero.highlight && <span className="text-brand-light">{c.hero.highlight}</span>}
              </h1>
              {c.hero.subtitle && (
                <p className={`text-base sm:text-lg text-subtle leading-relaxed max-w-xl mx-auto ${preview ? 'lg:mx-0' : ''}`}>{c.hero.subtitle}</p>
              )}
              <div className={`flex flex-col sm:flex-row gap-3 justify-center ${preview ? 'lg:justify-start' : ''}`}>
                <Link
                  href="/register"
                  className="h-12 px-6 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-medium inline-flex items-center justify-center gap-2"
                >
                  {c.hero.primaryCta} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
                {c.hero.secondaryCta && (
                  <Link
                    href="/register?ogrenci=1"
                    className="h-12 px-6 rounded-xl bg-surface-2 hover:bg-surface-3 border border-line text-fg text-sm font-medium inline-flex items-center justify-center gap-2"
                  >
                    <GraduationCap className="w-4 h-4 text-sky-300" aria-hidden="true" /> {c.hero.secondaryCta}
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
                        <Icon className={`w-3.5 h-3.5 ${ACCENTS[i % 3].text}`} aria-hidden="true" /> {t}
                      </li>
                    );
                  })}
                </ul>
              )}
            </div>
            {preview && <ProductPreview />}
          </div>
        </section>

        {/* Who it is for */}
        {audiences.length > 1 && (
          <section aria-label="Kimler için" className="border-t border-line/70">
            <ul className="max-w-6xl mx-auto px-4 sm:px-6 py-10 grid gap-3 md:grid-cols-3">
              {audiences.map(({ href, icon: Icon, title, text, accent }) => (
                <li key={title}>
                  <a href={href} className="group flex h-full gap-4 rounded-2xl border border-line bg-surface hover:border-line-strong p-5 transition-colors">
                    <span className={`shrink-0 w-10 h-10 rounded-xl border flex items-center justify-center ${accent.chip}`}>
                      <Icon className={`w-5 h-5 ${accent.text}`} aria-hidden="true" />
                    </span>
                    <span>
                      <span className="block text-[15px] font-semibold text-fg">{title}</span>
                      <span className="mt-1 block text-[13px] leading-relaxed text-subtle">{text}</span>
                      <span className={`mt-2 inline-flex items-center gap-1 text-[12px] ${accent.text}`}>
                        İncele <ArrowRight className="w-3.5 h-3.5 transition-transform group-hover:translate-x-0.5" aria-hidden="true" />
                      </span>
                    </span>
                  </a>
                </li>
              ))}
            </ul>
          </section>
        )}

        {c.features.visible && c.features.items.length > 0 && (
          <section id="ozellikler" aria-labelledby="ozellikler-baslik" className="scroll-mt-20 border-t border-line/70">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
              <SectionTitle id="ozellikler-baslik" eyebrow={c.features.eyebrow} title={c.features.title} text={c.features.text} />
              <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                {c.features.items.map(({ icon, title, text }, i) => (
                  <FeatureCard key={i} icon={ICONS[icon]} title={title} text={text} accent={ACCENTS[i % 3]} />
                ))}
              </ul>
            </div>
          </section>
        )}

        {c.students.visible && (
          <section id="ogrenciler" aria-labelledby="ogrenciler-baslik" className="scroll-mt-20 border-t border-line/70 bg-surface/40">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid lg:grid-cols-2 gap-12">
              <div>
                <SectionTitle id="ogrenciler-baslik" align="left" accent="text-sky-300" eyebrow={c.students.eyebrow} title={c.students.title} text={c.students.text} />
                <ul className="mt-8 space-y-3">
                  {c.students.points.filter(Boolean).map((p, i) => (
                    <li key={i} className="flex gap-3 text-[14px] text-body leading-relaxed">
                      <Check className="mt-1 w-4 h-4 text-sky-300 shrink-0" aria-hidden="true" />
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
                      <span className="shrink-0 w-9 h-9 rounded-full bg-sky-500/10 border border-sky-500/25 text-sky-300 text-sm font-semibold flex items-center justify-center">
                        {i + 1}
                      </span>
                      <div>
                        <h3 className="text-[15px] font-semibold text-fg inline-flex items-center gap-2">
                          <Icon className="w-4 h-4 text-subtle" aria-hidden="true" /> {title}
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

        {c.corporate.visible && c.corporate.items.length > 0 && (
          <section id="kurumsal" aria-labelledby="kurumsal-baslik" className="scroll-mt-20 border-t border-line/70">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid lg:grid-cols-[0.9fr_1.1fr] gap-10 items-start">
              <div className="lg:sticky lg:top-24">
                <SectionTitle id="kurumsal-baslik" align="left" accent="text-emerald-300" eyebrow={c.corporate.eyebrow} title={c.corporate.title} text={c.corporate.text} />
                <Link
                  href="/register?tur=kurumsal"
                  className="mt-6 h-11 px-5 rounded-xl border border-emerald-500/30 bg-emerald-500/10 hover:bg-emerald-500/15 text-emerald-200 text-sm font-medium inline-flex items-center gap-2"
                >
                  Kurumsal başvuru <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
              <ul className="grid gap-3 sm:grid-cols-2">
                {c.corporate.items.map(({ icon, title, text }, i) => (
                  <FeatureCard key={i} icon={ICONS[icon]} title={title} text={text} accent={ACCENTS[1]} />
                ))}
              </ul>
            </div>
          </section>
        )}

        {c.security.visible && c.security.items.length > 0 && (
          <section id="guvenlik" aria-labelledby="guvenlik-baslik" className="scroll-mt-20 border-t border-line/70 bg-surface/40">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
              <SectionTitle id="guvenlik-baslik" eyebrow={c.security.eyebrow} title={c.security.title} text={c.security.text} />
              <ul className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                {c.security.items.map(({ icon, title, text }, i) => (
                  <FeatureCard key={i} icon={ICONS[icon]} title={title} text={text} accent={ACCENTS[(i + 1) % 3]} />
                ))}
              </ul>
            </div>
          </section>
        )}

        {c.pricing.visible && (
          <section id="fiyatlar" aria-labelledby="fiyatlar-baslik" className="scroll-mt-20 border-t border-line/70">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 space-y-10">
              <SectionTitle id="fiyatlar-baslik" eyebrow={c.pricing.eyebrow} title={c.pricing.title} text={c.pricing.text} />
              <PricingPlans pricing={pricing} />
            </div>
          </section>
        )}

        {hasFaq && (
          <section id="sss" aria-labelledby="sss-baslik" className="scroll-mt-20 border-t border-line/70">
            <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
              <SectionTitle id="sss-baslik" eyebrow={c.faq.eyebrow} title={c.faq.title} />
              <div className="mt-8 divide-y divide-line border-y border-line">
                {c.faq.items.map(({ q, a }, i) => (
                  <details key={i} className="group py-4">
                    <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-fg min-h-11 [&::-webkit-details-marker]:hidden">
                      <h3 className="font-medium">{q}</h3>
                      <span className="text-subtle transition-transform group-open:rotate-45 text-xl leading-none" aria-hidden="true">
                        +
                      </span>
                    </summary>
                    <p className="mt-3 text-[14px] text-subtle leading-relaxed whitespace-pre-line">{a}</p>
                  </details>
                ))}
              </div>
            </div>
          </section>
        )}

        {c.cta.visible && (
          <section aria-labelledby="cta-baslik" className="border-t border-line/70">
            <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
              <div className="rounded-3xl border border-brand-line bg-brand-soft/60 px-6 py-10 sm:px-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div>
                  <h2 id="cta-baslik" className="text-2xl font-semibold tracking-tight text-fg">
                    {c.cta.title}
                  </h2>
                  {c.cta.text && <p className="mt-2 text-sm text-subtle">{c.cta.text}</p>}
                </div>
                <Link
                  href="/register"
                  className="h-12 px-6 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-medium inline-flex items-center justify-center gap-2 shrink-0"
                >
                  {c.cta.button} <ArrowRight className="w-4 h-4" aria-hidden="true" />
                </Link>
              </div>
            </div>
          </section>
        )}
      </main>

      <footer className="border-t border-line/70 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-12 grid gap-x-6 gap-y-10 grid-cols-2 lg:grid-cols-[1.4fr_1fr_1fr_1fr]">
          <div className="space-y-3 col-span-2 lg:col-span-1">
            <Link href="/" className="inline-flex items-center gap-2.5" aria-label="LrDocument ana sayfa">
              <SigmaLogo size="xs" />
              <span className="text-body font-semibold">LrDocument</span>
            </Link>
            <p className="text-[13px] text-muted leading-relaxed max-w-xs">{c.seo.description}</p>
            {c.footer.note && <p className="text-[12px] text-muted">{c.footer.note}</p>}
          </div>
          <FooterColumn
            title="Ürün"
            links={[
              ...nav.map(([href, label]) => ({ href, label })),
              ...(c.security.visible ? [{ href: '#guvenlik', label: c.security.eyebrow || 'Güvenlik' }] : []),
            ]}
          />
          <FooterColumn
            title="Hesap"
            links={[
              { href: '/register', label: 'Kayıt ol' },
              { href: '/register?ogrenci=1', label: 'Öğrenci kaydı' },
              { href: '/login', label: 'Giriş yap' },
              { href: '/login?kurumsal=1', label: 'Kurumsal giriş' },
            ]}
          />
          <FooterColumn
            title="Yasal"
            links={[
              { href: '/kvkk', label: 'KVKK Aydınlatma Metni' },
              { href: '/gizlilik', label: 'Gizlilik Politikası' },
              { href: '/mesafeli-satis', label: 'Mesafeli Satış ve İade' },
              { href: '/kullanim-sartlari', label: 'Kullanım Şartları' },
            ]}
          />
        </div>
        <div className="border-t border-line/70">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-5 flex flex-col sm:flex-row items-center justify-between gap-2 text-xs text-muted">
            <p>© {new Date().getFullYear()} LrDocument</p>
            <p>
              Made by{' '}
              <a href="https://digivideas.com" target="_blank" rel="noopener noreferrer" className="text-brand-light hover:text-fg underline underline-offset-4">
                Digivideas
              </a>{' '}
              and lrion&apos;s
            </p>
          </div>
        </div>
      </footer>
    </div>
  );
}

function SectionTitle({
  id,
  eyebrow,
  title,
  text,
  align = 'center',
  accent = 'text-brand-light',
}: {
  id: string;
  eyebrow: string;
  title: string;
  text?: string;
  align?: 'center' | 'left';
  accent?: string;
}) {
  return (
    <div className={align === 'center' ? 'text-center max-w-2xl mx-auto' : ''}>
      {eyebrow && <p className={`text-[12px] font-medium uppercase tracking-[0.14em] ${accent}`}>{eyebrow}</p>}
      <h2 id={id} className="mt-3 text-2xl sm:text-[2rem] sm:leading-tight font-semibold tracking-tight text-fg text-balance">
        {title}
      </h2>
      {text && <p className="mt-3 text-[15px] text-subtle leading-relaxed">{text}</p>}
    </div>
  );
}

function FeatureCard({ icon: Icon, title, text, accent }: { icon: React.ElementType; title: string; text: string; accent: (typeof ACCENTS)[number] }) {
  return (
    <li className="rounded-2xl border border-line bg-surface p-5">
      <span className={`w-10 h-10 rounded-xl border flex items-center justify-center ${accent.chip}`}>
        <Icon className={`w-5 h-5 ${accent.text}`} aria-hidden="true" />
      </span>
      <h3 className="mt-4 text-[15px] font-semibold text-fg">{title}</h3>
      <p className="mt-1.5 text-[13px] leading-relaxed text-subtle">{text}</p>
    </li>
  );
}

function FooterColumn({ title, links }: { title: string; links: { href: string; label: string }[] }) {
  return (
    <nav aria-label={title}>
      <h2 className="text-[12px] font-semibold uppercase tracking-[0.12em] text-subtle">{title}</h2>
      <ul className="mt-3 space-y-1">
        {links.map(({ href, label }) => (
          <li key={href}>
            {href.startsWith('#') ? (
              <a href={href} className="inline-flex min-h-9 items-center text-[13px] text-muted hover:text-fg">
                {label}
              </a>
            ) : (
              <Link href={href} className="inline-flex min-h-9 items-center text-[13px] text-muted hover:text-fg">
                {label}
              </Link>
            )}
          </li>
        ))}
      </ul>
    </nav>
  );
}

/** Static mock of the student overview: tomorrow's classes, an exam countdown and attendance. */
function ProductPreview() {
  const sessions = [
    { time: '08:00–10:00', name: 'Analiz III', room: 'D-201', color: 'var(--color-emerald-400)' },
    { time: '10:00–12:00', name: 'Lineer Cebir II', room: 'D-104', color: 'var(--color-sky-400)' },
    { time: '13:00–15:00', name: 'Diferansiyel Denklemler', room: 'Amfi 2', color: 'var(--color-brand-light)' },
  ];
  return (
    <div className="relative mx-auto w-full max-w-md lg:max-w-none" aria-label="Ders takibi ekran önizlemesi" role="img">
      <div className="rounded-2xl border border-line-strong bg-surface shadow-2xl shadow-black/40 overflow-hidden">
        <div className="flex items-center gap-1.5 px-4 h-9 border-b border-line bg-surface-2">
          <span className="w-2.5 h-2.5 rounded-full bg-rose-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-amber-400/70" />
          <span className="w-2.5 h-2.5 rounded-full bg-emerald-400/70" />
          <span className="ml-3 text-[11px] text-muted">Genel bakış</span>
        </div>
        <div className="p-4 grid gap-3">
          <div className="grid grid-cols-3 gap-2">
            {[
              ['Dönem ort.', '3.12', 'text-emerald-300'],
              ['AGNO', '2.94', 'text-sky-300'],
              ['Vize', '4 gün', 'text-brand-light'],
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
                    <p className="text-[10px] text-muted">
                      {s.time} • {s.room}
                    </p>
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
              <div className="h-full w-[37%] rounded-full bg-emerald-400" />
            </div>
            <p className="text-[10px] text-muted">29 Ekim ve ara sınav haftası hesaba katılmadı.</p>
          </div>
        </div>
      </div>
      <div className="hidden sm:flex absolute -bottom-5 -left-5 items-center gap-2 rounded-xl border border-line-strong bg-surface-2 px-3 py-2 shadow-xl shadow-black/40">
        <span className="font-mono text-[12px] text-body">∫₀¹ x² dx = ⅓</span>
        <span className="text-[10px] text-sky-300">KaTeX</span>
      </div>
    </div>
  );
}
