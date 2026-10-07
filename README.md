# LrDocument — VPS Sunucu Gereksinimleri ve Canlıya Alma (Deployment) Rehberi

Bu rehber, **LrDocument** uygulamasını herhangi bir VPS (Sanal Özel Sunucu) üzerinde 7/24 kesintisiz, güvenli (HTTPS/SSL), yüksek performanslı ve otomatik yeniden başlama (PM2 + Nginx) desteğiyle nasıl yayına alacağınızı adım adım açıklamaktadır.

---

## 1. VPS Sunucu Donanım & Sistem Gereksinimleri

LrDocument; **Next.js 16 (App Router)**, **React 19**, **KaTeX** ve **TailwindCSS** mimarisi üzerine kurulu hafif ve hızlı bir web uygulamasıdır.

### 💻 Tavsiye Edilen Sunucu Tipleri
* **Minimum Gereksinim (Düşük Trafik / Tek Kullanıcı):**
  * **İşlemci (CPU):** 2 vCPU
  * **Bellek (RAM):** 2 GB RAM (Derleme sırasında swap desteği önerilir)
  * **Disk:** 15 GB SSD / NVMe
  * **Bant Genişliği:** 1 TB Trafik
* **Önerilen / İdeal Yapılandırma:**
  * **İşlemci (CPU):** 3 vCPU
  * **Bellek (RAM):** 3 GB veya 4 GB RAM
  * **Disk:** 25 GB - 50 GB NVMe SSD
  * **İşletim Sistemi:** **Ubuntu 24.04 LTS** veya **Ubuntu 22.04 LTS** (veya Debian 12)

---

## 2. Sıfırdan Adım Adım VPS Kurulum Rehberi

### 1. Adım: Sunucuya SSH ile Bağlanma ve Güncelleme
Terminalinizden (PowerShell, macOS Terminal veya PuTTY) sunucunuza bağlanın:

```bash
ssh root@SUNUCU_IP_ADRESINIZ
```

Sunucu paket listesini güncelleyin ve temel araçları yükleyin:
```bash
sudo apt update && sudo apt upgrade -y
sudo apt install -y curl wget git build-essential ufw
```

---

### 2. Adım: Node.js (v20+ LTS) Kurulumu
NodeSource resmi deposu üzerinden en güncel Node.js LTS sürümünü kurun:

```bash
# NodeSource deposunu ekleyin
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -

# Node.js ve npm kurulumunu yapın
sudo apt install -y nodejs

# Versiyonları doğrulayın (Node v20+ ve npm v10+ görmelisiniz)
node -v
npm -v
```

---

### 3. Adım: PM2 Süreç Yöneticisi Kurulumu
Uygulamanın sunucu çökse veya yeniden başlasa bile 7/24 arka planda çalışması için **PM2** kuruyoruz:

```bash
sudo npm install -g pm2
```

---

### 4. Adım: Projeyi Sunucuya İndirme / Aktarma
Projeyi barındırmak için `/var/www` altında bir dizin oluşturalım:

```bash
sudo mkdir -p /var/www/lrdocument
cd /var/www/lrdocument

# GitHub / Gitlab üzerinden çekmek için:
git clone https://github.com/KULLANICI_ADI/REPO_ADI.git .

# VEYA yerel bilgisayarınızdan dosyaları sunucuya kopyalamak için (Kendi bilgisayarınızın terminalinde çalıştırın):
# scp -r c:/Users/monster/Desktop/MyApp/* root@SUNUCU_IP_ADRESINIZ:/var/www/lrdocument/
```

---

### 5. Adım: Çevre Değişkenleri (.env) ve Derleme
Proje klasöründeyken bağımlılıkları yükleyin ve üretim derlemesini alın:

```bash
cd /var/www/lrdocument

# .env dosyasını oluşturun (Prisma yalnızca .env dosyasını okur)
cp .env.example .env

# JWT_SECRET için güçlü bir anahtar üretip .env içine yazın (zorunlu)
openssl rand -base64 48

# İlk yönetici hesabı için ADMIN_EMAIL ve ADMIN_PASSWORD değerlerini .env içinde doldurun

# Bağımlılıkları kurun ve veritabanı şemasını uygulayın
npm install
npx prisma generate
npx prisma db push

# Next.js üretim derlemesini yapın
npm run build
```

---

### 6. Adım: PM2 ile Uygulamayı Canlıya Alma
Derlenen uygulamayı PM2 üzerinden başlatalım ve sunucu yeniden başladığında otomatik açılması için kaydedelim:

```bash
# Uygulamayı 3000 portunda başlatın
pm2 start npm --name "lrdocument" -- start -- -p 3000

# PM2 başlangıç ayarını yapın ve kaydedin
pm2 startup
pm2 save
```

PM2 durumu ve logları kontrol etmek için:
```bash
pm2 status
pm2 logs lrdocument
```

---

### 7. Adım: Nginx Web Sunucusu ve Reverse Proxy Kurulumu
Kullanıcıların doğrudan IP veya Domain adresiyle (Port 80/443) erişebilmesi için Nginx kuralım:

```bash
sudo apt install -y nginx
```

Nginx yapılandırma dosyasını oluşturun:
```bash
sudo nano /etc/nginx/sites-available/lrdocument
```

Aşağıdaki içeriği yapıştırın (Eğer bir alan adınız varsa `alanadiniz.com` yazın, yoksa sunucu IP adresinizi yazabilirsiniz):

```nginx
server {
    listen 80;
    server_name alanadiniz.com www.alanadiniz.com; # veya sunucu IP adresi

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_cache_bypass $http_upgrade;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Yapılandırmayı etkinleştirin ve Nginx'i yeniden başlatın:
```bash
sudo ln -s /etc/nginx/sites-available/lrdocument /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

---

### 8. Adım: Ücretsiz SSL (HTTPS) Sertifikası Kurulumu (Certbot)
Domain adınız sunucu IP'nize yönlendirilmişse, Let's Encrypt ile 1 dakikada ücretsiz SSL kurabilirsiniz:

```bash
sudo apt install -y certbot python3-certbot-nginx
sudo certbot --nginx -d alanadiniz.com -d www.alanadiniz.com
```
*(Certbot SSL sertifikanızı otomatik yenileyecek şekilde ayarlar.)*

---

### 9. Adım: Güvenlik Duvarı (UFW Firewall) Açma
Sunucu güvenliği için yalnızca SSH, HTTP ve HTTPS portlarını açık bırakın:

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw enable
sudo ufw status
```

---

## 3. Güncelleme & Sürüm Yenileme Scripti

Gelecekte kodlarınızda bir değişiklik yaptığınızda VPS sunucunuzu tek komutla güncellemek için `/var/www/lrdocument/update.sh` dosyası oluşturabilirsiniz:

```bash
#!/bin/bash
echo "🚀 LrDocument güncelleniyor..."
cd /var/www/lrdocument
git pull origin main
npm install
npm run build
pm2 restart lrdocument
echo "✅ Güncelleme tamamlandı ve uygulama yeniden başlatıldı!"
```

Çalıştırma izni vermek için:
```bash
chmod +x /var/www/lrdocument/update.sh
```

---

## 4. Özet Kontrol Listesi
| Kontrol Adımı | Durum | Komut |
| :--- | :--- | :--- |
| **Node.js 20+** | Kurulu | `node -v` |
| **Next.js Derlemesi** | Başarılı | `npm run build` |
| **PM2 Servisi** | Aktif | `pm2 status` |
| **Nginx Reverse Proxy** | Aktif | `systemctl status nginx` |
| **HTTPS / SSL** | Güvenli | Certbot Let's Encrypt |
