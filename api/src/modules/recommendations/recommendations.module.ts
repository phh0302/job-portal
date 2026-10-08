import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '../applications/entities/application.entity';
import { CandidatesModule } from '../candidates/candidates.module';
import { CandidateProfile } from '../candidates/entities/candidate-profile.entity';
import { SavedJob } from '../engagement/entities/saved-job.entity';
import { Job } from '../jobs/entities/job.entity';
import { JobsModule } from '../jobs/jobs.module';
import { AiExplainerService } from './ai-explainer.service';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

@Module({
  imports: [TypeOrmModule.forFeature([Job, CandidateProfile, Application, SavedJob]), CandidatesModule, JobsModule],
  controllers: [RecommendationsController],
  providers: [RecommendationsService, AiExplainerService],
})
export class RecommendationsModule {}
