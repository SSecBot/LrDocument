import { z } from 'zod';

// ---------------------------------------------------------------------------
// Editable content of the public landing page (Yönetici Paneli › Açılış sayfası).
// Everything is plain text rendered by React (escaped), so admins cannot inject markup.
// ---------------------------------------------------------------------------

/** Icons an admin can pick for list items; the landing page maps them to lucide icons. */
export const LANDING_ICONS = [
  'GraduationCap',
  'FileText',
  'ListChecks',
  'Kanban',
  'CalendarDays',
  'CalendarRange',
  'Wallet',
  'FileUp',
  'BellRing',
  'ShieldCheck',
  'Smartphone',
  'Sigma',
  'BookOpen',
  'Building2',
  'Users',
  'Lock',
] as const;
export type LandingIcon = (typeof LANDING_ICONS)[number];

const short = (max = 120) => z.string().trim().max(max);
const text = (max = 600) => z.string().trim().max(max);
const iconItem = z.object({ icon: z.enum(LANDING_ICONS), title: short(80).min(1), text: text(400) });

export const landingContentSchema = z.object({
  hero: z.object({
    eyebrow: short(),
    title: short(140).min(1),
    highlight: short(80),
    subtitle: text(),
    primaryCta: short(60).min(1),
    secondaryCta: short(60),
    trustPoints: z.array(short(80)).max(4),
    showPreview: z.boolean(),
  }),
  features: z.object({ visible: z.boolean(), eyebrow: short(), title: short(140), text: text(), items: z.array(iconItem).max(12) }),
  students: z.object({
    visible: z.boolean(),
    eyebrow: short(),
    title: short(140),
    text: text(),
    points: z.array(text(300)).max(10),
    steps: z.array(iconItem).max(6),
  }),
  pricing: z.object({ visible: z.boolean(), eyebrow: short(), title: short(140), text: text() }),
  faq: z.object({ visible: z.boolean(), eyebrow: short(), title: short(140), items: z.array(z.object({ q: short(200).min(1), a: text(1200) })).max(20) }),
  cta: z.object({ visible: z.boolean(), title: short(140), text: text(), button: short(60).min(1) }),
  footer: z.object({ note: short(200) }),
});

export type LandingContent = z.infer<typeof landingContentSchema>;

export const DEFAULT_LANDING: LandingContent = {
  hero: {
    eyebrow: 'Öğrenciler, eğitimciler ve içerik üreticileri için',
    title: 'Notlarınız, dersleriniz ve işleriniz',
    highlight: 'tek bir yerde.',
    subtitle:
      'LaTeX destekli notlar, görevler, takvim ve bütçe; üniversite öğrencileri için de devamsızlığı ve notları kendi hesaplayan ders takibi.',
    primaryCta: 'Kayıt talebi oluştur',
    secondaryCta: 'Öğrenciyim',
    trustPoints: ['Veriler şifreli ve hesabınıza özel', 'iPhone, iPad, Android, masaüstü', 'PDF’ler cihazınızda okunur'],
    showPreview: true,
  },
  features: {
    visible: true,
    eyebrow: 'Özellikler',
    title: 'Günlük işiniz için gereken her şey',
    text: 'Modüller birbirine bağlı çalışır: bir görevi takvime, bir notu derse, bir harcamayı projeye bağlayın.',
    items: [
      { icon: 'GraduationCap', title: 'Ders takibi', text: 'Öğrencilere özel: ders programı, devamsızlık hakkı, vize-final, çan eğrisi, harf notu, AGNO ve sınav geri sayımı.' },
      { icon: 'FileText', title: 'Notlar ve LaTeX', text: 'Markdown notlar, canlı KaTeX önizleme; PDF, Word ve Markdown dosyalarından içe aktarma.' },
      { icon: 'ListChecks', title: 'Görevler ve pano', text: 'Öncelik ve son tarihli görevler, aynı sayfada sürükle-bırak Kanban panosu.' },
      { icon: 'CalendarDays', title: 'Takvim', text: 'Kaydırılabilir zaman çizelgesi; .ics ile içe ve dışa aktarma, telefon takviminizle eşitleme.' },
      { icon: 'Wallet', title: 'Gelir, gider ve borç', text: 'Kategoriler, döviz çevirisi, kredi/borç takibi: aylık faiz ve asgari ödeme hesabı.' },
      { icon: 'Building2', title: 'Kurumsal kullanım', text: 'Ekibiniz için kişi sayısına göre indirimli kurumsal paketler.' },
    ],
  },
  students: {
    visible: true,
    eyebrow: 'Üniversite öğrencileri',
    title: 'Devamsızlığınızı ve notlarınızı siz hesaplamayın',
    text: 'Ders Takibi, yönetmeliğinizdeki kuralları ve üniversitenizin akademik takvimini bilir. Sizin yapmanız gereken tek şey derse gitmediğiniz günü işaretlemek.',
    points: [
      'Devamsızlık, takvimdeki gerçek ders günlerine göre hesaplanır; bayram, arife öğleden sonrası ve sınav haftaları sayılmaz.',
      'Akşamları genel bakışta yarının ders programı görünür.',
      'Hocanın çan eğrisini ders ders girin; harf notunuz ona göre hesaplanır.',
      'Alttan alınan derslerde nottan kalındıysa devam zorunluluğu aranmaz.',
      'KTÜ yönetmeliği hazır; diğer üniversiteler için not sistemi düzenlenebilir.',
    ],
    steps: [
      { icon: 'FileUp', title: 'Ders programı PDF’ini yükleyin', text: 'Bölümünüzün haftalık programından sınıfınızı ve şubenizi seçin; dersler, saatler ve derslikler otomatik eklenir.' },
      { icon: 'CalendarRange', title: 'Akademik takvimi yükleyin', text: 'Dönem başı-sonu ve sınav haftaları işlenir; milli ve dinî bayramlar kendiliğinden eklenir.' },
      { icon: 'BellRing', title: 'Gerisini takip edin', text: 'Kaç saat devamsızlık hakkınız kaldığını, geçmek için kaç almanız gerektiğini ve sınava kaç gün kaldığını görün.' },
    ],
  },
  pricing: {
    visible: true,
    eyebrow: 'Fiyatlar',
    title: 'Sade fiyatlandırma',
    text: 'Bireysel, kurumsal ve öğrenci seçenekleri; aylık ya da bir kez ödeyip ömür boyu.',
  },
  faq: {
    visible: true,
    eyebrow: 'SSS',
    title: 'Sık sorulan sorular',
    items: [
      { q: 'Hesabım ne zaman açılır?', a: 'Kayıt formunu doldurduğunuzda talebiniz yöneticiye iletilir. Onaylandığında e-posta ile bilgilendirilirsiniz ve aynı bilgilerle giriş yapabilirsiniz.' },
      { q: 'Kurumsal paket nasıl fiyatlanır?', a: 'Kişi başı fiyat, normal fiyatın indirimli bir yüzdesidir ve seçtiğiniz kişi sayısıyla çarpılır. Hem aylık hem ömür boyu seçenek vardır.' },
      { q: 'Öğrenci indirimi için ne gerekiyor?', a: 'Kayıtta “Öğrenci” seçeneğini işaretleyip üniversite uzantılı öğrenci e-postanızı, bölümünüzü ve sınıfınızı girmeniz yeterli. Ders Takibi modülü de açılır.' },
      { q: 'Birden fazla hesabı aynı cihazda kullanabilir miyim?', a: 'Evet. Menüdeki hesap listesinden “Hesap ekle” ile ikinci bir hesapla giriş yapıp hesaplar arasında tek dokunuşla geçebilirsiniz.' },
      { q: 'Verilerim nasıl korunuyor?', a: 'Notlarınız, görevleriniz, takvim ve finans kayıtlarınız sunucuda size özel bir anahtarla şifrelenir. Tarayıcıda kişisel veri tutulmaz.' },
      { q: 'iPhone ve iPad’de çalışır mı?', a: 'Evet. Safari’de açıp “Ana Ekrana Ekle” ile uygulama gibi kullanabilirsiniz; PDF içe aktarma dahil tüm özellikler mobilde çalışır.' },
    ],
  },
  cta: {
    visible: true,
    title: 'Dönemi düzenli başlatın.',
    text: 'Kayıt talebi bir dakika sürer; onaylandığında e-posta ile haber veririz.',
    button: 'Kayıt talebi oluştur',
  },
  footer: { note: '' },
};

type Plain = Record<string, unknown>;
const isPlain = (v: unknown): v is Plain => !!v && typeof v === 'object' && !Array.isArray(v);

/** Stored content over the defaults; any section that fails validation falls back to its default. */
export function resolveLandingContent(stored: unknown): LandingContent {
  const out: Plain = {};
  const src = isPlain(stored) ? stored : {};
  for (const key of Object.keys(landingContentSchema.shape) as (keyof LandingContent)[]) {
    const merged = isPlain(src[key]) ? { ...(DEFAULT_LANDING[key] as Plain), ...(src[key] as Plain) } : DEFAULT_LANDING[key];
    const r = landingContentSchema.shape[key].safeParse(merged);
    out[key] = r.success ? r.data : DEFAULT_LANDING[key];
  }
  return out as LandingContent;
}
