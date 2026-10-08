import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Application } from '../applications/entities/application.entity';
import { CandidateProfile } from '../candidates/entities/candidate-profile.entity';
import { EmployerProfile } from '../companies/entities/employer-profile.entity';
import { ApplicationMessage } from './entities/application-message.entity';
import { CandidateMessagesController, EmployerMessagesController } from './messages.controller';
import { MessagesService } from './messages.service';

@Module({
  imports: [TypeOrmModule.forFeature([ApplicationMessage, Application, EmployerProfile, CandidateProfile])],
  controllers: [EmployerMessagesController, CandidateMessagesController],
  providers: [MessagesService],
})
export class MessagesModule {}
