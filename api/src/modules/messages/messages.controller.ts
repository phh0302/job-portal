import { Body, Controller, Get, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { AuthUser } from '../../common/types/auth-user';
import { ConversationsQuery, MessagesQuery, SendMessageDto } from './dto/message.dto';
import { MessagesService } from './messages.service';

@ApiTags('messages')
@ApiBearerAuth()
@Roles(UserRole.EMPLOYER)
@Controller('employer/messages')
export class EmployerMessagesController {
  constructor(private readonly service: MessagesService) {}

  @Get()
  list(@CurrentUser() u: AuthUser, @Query() q: ConversationsQuery) {
    return this.service.conversations('EMPLOYER', u.id, q.page, q.limit);
  }

  @Get('unread-count')
  unread(@CurrentUser() u: AuthUser) {
    return this.service.unreadCount('EMPLOYER', u.id);
  }

  @Get(':applicationId')
  thread(@CurrentUser() u: AuthUser, @Param('applicationId', ParseIntPipe) id: number, @Query() q: MessagesQuery) {
    return this.service.thread('EMPLOYER', u.id, id, q.before);
  }

  @Post(':applicationId')
  @RateLimit({ limit: 30, windowSec: 60 })
  send(@CurrentUser() u: AuthUser, @Param('applicationId', ParseIntPipe) id: number, @Body() dto: SendMessageDto) {
    return this.service.send('EMPLOYER', u.id, id, dto.body);
  }
}

@ApiTags('messages')
@ApiBearerAuth()
@Roles(UserRole.CANDIDATE)
@Controller('candidate/messages')
export class CandidateMessagesController {
  constructor(private readonly service: MessagesService) {}

  @Get()
  list(@CurrentUser() u: AuthUser, @Query() q: ConversationsQuery) {
    return this.service.conversations('CANDIDATE', u.id, q.page, q.limit);
  }

  @Get('unread-count')
  unread(@CurrentUser() u: AuthUser) {
    return this.service.unreadCount('CANDIDATE', u.id);
  }

  @Get(':applicationId')
  thread(@CurrentUser() u: AuthUser, @Param('applicationId', ParseIntPipe) id: number, @Query() q: MessagesQuery) {
    return this.service.thread('CANDIDATE', u.id, id, q.before);
  }

  @Post(':applicationId')
  @RateLimit({ limit: 30, windowSec: 60 })
  send(@CurrentUser() u: AuthUser, @Param('applicationId', ParseIntPipe) id: number, @Body() dto: SendMessageDto) {
    return this.service.send('CANDIDATE', u.id, id, dto.body);
  }
}
