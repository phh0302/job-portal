import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { EmailOutbox } from './entities/email-outbox.entity';
import { MailAdminService } from './mail-admin.service';
import { MailQueueWorker } from './mail-queue.worker';
import { MailTransport } from './mail-transport.service';
import { MailService } from './mail.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([EmailOutbox])],
  providers: [MailTransport, MailService, MailQueueWorker, MailAdminService],
  exports: [MailService, MailAdminService],
})
export class MailModule {}
