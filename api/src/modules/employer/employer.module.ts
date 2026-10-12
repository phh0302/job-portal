import { Module } from '@nestjs/common';
import { ResponseStatsRunner } from './response-stats.runner';
import { CandidateUnlock } from '../billing/entities/candidate-unlock.entity';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '../applications/entities/application.entity';
import { CandidateProfile } from '../candidates/entities/candidate-profile.entity';
import { Category } from '../catalog/entities/category.entity';
import { Location } from '../catalog/entities/location.entity';
import { Skill } from '../catalog/entities/skill.entity';
import { CompanyInvitation } from '../companies/entities/company-invitation.entity';
import { Company } from '../companies/entities/company.entity';
import { EmployerProfile } from '../companies/entities/employer-profile.entity';
import { Job } from '../jobs/entities/job.entity';
import { User } from '../users/entities/user.entity';
import { EmployerApplicationsService } from './applications.service';
import { CandidateSearchService } from './candidate-search.service';
import { EmployerCompanyService } from './company.service';
import { EmployerDashboardService } from './dashboard.service';
import { EmployerContext } from './employer-context.service';
import { EmployerController } from './employer.controller';
import { JobExpiryRunner } from './job-expiry.runner';
import { EmployerJobsService } from './jobs.service';
import { EmployerTeamController, TeamInvitationPublicController } from './team.controller';
import { EmployerTeamService } from './team.service';

@Module({
  imports: [
    TypeOrmModule.forFeature([EmployerProfile, Company, CompanyInvitation, User, Job, Application, CandidateProfile, Category, Skill, Location, CandidateUnlock]),
  ],
  controllers: [EmployerController, EmployerTeamController, TeamInvitationPublicController],
  providers: [
    ResponseStatsRunner,
    EmployerContext,
    EmployerCompanyService,
    EmployerJobsService,
    EmployerApplicationsService,
    EmployerDashboardService,
    CandidateSearchService,
    JobExpiryRunner,
    EmployerTeamService,
  ],
})
export class EmployerModule {}
