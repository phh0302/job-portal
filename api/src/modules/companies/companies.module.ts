import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CompaniesPublicController } from './companies-public.controller';
import { Company } from './entities/company.entity';
import { EmployerProfile } from './entities/employer-profile.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Company, EmployerProfile])],
  controllers: [CompaniesPublicController],
})
export class CompaniesModule {}
