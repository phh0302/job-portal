import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '../applications/entities/application.entity';
import { CandidateProfile } from '../candidates/entities/candidate-profile.entity';
import { EmployerProfile } from '../companies/entities/employer-profile.entity';
import { Job } from '../jobs/entities/job.entity';
import { CvScreening } from './entities/cv-screening.entity';
import { CvJobCheck } from './entities/cv-job-check.entity';
import { Resume } from '../candidates/entities/resume.entity';
import { CandidateCheckController } from './candidate-check.controller';
import { CandidateCheckService } from './candidate-check.service';
import { AiCandidateChecker } from './candidate-check.engine';
import { ScreeningController } from './screening.controller';
import { AiCvScreener } from './screening.engine';
import { ScreeningService } from './screening.service';

@Module({
  imports: [TypeOrmModule.forFeature([CvScreening, CvJobCheck, Application, Job, CandidateProfile, EmployerProfile, Resume])],
  controllers: [ScreeningController, CandidateCheckController],
  providers: [ScreeningService, AiCvScreener, CandidateCheckService, AiCandidateChecker],
  exports: [ScreeningService],
})
export class ScreeningModule {}
