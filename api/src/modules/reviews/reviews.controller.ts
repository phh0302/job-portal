import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Post, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums';
import { AuthUser } from '../../common/types/auth-user';
import { ReasonDto } from '../admin/dto/admin.dto';
import { AdminReviewsQuery, ReplyReviewDto, UpsertReviewDto } from './dto/review.dto';
import { ReviewsService } from './reviews.service';

@ApiTags('reviews')
@Public()
@Controller('companies/:slug/reviews')
export class PublicReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Get()
  list(@Param('slug') slug: string, @Query() q: PaginationDto) {
    return this.service.publicList(slug, q.page, q.limit);
  }
}

@ApiTags('reviews')
@ApiBearerAuth()
@Roles(UserRole.CANDIDATE)
@Controller('candidate/reviews')
export class CandidateReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Get()
  mine(@CurrentUser() u: AuthUser) {
    return this.service.mine(u.id);
  }

  @Get('company/:companyId')
  one(@CurrentUser() u: AuthUser, @Param('companyId', ParseIntPipe) companyId: number) {
    return this.service.myForCompany(u.id, companyId);
  }

  @Put('company/:companyId')
  @RateLimit({ limit: 10, windowSec: 3600 })
  upsert(@CurrentUser() u: AuthUser, @Param('companyId', ParseIntPipe) companyId: number, @Body() dto: UpsertReviewDto) {
    return this.service.upsert(u, companyId, dto);
  }

  @Delete('company/:companyId')
  @HttpCode(204)
  remove(@CurrentUser() u: AuthUser, @Param('companyId', ParseIntPipe) companyId: number) {
    return this.service.remove(u.id, companyId);
  }
}

@ApiTags('reviews')
@ApiBearerAuth()
@Roles(UserRole.EMPLOYER)
@Controller('employer/reviews')
export class EmployerReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Get()
  list(@CurrentUser() u: AuthUser, @Query() q: PaginationDto) {
    return this.service.employerList(u.id, q.page, q.limit);
  }

  @Post(':id/reply')
  @HttpCode(200)
  reply(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ReplyReviewDto) {
    return this.service.reply(u.id, id, dto.reply);
  }
}

@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin/reviews')
export class AdminReviewsController {
  constructor(private readonly service: ReviewsService) {}

  @Get()
  list(@Query() q: AdminReviewsQuery) {
    return this.service.adminList(q);
  }

  @Post(':id/approve')
  @HttpCode(200)
  approve(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.service.approve(u, id, req.ip);
  }

  @Post(':id/reject')
  @HttpCode(200)
  reject(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ReasonDto, @Req() req: Request) {
    return this.service.reject(u, id, dto.reason, req.ip);
  }
}
