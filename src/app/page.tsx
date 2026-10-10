import React from 'react';
import Link from 'next/link';
import {
  ArrowRight,
  BellRing,
  CalendarDays,
  CalendarRange,
  FileText,
  FileUp,
  GraduationCap,
  ImageIcon,
  Kanban,
  ListChecks,
  ShieldCheck,
  Smartphone,
  Sigma,
  Wallet,
} from 'lucide-react';
import { SigmaLogo } from '@/components/ui/SigmaLogo';
import { LandingNav } from '@/components/landing/LandingNav';
import { PricingPlans } from '@/components/landing/PricingPlans';

const MODULES = [
  { icon: GraduationCap, title: 'Ders takibi', text: 'Öğrencilere özel: ders programı, devamsızlık hakkı, vize-final, çan eğrisi, harf notu, AGNO ve sınav geri sayımı.' },
  { icon: FileText, title: 'Notlar ve LaTeX', text: 'Markdown notlar, canlı KaTeX önizleme, klasörler ve dışa aktarma.' },
  { icon: ListChecks, title: 'Görevler', text: 'Öncelik ve son tarihli görevler; tarihi yaklaşanlar için uyarılar ve bildirimler.' },
  { icon: Kanban, title: 'Kanban', text: 'Fikirden tamamlanana kadar işlerinizi sürükle-bırak kartlarla takip edin.' },
  { icon: CalendarDays, title: 'Takvim', text: 'Etkinlikler, teslim tarihleri; .ics ile içe ve dışa aktarma, telefon takviminizle eşitleme.' },
  { icon: Wallet, title: 'Gelir ve gider', text: 'Kategoriler, döviz çevirisi, aylık özetler ve Excel’e aktarma.' },
  { icon: ImageIcon, title: 'Medya', text: 'Çizimler, görseller ve video bağlantıları için düzenli bir arşiv.' },
] as const;

const STUDENT_STEPS = [
  { icon: FileUp, title: 'Ders programı PDF’ini yükleyin', text: 'Bölümünüzün haftalık programından sınıfınızı ve şubenizi seçin; dersler, saatler ve derslikler otomatik eklenir. Seçmelileri siz eklersiniz.' },
  { icon: CalendarRange, title: 'Akademik takvimi yükleyin', text: 'Üniversitenin takvim PDF’i okunur; dönem başı-sonu ve sınav haftaları işlenir. Milli ve dinî bayramlar kendiliğinden eklenir.' },
  { icon: BellRing, title: 'Gerisini takip edin', text: 'Kaç saat devamsızlık hakkınız kaldığını, geçmek için kaç almanız gerektiğini ve sınava kaç gün kaldığını görün.' },
] as const;

const STUDENT_POINTS = [
  'Devamsızlık, takvimdeki gerçek ders günlerine göre hesaplanır; bayram, arife öğleden sonrası ve sınav haftaları sayılmaz.',
  'Saat 17:00’den sonra genel bakışta yarının ders programı görünür.',
  'Hocanın çan eğrisini ders ders girin; harf notunuz ona göre hesaplanır.',
  'Alttan alınan derslerde nottan kalındıysa devam zorunluluğu aranmaz.',
  'KTÜ yönetmeliği hazır; diğer üniversiteler için not sistemi düzenlenebilir.',
];

const FAQ = [
  {
    q: 'Hesabım ne zaman açılır?',
    a: 'Kayıt formunu doldurduğunuzda talebiniz yöneticiye iletilir. Onaylandığında e-posta ile bilgilendirilirsiniz ve aynı bilgilerle giriş yapabilirsiniz.',
  },
  {
    q: 'Öğrenci indirimi için ne gerekiyor?',
    a: 'Kayıtta “Üniversite öğrencisiyim” seçeneğini işaretleyip üniversite uzantılı öğrenci e-postanızı, bölümünüzü ve sınıfınızı girmeniz yeterli. Fiyatlar yarı yarıya iner ve Ders Takibi modülü açılır.',
  },
  {
    q: 'Yüklediğim PDF’ler sunucuya gidiyor mu?',
    a: 'Hayır. Ders programı ve akademik takvim PDF’leri tarayıcınızda okunur; yalnızca sizin onayladığınız ders ve tarih bilgileri hesabınıza kaydedilir.',
  },
  {
    q: 'iPhone ve iPad’de çalışır mı?',
    a: 'Evet. Safari’de açıp “Ana Ekrana Ekle” ile uygulama gibi kullanabilirsiniz; PDF içe aktarma dahil tüm özellikler mobilde çalışır.',
  },
  {
    q: 'Verilerim başkalarıyla paylaşılıyor mu?',
    a: 'Hayır. Her hesabın verisi ayrı tutulur; başka kullanıcılar sizin notlarınızı, derslerinizi veya finans kayıtlarınızı göremez.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-dvh bg-app text-fg overflow-x-clip">
      <LandingNav />

      <main>
        {/* Hero */}
        <section className="relative">
          <div
            aria-hidden
            className="pointer-events-none absolute inset-x-0 top-0 h-[520px] bg-[radial-gradient(60%_60%_at_50%_0%,rgba(47,107,55,0.22),transparent_70%)]"
          />
          <div className="relative max-w-6xl mx-auto px-4 sm:px-6 pt-14 sm:pt-20 pb-16 grid lg:grid-cols-[1.05fr_1fr] gap-12 lg:gap-10 items-center">
            <div className="space-y-6 text-center lg:text-left">
              <p className="inline-flex items-center gap-2 h-7 px-3 rounded-full border border-brand-line bg-brand-soft text-[12px] text-brand-light">
                <Sigma className="w-3.5 h-3.5" /> Öğrenciler, eğitimciler ve içerik üreticileri için
              </p>
              <h1 className="text-[2.1rem] leading-[1.15] sm:text-5xl sm:leading-[1.1] font-semibold tracking-tight text-fg">
                Notlarınız, dersleriniz ve işleriniz <span className="text-brand-light">tek bir yerde.</span>
              </h1>
              <p className="text-base sm:text-lg text-subtle leading-relaxed max-w-xl mx-auto lg:mx-0">
                LaTeX destekli notlar, görevler, takvim ve bütçe; üniversite öğrencileri için de devamsızlığı ve notları kendi hesaplayan ders
                takibi.
              </p>
              <div className="flex flex-col sm:flex-row gap-3 justify-center lg:justify-start">
                <Link href="/register" className="h-12 px-6 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-medium inline-flex items-center justify-center gap-2">
                  Kayıt talebi oluştur <ArrowRight className="w-4 h-4" />
                </Link>
                <Link
                  href="/register?ogrenci=1"
                  className="h-12 px-6 rounded-xl bg-surface-2 hover:bg-surface-3 border border-line text-fg text-sm font-medium inline-flex items-center justify-center gap-2"
                >
                  <GraduationCap className="w-4 h-4 text-brand-light" /> Öğrenciyim, %50 indirim
                </Link>
              </div>
              <ul className="flex flex-wrap justify-center lg:justify-start gap-x-5 gap-y-2 text-[12px] text-muted">
                <li className="inline-flex items-center gap-1.5"><ShieldCheck className="w-3.5 h-3.5" /> Veriler hesabınıza özel</li>
                <li className="inline-flex items-center gap-1.5"><Smartphone className="w-3.5 h-3.5" /> iPhone, iPad, Android, masaüstü</li>
                <li className="inline-flex items-center gap-1.5"><FileUp className="w-3.5 h-3.5" /> PDF’ler cihazınızda okunur</li>
              </ul>
            </div>
            <ProductPreview />
          </div>
        </section>

        {/* Modules */}
        <section id="ozellikler" className="scroll-mt-20 border-t border-line/70">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <SectionTitle eyebrow="Özellikler" title="Günlük işiniz için gereken her şey" text="Modüller birbirine bağlı çalışır: bir görevi takvime, bir notu derse, bir harcamayı projeye bağlayın." />
            <div className="mt-10 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              {MODULES.map(({ icon: Icon, title, text }, i) => (
                <div
                  key={title}
                  className={`rounded-2xl border p-5 ${i === 0 ? 'sm:col-span-2 border-brand-line bg-brand-soft/40' : 'border-line bg-surface'}`}
                >
                  <div className="w-9 h-9 rounded-lg bg-surface-3 border border-line-strong flex items-center justify-center">
                    <Icon className="w-[18px] h-[18px] text-brand-light" />
                  </div>
                  <h3 className="mt-4 text-[15px] font-semibold text-fg">{title}</h3>
                  <p className="mt-1.5 text-[13px] leading-relaxed text-subtle">{text}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* Students */}
        <section id="ogrenciler" className="scroll-mt-20 border-t border-line/70 bg-surface/40">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 grid lg:grid-cols-2 gap-12">
            <div>
              <SectionTitle
                align="left"
                eyebrow="Üniversite öğrencileri"
                title="Devamsızlığınızı ve notlarınızı siz hesaplamayın"
                text="Ders Takibi, yönetmeliğinizdeki kuralları ve üniversitenizin akademik takvimini bilir. Sizin yapmanız gereken tek şey derse gitmediğiniz günü işaretlemek."
              />
              <ul className="mt-8 space-y-3">
                {STUDENT_POINTS.map((p) => (
                  <li key={p} className="flex gap-3 text-[14px] text-body leading-relaxed">
                    <span className="mt-2 w-1.5 h-1.5 rounded-full bg-brand-light shrink-0" />
                    {p}
                  </li>
                ))}
              </ul>
            </div>
            <ol className="space-y-3 self-center">
              {STUDENT_STEPS.map(({ icon: Icon, title, text }, i) => (
                <li key={title} className="rounded-2xl border border-line bg-surface p-5 flex gap-4">
                  <div className="shrink-0 flex flex-col items-center gap-2">
                    <span className="w-9 h-9 rounded-full bg-brand-soft border border-brand-line text-brand-light text-sm font-semibold flex items-center justify-center">{i + 1}</span>
                  </div>
                  <div>
                    <h3 className="text-[15px] font-semibold text-fg inline-flex items-center gap-2">
                      <Icon className="w-4 h-4 text-subtle" /> {title}
                    </h3>
                    <p className="mt-1.5 text-[13px] text-subtle leading-relaxed">{text}</p>
                  </div>
                </li>
              ))}
            </ol>
          </div>
        </section>

        {/* Pricing */}
        <section id="fiyatlar" className="scroll-mt-20 border-t border-line/70">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16 sm:py-20 space-y-10">
            <SectionTitle eyebrow="Fiyatlar" title="Sade fiyatlandırma" text="İki seçenek, aynı özellikler. Üniversite öğrencileri her iki planı da yarı fiyatına alır." />
            <PricingPlans />
          </div>
        </section>

        {/* FAQ */}
        <section id="sss" className="scroll-mt-20 border-t border-line/70">
          <div className="max-w-3xl mx-auto px-4 sm:px-6 py-16 sm:py-20">
            <SectionTitle eyebrow="SSS" title="Sık sorulan sorular" />
            <div className="mt-8 divide-y divide-line border-y border-line">
              {FAQ.map(({ q, a }) => (
                <details key={q} className="group py-4">
                  <summary className="flex cursor-pointer list-none items-center justify-between gap-4 text-[15px] font-medium text-fg [&::-webkit-details-marker]:hidden">
                    {q}
                    <span className="text-subtle transition-transform group-open:rotate-45 text-xl leading-none">+</span>
                  </summary>
                  <p className="mt-3 text-[14px] text-subtle leading-relaxed">{a}</p>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* Closing CTA */}
        <section className="border-t border-line/70">
          <div className="max-w-6xl mx-auto px-4 sm:px-6 py-16">
            <div className="rounded-3xl border border-brand-line bg-brand-soft/60 px-6 py-10 sm:px-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
              <div>
                <h2 className="text-2xl font-semibold tracking-tight text-fg">Dönemi düzenli başlatın.</h2>
                <p className="mt-2 text-sm text-subtle">Kayıt talebi bir dakika sürer; onaylandığında e-posta ile haber veririz.</p>
              </div>
              <Link href="/register" className="h-12 px-6 rounded-xl bg-brand hover:bg-brand-hover text-white text-sm font-medium inline-flex items-center justify-center gap-2 shrink-0">
                Kayıt talebi oluştur <ArrowRight className="w-4 h-4" />
              </Link>
            </div>
          </div>
        </section>
      </main>

      <footer className="border-t border-line/70 pb-[env(safe-area-inset-bottom)]">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 py-8 flex flex-col sm:flex-row items-center justify-between gap-4 text-xs text-muted">
          <div className="flex items-center gap-2.5">
            <SigmaLogo size="xs" />
            <span className="text-body font-medium">LrDocument</span>
          </div>
          <nav className="flex items-center gap-5" aria-label="Alt menü">
            <Link href="/login" className="hover:text-fg">Giriş</Link>
            <Link href="/register" className="hover:text-fg">Kayıt</Link>
            <a href="#sss" className="hover:text-fg">SSS</a>
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
