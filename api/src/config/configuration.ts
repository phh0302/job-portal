const DEV_SECRET = 'dev_access_secret_change_me';

export default () => {
  const accessSecret = process.env.JWT_ACCESS_SECRET ?? DEV_SECRET;
  if (
    process.env.NODE_ENV === 'production' &&
    (accessSecret === DEV_SECRET ||
      accessSecret.length < 32 ||
      accessSecret.startsWith('change_me'))
  ) {
    throw new Error(
      'JWT_ACCESS_SECRET chưa được cấu hình an toàn (cần chuỗi ngẫu nhiên >= 32 ký tự) cho production',
    );
  }
  return {
    nodeEnv: process.env.NODE_ENV ?? 'development',
    port: parseInt(process.env.PORT ?? '3000', 10),
    corsOrigin: (process.env.CORS_ORIGIN ?? 'http://localhost:5173').split(','),
    /** Địa chỉ web (dùng tạo link trong email) */
    webUrl: process.env.WEB_URL ?? 'http://localhost:5173',
    jwt: {
      accessSecret,
      accessExpires: process.env.JWT_ACCESS_EXPIRES ?? '15m',
      refreshExpires: process.env.JWT_REFRESH_EXPIRES ?? '7d',
    },
    mail: {
      host: process.env.SMTP_HOST || undefined,
      port: parseInt(process.env.SMTP_PORT ?? '587', 10),
      secure: process.env.SMTP_SECURE === 'true',
      user: process.env.SMTP_USER || undefined,
      pass: process.env.SMTP_PASS || undefined,
      from: process.env.MAIL_FROM ?? 'JobPortal <no-reply@jobportal.local>',
    },
    /** AI giải thích đề xuất việc làm (tùy chọn) */
    ai: {
      apiKey: process.env.ANTHROPIC_API_KEY || undefined,
      model: process.env.AI_MODEL || 'claude-haiku-5-5',
      baseUrl: process.env.AI_BASE_URL || undefined,
    },
    upload: {
      dir: process.env.UPLOAD_DIR ?? 'uploads',
      maxMb: parseInt(process.env.MAX_UPLOAD_MB ?? '5', 10),
    },
    db: {
      host: process.env.DB_HOST ?? 'localhost',
      port: parseInt(process.env.DB_PORT ?? '1433', 10),
      // Tên instance (vd: SQLEXPRESS). Nếu có thì bỏ qua port, cần bật dịch vụ SQL Server Browser.
      instanceName: process.env.DB_INSTANCE || undefined,
      username: process.env.DB_USERNAME ?? 'sa',
      password: process.env.DB_PASSWORD ?? '',
      database: process.env.DB_DATABASE ?? 'job_portal',
      encrypt: process.env.DB_ENCRYPT === 'true',
      trustServerCertificate: process.env.DB_TRUST_SERVER_CERT !== 'false',
      synchronize: process.env.DB_SYNCHRONIZE === 'true',
      logging: process.env.DB_LOGGING === 'true',
    },
  };
};
