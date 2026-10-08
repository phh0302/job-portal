#!/usr/bin/env bash
# =====================================================================
# Cài đặt JobPortal lên VPS Ubuntu 22.04/24.04 mới (DigitalOcean, ...).
# Chạy với quyền root, trong thư mục mã nguồn đã clone:
#     cd ~/job-portal && sudo bash deploy/setup-vps.sh
# Script làm: swap 2GB, tường lửa, Docker, tạo deploy/.env.prod (sinh mật khẩu ngẫu nhiên),
#             build & chạy toàn bộ hệ thống, đặt lịch backup hằng ngày.
# Chạy lại an toàn: không ghi đè .env.prod đã có.
# =====================================================================
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
ENV_FILE="$ROOT/deploy/.env.prod"
COMPOSE="docker compose -f $ROOT/deploy/docker-compose.prod.yml --env-file $ENV_FILE"

say() { printf '\n\033[1;34m==> %s\033[0m\n' "$1"; }
[ "$(id -u)" = 0 ] || { echo "Hãy chạy bằng sudo / root"; exit 1; }

# ---------- 1. Swap (đề phòng thiếu RAM khi build) ----------
if ! swapon --show | grep -q '/swapfile'; then
  say "Tạo swap 2GB"
  fallocate -l 2G /swapfile && chmod 600 /swapfile && mkswap /swapfile && swapon /swapfile
  grep -q '/swapfile' /etc/fstab || echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

# ---------- 2. Kiểm tra RAM (SQL Server cần >= 2GB RAM thật) ----------
MEM_MB=$(awk '/MemTotal/ {print int($2/1024)}' /proc/meminfo)
if [ "$MEM_MB" -lt 1990 ]; then
  echo "VPS chỉ có ${MEM_MB}MB RAM – SQL Server sẽ không khởi động. Hãy chọn gói >= 4GB RAM."; exit 1
elif [ "$MEM_MB" -lt 3500 ]; then
  echo "Cảnh báo: VPS có ${MEM_MB}MB RAM. SQL Server có thể từ chối chạy trên máy 2GB; khuyên dùng 4GB."
fi

# ---------- 3. Tường lửa ----------
say "Cấu hình tường lửa (SSH, HTTP, HTTPS)"
apt-get update -y
apt-get install -y ufw curl ca-certificates openssl
ufw allow OpenSSH >/dev/null
ufw allow 80/tcp >/dev/null
ufw allow 443/tcp >/dev/null
ufw allow 443/udp >/dev/null
ufw --force enable

# ---------- 4. Docker ----------
if ! command -v docker >/dev/null; then
  say "Cài Docker"
  curl -fsSL https://get.docker.com | sh
fi
systemctl enable --now docker

# ---------- 5. File cấu hình ----------
if [ ! -f "$ENV_FILE" ]; then
  say "Tạo deploy/.env.prod"
  read -rp "Tên miền (vd: jobportal-demo.me, không có https://): " DOMAIN
  read -rp "Email của bạn (nhận thông báo chứng chỉ HTTPS): " ACME_EMAIL
  read -rp "Email đăng nhập admin [admin@$DOMAIN]: " ADMIN_EMAIL
  ADMIN_EMAIL=${ADMIN_EMAIL:-admin@$DOMAIN}
  read -rp "Tạo dữ liệu demo cho bản trình diễn? (Y/n): " DEMO
  case "${DEMO:-Y}" in [nN]*) SEED_DEMO=false ;; *) SEED_DEMO=true ;; esac

  DB_PASSWORD="Db$(openssl rand -hex 12)!Aa1"
  JWT_SECRET="$(openssl rand -hex 48)"
  ADMIN_PASSWORD="Ad$(openssl rand -hex 6)9x"

  cp "$ROOT/deploy/.env.prod.example" "$ENV_FILE"
  set_kv() { sed -i "s|^$1=.*|$1=$2|" "$ENV_FILE"; }
  set_kv DOMAIN "$DOMAIN"
  set_kv ACME_EMAIL "$ACME_EMAIL"
  set_kv DB_PASSWORD "$DB_PASSWORD"
  set_kv JWT_ACCESS_SECRET "$JWT_SECRET"
  set_kv SEED_ADMIN_EMAIL "$ADMIN_EMAIL"
  set_kv SEED_ADMIN_PASSWORD "$ADMIN_PASSWORD"
  set_kv SEED_DEMO "$SEED_DEMO"
  set_kv MAIL_FROM "\"JobPortal <no-reply@$DOMAIN>\""
  chmod 600 "$ENV_FILE"

  CRED="/root/jobportal-admin.txt"
  printf 'URL: https://%s/login\nAdmin: %s\nMật khẩu: %s\n(Đổi mật khẩu sau lần đăng nhập đầu, rồi xoá file này)\n' "$DOMAIN" "$ADMIN_EMAIL" "$ADMIN_PASSWORD" > "$CRED"
  chmod 600 "$CRED"
  echo "Đã lưu tài khoản admin vào $CRED"
fi

DOMAIN=$(grep '^DOMAIN=' "$ENV_FILE" | cut -d= -f2)

# robots.txt trỏ sitemap về tên miền thật
sed -i "s|^Sitemap: .*|Sitemap: https://$DOMAIN/api/sitemap.xml|" "$ROOT/web/public/robots.txt"
# Không để git pull báo xung đột vì file đã sửa trên server
git -C "$ROOT" update-index --skip-worktree web/public/robots.txt 2>/dev/null || true

# ---------- 6. Kiểm tra DNS ----------
IP=$(curl -fsS https://api.ipify.org || true)
DNS_IP=$(getent hosts "$DOMAIN" | awk '{print $1}' | head -1 || true)
if [ -n "$IP" ] && [ "$IP" != "$DNS_IP" ]; then
  echo "Cảnh báo: $DOMAIN đang trỏ tới '${DNS_IP:-chưa có}', còn IP VPS là $IP."
  echo "HTTPS chỉ cấp được khi bản ghi DNS A đã trỏ đúng (có thể mất 5–30 phút)."
fi

# ---------- 7. Build & chạy ----------
say "Build và khởi động (lần đầu mất 5–10 phút)"
$COMPOSE up -d --build

# ---------- 8. Backup hằng ngày 2h sáng ----------
if [ -f "$ROOT/scripts/backup/backup-docker.sh" ]; then
  chmod +x "$ROOT/scripts/backup/backup-docker.sh"
  CRON="0 2 * * * cd $ROOT && bash scripts/backup/backup-docker.sh >> /var/log/jobportal-backup.log 2>&1"
  ( crontab -l 2>/dev/null | grep -v 'backup-docker.sh' ; echo "$CRON" ) | crontab -
  echo "Đã đặt lịch backup hằng ngày lúc 2:00"
fi

say "Xong!"
$COMPOSE ps
echo
echo "Mở https://$DOMAIN (chứng chỉ HTTPS có thể cần 1–2 phút)."
echo "Xem log:      $COMPOSE logs -f api"
echo "Cập nhật code: git pull && $COMPOSE up -d --build"
