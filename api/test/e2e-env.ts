/**
 * Môi trường cho E2E test: dùng DATABASE RIÊNG (mặc định job_portal_e2e), xóa sạch & tạo lại bảng mỗi lần chạy.
 * Tài khoản SQL Server lấy từ api/.env như bình thường.
 */
import 'dotenv/config';
import { mkdtempSync } from 'fs';
import { tmpdir } from 'os';
import { join } from 'path';

process.env.NODE_ENV = 'test';
process.env.DB_DATABASE = process.env.E2E_DB_DATABASE ?? 'job_portal_e2e';
process.env.DB_SYNCHRONIZE = 'false';
process.env.DB_LOGGING = 'false';
process.env.JOB_ALERTS_ENABLED = 'false';
process.env.LOG_REQUESTS = 'false';
process.env.SMTP_HOST = '';
process.env.UPLOAD_DIR = mkdtempSync(join(tmpdir(), 'jobportal-e2e-'));
process.env.JWT_ACCESS_SECRET = 'e2e_secret_e2e_secret_e2e_secret_e2e_secret';
