# Sunucudaki Kurulumu Güncelleme Rehberi

Kurulum klasörü: `/var/www/LrDocument`, veritabanı ve anahtarlar: `/var/lib/lrdocument`.
Güncellemeyi `scripts/update.sh` yapar; PM2'de bu klasörde çalışan süreci kendisi bulur.
Aşağıda geçen `PM2_ADI` yerine `pm2 list` çıktısındaki adı yazın.

---

## Her güncellemede (2 adım)

**1. Bilgisayarınızda** kodu GitHub'a gönderin:

```bash
git add -A
git commit -m "Güncelleme"
git push origin master
```

**2. Sunucuda** tek komut:

```bash
ssh root@SUNUCU_IP_ADRESINIZ
bash /var/www/LrDocument/scripts/update.sh
```

Betik sırasıyla: veritabanını yedekler → kodu çeker → `npm ci` → yeni tabloları ekler
(`prisma db push`, veri silmez) → derler → PM2'yi yeniden başlatır → sitenin yanıt verdiğini kontrol eder.
Derleme sırasında site 1–3 dakika kapalı kalabilir. Son 20 yedek `/var/lib/lrdocument/backups/` altında durur.

---

## Bu güncellemede gelenler (Big Update 4: dil desteği, geri alma, klavye, hızlı açılış)

`update.sh` User ve OrgMember tablolarına `locale` alanı ekler (varsayılan `tr`: mevcut tüm hesaplar Türkçe kalır).
Derleme sırasında `scripts/build-i18n.mjs` İngilizce sözlüğü `public/i18n/en.js` olarak üretir (otomatik; ek ayar yok).

- **Dil (Türkçe / English):** kayıtta seçilir; giriş sayfasından ve Ayarlar › Tercihler › Dil’den değiştirilir. Dil hesaba
  kaydedilir; bildirimler ve e-postalar da bu dilde gider. Yönetici paneli ve yasal metinler Türkçe kalır. Açılış sayfasında
  yönetici panelinden **değiştirilmiş** metinler İngilizcede de yazıldığı gibi (Türkçe) görünür.
- **Silmelere geri alma:** silinen kayıt 6 saniye boyunca “Geri al” ile geri getirilebilir; sunucuya silme isteği bu süre
  bitince gider.
- **Hata mesajları:** genel “bir hata oluştu” yerine ne olduğunu ve ne yapılacağını anlatan mesajlar; çökme / 404 sayfaları.
- **Bildirim izni:** izin istenmeden önce nedeni anlatılır; karşılama penceresinden doğrudan açılabilir.
- **“Ana ekrana ekle” hatırlatması:** uygulama yüklü değilken her açılışta; “Bir daha gösterme” seçeneğiyle.
- **Fiyatlar:** aylık fiyatların altında “Otomatik yenilenir · İstediğiniz an iptal”, ömür boyunun altında “Tek seferlik ödeme”.
- **Klavye:** telefon ve tabletlerde klavye açılınca yazı alanları klavyenin üstünde kalır.
- **Hızlı açılış:** uygulama yalnızca açık bölümün kodunu indirir; diğerleri arka planda hazırlanır.

---

## Önceki güncellemede gelenler (güvenlik yükseltmesi, Node.js 24)

**Önce Node.js'i yükseltin** (aşağıdaki bölüm). Sunucuda Node 20 varsa `update.sh` hiçbir şeye dokunmadan durur
ve site eski sürümle çalışmaya devam eder.

- **Next.js 16.4.0 → 16.4.2:** görsel uç noktasındaki (SVG) uzaktan kod çalıştırma ve Server Actions
  hizmet engelleme açıkları kapandı.
- **ESLint 9 → 10**, `eslint-config-next` 16.4.2; eslint eklentisindeki `braces` açığı (düzeltilmiş sürümü yok)
  bağımlılık ağacından tamamen çıkarıldı. `npm audit`: 0 açık.
- `package.json` artık Node 22.13+ istiyor (`engines`), proje köküne `.nvmrc` (24) eklendi.

### Node.js'i 24'e yükseltme (bir kez)

Hangi kurulumu kullandığınızı görmek için: `which node` (`/root/.nvm/...` ise nvm, `/usr/bin/node` ise apt/NodeSource).

**apt / NodeSource ile kurulduysa:**

```bash
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt-get install -y nodejs
node -v            # v24.x.x görmelisiniz
pm2 update         # PM2'yi yeni Node ile yeniden başlatır (süreçler korunur)
bash /var/www/LrDocument/scripts/update.sh
```

**nvm ile kurulduysa:**

```bash
nvm install 24 && nvm alias default 24
npm install -g pm2 # nvm her Node sürümü için ayrı global paket tutar
pm2 update
bash /var/www/LrDocument/scripts/update.sh
```

`pm2 update` adımı önemlidir: atlanırsa PM2 uygulamayı eski Node ile çalıştırmaya devam eder.

---

## Önceki güncellemede gelenler (Big Update 3, yasal sayfalar, hesap silme)

`update.sh` Task tablosuna boş bir `dueTime` alanı ekler; mevcut veriye dokunulmaz. Ek ayar gerekmez.

- **Görevlere saat:** son tarihe isteğe bağlı saat; o saatte "Görevin saati geldi" bildirimi gider, takvimde görünür.
- **Notların açılış klasörü:** Ayarlar › Tercihler › Notlar: Tüm Notlar (varsayılan) / son bırakılan / seçilen klasör.
- **Finans düzeltmeleri:** düzenlerken tutarın boş gelmesi (gelir ekleme/düzenleme hatası), başka aydaki düzenli kaydın
  düzenlenip silinememesi, özel kur marjının kayıtta kaybolması, "Kredi / borç ekle"nin Gelir olarak açılması düzeltildi.
  Düzenli işlemlere **yıllık** seçeneği eklendi; düzenli gelirde bitiş tarihi artık isteğe bağlı. Krediler kutusu mobilde
  düzeltildi.
- **Silme onayı:** tüm silme düğmeleri önce onay penceresi açar.
- **Yazım araçları:** notlarda roman / tez kısayolları (bölüm, sahne, diyalog, dipnot, atıf, kaynak, numaralı başlık / şekil /
  tablo / denklem, içindekiler, iskeletler); önizlemede dipnot ve sahne ayracı.
- **Kitap görünümü:** PDF okuyucu ve not önizlemesi tablet / bilgisayarda çift sayfa (telefonda yok).
- **Ders çalışma takvimi** (öğrenci): Ders Takibi › Çalışma takvimi. Haftalık çalışma saatleri, başlangıç ve bitiş bildirimi,
  işaretleme, telafi; çalışmaların %40'ından fazlası yapılmazsa "x saat eksik — ileriki çalışmalara eklenmeli" uyarısı.
- **Favicon** yeni turuncu Σ logosuyla güncellendi (tarayıcı eskisini önbellekte tutuyorsa bir kez yenileyin).
- **Yasal:** yeni sayfa `/teslimat-ve-iade` (Teslimat ve İade Şartları). Metni ve Mesafeli Satış Sözleşmesi Yönetici Paneli ›
  Açılış sayfası › Yasal metinler'den düzenlenir. **Not:** daha önce yasal metinleri panelden kaydettiyseniz Mesafeli Satış
  metninizdeki eski "İade koşulları" bölümü olduğu gibi kalır; isterseniz yeni sayfaya yönlendiren kısa metinle değiştirin.
  Satıcı bilgileri ve iletişim e-postası alanlarının dolu olduğundan emin olun (iyzico başvurusu bunları ister).
- **Açılış sayfası:** iyzico ile Öde, Visa ve Mastercard logoları (alt bilgi, fiyatlar, yasal sayfalar); özellik metinleri ve
  SSS güncellendi. Açılış sayfası metinlerini panelden daha önce kaydettiyseniz kaydettiğiniz metinler gösterilir.
- **Hesap silme:** Ayarlar › Hesap › Hesabı sil (şifre + "HESABIMI SİL" onayı). Yönetici hesabı ve kurumsal üyeler silemez.
- **Giriş:** e-posta kodu ekranında spam / Promosyonlar klasörü uyarısı.

---

## Önceki güncellemede gelenler (PDF okuyucu, bildirim sesi, sıkıştırma)

`update.sh` StoredFile tablosuna iki boş alan ekler; mevcut veriye dokunulmaz.

- **PDF okuyucu:** bilgisayarda %50, telefonda %75 açılır; %10'a kadar küçültülür; en son bırakılan büyüklük (telefon ve
  bilgisayar için ayrı) hesapta saklanır.
- **Bildirim sesi:** Ayarlar › Tercihler › Bildirimler › *Bildirim sesi*: Kapalı / Varsayılan (zil) / Kendi sesim (MP3, WAV,
  OGG, M4A, en fazla 1 MB; sunucuda şifreli saklanır, içeriği kontrol edilir). Uygulama açıkken çalar; uygulama kapalıyken
  telefon/bilgisayar kendi sistem sesini kullanır (tarayıcılar buna izin vermez).
- **Sıkıştırma:** PDF'ler (ve sesler) şifrelenmeden önce Brotli ile sıkıştırılır; eski PDF'ler arka planda (5'er 5'er)
  sıkıştırılır. `update.sh` veritabanı yedeklerini artık **gzip** ile sıkıştırır (`lrdocument-TARIH.db.gz`); yönetici JSON
  yedeğindeki dosyalar da sıkıştırılmış yazılır. Not: içi zaten sıkıştırılmış PDF'lerde kazanç küçük olur.
  **Yedekten dönüş:** `gunzip -c /var/lib/lrdocument/backups/lrdocument-TARIH.db.gz > /var/lib/lrdocument/prod.db`
- **Düzeltmeler:** kurumsalda aynı tablo notunu iki kişi düzenleyince birinin değişikliğinin silinmesi düzeltildi
  (tablo artık dışarıdan gelen değişikliği alır); uygulama açıkken gelen push bildirimi sessiz gösterilir, seçilen ses çalar.

---

## Önceki güncellemede gelenler (Big Update 2)

`update.sh` veritabanına yeni tablo ve boş alanlar ekler (StoredFile, not türü, şahsi kayıt alanı); mevcut veriye dokunulmaz.
Yeni npm paketleri (`docx`, `jspdf`, `html2canvas-pro`, `xlsx`) `npm ci` ile kurulur; ek ayar gerekmez.

- **Not türleri:** Notlar › Yeni › *Not* veya *Tablo*. Tablo notu Excel gibi çalışır (sayfalar, formüller — TOPLA/SUM,
  EĞER/IF, DÜŞEYARA/VLOOKUP…, biçimlendirme, sıralama, kopyala-yapıştır). İçe aktar önce *Not / Tablo* sorar; Excel/CSV
  dosyası her zaman tablo notu olur. Not listesinde tarihin yanında tür yazar.
- **PDF notları:** PDF yüklenince metne çevrilmez; uygulamadaki PDF okuyucuda açılır. Dosya **sunucuda, kullanıcıya özel
  anahtarla şifrelenmiş** (AES-256-GCM) olarak veritabanında tutulur, her açılışta SHA-256 ile doğrulanır; tarayıcıda kopya
  tutulmaz. PDF başına en fazla 25 MB, hesap başına toplam 1 GB. "Metne dönüştür" ile (el yazısı seçeneği dahil) ayrı bir
  metin notu oluşturulur. **Not:** PDF'ler veritabanında durduğu için `backups/` altındaki yedekler büyüyebilir; disk alanını
  ara sıra kontrol edin.
- **Notu indir:** metin notu → Markdown / PDF / Word; tablo → Excel / CSV / PDF; PDF notu → orijinal dosya.
- **Kurumsal "Şahsi Notlar" ve "Şahsi Finans":** her kişinin yalnızca kendisinin gördüğü notlar ve gelir-gider sayfası
  (kurum sahibi de diğer üyelerin şahsi kayıtlarını göremez). Kurumdan çıkarılan kişinin şahsi kayıtları silinir.
- **Adlar:** "Gelir ve Gider" → **Finans**, "Görevler ve Kanban" → **Görevler**.
- **Genel bakış:** yeni bölümler — Aylık takvim, Döviz kurları, Akademik durum, Finans analizi, Sabitlenmiş notlar.
- **Klasör simgesi** seçilebilir; **klavye ve dokunmatik kısayollar** (listeyi "?" açar; Ayarlar › Tercihler › Kısayollar).
- **Ders hatırlatması:** Ayarlar › Tercihler › Bildirimler'den dersten kaç dakika önce / sonra geleceği seçilir.
- **Kullanım kılavuzu:** ilk girişte açılan karşılama penceresi ve Ayarlar › Destek'te `kullanim-kilavuzu.pdf`.
  Kaynak: `docs/kullanim-kilavuzu/` (yeniden üretmek için `node docs/kullanim-kilavuzu/build.mjs`, Playwright gerekir).
- **VIP paket:** Yönetici Paneli'nde kullanıcının paketinden **VIP — ömür boyu ücretsiz** seçilir; ödeme durumu "muaf"
  olur ve hiç ödeme istenmez. Başka pakete alınırsa normal ödeme durumuna döner.
- **Güvenlik / hata düzeltmeleri:** yedek geri yüklemede şahsi kayıtların ortak alana düşmesi engellendi (yedeğe PDF
  dosyaları ve gizli notlar da eklendi); 10 MB'tan büyük istek gövdelerinin sessizce kesilmesi düzeltildi (eksik gelen
  yüklemeler reddedilir); dosya yanıtlarına `sandbox` CSP; tablo notlarında hızlı yazarken karakter kaybı düzeltildi.

---

## Önceki güncellemede gelenler (gizli notlar, iPhone/iPad bildirimleri, açılır pencereler)

`update.sh` veritabanına iki yeni tablo ekler (SecretVault, SecretNote); mevcut veriye dokunulmaz.

- **Gizli notlar:** Notlar › *Gizli Notlar*. İlk açılışta ayrı bir şifre belirlenir; notlar tarayıcıda şifrelenip öyle kaydedilir,
  sunucu ve yönetici içeriği göremez. Görünümden çıkınca, 5 dakika işlem yapılmayınca veya uygulama 1 dakikadan uzun arka planda
  kalınca kilitlenir. Şifre unutulursa kurtarılamaz; "Şifremi unuttum" hesap şifresiyle tüm gizli notları silip sıfırlar.
  Kurumsal kodla giren üyelerde yoktur (ortak alana kişisel not yazılmasın diye).
- **iPhone / iPad bildirimleri:** Apple, gönderici adresi gerçek bir https adresi olmayan bildirimleri reddediyordu (HTTP 403).
  Sunucu artık sitenin açıldığı alan adını (https://alanadiniz) kullanır. İsterseniz `.env` dosyasına `SITE_URL=https://alanadiniz`
  ekleyerek sabitleyebilirsiniz. Güncellemeden sonra iPhone/iPad'de Ayarlar › Tercihler'den bildirimi bir kez kapatıp açın.
- **Açılır pencereler:** telefonda alt buton satırı tam genişlikte; dar ekranda taşan satırlar (kategori ekleme, kontrol listesi,
  ders değerlendirmeleri) düzeltildi; iPhone/iPad'de klavye açılınca pencere klavyenin üstünde kalır.

---

## Önceki güncellemede gelenler (hatırlatma bildirimleri, sıralama, genel bakış düzeni, güvenlik)

Veritabanı değişmez; ek ayar gerekmez.

- **Hatırlatma bildirimleri (telefon, tablet, bilgisayar):** görevin son günü geldiğinde ve süresi geçtiğinde; ödeme / tahsilat
  günü geldiğinde ve geçtiğinde (tekrarlayan ödemeler ve kredi / borç ödeme günü dahil); öğrencilerde dersten **15 dakika önce**
  (tatil, sınav haftası ve dönem dışı günlerde gönderilmez) ve sınav günü sabahı. Gün hatırlatmaları 08:00–22:00 arası, ders
  hatırlatmaları ders saatine göre gider; her biri bir kez.
- **Notlar:** klasörler "Sırala" ile oklarla veya sürükleyerek; notlar "Sırala" menüsünden son düzenlenen / oluşturma / başlık /
  elle sıralanır. Sıralama kişiseldir ve sunucuda saklanır (her cihazda aynı).
- **Genel bakış › Düzenle:** bölümler gösterilir / gizlenir / sıralanır; yeni "Yaklaşan görevler" ve "Yaklaşan ödemeler" bölümleri.
- **Güvenlik:** tüm API isteklerinde site dışı (CSRF) kontrolü sıkılaştırıldı; büyük istek gövdeleri bellekte biriktirilmeden
  reddedilir; canlı bağlantı ve kayıt sayısına üst sınır; şifre sıfırlama / doğrulama kodu istekleri hesabın var olup olmadığını
  belli etmez.

---

## Önceki güncellemede gelenler (görev aralığı, canlı bildirim, Windows uygulaması)

Veritabanına yalnızca boş yeni alanlar eklenir; ek ayar gerekmez.

- **Görevlerde tarih aralığı:** "Aralık" ile görev bir başlangıç–bitiş aralığına yayılır; takvimde aralığın her gününde görünür.
- **Kurumsal "Ekleyen":** görev, pano kartı, gelir/gider ve müşteri ödemelerinde kimin eklediği görünür (sunucu kaydeder, değiştirilemez).
- **Canlı bildirimler:** ekip arkadaşının eklediği görev, ödeme, not vb. anında bildirim ve uyarı olarak düşer; gecikme/hatırlatmalar
  sayfa yenilemeden güncellenir. Ayarlar › Tercihler › *Masaüstü bildirimleri* açılırsa uygulama arka plandayken Windows bildirimi de gelir.
  Bireysel hesaplarda da diğer cihazlardaki değişiklikler anında görünür.
- **Telefon bildirimleri (Web Push):** Ayarlar › Tercihler › *Telefon ve bilgisayar bildirimleri* açılan cihaza, uygulama kapalıyken
  de bildirim gelir: ekibin eklediği görev/ödeme/not ve gecikmiş görev, bugünkü etkinlik, vadesi geçen işlem hatırlatmaları
  (08:00–22:00 arası, her biri bir kez). Ayar gerekmez: sunucu anahtarı ilk kullanımda `/var/lib/lrdocument/vapid-keys.json`
  olarak oluşur; **bu dosyayı silmeyin**, silinirse cihazların bildirimi yeniden açması gerekir. Sunucunun dışarıya 443 (HTTPS)
  portundan çıkabilmesi yeterli. iPhone'da bildirim için site önce Safari › Paylaş › *Ana Ekrana Ekle* ile yüklenmelidir (iOS 16.4+).
  **Test:** Yönetici Paneli › Varsayılanlar › *Bildirimler* › önce "Bu cihazda bildirimleri aç", sonra **Bana test bildirimi gönder**.
  Aynı yerde kayıtlı cihaz sayısı, son başarılı gönderim/hata ve "Hatırlatmaları şimdi çalıştır" düğmesi var.
- **Windows uygulaması (PWA):** Edge/Chrome adres çubuğundaki "Uygulamayı yükle" ile kurulur (Ayarlar › Tercihler › Uygulama).
  Yükleme için sitenin **HTTPS** ile açılması gerekir.
- **Notlar** doğrudan editörde açılır (Bölünmüş/Önizleme bir tık uzakta).
- **Döviz kur marjı** varsayılanı **0 TL**. Kullanıcı isterse Ayarlar › Tercihler › Döviz'den açar. Eski 2,50 TL varsayılanı ilk açılışta bir kez 0'a çekilir.

---

## Bu güncellemede gelenler (üniversiteler, talepler, öğrenci e-postası)

Veritabanına yeni tablolar ve boş alanlar eklenir; mevcut veriler değişmez. Ek bir ayar gerekmez.

- **Üniversiteler:** Türkiye'deki 205 üniversite listede. Öğrenci okulunu listeden seçer.
  Yönetici Paneli › **Üniversiteler** sekmesinde bir okulun akademik takvimini bir kez yayınlayın
  (takvim PDF'ini okutarak ya da elle). O okulun bütün öğrencilerinin ders takibine dönem tarihleri,
  sınav haftaları ve tatiller otomatik eklenir; öğrenciler yalnızca ders programlarını girer.
  Öğrenciler kendi yükledikleri takvimi "Okulum için öner" ile gönderebilir; bu öneri Talepler'e düşer.
- **Hazır takvimler:** 20 üniversitenin (KTÜ, Trabzon Üniversitesi, Avrasya, ODTÜ, İTÜ, Boğaziçi, Hacettepe, Ankara, İstanbul,
  Gazi, Ege, DEÜ, YTÜ, Marmara, Atatürk, Selçuk, Çukurova, Uludağ, OMÜ, ÇOMÜ) resmî 2026-2027 takvimleri
  `data/akademik-takvimler/` klasöründe. Güncellemeden sonra ilk kullanımda kendiliğinden yayınlanır;
  panelde "hazır" etiketiyle görünür. Düzenlediğiniz ya da kaldırdığınız takvim bir daha üzerine yazılmaz.
- **Talepler:** Ayarlar › Destek'ten gelen istek, öneri ve hata bildirimleri ile öğrencilerin
  bireysel hesaba geçiş talepleri Yönetici Paneli › **Talepler** sekmesinde. Sonuçlandırdığınızda
  (notunuzla birlikte) kullanıcıya e-posta gider.
- **Hesap onayı e-postası:** Bekleyen bir hesabı onayladığınızda kullanıcıya otomatik
  "Hesabınız onaylandı" e-postası gönderilir.
- **Öğrenci e-postasıyla giriş:** Öğrenciler Ayarlar › Güvenlik'te öğrenci e-postalarını kodla
  doğrular; sonra o adresle de giriş yapabilir ve şifre sıfırlayabilir.
- **Yönetici hesabı** artık bireysel hesapla aynı bölümleri görür (Ders Takibi yalnızca öğrenci
  hesaplarında). Ders takibini denemek isterseniz kendi hesap türünüzü Öğrenci yapabilirsiniz.

---

## Önceki güncellemede gelenler

### E-posta doğrulama: ayar gerekmez

- Doğrulama, şifre sıfırlama ve öğrenci kodları **hiçbir e-posta hizmeti kurmadan** gönderilir:
  sunucu iletiyi doğrudan alıcının posta sunucusuna (Gmail, Outlook…) teslim eder.
- Gönderen adres otomatik olarak `no-reply@alanadiniz` olur.
- **İlk iş:** Yönetici Paneli › Varsayılanlar › *E-posta gönderimi* › **Bana test e-postası gönder**.
  - E-posta geldiyse her şey hazır; spam klasörüne de bakın.
  - "25 numaralı çıkış portu kapalı olabilir" hatası alırsanız sunucu firmanız e-posta portunu
    engelliyordur. Birçok VPS firması (DigitalOcean, Hetzner, AWS…) bunu varsayılan olarak yapar;
    panelden ya da destek talebiyle açtırabilirsiniz.
  - Port açılana kadar: Varsayılanlar › Güvenlik › *Girişte e-posta doğrulaması zorunlu* → **Kapalı**.
    Bunu yapmazsanız doğrulanmamış kullanıcılar giriş yapamaz. Kayıt bekleyen kullanıcıları listede
    **Doğrulanmış say** ile onaylayabilirsiniz.
- **İsteğe bağlı, spam'e düşmeyi azaltır:** aynı paneldeki üç TXT kaydını (SPF, DKIM, DMARC) alan
  adınızın DNS ayarlarına ekleyin.
- **İsteğe bağlı:** kendi e-posta sunucunuzu kullanmak isterseniz `.env` dosyasına
  `SMTP_URL="smtps://kullanici:sifre@smtp.ornek.com"` ekleyin.
- DKIM anahtarı ilk gönderimde `/var/lib/lrdocument/dkim-private.pem` olarak oluşur. Bu dosyayı
  silmeyin; silerseniz DNS'teki DKIM kaydının yenilenmesi gerekir.

### Mevcut kullanıcılar

E-postası henüz doğrulanmamış kullanıcılar ilk girişte e-postalarına gelen 6 haneli kodu girer.
Bu bir kez yapılır. Yöneticiler bundan muaftır.

### Güvenlik değişikliği: uygulama yalnızca 127.0.0.1'i dinler

- Betik PM2 sürecini bu sürümde **bir kez silip yeniden oluşturur** (`-H 127.0.0.1`).
- Böylece 3000 portu internete açık kalmaz; site yalnızca nginx/HTTPS üzerinden açılır.
- nginx yapılandırmanız `proxy_pass http://127.0.0.1:3000;` ise başka bir şey yapmanız gerekmez.
- Siteyi nginx olmadan `http://IP:3000` ile açıyorsanız betiği şöyle çalıştırın:

```bash
BIND_HOST=0.0.0.0 bash /var/www/LrDocument/scripts/update.sh
```

### SEO

- `https://alanadiniz/sitemap.xml` ve `/robots.txt` otomatik üretilir.
- Google Search Console'a sitenizi ekleyip sitemap adresini bildirin.
- Arama sonuçlarındaki başlık ve açıklamayı Yönetici Paneli › Açılış sayfası › *Arama motorları (SEO)*
  bölümünden değiştirebilirsiniz.
- Sunucu adı otomatik algılanır. İsterseniz `.env` dosyasına `SITE_URL="https://alanadiniz.com"` ekleyin.

### Yasal metinler

Yönetici Paneli › Açılış sayfası › *Yasal metinler* bölümünde **veri sorumlusu**, **iletişim e-postası**
ve **satıcı bilgileri** (unvan, adres, vergi no) alanlarını doldurun. Bunlar KVKK ve mesafeli satış
metinlerinde yasal olarak gereklidir.

---

## Eski kurulumdan ilk geçiş (yalnızca v1.3.0'dan geliyorsanız)

Eski sürümde veritabanı (`prisma/dev.db`) git deposunun içindeydi. Düz `git pull` canlı veritabanını
silebileceği için ilk geçişi betiğin en yeni hâliyle yapın:

```bash
cd /var/www/LrDocument
sudo apt install -y sqlite3
git fetch origin master
git show origin/master:scripts/update.sh > /tmp/lrdocument-update.sh
bash /tmp/lrdocument-update.sh
```

---

## Git kullanmıyorsanız (SCP ile yükleme)

Yeni dosyaları yüklemeden **önce** sunucuda betiği çalıştırarak veritabanını taşıyın; aksi halde
bilgisayarınızdaki `prisma/dev.db` sunucudakinin üzerine yazılabilir.

```bash
# 1) Sunucuda: veritabanını yedekleyip taşı (git olmadığı için kod adımı atlanır,
#    eski kodla yeniden derlenir ve uygulama yeniden başlar)
bash /tmp/lrdocument-update.sh      # betiği önce scp ile /tmp altına kopyalayın
```

```powershell
# 2) Bilgisayarınızda: node_modules, .next, .env ve prisma/dev.db HARİÇ dosyaları yükleyin
scp -r src public scripts prisma/schema.prisma package.json package-lock.json next.config.ts `
  tsconfig.json postcss.config.mjs eslint.config.mjs root@SUNUCU_IP_ADRESINIZ:/var/www/LrDocument/
```

`prisma/schema.prisma` dosyasını sunucuda `prisma/` klasörüne taşıyın, sonra betiği tekrar çalıştırın:

```bash
bash /var/www/LrDocument/scripts/update.sh
```

---

## Yönetici e-postasını / şifresini terminalden değiştirme

`.env` içindeki `ADMIN_EMAIL` / `ADMIN_PASSWORD` yalnızca hiç yönetici yokken (ilk kurulumda) kullanılır;
sonradan değiştirmek bir şey yapmaz. Sunucuda:

```bash
cd /var/www/LrDocument
```

```bash
read -p "Yeni e-posta (aynı kalsın: Enter): " NEW_EMAIL && read -s -p "Yeni şifre (aynı kalsın: Enter): " NEW_PASS && echo && NEW_EMAIL="$NEW_EMAIL" NEW_PASS="$NEW_PASS" node -e 'const {PrismaClient}=require("@prisma/client");const b=require("bcryptjs");const p=new PrismaClient();(async()=>{const a=await p.user.findFirst({where:{role:"ADMIN"},orderBy:{createdAt:"asc"}});if(!a)throw new Error("Yönetici bulunamadı");const d={sessionVersion:{increment:1}};const e=(process.env.NEW_EMAIL||"").trim().toLowerCase();if(e){d.email=e;d.emailVerifiedAt=new Date()}const pw=process.env.NEW_PASS||"";if(pw){if(pw.length<8)throw new Error("Şifre en az 8 karakter olmalı");d.passwordHash=await b.hash(pw,12)}await p.user.update({where:{id:a.id},data:d});console.log("Güncellendi:",a.email,"->",d.email||a.email)})().catch(e=>{console.error("Hata:",e.message);process.exitCode=1}).finally(()=>p.$disconnect())'
```

Komut ilk oluşturulan yönetici hesabını günceller; şifre ekranda görünmez ve komut geçmişine yazılmaz.
Yöneticinin açık oturumları kapanır. E-posta çalışıyorsa giriş sayfasındaki **Şifremi unuttum** da kullanılabilir.

---

## Sorun giderme

| Belirti | Çözüm |
|---|---|
| Betik "kaydedilmemiş kod değişiklikleri var" diyor | `git status` ile sunucuda elle değiştirilen dosyaları görün. Gerekmiyorsa `git checkout -- <dosya>` ile geri alın ve betiği tekrar çalıştırın. |
| Derleme bellek hatası veriyor | `LRION_KURULUM_REHBERI.md` içindeki swap adımını uygulayın. |
| Uygulama açılmıyor | `pm2 logs PM2_ADI --lines 100`. Üretimde `JWT_SECRET` 32 karakterden kısaysa uygulama bilerek başlamaz. |
| Güncelleme yarıda kaldı | Veriler yedektedir. `pm2 restart PM2_ADI` ile önceki derlemeyle devam edip sorunu giderdikten sonra betiği tekrar çalıştırın. |
| Yedekten geri dönmek | `pm2 stop PM2_ADI && gunzip -c /var/lib/lrdocument/backups/lrdocument-TARIH.db.gz > /var/lib/lrdocument/prod.db && pm2 start PM2_ADI` (eski `.db` yedekleri için `gunzip -c` yerine `cp`) |
| Giriş denemeleri engellendi | Güvenlik için aynı e-postaya 15 dakikada 8, aynı IP'den 20 hatalı deneme sınırı var (kurumsal kod: IP başına 10); süre dolunca açılır veya `pm2 restart PM2_ADI` ile sıfırlanır. |
| Doğrulama e-postası gelmiyor | Yönetici Paneli › Varsayılanlar › E-posta gönderimi'nde son hatayı görün. Port 25 kapalıysa sunucu firmanızdan açtırın veya `SMTP_URL` tanımlayın; bu sırada girişte e-posta doğrulamasını kapatabilirsiniz. |
| Kullanıcı telefonunu kaybetti (iki adımlı doğrulama) | Kurtarma kodlarından biriyle girebilir. Kodları da yoksa Yönetici Paneli › Kullanıcılar › **2 adımlı › Sıfırla**. |
| Güncellemeden sonra site açılmıyor ama `pm2 list` "online" | nginx `proxy_pass` adresinin `http://127.0.0.1:3000` olduğunu kontrol edin (`sudo nginx -t && sudo systemctl reload nginx`). |

Betik her çalışmada son 20 yedeği `/var/lib/lrdocument/backups/` altında tutar.
