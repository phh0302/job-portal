import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { AuditModule } from '../audit/audit.module';
import { CandidateProfile } from '../candidates/entities/candidate-profile.entity';
import { Company } from '../companies/entities/company.entity';
import { EmployerProfile } from '../companies/entities/employer-profile.entity';
import { CompanyReview } from './entities/company-review.entity';
import { AdminReviewsController, CandidateReviewsController, EmployerReviewsController, PublicReviewsController } from './reviews.controller';
import { ReviewsService } from './reviews.service';

@Module({
  imports: [TypeOrmModule.forFeature([CompanyReview, Company, CandidateProfile, EmployerProfile]), AuditModule],
  controllers: [PublicReviewsController, CandidateReviewsController, EmployerReviewsController, AdminReviewsController],
  providers: [ReviewsService],
  exports: [ReviewsService],
})
export class ReviewsModule {}
