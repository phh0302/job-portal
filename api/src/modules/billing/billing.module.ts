import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CandidateProfile } from '../candidates/entities/candidate-profile.entity';
import { Company } from '../companies/entities/company.entity';
import { EmployerProfile } from '../companies/entities/employer-profile.entity';
import { Job } from '../jobs/entities/job.entity';
import { AdminBillingController, EmployerBillingController, PublicPlansController } from './billing.controller';
import { BillingService } from './billing.service';
import { CandidateUnlock } from './entities/candidate-unlock.entity';
import { PlanOrder } from './entities/plan-order.entity';
import { ServicePlan } from './entities/service-plan.entity';

@Module({
  imports: [
    TypeOrmModule.forFeature([ServicePlan, PlanOrder, CandidateUnlock, Company, EmployerProfile, Job, CandidateProfile])
  ],
  controllers: [PublicPlansController, EmployerBillingController, AdminBillingController],
  providers: [BillingService],
  exports: [BillingService],
})
export class BillingModule {}
