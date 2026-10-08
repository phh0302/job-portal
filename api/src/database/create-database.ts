/**
 * Tạo database nếu chưa có (SQL Server không tự tạo DB khi kết nối).
 * Chạy: npm run db:create
 */
import 'dotenv/config';
import * as sql from 'mssql';
import configuration from '../config/configuration';

async function main() {
  const { db } = configuration();
  if (!/^[A-Za-z0-9_]+$/.test(db.database)) {
    throw new Error(`Tên database không hợp lệ: ${db.database}`);
  }
  const pool = await sql.connect({
    server: db.host,
    port: db.instanceName ? undefined : db.port,
    user: db.username,
    password: db.password,
    database: 'master',
    options: {
      encrypt: db.encrypt,
      trustServerCertificate: db.trustServerCertificate,
      instanceName: db.instanceName,
    },
  });
  await pool
    .request()
    .query(`IF DB_ID(N'${db.database}') IS NULL CREATE DATABASE [${db.database}] COLLATE Vietnamese_CI_AS;`);
  console.log(`Database "${db.database}" đã sẵn sàng.`);
  await pool.close();
}

main().catch((err) => {
  console.error('Không tạo được database:', err.message);
  process.exit(1);
});
