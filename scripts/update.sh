#!/usr/bin/env bash
# =============================================================================
# LrDocument — sunucu güncelleme betiği (VPS / PM2 / SQLite)
#
# Kullanım (sunucuda):
#   bash /var/www/lrion/scripts/update.sh
#
# Varsayılanlar ortam değişkenleriyle değiştirilebilir:
#   APP_DIR=/var/www/lrion PM2_NAME=lrion BRANCH=master PORT=3000 DATA_DIR=/var/lib/lrion
#
# Ne yapar:
#   1. Veritabanının zaman damgalı yedeğini alır
#   2. Veritabanı proje klasörünün içindeyse (prisma/dev.db) onu kalıcı bir klasöre taşır,
#      böylece git güncellemeleri verinin üzerine asla yazamaz
#   3. .env içindeki JWT_SECRET zayıf/eksikse güçlü bir anahtar üretir
#   4. Kodu günceller (git varsa), bağımlılıkları kurar, şemayı uygular, derler
#   5. PM2 sürecini yeniden başlatır ve sağlık kontrolü yapar
# =============================================================================
set -euo pipefail

APP_DIR="${APP_DIR:-/var/www/lrion}"
PM2_NAME="${PM2_NAME:-lrion}"
BRANCH="${BRANCH:-master}"
PORT="${PORT:-3000}"
DATA_DIR="${DATA_DIR:-/var/lib/lrion}"
STAMP="$(date +%Y%m%d-%H%M%S)"

step() { printf '\n\033[1;32m==> %s\033[0m\n' "$*"; }
warn() { printf '\033[1;33m!!  %s\033[0m\n' "$*"; }
fail() { printf '\033[1;31mXX  %s\033[0m\n' "$*"; exit 1; }

on_error() {
  printf '\n\033[1;31mGüncelleme yarıda kaldı (satır %s).\033[0m\n' "$1"
  echo "Verileriniz güvende: yedekler $DATA_DIR/backups içinde."
  echo "Önceki sürümle devam etmek için:  pm2 restart $PM2_NAME"
  echo "Sorunu giderip betiği tekrar çalıştırabilirsiniz; adımlar tekrar çalıştırılmaya uygundur."
}
trap 'on_error $LINENO' ERR

cd "$APP_DIR" || fail "$APP_DIR bulunamadı."
[ -f .env ] || fail ".env dosyası bulunamadı ($APP_DIR/.env)."

# ---------------------------------------------------------------------------
step "1/6 Veritabanı yedekleniyor"
# ---------------------------------------------------------------------------
DB_URL="$(grep -E '^DATABASE_URL=' .env | head -1 | cut -d= -f2- | tr -d '"'"'" || true)"
[ -n "$DB_URL" ] || fail ".env içinde DATABASE_URL yok."
DB_PATH="${DB_URL#file:}"
# Prisma, göreli SQLite yollarını schema.prisma'nın bulunduğu klasöre (prisma/) göre çözer.
case "$DB_PATH" in
  /*) ;;
  *) DB_PATH="$APP_DIR/prisma/${DB_PATH#./}" ;;
esac
[ -f "$DB_PATH" ] || fail "Veritabanı dosyası bulunamadı: $DB_PATH"

mkdir -p "$DATA_DIR/backups"
BACKUP="$DATA_DIR/backups/lrdocument-$STAMP.db"
if command -v sqlite3 >/dev/null 2>&1; then
  sqlite3 "$DB_PATH" ".backup '$BACKUP'"
else
  cp "$DB_PATH" "$BACKUP"
fi
echo "Yedek: $BACKUP"
# Son 20 yedeği tut
ls -1t "$DATA_DIR"/backups/lrdocument-*.db 2>/dev/null | tail -n +21 | xargs -r rm -f

# ---------------------------------------------------------------------------
step "2/6 Veritabanı konumu kontrol ediliyor"
# ---------------------------------------------------------------------------
case "$DB_PATH" in
  "$APP_DIR"/*)
    NEW_DB="$DATA_DIR/prod.db"
    warn "Veritabanı proje klasöründe ($DB_PATH). Kalıcı konuma taşınıyor: $NEW_DB"
    pm2 stop "$PM2_NAME" >/dev/null 2>&1 || true   # taşıma sırasında yazma olmasın
    if [ -f "$NEW_DB" ]; then
      fail "$NEW_DB zaten var. Hangisinin güncel olduğunu kontrol edip .env'deki DATABASE_URL'i elle ayarlayın."
    fi
    cp "$DB_PATH" "$NEW_DB"
    sed -i "s|^DATABASE_URL=.*|DATABASE_URL=\"file:$NEW_DB\"|" .env
    DB_PATH="$NEW_DB"
    echo "DATABASE_URL güncellendi -> file:$NEW_DB"
    ;;
  *) echo "Veritabanı zaten kalıcı konumda: $DB_PATH" ;;
esac

# ---------------------------------------------------------------------------
step "3/6 Ortam değişkenleri kontrol ediliyor"
# ---------------------------------------------------------------------------
JWT="$(grep -E '^JWT_SECRET=' .env | head -1 | cut -d= -f2- | tr -d '"'"'" || true)"
case "$JWT" in
  ""|lrdocument_super_secret_jwt_key_2026_production|your_secure_jwt_secret_here|lrion_super_secure_jwt_production_secret_key_2026_x99!|BURAYA_OPENSSL_ILE_URETILEN_ANAHTAR)
    WEAK=1 ;;
  *) [ "${#JWT}" -lt 32 ] && WEAK=1 || WEAK=0 ;;
esac
if [ "$WEAK" = 1 ]; then
  NEW_SECRET="$(openssl rand -base64 48 | tr -d '\n')"
  if grep -qE '^JWT_SECRET=' .env; then
    sed -i "s|^JWT_SECRET=.*|JWT_SECRET=\"$NEW_SECRET\"|" .env
  else
    printf '\nJWT_SECRET="%s"\n' "$NEW_SECRET" >> .env
  fi
  warn "JWT_SECRET zayıftı; yeni anahtar üretildi. Tüm kullanıcılar bir kez yeniden giriş yapacak."
else
  echo "JWT_SECRET uygun."
fi
chmod 600 .env

# ---------------------------------------------------------------------------
step "4/6 Kod güncelleniyor"
# ---------------------------------------------------------------------------
if [ -d .git ]; then
  # Eski sürümlerde veritabanı git'te izleniyordu; sunucudaki kopya artık kullanılmıyor (2. adım).
  git checkout -- prisma/dev.db 2>/dev/null || true
  # `npm install` on the server often rewrites the lockfile; the repo's version is authoritative.
  git checkout -- package-lock.json 2>/dev/null || true
  git fetch origin "$BRANCH"
  git merge --ff-only "origin/$BRANCH" || fail "Sunucuda kaydedilmemiş kod değişiklikleri var. 'git status' ile kontrol edin."
  git log -1 --pretty='Sürüm: %h %s'
else
  warn "Git deposu yok; yeni dosyaların bu klasöre zaten yüklendiği varsayılıyor."
fi

# ---------------------------------------------------------------------------
step "5/6 Bağımlılıklar, veritabanı şeması ve derleme"
# ---------------------------------------------------------------------------
if [ -f package-lock.json ]; then npm ci; else npm install; fi
npx prisma generate
# Yalnızca veri kaybı olmayan değişiklikleri uygular; riskli bir değişiklik varsa durur.
npx prisma db push --skip-generate
npm run build

# ---------------------------------------------------------------------------
step "6/6 Uygulama yeniden başlatılıyor"
# ---------------------------------------------------------------------------
if pm2 describe "$PM2_NAME" >/dev/null 2>&1; then
  pm2 restart "$PM2_NAME" --update-env
else
  pm2 start npm --name "$PM2_NAME" -- start -- -p "$PORT"
fi
pm2 save >/dev/null

for i in $(seq 1 20); do
  if curl -fsS "http://127.0.0.1:$PORT/api/auth/me" >/dev/null 2>&1; then
    printf '\n\033[1;32mGüncelleme tamamlandı, uygulama yanıt veriyor.\033[0m\n'
    echo "Veritabanı: $DB_PATH"
    echo "Yedek:      $BACKUP"
    exit 0
  fi
  sleep 2
done
fail "Uygulama 40 sn içinde yanıt vermedi. Loglar: pm2 logs $PM2_NAME --lines 100"
