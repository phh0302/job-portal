import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuthModule } from '../auth/auth.module';
import { Category } from '../catalog/entities/category.entity';
import { Location } from '../catalog/entities/location.entity';
import { Skill } from '../catalog/entities/skill.entity';
import { Company } from '../companies/entities/company.entity';
import { EmployerProfile } from '../companies/entities/employer-profile.entity';
import { Job } from '../jobs/entities/job.entity';
import { Report } from '../reports/entities/report.entity';
import { User } from '../users/entities/user.entity';
import { AdminCatalogService } from './admin-catalog.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminModerationService } from './admin-moderation.service';
import { AdminUsersService } from './admin-users.service';
import { AdminController } from './admin.controller';

@Module({
  imports: [TypeOrmModule.forFeature([User, Job, Company, Report, EmployerProfile, Category, Skill, Location]), AuthModule],
  controllers: [AdminController],
  providers: [AdminDashboardService, AdminUsersService, AdminModerationService, AdminCatalogService],
})
export class AdminModule {}
