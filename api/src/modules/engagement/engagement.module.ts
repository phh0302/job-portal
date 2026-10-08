import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Category } from '../catalog/entities/category.entity';
import { Location } from '../catalog/entities/location.entity';
import { Company } from '../companies/entities/company.entity';
import { Job } from '../jobs/entities/job.entity';
import { JobsModule } from '../jobs/jobs.module';
import { CompanyFollowController } from './company-follow.controller';
import { EngagementController } from './engagement.controller';
import { EngagementService } from './engagement.service';
import { FollowedCompany } from './entities/followed-company.entity';
import { JobAlert } from './entities/job-alert.entity';
import { SavedJob } from './entities/saved-job.entity';
import { JobAlertRunner } from './job-alert.runner';

@Module({
  imports: [TypeOrmModule.forFeature([SavedJob, FollowedCompany, JobAlert, Job, Company, Location, Category]), JobsModule],
  controllers: [EngagementController, CompanyFollowController],
  providers: [EngagementService, JobAlertRunner],
  exports: [EngagementService],
})
export class EngagementModule {}
