import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidatesModule } from '../candidates/candidates.module';
import { Job } from '../jobs/entities/job.entity';
import { CandidateApplicationsController } from './applications.controller';
import { ApplicationsService } from './applications.service';
import { Application } from './entities/application.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Application, Job]), CandidatesModule],
  controllers: [CandidateApplicationsController],
  providers: [ApplicationsService],
  exports: [ApplicationsService],
})
export class ApplicationsModule {}
