import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { AuthUser } from '../../common/types/auth-user';
import { AdminTicketsQuery, FaqDto, FaqSearchQuery, SupportMessageDto } from './dto/support.dto';
import { SupportService } from './support.service';

@ApiTags('support')
@Public()
@Controller('support/faqs')
export class PublicFaqController {
  constructor(private readonly service: SupportService) {}

  @Get()
  @RateLimit({ limit: 60, windowSec: 60 })
  list(@Query() q: FaqSearchQuery) {
    return this.service.publicFaqs(q.q, q.audience);
  }
}

@ApiTags('support')
@ApiBearerAuth()
@Roles(UserRole.CANDIDATE, UserRole.EMPLOYER)
@Controller('support')
export class SupportController {
  constructor(private readonly service: SupportService) {}

  @Get('conversation')
  mine(@CurrentUser() u: AuthUser) {
    return this.service.mine(u.id);
  }

  @Get('unread')
  unread(@CurrentUser() u: AuthUser) {
    return this.service.unreadForUser(u.id);
  }

  @Post('messages')
  @RateLimit({ limit: 20, windowSec: 60 })
  send(@CurrentUser() u: AuthUser, @Body() dto: SupportMessageDto) {
    return this.service.send(u, dto.body);
  }

  @Post('escalate')
  @HttpCode(200)
  @RateLimit({ limit: 5, windowSec: 600 })
  escalate(@CurrentUser() u: AuthUser) {
    return this.service.escalate(u.id);
  }

  @Post('close')
  @HttpCode(200)
  close(@CurrentUser() u: AuthUser) {
    return this.service.closeMine(u.id);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/support')
export class AdminSupportController {
  constructor(private readonly service: SupportService) {}

  @Get('tickets')
  list(@Query() q: AdminTicketsQuery) {
    return this.service.adminList(q);
  }

  @Get('tickets/:id')
  detail(@Param('id', ParseIntPipe) id: number) {
    return this.service.adminDetail(id);
  }

  @Post('tickets/:id/messages')
  reply(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: SupportMessageDto) {
    return this.service.adminReply(u, id, dto.body);
  }

  @Post('tickets/:id/close')
  @HttpCode(200)
  close(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.adminClose(u, id);
  }

  @Get('faqs')
  faqs() {
    return this.service.adminFaqs();
  }

  @Post('faqs')
  createFaq(@Body() dto: FaqDto) {
    return this.service.createFaq(dto);
  }

  @Put('faqs/:id')
  updateFaq(@Param('id', ParseIntPipe) id: number, @Body() dto: FaqDto) {
    return this.service.updateFaq(id, dto);
  }

  @Delete('faqs/:id')
  @HttpCode(204)
  removeFaq(@Param('id', ParseIntPipe) id: number) {
    return this.service.removeFaq(id);
  }
}
