# Sunucudaki Kurulumu Güncelleme Rehberi

Bu rehber, sunucuda **ilk sürümü** (v1.3.0) çalışan LrDocument kurulumunu verileri kaybetmeden
yeni sürüme (güvenlik düzeltmeleri + yeni tasarım) geçirmek içindir.

Varsayılan kurulum: `/var/www/lrion`, PM2 süreç adı `lrion`, port `3000`
(`LRION_KURULUM_REHBERI.md` ile aynı). Farklıysa komutlardaki değerleri değiştirin.

> **Neden özel bir adım gerekiyor?** Eski sürümde veritabanı (`prisma/dev.db`) git deposunun içinde
> izleniyordu. Yeni sürümde veritabanı depodan çıkarıldı. Sunucuda düz bir `git pull` yaparsanız
> **canlı veritabanınız silinebilir**. `scripts/update.sh` betiği önce yedek alır, veritabanını
> `/var/lib/lrion/prod.db` konumuna taşır, sonra kodu günceller. Bu yüzden ilk güncellemeyi
> mutlaka aşağıdaki yolla yapın.

---

## 0. Bilgisayarınızda: kodu GitHub'a gönderin

```bash
git add -A
git commit -m "v2.0.0: güvenlik düzeltmeleri ve sade tasarım"
git push origin master
```

---

## 1. Sunucuda: ilk güncelleme (bir kez)

```bash
ssh root@SUNUCU_IP_ADRESINIZ
cd /var/www/lrion

# (önerilir) sqlite3 kurulu olsun: çalışan veritabanından tutarlı yedek alır
sudo apt install -y sqlite3

# Yeni betiği, sunucudaki kodu henüz değiştirmeden indirin ve çalıştırın
git fetch origin master
git show origin/master:scripts/update.sh > /tmp/lrdocument-update.sh
bash /tmp/lrdocument-update.sh
```

Betik sırasıyla şunları yapar ve her adımı ekrana yazar:

| Adım | İşlem |
|---|---|
| 1 | Veritabanını `/var/lib/lrion/backups/` altına zaman damgalı olarak yedekler |
| 2 | `prisma/dev.db` dosyasını `/var/lib/lrion/prod.db` konumuna taşır ve `.env` içindeki `DATABASE_URL` değerini günceller |
| 3 | `JWT_SECRET` eski/zayıfsa yeni, güçlü bir anahtar üretir |
| 4 | Kodu `master` dalından çeker |
| 5 | `npm ci`, `prisma generate`, `prisma db push` (yeni `sessionVersion` kolonu) ve `npm run build` |
| 6 | PM2'yi yeniden başlatır ve uygulamanın yanıt verdiğini kontrol eder |

Uygulama 2. adımdan derleme bitene kadar (genelde 1–3 dakika) kapalı kalır.

### Güncellemeden hemen sonra

1. **Tüm kullanıcılar bir kez yeniden giriş yapacak** (JWT anahtarı değiştiği için).
2. **Yönetici şifresini değiştirin:** `admin@lrdocument.com` hesabının eski şifresi kodun içinde
   açıkça yazılıydı. Giriş yapın → *Hesap & Güvenlik* → *Şifre Güncelleme*.
3. Sitenin açıldığını kontrol edin: `https://lrion.com.tr`

---

## 2. Sonraki güncellemeler

İlk güncellemeden sonra betik depoda olduğu için tek komut yeterli:

```bash
bash /var/www/lrion/scripts/update.sh
```

Eski rehberdeki `update.sh` dosyası `main` dalını çekiyordu; depo `master` dalını kullanıyor.
Eski dosyayı silebilirsiniz: `rm /var/www/lrion/update.sh`

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
  tsconfig.json postcss.config.mjs eslint.config.mjs root@SUNUCU_IP_ADRESINIZ:/var/www/lrion/
```

`prisma/schema.prisma` dosyasını sunucuda `prisma/` klasörüne taşıyın, sonra betiği tekrar çalıştırın:

```bash
bash /var/www/lrion/scripts/update.sh
```

---

## Sorun giderme

| Belirti | Çözüm |
|---|---|
| Betik "kaydedilmemiş kod değişiklikleri var" diyor | `git status` ile sunucuda elle değiştirilen dosyaları görün. Gerekmiyorsa `git checkout -- <dosya>` ile geri alın ve betiği tekrar çalıştırın. |
| Derleme bellek hatası veriyor | `LRION_KURULUM_REHBERI.md` içindeki swap adımını uygulayın. |
| Uygulama açılmıyor | `pm2 logs lrion --lines 100`. Üretimde `JWT_SECRET` 32 karakterden kısaysa uygulama bilerek başlamaz. |
| Güncelleme yarıda kaldı | Veriler yedektedir. `pm2 restart lrion` ile önceki derlemeyle devam edip sorunu giderdikten sonra betiği tekrar çalıştırın. |
| Yedekten geri dönmek | `pm2 stop lrion && cp /var/lib/lrion/backups/lrdocument-TARIH.db /var/lib/lrion/prod.db && pm2 start lrion` |
| Giriş denemeleri engellendi | Güvenlik için aynı e-postaya 15 dakikada 8, aynı IP'den 20 hatalı deneme sınırı var; süre dolunca açılır veya `pm2 restart lrion` ile sıfırlanır. |

Betik her çalışmada son 20 yedeği `/var/lib/lrion/backups/` altında tutar.
