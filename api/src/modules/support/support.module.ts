import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { FaqArticle } from './entities/faq-article.entity';
import { SupportMessage } from './entities/support-message.entity';
import { SupportTicket } from './entities/support-ticket.entity';
import { AdminSupportController, PublicFaqController, SupportController } from './support.controller';
import { SupportBotService } from './support-bot.service';
import { SupportService } from './support.service';

@Module({
  imports: [TypeOrmModule.forFeature([SupportTicket, SupportMessage, FaqArticle, User])],
  controllers: [PublicFaqController, SupportController, AdminSupportController],
  providers: [SupportService, SupportBotService],
  exports: [SupportService],
})
export class SupportModule {}
