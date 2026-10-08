import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { User } from '../users/entities/user.entity';
import { Notification } from './entities/notification.entity';
import { NotificationsController } from './notifications.controller';
import { NotificationsService } from './notifications.service';
import { RealtimeService } from './realtime.service';
import { NotificationsStreamController } from './stream.controller';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([Notification, User])],
  controllers: [NotificationsController, NotificationsStreamController],
  providers: [NotificationsService, RealtimeService],
  exports: [NotificationsService, RealtimeService],
})
export class NotificationsModule {}
