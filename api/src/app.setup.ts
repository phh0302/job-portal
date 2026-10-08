import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestExpressApplication } from '@nestjs/platform-express';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import express from 'express';
import helmet from 'helmet';
import { join, resolve } from 'path';
import { AllExceptionsFilter } from './common/http-exception.filter';

/** Cấu hình chung cho app (dùng cho main.ts và E2E test) */
export function configureApp(app: NestExpressApplication) {
  const config = app.get(ConfigService);

  // Phía sau reverse proxy (Nginx, IIS…) để req.ip là IP thật của người dùng
  if (process.env.TRUST_PROXY) app.set('trust proxy', process.env.TRUST_PROXY === 'true' ? 1 : process.env.TRUST_PROXY);
  app.disable('x-powered-by');
  // Giới hạn kích thước body (mô tả công việc dài nhưng không cần hơn 1MB)
  app.use(express.json({ limit: '1mb' }));
  app.use(express.urlencoded({ extended: true, limit: '1mb' }));

  app.setGlobalPrefix('api');
  // cross-origin: cho phép web ở domain khác hiển thị ảnh logo/avatar của API
  app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
  // Ảnh công khai (avatar, logo). CV KHÔNG nằm ở đây — chỉ tải qua link có chữ ký.
  const uploadDir = resolve(config.get<string>('upload.dir') ?? 'uploads');
  app.use('/api/uploads/public', express.static(join(uploadDir, 'public'), { maxAge: '7d', index: false }));
  app.enableCors({
    origin: config.get<string[]>('corsOrigin'),
    credentials: true,
    exposedHeaders: ['X-Request-Id', 'Content-Disposition'],
  });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true, transform: true }));
  app.useGlobalFilters(new AllExceptionsFilter());

  // Chỉ bật Swagger ngoài production (hoặc khi SWAGGER=true)
  if (config.get('nodeEnv') !== 'production' || process.env.SWAGGER === 'true') {
    const swaggerConfig = new DocumentBuilder()
      .setTitle('Job Portal API')
      .setDescription('API cho trang tìm việc: Ứng viên, Nhà tuyển dụng, Admin')
      .setVersion('0.1.0')
      .addBearerAuth()
      .build();
    SwaggerModule.setup('api/docs', app, SwaggerModule.createDocument(app, swaggerConfig));
  }
  return app;
}
