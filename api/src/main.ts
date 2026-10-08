import 'dotenv/config';
import { Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { NestFactory } from '@nestjs/core';
import { NestExpressApplication } from '@nestjs/platform-express';
import { AppModule } from './app.module';
import { configureApp } from './app.setup';

async function bootstrap() {
  const app = await NestFactory.create<NestExpressApplication>(AppModule, { bodyParser: false });
  configureApp(app);
  app.enableShutdownHooks();

  const port = app.get(ConfigService).get<number>('port') ?? 3000;
  await app.listen(port);
  Logger.log(`API: http://localhost:${port}/api  |  Swagger: http://localhost:${port}/api/docs`);
}
bootstrap();
