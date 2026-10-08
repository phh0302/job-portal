import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Location } from '../catalog/entities/location.entity';
import { Skill } from '../catalog/entities/skill.entity';
import { CandidatesController } from './candidates.controller';
import { CandidatesService } from './candidates.service';
import { CandidateProfile } from './entities/candidate-profile.entity';
import { Education } from './entities/education.entity';
import { Experience } from './entities/experience.entity';
import { Resume } from './entities/resume.entity';

@Module({
  imports: [TypeOrmModule.forFeature([CandidateProfile, Education, Experience, Resume, Skill, Location])],
  controllers: [CandidatesController],
  providers: [CandidatesService],
  exports: [CandidatesService],
})
export class CandidatesModule {}
