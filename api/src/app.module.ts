import { MiddlewareConsumer, Module, NestModule } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { TypeOrmModule } from '@nestjs/typeorm';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RateLimitGuard } from './common/guards/rate-limit.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { RequestLoggerMiddleware } from './common/request-logger.middleware';
import configuration from './config/configuration';
import { DatabaseModule } from './database/database.module';
import { AdminModule } from './modules/admin/admin.module';
import { ApplicationsModule } from './modules/applications/applications.module';
import { AuditModule } from './modules/audit/audit.module';
import { ContentModule } from './modules/content/content.module';
import { AuthModule } from './modules/auth/auth.module';
import { CandidatesModule } from './modules/candidates/candidates.module';
import { CatalogModule } from './modules/catalog/catalog.module';
import { CompaniesModule } from './modules/companies/companies.module';
import { EmployerModule } from './modules/employer/employer.module';
import { EngagementModule } from './modules/engagement/engagement.module';
import { JobsModule } from './modules/jobs/jobs.module';
import { NotificationsModule } from './modules/notifications/notifications.module';
import { RecommendationsModule } from './modules/recommendations/recommendations.module';
import { ReportsModule } from './modules/reports/reports.module';
import { StorageModule } from './modules/storage/storage.module';
import { HealthModule } from './modules/health/health.module';
import { MailModule } from './modules/mail/mail.module';
import { MessagesModule } from './modules/messages/messages.module';
import { ReviewsModule } from './modules/reviews/reviews.module';
import { BillingModule } from './modules/billing/billing.module';
import { User } from './modules/users/entities/user.entity';

@Module({
  imports: [
    ConfigModule.forRoot({ isGlobal: true, load: [configuration] }),
    DatabaseModule,
    TypeOrmModule.forFeature([User]),
    MailModule,
    StorageModule,
    NotificationsModule,
    AuditModule,
    ContentModule,
    HealthModule,
    AuthModule,
    CatalogModule,
    CandidatesModule,
    CompaniesModule,
    JobsModule,
    ApplicationsModule,
    EngagementModule,
    ReportsModule,
    EmployerModule,
    AdminModule,
    RecommendationsModule,
    MessagesModule,
    ReviewsModule,
    BillingModule,
  ],
  providers: [
    // Thứ tự chạy: rate limit -> xác thực JWT -> phân quyền theo role
    { provide: APP_GUARD, useClass: RateLimitGuard },
    { provide: APP_GUARD, useClass: JwtAuthGuard },
    { provide: APP_GUARD, useClass: RolesGuard },
  ],
})
export class AppModule implements NestModule {
  configure(consumer: MiddlewareConsumer) {
    consumer.apply(RequestLoggerMiddleware).forRoutes('{*splat}');
  }
}
