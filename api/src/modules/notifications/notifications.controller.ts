import { Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Transform } from 'class-transformer';
import { IsBoolean, IsOptional } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { AuthUser } from '../../common/types/auth-user';
import { NotificationsService } from './notifications.service';

class NotificationQuery extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => value === 'true' || value === true)
  @IsBoolean()
  unread?: boolean;
}

/** Thông báo trong web — dùng chung cho mọi vai trò */
@ApiTags('notifications')
@ApiBearerAuth()
@Controller('notifications')
export class NotificationsController {
  constructor(private readonly service: NotificationsService) {}

  @Get()
  list(@CurrentUser() u: AuthUser, @Query() q: NotificationQuery) {
    return this.service.list(u.id, q.page, q.limit, q.unread);
  }

  @Get('unread-count')
  unreadCount(@CurrentUser() u: AuthUser) {
    return this.service.unreadCount(u.id);
  }

  @Post(':id/read')
  @HttpCode(204)
  markRead(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.markRead(u.id, id);
  }

  @Post('read-all')
  @HttpCode(204)
  markAllRead(@CurrentUser() u: AuthUser) {
    return this.service.markAllRead(u.id);
  }
}
