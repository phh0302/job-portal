import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../companies/entities/company.entity';
import { Job } from '../jobs/entities/job.entity';
import { Report } from './entities/report.entity';
import { ReportsController } from './reports.controller';
import { ReportsService } from './reports.service';

@Module({
  imports: [TypeOrmModule.forFeature([Report, Job, Company])],
  controllers: [ReportsController],
  providers: [ReportsService],
})
export class ReportsModule {}
