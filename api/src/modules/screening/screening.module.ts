import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '../applications/entities/application.entity';
import { CandidateProfile } from '../candidates/entities/candidate-profile.entity';
import { EmployerProfile } from '../companies/entities/employer-profile.entity';
import { Job } from '../jobs/entities/job.entity';
import { CvScreening } from './entities/cv-screening.entity';
import { ScreeningController } from './screening.controller';
import { AiCvScreener } from './screening.engine';
import { ScreeningService } from './screening.service';

@Module({
  imports: [TypeOrmModule.forFeature([CvScreening, Application, Job, CandidateProfile, EmployerProfile])],
  controllers: [ScreeningController],
  providers: [ScreeningService, AiCvScreener],
  exports: [ScreeningService],
})
export class ScreeningModule {}
