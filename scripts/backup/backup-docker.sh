#!/bin/sh
# Sao lưu khi chạy bằng docker compose (VPS Linux).
# Đặt lịch (crontab -e):  0 2 * * * cd /opt/job-portal && sh scripts/backup/backup-docker.sh >> deploy/backups/backup.log 2>&1
set -e
cd "$(dirname "$0")/../.."
COMPOSE="docker compose -f deploy/docker-compose.prod.yml --env-file deploy/.env.prod"
. ./deploy/.env.prod
DB="${DB_DATABASE:-job_portal}"
STAMP=$(date +%Y%m%d-%H%M%S)
KEEP_DAYS=${KEEP_DAYS:-14}
mkdir -p deploy/backups && chmod 777 deploy/backups  # SQL Server trong container (user mssql) cần ghi được

echo "[$(date)] Backup database $DB"
$COMPOSE exec -T sqlserver /opt/mssql-tools18/bin/sqlcmd -C -S localhost -U sa -P "$DB_PASSWORD" -b \
  -Q "BACKUP DATABASE [$DB] TO DISK = N'/var/opt/mssql/backups/$DB-$STAMP.bak' WITH INIT, CHECKSUM"

echo "[$(date)] Backup uploads"
$COMPOSE exec -T api tar -czf - -C /data uploads > "deploy/backups/uploads-$STAMP.tar.gz"

# Xóa bản cũ
find deploy/backups -name '*.bak' -mtime +"$KEEP_DAYS" -delete
find deploy/backups -name 'uploads-*.tar.gz' -mtime +"$KEEP_DAYS" -delete
echo "[$(date)] Xong"
# Khuyên dùng: đồng bộ thư mục deploy/backups lên nơi khác (rclone -> Google Drive / S3) để phòng hỏng VPS.
