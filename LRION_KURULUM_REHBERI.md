# 🚀 lrion.com.tr — Canlıya Alma ve Kurulum Rehberi (VPS / Nginx / PM2 / SSL)

Bu rehber, **LrDocument** projenizi **`lrion.com.tr`** ve **`www.lrion.com.tr`** domain adreslerinizle bir Linux VPS (Ubuntu 22.04 / 24.04 LTS) üzerinde **7/24 kesintisiz, güvenli (HTTPS/SSL), yüksek performanslı ve otomatik yeniden başlama** desteğiyle nasıl yayına alacağınızı adım adım anlatmaktadır.

---

## 📌 İçindekiler
1. [1. Adım: DNS (Alan Adı) Yönlendirme Ayarları](#1-adım-dns-alan-adı-yönlendirme-ayarları)
2. [2. Adım: Sunucu Hazırlığı ve Gerekli Paketlerin Kurulumu](#2-adım-sunucu-hazırlığı-ve-gerekli-paketlerin-kurulumu)
3. [3. Adım: Proje Kodlarının Sunucuya Aktarılması ve .env Ayarları](#3-adım-proje-kodlarının-sunucuya-aktarılması-ve-env-ayarları)
4. [4. Adım: Veritabanı (Prisma) ve Next.js Derlemesi](#4-adım-veritabanı-prisma-ve-nextjs-derlemesi)
5. [5. Adım: PM2 ile Uygulamayı 7/24 Arka Planda Başlatma](#5-adım-pm2-ile-uygulamayı-724-arka-planda-başlatma)
6. [6. Adım: Nginx Web Sunucusu ve Reverse Proxy Yapılandırması](#6-adım-nginx-web-sunucusu-ve-reverse-proxy-yapılandırması)
7. [7. Adım: Ücretsiz Let's Encrypt SSL (HTTPS) Kurulumu](#7-adım-ücretsiz-lets-encrypt-ssl-https-kurulumu)
8. [8. Adım: Sunucu Güvenliği (UFW Firewall)](#8-adım-sunucu-güvenliği-ufw-firewall)
9. [9. Adım: Tek Komutla Otomatik Güncelleme Scripti (update.sh)](#9-adım-tek-komutla-otomatik-güncelleme-scripti-updatesh)
10. [10. Sorun Giderme (Troubleshooting)](#10-sorun-giderme-troubleshooting)

---

## 1. Adım: DNS (Alan Adı) Yönlendirme Ayarları

Domain adresinizin bağlı olduğu yönetim panelinde (Natro, Turhost, İsimTescil, Metunic, Cloudflare vb.) DNS Yönetimi sayfasına gidin ve aşağıdaki kayıtları ekleyin:

| Kayıt Tipi (Type) | İsim / Host (Name) | Değer / Hedef (Value/Target) | TTL |
| :--- | :--- | :--- | :--- |
| **A** | `@` (veya `lrion.com.tr`) | `SUNUCU_IP_ADRESINIZ` | 300 (veya Otomatik) |
| **A** | `www` (veya `www.lrion.com.tr`) | `SUNUCU_IP_ADRESINIZ` | 300 (veya Otomatik) |

> 💡 **Cloudflare Kullanıyorsanız:**  
> Başlangıç aşamasında SSL sertifikasını doğrudan sunucunuzda (Certbot ile) üretebilmek için Cloudflare DNS sekmesinde bulut simgesini **Gri (DNS Only / Proxy Kapalı)** yapın. SSL kurulumundan sonra isterseniz tekrar Turuncu (Proxied) yapabilirsiniz.

DNS yönlendirmesinin yapıldığını kendi bilgisayarınızın terminalinden kontrol edebilirsiniz:
```bash
ping lrion.com.tr
# veya
nslookup lrion.com.tr
```

---

## 2. Adım: Sunucu Hazırlığı ve Gerekli Paketlerin Kurulumu

### 2.1. Sunucuya SSH ile Bağlanın
```bash
ssh root@SUNUCU_IP_ADRESINIZ
```

### 2.2. Paket Listesini Güncelleyin ve Temel Araçları Yükleyin
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential ufw nginx certbot python3-certbot-nginx
```

### 2.3. Node.js 20 LTS ve npm Kurulumu
```bash
# NodeSource 20.x deposunu ekleyin
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.js kurulumunu yapın
sudo apt install -y nodejs

# Sürümleri kontrol edin (Node v20+ ve npm v10+ görmelisiniz)
node -v
npm -v
```

### 2.4. PM2 Süreç Yöneticisi Kurulumu
```bash
sudo npm install -g pm2
```

---

## 3. Adım: Proje Kodlarının Sunucuya Aktarılması ve .env Ayarları

### 3.1. Proje Dizinini Oluşturun
```bash
sudo mkdir -p /var/www/lrion
sudo chown -R $USER:$USER /var/www/lrion
cd /var/www/lrion
```

### 3.2. Kodları Sunucuya Yükleyin

#### Seçenek A: Git / GitHub ile İndirme (Önerilen)
```bash
git clone https://github.com/KULLANICI_ADI/REPO_ADI.git .
```

#### Seçenek B: Kendi Bilgisayarınızdan SCP ile Yükleme
Kendi bilgisayarınızda PowerShell veya Terminal açarak proje klasörünüzü sunucuya kopyalayın:
```powershell
# Kendi bilgisayarınızın terminalinde çalıştırın (node_modules ve .next hariç tutulabilir):
scp -r "c:\Users\monster\Desktop\Yazılım\projeler\LrDocument\*" root@SUNUCU_IP_ADRESINIZ:/var/www/lrion/
```

### 3.3. Üretim `.env` Dosyasını Oluşturun
Sunucuda `/var/www/lrion` dizinindeyken:
```bash
nano .env
```

Aşağıdaki yapılandırmayı yapıştırın (`Ctrl + O` ile kaydedin, `Enter`'a basın, `Ctrl + X` ile çıkın):

```env
# Veritabanı & Güvenlik
DATABASE_URL="file:./dev.db"
# Kendi anahtarınızı üretin: openssl rand -base64 48  (en az 32 karakter, zorunlu)
JWT_SECRET="BURAYA_OPENSSL_ILE_URETILEN_ANAHTAR"

# İlk yönetici hesabı (veritabanında hiç ADMIN yoksa oluşturulur)
ADMIN_EMAIL="admin@lrion.com.tr"
ADMIN_PASSWORD="GUCLU_BIR_SIFRE"

# Canlı Döviz Kuru API
NEXT_PUBLIC_EXCHANGE_RATE_API_URL=https://open.er-api.com/v6/latest/USD

# Uygulama ve Domain Bilgileri
NEXT_PUBLIC_APP_NAME="LrDocument"
NEXT_PUBLIC_DEFAULT_CURRENCY=TRY
APP_URL="https://lrion.com.tr"
NEXT_PUBLIC_APP_URL="https://lrion.com.tr"
```

---

## 4. Adım: Veritabanı (Prisma) ve Next.js Derlemesi

`/var/www/lrion` dizininde aşağıdaki komutları sırasıyla çalıştırın:

```bash
cd /var/www/lrion

# 1. Bağımlılıkları yükleyin
npm install

# 2. Prisma istemcisini oluşturun ve SQLite tablolarını senkronize edin
npx prisma generate
npx prisma db push

# 3. Next.js üretim derlemesini (build) alın
npm run build
```

> ⚠️ **RAM Uyarısı:** Eğer sunucunuz 1 GB veya 2 GB RAM'e sahipse, `npm run build` sırasında bellek yetersizliği yaşamamak için swap alanı oluşturmanız önerilir:
> ```bash
> sudo fallocate -l 2G /swapfile
> sudo chmod 600 /swapfile
> sudo mkswap /swapfile
> sudo swapon /swapfile
> echo '/swapfile none swap sw 0 0' | sudo tee -a /etc/fstab
> ```

---

## 5. Adım: PM2 ile Uygulamayı 7/24 Arka Planda Başlatma

Uygulamanın çökmesi durumunda otomatik yeniden başlaması ve sunucu yeniden başlatıldığında kendiliğinden açılması için PM2'yi yapılandırıyoruz:

```bash
cd /var/www/lrion

# Uygulamayı 3000 portunda PM2 ile başlatın
pm2 start npm --name "lrion" -- start -- -p 3000

# Sunucu açılışında otomatik başlama ayarını yapın
pm2 startup
# (Terminalde size verilen komutu kopyalayıp çalıştırın)

# Mevcut PM2 durumunu kaydedin
pm2 save
```

### PM2 Kontrol Komutları:
```bash
pm2 status             # Çalışma durumunu listeler
pm2 logs lrion         # Canlı uygulama loglarını gösterir
pm2 restart lrion      # Uygulamayı yeniden başlatır
pm2 stop lrion         # Uygulamayı durdurur
```

---

## 6. Adım: Nginx Web Sunucusu ve Reverse Proxy Yapılandırması

Kullanıcıların `lrion.com.tr` yazdıklarında arka plandaki 3000 portuna yönlendirilmesi için Nginx yapılandırması oluşturuyoruz:

```bash
sudo nano /etc/nginx/sites-available/lrion.com.tr
```

Aşağıdaki yapılandırmayı yapıştırın:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name lrion.com.tr www.lrion.com.tr;

    # Dosya yükleme boyut limiti (PDF, görsel vb. için)
    client_max_body_size 50M;

    # Gzip sıkıştırma optimizasyonu
    gzip on;
    gzip_types text/plain text/css application/json application/javascript text/xml application/xml application/xml+rss text/javascript;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        
        # WebSocket & Header Desteği
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        
        # Kullanıcı Gerçek IP ve Protokol Bilgileri
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        
        # Zaman aşımı limitleri
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }
}
```

Yapılandırmayı aktif hale getirin ve Nginx'i test edip yeniden başlatın:
```bash
# Sitenin linkini etkinleştirilenler klasörüne ekleyin
sudo ln -s /etc/nginx/sites-available/lrion.com.tr /etc/nginx/sites-enabled/

# Varsa varsayılan Nginx sayfasını kaldırın
sudo rm -f /etc/nginx/sites-enabled/default

# Sözdizimi hatası var mı kontrol edin
sudo nginx -t

# Nginx servisini yeniden başlatın
sudo systemctl restart nginx
```

---

## 7. Adım: Ücretsiz Let's Encrypt SSL (HTTPS) Kurulumu

Domain DNS yönlendirmeniz tamamlandıysa, Let's Encrypt Certbot ile tek komutla SSL sertifikanızı kurun:

```bash
sudo certbot --nginx -d lrion.com.tr -d www.lrion.com.tr
```

* E-posta adresinizi girin ve şartları onaylayın (`Y`).
* Certbot Nginx dosyanızı otomatik olarak HTTPS (Port 443) ve HTTP->HTTPS yönlendirmesiyle güncelleyecektir.

### SSL Otomatik Yenileme Testi:
Let's Encrypt sertifikaları 90 günlüktür ve Certbot arka planda otomatik yeniler. Yenilemenin sorunsuz çalıştığını doğrulamak için:
```bash
sudo certbot renew --dry-run
```

---

## 8. Adım: Sunucu Güvenliği (UFW Firewall)

Sunucunuzun sadece gerekli portlara açık olması için güvenlik duvarını aktif edin:

```bash
# SSH bağlantısını açık bırakın (Çok Önemli!)
sudo ufw allow OpenSSH

# HTTP ve HTTPS portlarını açın
sudo ufw allow 'Nginx Full'

# Güvenlik duvarını etkinleştirin
sudo ufw --force enable

# Durumu kontrol edin
sudo ufw status
```

---

## 9. Adım: Tek Komutla Otomatik Güncelleme Scripti (update.sh)

Güncelleme betiği artık depoda: `scripts/update.sh`. Yedek alır, veritabanını proje klasörü dışında
(`/var/lib/lrion/prod.db`) tutar, kodu `master` dalından çeker, derler ve PM2'yi yeniden başlatır.

```bash
bash /var/www/lrion/scripts/update.sh
```

> Eski (v1.3.0) bir kurulumu ilk kez güncelliyorsanız önce **SUNUCU_GUNCELLEME.md** dosyasındaki
> "ilk güncelleme" adımlarını izleyin.

---

## 10. Sorun Giderme (Troubleshooting)

### ❓ 1. Sitede "502 Bad Gateway" Hatası Alıyorum
* **Neden:** PM2 üzerinde Next.js uygulaması çalışmıyor veya çökmüş olabilir.
* **Çözüm:**
  ```bash
  pm2 status
  pm2 logs lrion --lines 50
  ```
  Eğer hata veriyorsa `npm run build` adımının başarıyla tamamlandığından ve `.env` dosyasının doğruluğundan emin olun.

### ❓ 2. SQLite Veritabanı Yazma Hatası (EACCES / Permission Denied)
* **Neden:** `dev.db` dosyasına veya `prisma` klasörüne yazma izni verilmemiş olabilir.
* **Çözüm:**
  ```bash
  sudo chown -R $USER:$USER /var/www/lrion/prisma
  chmod 664 /var/www/lrion/prisma/dev.db
  ```

### ❓ 3. SSL Sertifikası Alırken Hata (Certbot Failed)
* **Neden:** DNS A kaydı henüz yayılmamış veya sunucu IP'nizle eşleşmiyor olabilir.
* **Çözüm:** `ping lrion.com.tr` komutuyla sunucunuzun IP adresinin döndüğünden emin olun. Port 80'in firewall tarafından engellenmediğini (`sudo ufw status`) kontrol edin.

---

## 🎉 Tebrikler!
Artık **`https://lrion.com.tr`** ve **`https://www.lrion.com.tr`** adresleriniz 7/24 kesintisiz, SSL güvenliğiyle ve tam performansla yayındadır!
