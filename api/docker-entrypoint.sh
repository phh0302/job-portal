#!/bin/sh
# Khởi động container API: tạo database (nếu chưa có) -> chạy migration -> (tùy chọn) seed -> chạy app
set -e

if [ "${RUN_MIGRATIONS:-true}" = "true" ]; then
  echo "[entrypoint] Kiểm tra database..."
  # SQL Server trong docker có thể khởi động chậm: thử lại tối đa ~60 giây
  i=0
  until node dist/database/create-database.js; do
    i=$((i+1))
    if [ "$i" -ge 12 ]; then echo "[entrypoint] Không kết nối được SQL Server"; exit 1; fi
    echo "[entrypoint] Chờ SQL Server... ($i)"
    sleep 5
  done
  echo "[entrypoint] Chạy migration..."
  npx typeorm migration:run -d dist/database/data-source.js
fi

if [ "${RUN_SEED:-false}" = "true" ]; then
  echo "[entrypoint] Seed dữ liệu..."
  node dist/database/seeds/seed.js
fi

exec "$@"
