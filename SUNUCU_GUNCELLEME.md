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
| Yedekten geri dönmek | `pm2 stop PM2_ADI && cp /var/lib/lrdocument/backups/lrdocument-TARIH.db /var/lib/lrdocument/prod.db && pm2 start PM2_ADI` |
| Giriş denemeleri engellendi | Güvenlik için aynı e-postaya 15 dakikada 8, aynı IP'den 20 hatalı deneme sınırı var (kurumsal kod: IP başına 10); süre dolunca açılır veya `pm2 restart PM2_ADI` ile sıfırlanır. |
| Doğrulama e-postası gelmiyor | Yönetici Paneli › Varsayılanlar › E-posta gönderimi'nde son hatayı görün. Port 25 kapalıysa sunucu firmanızdan açtırın veya `SMTP_URL` tanımlayın; bu sırada girişte e-posta doğrulamasını kapatabilirsiniz. |
| Kullanıcı telefonunu kaybetti (iki adımlı doğrulama) | Kurtarma kodlarından biriyle girebilir. Kodları da yoksa Yönetici Paneli › Kullanıcılar › **2 adımlı › Sıfırla**. |
| Güncellemeden sonra site açılmıyor ama `pm2 list` "online" | nginx `proxy_pass` adresinin `http://127.0.0.1:3000` olduğunu kontrol edin (`sudo nginx -t && sudo systemctl reload nginx`). |

Betik her çalışmada son 20 yedeği `/var/lib/lrdocument/backups/` altında tutar.
