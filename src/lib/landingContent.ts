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
  'KeyRound',
  'MailCheck',
  'Zap',
  'UserCheck',
] as const;
export type LandingIcon = (typeof LANDING_ICONS)[number];

const short = (max = 120) => z.string().trim().max(max);
const text = (max = 600) => z.string().trim().max(max);
const iconItem = z.object({ icon: z.enum(LANDING_ICONS), title: short(80).min(1), text: text(400) });

export const landingContentSchema = z.object({
  /** Search engines and link previews (title tag, meta description, keywords). */
  seo: z.object({
    title: short(70).min(1),
    description: text(170).min(1),
    keywords: short(400),
  }),
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
  corporate: z.object({ visible: z.boolean(), eyebrow: short(), title: short(140), text: text(), items: z.array(iconItem).max(8) }),
  security: z.object({ visible: z.boolean(), eyebrow: short(), title: short(140), text: text(), items: z.array(iconItem).max(8) }),
  pricing: z.object({ visible: z.boolean(), eyebrow: short(), title: short(140), text: text() }),
  faq: z.object({ visible: z.boolean(), eyebrow: short(), title: short(140), items: z.array(z.object({ q: short(200).min(1), a: text(1200) })).max(20) }),
  cta: z.object({ visible: z.boolean(), title: short(140), text: text(), button: short(60).min(1) }),
  footer: z.object({ note: short(200) }),
  /** KVKK aydınlatma metni and gizlilik politikası (/kvkk, /gizlilik; linked in the footer). */
  legal: z.object({
    controller: short(200),
    contact: short(254),
    updated: short(40),
    /** Satıcı unvanı, adresi, telefonu, vergi / MERSİS no (Mesafeli Satış Sözleşmesi). */
    seller: text(2000),
    kvkk: text(40_000).min(1),
    privacy: text(40_000).min(1),
    sales: text(40_000).min(1),
    /** Teslimat ve iade şartları (/teslimat-ve-iade). */
    delivery: text(40_000).min(1),
    terms: text(40_000).min(1),
  }),
});

export type LandingContent = z.infer<typeof landingContentSchema>;

// Default legal texts. "{veriSorumlusu}", "{iletisim}" and "{saticiBilgileri}" are replaced with the controller name and
// contact address set in Yönetici Paneli › Açılış sayfası › Yasal metinler. Lines starting with
// "## " are headings, lines starting with "- " list items; blank lines separate paragraphs.
const KVKK_TEXT = `Bu aydınlatma metni, 6698 sayılı Kişisel Verilerin Korunması Kanunu'nun ("KVKK") 10. maddesi uyarınca, LrDocument hizmetini kullanırken işlenen kişisel verileriniz hakkında sizi bilgilendirmek için hazırlanmıştır.

## Veri sorumlusu
Kişisel verileriniz veri sorumlusu sıfatıyla {veriSorumlusu} tarafından işlenmektedir.

## İşlenen kişisel veriler
- Kimlik ve iletişim: ad soyad, e-posta adresi.
- Hesap ve abonelik: hesap türü (bireysel, kurumsal, öğrenci), paket ve ödeme durumu, kayıt ve son görülme zamanı.
- Öğrenci hesapları: üniversite, öğrenci e-postası, bölüm, sınıf ve isteğe bağlı öğrenci numarası.
- Kurumsal hesaplar: kurum adı, kurum sahibinin eklediği kişilerin adları ve rolleri.
- Kullanıcı içerikleri: notlar, görevler, takvim kayıtları, gelir-gider ve borç kayıtları, ders takibi verileri ve kurumsal hesaplarda müşteri kayıtları.
- İşlem güvenliği: oturum bilgileri ve kötüye kullanımı önlemek için kısa süreli tutulan IP adresi.

## İşleme amaçları
- Hesabınızın oluşturulması, onaylanması ve hizmetin sunulması,
- abonelik ve ödeme süreçlerinin yürütülmesi,
- bilgi güvenliğinin sağlanması ve kötüye kullanımın önlenmesi,
- mevzuattan doğan yükümlülüklerin yerine getirilmesi.

## Hukuki sebepler
Kişisel verileriniz KVKK'nın 5. maddesinin 2. fıkrasındaki; sözleşmenin kurulması ve ifası için gerekli olması (c), veri sorumlusunun hukuki yükümlülüğünü yerine getirmesi (ç) ve temel hak ve özgürlüklerinize zarar vermemek kaydıyla meşru menfaat (f) hukuki sebeplerine dayanılarak işlenir.

## Toplama yöntemi
Veriler; kayıt formu, uygulama içindeki girişleriniz ve oturum işlemleri aracılığıyla elektronik ortamda toplanır. Yüklediğiniz PDF dosyaları cihazınızda işlenir, sunucuya gönderilmez.

## Aktarım
Kişisel verileriniz üçüncü kişilere satılmaz ve pazarlama amacıyla paylaşılmaz. Veriler, hizmetin barındırıldığı sunucularda saklanır; yalnızca kanunen yetkili kurum ve kuruluşlara, talep edilmesi hâlinde ve mevzuatın izin verdiği ölçüde aktarılabilir.

## Saklama süresi
Veriler hesabınız açık olduğu sürece saklanır. Hesabınız silindiğinde verileriniz silinir; mevzuat gereği saklanması gereken kayıtlar yasal süre sonunda imha edilir.

## Haklarınız
KVKK'nın 11. maddesi uyarınca; kişisel verilerinizin işlenip işlenmediğini öğrenme, işlenmişse bilgi talep etme, işlenme amacını ve amacına uygun kullanılıp kullanılmadığını öğrenme, aktarıldığı üçüncü kişileri bilme, eksik veya yanlış işlenmişse düzeltilmesini, KVKK'daki şartlar çerçevesinde silinmesini veya yok edilmesini isteme, bu işlemlerin aktarılan üçüncü kişilere bildirilmesini isteme, münhasıran otomatik sistemlerle analiz edilmesi sonucu aleyhinize bir sonucun ortaya çıkmasına itiraz etme ve kanuna aykırı işleme nedeniyle zarara uğramanız hâlinde zararın giderilmesini talep etme haklarına sahipsiniz.

## Başvuru
Taleplerinizi {iletisim} adresine iletebilirsiniz. Başvurunuz en geç otuz gün içinde ücretsiz olarak sonuçlandırılır.`;

const PRIVACY_TEXT = `Bu politika, LrDocument'i kullanırken bilgilerinizin nasıl toplandığını, korunduğunu ve kullanıldığını açıklar. Kişisel verilerin işlenmesine ilişkin ayrıntılı bilgi için KVKK Aydınlatma Metni'ne bakabilirsiniz.

## Topladığımız bilgiler
Yalnızca hizmet için gereken bilgileri toplarız: hesap bilgileriniz (ad, e-posta, hesap türü), uygulamaya kendi girdiğiniz içerikler ve oturumunuzun güvenliği için gereken teknik bilgiler.

## Verilerin korunması
- Notlarınız, görevleriniz, takvim, finans ve müşteri kayıtlarınız sunucuda size özel bir anahtarla AES-256 ile şifrelenerek saklanır.
- Şifreniz geri döndürülemez biçimde (bcrypt) saklanır; kimse şifrenizi göremez.
- Kurumsal giriş kodları sunucuda okunabilir hâlde tutulmaz, yalnızca doğrulama için kullanılan özetleri saklanır.
- Bağlantılar HTTPS ile şifrelenir.

## Çerezler ve tarayıcı depolama
Yalnızca oturumunuzu sürdürmek için gerekli, JavaScript ile okunamayan (httpOnly) zorunlu çerezler kullanılır: oturum çerezi ve aynı tarayıcıda açtığınız hesapların listesi. Bu çerezler adınızı veya e-postanızı içermez. Analiz, reklam veya takip çerezi kullanılmaz; tercihleriniz tarayıcıda değil, sunucuda şifreli olarak saklanır.

## Dosyalar
Ders programı, akademik takvim ve not olarak içe aktardığınız PDF, Word ve Markdown dosyaları cihazınızda işlenir; dosyanın kendisi sunucuya yüklenmez, yalnızca sizin kaydettiğiniz sonuç saklanır.

## Üçüncü taraf hizmetler
Döviz kurlarını göstermek için herkese açık kur servislerinden kişisel veri içermeyen istekler yapılır. Bunun dışında verileriniz reklam, analiz veya pazarlama hizmetleriyle paylaşılmaz.

## Kurumsal hesaplar
Kurumsal çalışma alanındaki notlar, görevler, takvim, finans ve müşteri kayıtları kurumun ortak verisidir. Kurum sahibi ve yöneticiler bu verilerin tümünü görebilir; diğer kişiler kurum sahibinin veya yöneticilerin verdiği izinler ölçüsünde erişir. Müşteri kayıtlarına girilen kişisel verilerden ilgili kurum sorumludur.

## Saklama ve silme
Verileriniz hesabınız açık olduğu sürece saklanır. Hesabınızın ve verilerinizin silinmesini {iletisim} adresinden talep edebilirsiniz.

## Değişiklikler
Bu politika güncellendiğinde sayfanın başındaki tarih değişir.

## İletişim
Sorularınız için: {iletisim}`;

const SALES_TEXT = `Bu sözleşme, 6502 sayılı Tüketicinin Korunması Hakkında Kanun ve Mesafeli Sözleşmeler Yönetmeliği uyarınca, LrDocument hizmetinin elektronik ortamda satışına ilişkin tarafların hak ve yükümlülüklerini düzenler.

## Taraflar
Satıcı: {saticiBilgileri}

Alıcı: Kayıt formunda adı, soyadı ve e-posta adresi belirtilen kişi veya kurum.

## Sözleşmenin konusu
Sözleşmenin konusu, Alıcı'nın seçtiği LrDocument paketinin (bireysel, öğrenci veya kurumsal; aylık ya da ömür boyu) elektronik ortamda sunulmasıdır. Hizmet; notlar, görevler, takvim, gelir-gider takibi, öğrenciler için ders takibi ve kurumsal hesaplar için ortak çalışma alanı özelliklerini kapsar.

## Bedel ve ödeme
- Paket ücretleri fiyatlandırma bölümünde gösterilir; kayıt talebinin oluşturulduğu andaki fiyat geçerlidir.
- Kurumsal paketlerde ücret, kurum sahibinin eklediği kişi sayısına göre hesaplanır ve kişi eklendikçe veya çıkarıldıkça güncellenir.
- Aylık paketler her ay yenilenir; ömür boyu paketler bir kez ödenir.
- Ödeme yöntemi ve ödeme bilgileri, kayıt talebinin onaylanmasının ardından Alıcı'ya iletilir.

## Hizmetin ifası
Kayıt talepleri Satıcı tarafından incelenir. Hesap onaylandığında Alıcı'ya bildirim yapılır ve hizmet, Alıcı'nın hesabına giriş yapabilmesiyle birlikte ifa edilmeye başlanır. Hizmet internet üzerinden sunulur; fiziksel teslimat yapılmaz. Teslimat ve iadeye ilişkin ayrıntılar Teslimat ve İade Şartları'nda yer alır.

## Cayma hakkı
Alıcı, hesabı açılmadan önce kayıt talebini herhangi bir gerekçe göstermeden ve cezai şart ödemeden geri çekebilir; bu durumda ödeme yapılmışsa tamamı iade edilir.

Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesinin birinci fıkrasının (ğ) bendi uyarınca, elektronik ortamda anında ifa edilen hizmetlerde, Alıcı'nın onayıyla ifaya başlandıktan sonra cayma hakkı kullanılamaz. Alıcı, hesabının açılmasını talep ederek hizmetin ifasına başlanmasına onay vermiş olur.

## İade koşulları
İptal ve iade koşulları, bu sözleşmenin eki olan Teslimat ve İade Şartları'nda düzenlenmiştir. İade ve iptal talepleri için {iletisim} adresine yazabilirsiniz.

## Uyuşmazlıkların çözümü
Bu sözleşmeden doğan uyuşmazlıklarda, Ticaret Bakanlığı'nca her yıl ilan edilen parasal sınırlar dâhilinde Alıcı'nın veya Satıcı'nın yerleşim yerindeki Tüketici Hakem Heyetleri, bu sınırları aşan durumlarda Tüketici Mahkemeleri yetkilidir.

## Yürürlük
Alıcı, kayıt talebini göndermeden önce bu sözleşmeyi okuduğunu ve kabul ettiğini beyan eder. Sözleşme, kayıt talebinin gönderilmesiyle kurulur.`;

const DELIVERY_TEXT = `Bu metin, LrDocument paketlerinin Alıcı'ya nasıl teslim edildiğini ve iptal ile iade koşullarını açıklar. Mesafeli Satış Sözleşmesi'nin ayrılmaz bir parçasıdır.

## Satıcı
{saticiBilgileri}

## Teslimat
- LrDocument, internet üzerinden sunulan bir yazılım hizmetidir (dijital hizmet); fiziksel ürün gönderimi ve kargo yapılmaz, kargo ücreti alınmaz.
- Kayıt talebi ve ödeme onaylandıktan sonra hesap en geç 2 iş günü içinde açılır ve Alıcı'ya e-posta ile bildirilir. Teslimat, Alıcı'nın hesabına giriş yapabilmesiyle tamamlanmış sayılır.
- Hesap belirtilen süre içinde açılmazsa Alıcı, {iletisim} adresine yazarak durumu bildirebilir; hizmet sağlanamıyorsa ödemenin tamamı iade edilir.
- Kurumsal paketlerde eklenen her kişiye, kurum sahibinin oluşturduğu giriş kodu ile erişim sağlanır.

## Cayma hakkı
- Alıcı, hesabı açılmadan önce kayıt talebini herhangi bir gerekçe göstermeden geri çekebilir; ödeme yapılmışsa tamamı iade edilir.
- Mesafeli Sözleşmeler Yönetmeliği'nin 15. maddesinin birinci fıkrasının (ğ) bendi uyarınca, elektronik ortamda anında ifa edilen hizmetlerde, Alıcı'nın onayıyla ifaya başlandıktan sonra cayma hakkı kullanılamaz.

## İptal ve iade koşulları
- Aylık paketler: Abonelik dilediğiniz zaman iptal edilebilir. İptal, bir sonraki dönemden itibaren geçerli olur; içinde bulunulan dönemin ücreti iade edilmez.
- Ömür boyu paketler: Hizmet, Satıcı'dan kaynaklanan teknik bir sebeple hesabın açılmasından itibaren 14 gün içinde kullanılamazsa ücretin tamamı iade edilir.
- Hizmetin Satıcı'dan kaynaklanan nedenlerle sürekli olarak sunulamaması hâlinde, ödenmiş ancak kullanılmamış süreye karşılık gelen tutar iade edilir.
- Kurumsal paketlerde kişi çıkarıldığında, ücret bir sonraki dönemden itibaren yeni kişi sayısına göre hesaplanır.
- Alıcı'nın kendi isteğiyle hesabını silmesi hâlinde, içinde bulunulan dönemin ücreti iade edilmez.

## İadenin yapılması
- İade talepleri {iletisim} adresine e-posta ile iletilir; talepte hesabın e-posta adresi ve ödeme bilgisi belirtilmelidir.
- Kabul edilen iadeler, talebin kabulünden itibaren en geç 14 gün içinde ödemenin yapıldığı yöntemle yapılır. Tutarın hesaba yansıma süresi bankaya göre değişebilir.
- Kartla yapılan ödemelerin iadesi, ödemenin yapıldığı karta yapılır.

## İletişim
Teslimat ve iade ile ilgili sorularınız için: {iletisim}`;

const TERMS_TEXT = `Bu Kullanım Şartları, LrDocument hizmetini kullanan herkes için geçerlidir. Hizmete kayıt olarak veya hizmeti kullanarak bu şartları kabul etmiş olursunuz. Hizmeti sunan: {veriSorumlusu}.

## Hizmet
LrDocument; notlar, görevler, takvim, gelir-gider takibi, öğrenciler için ders takibi ve kurumsal hesaplar için ortak çalışma alanı sunan çevrim içi bir uygulamadır. Hizmetin özellikleri zaman içinde geliştirilebilir veya değiştirilebilir.

## Hesap ve güvenlik
- Kayıtta verdiğiniz bilgilerin doğru ve güncel olmasından siz sorumlusunuz.
- Hesaplar yönetici onayından sonra açılır; onay vermeme hakkı saklıdır.
- Şifrenizi ve kurumsal giriş kodunuzu kimseyle paylaşmayın. Hesabınızla yapılan işlemlerden siz sorumlusunuz; yetkisiz bir kullanım fark ederseniz derhal bildirin.

## Kurumsal hesaplar
Kurumsal hesabın sahibi; kişileri ekleme, çıkarma, kod verme ve izinleri belirleme yetkisine sahiptir ve kurum adına bu şartları kabul eder. Kurumsal çalışma alanındaki veriler kurumun ortak verisidir. Kurum, üyelerinin hesap üzerinden yaptığı işlemlerden ve müşteri kayıtlarına girdiği kişisel verilerin hukuka uygun işlenmesinden sorumludur.

## Kabul edilebilir kullanım
Hizmeti kullanırken aşağıdakileri yapmamayı kabul edersiniz:
- yürürlükteki mevzuata aykırı, başkalarının haklarını ihlal eden veya zararlı içerik saklamak ya da paylaşmak,
- hizmetin güvenliğini aşmaya, başka kullanıcıların verilerine erişmeye veya hizmeti aksatmaya çalışmak,
- hizmeti otomatik araçlarla aşırı yükleyecek şekilde kullanmak,
- hizmeti tersine mühendislikle çözmek, kopyalamak veya izinsiz olarak yeniden satmak.

## İçerikleriniz
Hizmete girdiğiniz notlar, belgeler ve kayıtlar size (kurumsal hesaplarda kuruma) aittir. Bu içerikleri yalnızca hizmeti size sunmak için gereken ölçüde saklar ve işleriz; içerikleriniz sunucuda size özel anahtarla şifrelenir. Ayrıntılar için Gizlilik Politikası ve KVKK Aydınlatma Metni'ne bakınız.

## Ücretler
Ücretli paketlere ilişkin bedel, ödeme, cayma ve iade koşulları Mesafeli Satış Sözleşmesi ile Teslimat ve İade Şartları'nda düzenlenmiştir.

## Hizmetin sürekliliği ve sorumluluk
Hizmeti kesintisiz ve hatasız sunmak için makul özeni gösteririz; bakım, güncelleme veya öngörülemeyen teknik sorunlar nedeniyle geçici kesintiler olabilir. Önemli verilerinizin ayrıca yedeğini almanızı öneririz. Kanunen sınırlandırılamayan haller saklı kalmak kaydıyla, dolaylı zararlardan ve kullanıcının kendi kusurundan doğan veri kayıplarından sorumluluk kabul edilmez.

## Hesabın askıya alınması ve kapatılması
Bu şartların ihlali hâlinde hesap askıya alınabilir veya kapatılabilir. Hesabınızı ve tüm verilerinizi istediğiniz zaman Ayarlar › Hesap › Hesabı sil bölümünden kalıcı olarak silebilir ya da {iletisim} adresine yazabilirsiniz.

## Değişiklikler
Bu şartlar güncellenebilir; güncel metin her zaman bu sayfada yayımlanır ve sayfanın başındaki tarih değişir. Önemli değişikliklerden sonra hizmeti kullanmaya devam etmeniz, güncel şartları kabul ettiğiniz anlamına gelir.

## Uygulanacak hukuk
Bu şartlar Türkiye Cumhuriyeti hukukuna tabidir. Tüketici işlemlerinde tüketici mevzuatındaki yetki kuralları saklıdır.

## İletişim
Sorularınız için: {iletisim}`;

export const DEFAULT_LANDING: LandingContent = {
  seo: {
    title: 'LrDocument — Ders takibi, LaTeX notlar ve görev uygulaması',
    description:
      'Devamsızlık ve not ortalamasını hesaplayan ders takibi, LaTeX notlar, görevler, takvim, bütçe ve kurumsal ekip alanı. Verileriniz şifreli.',
    keywords:
      'ders takibi, devamsızlık hesaplama, not ortalaması hesaplama, AGNO hesaplama, çan eğrisi, öğrenci ajandası, LaTeX not uygulaması, görev yönetimi, kanban, takvim, bütçe takibi, kurumsal müşteri takibi, üniversite akademik takvimi, KTÜ',
  },
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
      { icon: 'GraduationCap', title: 'Ders takibi', text: 'Öğrencilere özel: ders programı, ders çalışma takvimi, devamsızlık hakkı, vize-final, çan eğrisi, harf notu, AGNO ve sınav geri sayımı.' },
      { icon: 'FileText', title: 'Notlar, tablolar ve PDF', text: 'LaTeX destekli notlar, Excel benzeri tablolar, kitap görünümlü PDF okuyucu; roman ve tez yazarken bölüm, dipnot ve kaynak kısayolları.' },
      { icon: 'ListChecks', title: 'Görevler ve pano', text: 'Tarihli ve saatli görevler, vakti gelince telefonunuza bildirim; aynı sayfada sürükle-bırak Kanban panosu.' },
      { icon: 'CalendarDays', title: 'Takvim', text: 'Kaydırılabilir zaman çizelgesi; .ics ile içe ve dışa aktarma, telefon takviminizle eşitleme.' },
      { icon: 'Wallet', title: 'Finans', text: 'Gelir ve gider, günlük–yıllık düzenli ödemeler, döviz çevirisi; kredi ve borçlar için aylık faiz ve asgari ödeme hesabı.' },
      { icon: 'Building2', title: 'Kurumsal kullanım', text: 'Ekibinize ortak çalışma alanı: kişiye özel kurumsal kodla giriş, ortak notlar, müşteri ve taahhüt ödemesi takibi, bölüm bazında izinler.' },
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
      'Ders çalışma takvimi: her ders için haftalık çalışma saatlerinizi seçin; başlarken ve biterken bildirim gelir, çalışmaların %40’ından fazlası kaçarsa ne kadar telafi etmeniz gerektiği söylenir.',
      'Hocanın çan eğrisini ders ders girin; harf notunuz ona göre hesaplanır.',
      'Alttan alınan derslerde nottan kalındıysa devam zorunluluğu aranmaz.',
      'Türkiye’deki 205 üniversite listede: okulunuzu seçin, yayınlanan akademik takvimi otomatik gelsin; siz yalnızca ders programınızı girin.',
      'KTÜ not yönetmeliği hazır; diğer üniversiteler için not sistemi düzenlenebilir.',
    ],
    steps: [
      { icon: 'FileUp', title: 'Ders programı PDF’ini yükleyin', text: 'Bölümünüzün haftalık programından sınıfınızı ve şubenizi seçin; dersler, saatler ve derslikler otomatik eklenir.' },
      { icon: 'CalendarRange', title: 'Okulunuzu seçin', text: 'Okulunuzun akademik takvimi yayındaysa dönem tarihleri ve sınav haftaları kendiliğinden gelir; değilse PDF’ini yükleyin. Bayramlar otomatik eklenir.' },
      { icon: 'BellRing', title: 'Gerisini takip edin', text: 'Kaç saat devamsızlık hakkınız kaldığını, geçmek için kaç almanız gerektiğini ve sınava kaç gün kaldığını görün.' },
    ],
  },
  corporate: {
    visible: true,
    eyebrow: 'Kurumsal',
    title: 'Ekibiniz için ortak çalışma alanı',
    text: 'Kurum sahibi ekibini ekler, herkese kişiye özel bir giriş kodu verir ve kimin neyi görüp düzenleyeceğine karar verir.',
    items: [
      { icon: 'FileText', title: 'Anlık ortak notlar', text: 'Aynı notu birlikte düzenleyin; değişiklikler ekibin ekranına anında gelir.' },
      { icon: 'Building2', title: 'Müşteriler', text: 'Aylık ödeme, iletişim ve taahhüt süresi; geciken ödemeler takvimde ve listede görünür.' },
      { icon: 'UserCheck', title: 'Bölüm bazında izinler', text: 'Her kişi için gizli, görüntüler veya düzenler; en fazla iki yönetici.' },
      { icon: 'KeyRound', title: 'Kodla giriş', text: 'Ekip üyeleri e-posta ve şifre olmadan, kurum sahibinin verdiği kodla girer.' },
    ],
  },
  security: {
    visible: true,
    eyebrow: 'Güvenlik',
    title: 'Verileriniz size ait ve korunuyor',
    text: 'Hesabınız ve içerikleriniz için kurulum gerektirmeyen, varsayılan olarak açık korumalar.',
    items: [
      { icon: 'Lock', title: 'Şifreli saklama', text: 'Notlar, görevler, finans ve müşteri kayıtları sunucuda size özel anahtarla AES-256 ile şifrelenir.' },
      { icon: 'MailCheck', title: 'E-posta doğrulama', text: 'Her hesap, e-posta adresine gelen kodla doğrulanır; adres değişikliği de kodla onaylanır.' },
      { icon: 'ShieldCheck', title: 'İki adımlı doğrulama', text: 'İsterseniz girişte authenticator uygulamanızdaki kod da istenir.' },
      { icon: 'GraduationCap', title: 'Öğrenci doğrulama', text: 'Öğrencilik, üniversite e-postasına gelen kodla ya da öğrenci belgesiyle doğrulanır.' },
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
      { q: 'Kurumsal paket nasıl fiyatlanır?', a: 'Kurumsal hesabı yönetici açar; ekibinizi siz ekler, her kişiye özel bir kurumsal kod verirsiniz. Kişi başı fiyat normal fiyatın indirimli bir yüzdesidir ve eklediğiniz kişi sayısıyla çarpılır. Hem aylık hem ömür boyu seçenek vardır.' },
      { q: 'Öğrenci indirimi için ne gerekiyor?', a: 'Kayıtta “Öğrenci” seçeneğini işaretleyip üniversite uzantılı öğrenci e-postanızı, bölümünüzü ve sınıfınızı girmeniz yeterli. Ders Takibi modülü de açılır.' },
      { q: 'Birden fazla hesabı aynı cihazda kullanabilir miyim?', a: 'Evet. Menüdeki hesap listesinden “Hesap ekle” ile ikinci bir hesapla giriş yapıp hesaplar arasında tek dokunuşla geçebilirsiniz.' },
      { q: 'Verilerim nasıl korunuyor?', a: 'Notlarınız, görevleriniz, takvim ve finans kayıtlarınız sunucuda size özel bir anahtarla şifrelenir. Tarayıcıda kişisel veri tutulmaz.' },
      { q: 'iPhone ve iPad’de çalışır mı?', a: 'Evet. Safari’de açıp “Ana Ekrana Ekle” ile uygulama gibi kullanabilirsiniz; PDF içe aktarma dahil tüm özellikler mobilde çalışır.' },
      { q: 'Ödeme nasıl yapılır, iade var mı?', a: 'Ödemeler iyzico güvenli ödeme altyapısıyla, Visa ve Mastercard kredi / banka kartlarıyla yapılır. İptal ve iade koşulları Teslimat ve İade Şartları sayfasında açıklanmıştır.' },
      { q: 'Hesabımı silebilir miyim?', a: 'Evet. Ayarlar › Hesap › Hesabı sil ile hesabınızı ve tüm verilerinizi kalıcı olarak silebilirsiniz. İşlem geri alınamaz; önce notlarınızı indirmenizi öneririz.' },
    ],
  },
  cta: {
    visible: true,
    title: 'Dönemi düzenli başlatın.',
    text: 'Kayıt talebi bir dakika sürer; onaylandığında e-posta ile haber veririz.',
    button: 'Kayıt talebi oluştur',
  },
  footer: { note: '' },
  legal: {
    controller: 'LrDocument',
    contact: '',
    updated: '15 Ekim 2026',
    seller: '',
    kvkk: KVKK_TEXT,
    privacy: PRIVACY_TEXT,
    sales: SALES_TEXT,
    delivery: DELIVERY_TEXT,
    terms: TERMS_TEXT,
  },
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
