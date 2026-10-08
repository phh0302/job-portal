import {
  Body,
  Controller,
  Delete,
  Get,
  HttpCode,
  Param,
  ParseIntPipe,
  Patch,
  Post,
  Put,
  Query,
} from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums';
import { AuthUser } from '../../common/types/auth-user';
import { JobAlertDto } from './dto/engagement.dto';
import { EngagementService } from './engagement.service';
import { JobAlertRunner } from './job-alert.runner';

@ApiTags('candidate')
@ApiBearerAuth()
@Roles(UserRole.CANDIDATE)
@Controller('candidate')
export class EngagementController {
  constructor(
    private readonly service: EngagementService,
    private readonly runner: JobAlertRunner,
  ) {}

  // ===== Việc đã lưu =====

  @Get('saved-jobs')
  listSaved(@CurrentUser() u: AuthUser, @Query() q: PaginationDto) {
    return this.service.listSaved(u.id, q.page, q.limit);
  }

  /** Danh sách id để tô trái tim trên thẻ việc làm */
  @Get('saved-jobs/ids')
  savedIds(@CurrentUser() u: AuthUser) {
    return this.service.savedJobIds(u.id);
  }

  @Put('saved-jobs/:jobId')
  save(@CurrentUser() u: AuthUser, @Param('jobId', ParseIntPipe) jobId: number) {
    return this.service.saveJob(u.id, jobId);
  }

  @Delete('saved-jobs/:jobId')
  unsave(@CurrentUser() u: AuthUser, @Param('jobId', ParseIntPipe) jobId: number) {
    return this.service.unsaveJob(u.id, jobId);
  }

  // ===== Công ty theo dõi =====

  @Get('followed-companies')
  listFollowing(@CurrentUser() u: AuthUser, @Query() q: PaginationDto) {
    return this.service.listFollowing(u.id, q.page, q.limit);
  }

  @Put('followed-companies/:companyId')
  follow(@CurrentUser() u: AuthUser, @Param('companyId', ParseIntPipe) companyId: number) {
    return this.service.follow(u.id, companyId);
  }

  @Delete('followed-companies/:companyId')
  unfollow(@CurrentUser() u: AuthUser, @Param('companyId', ParseIntPipe) companyId: number) {
    return this.service.unfollow(u.id, companyId);
  }

  // ===== Thông báo việc làm =====

  @Get('job-alerts')
  listAlerts(@CurrentUser() u: AuthUser) {
    return this.service.listAlerts(u.id);
  }

  @Post('job-alerts')
  createAlert(@CurrentUser() u: AuthUser, @Body() dto: JobAlertDto) {
    return this.service.createAlert(u.id, dto);
  }

  @Patch('job-alerts/:id')
  updateAlert(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: JobAlertDto) {
    return this.service.updateAlert(u.id, id, dto);
  }

  @Delete('job-alerts/:id')
  @HttpCode(204)
  removeAlert(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.removeAlert(u.id, id);
  }

  /** Gửi thử email ngay với các việc làm đăng trong 30 ngày gần nhất */
  @Post('job-alerts/:id/send-test')
  @RateLimit({ limit: 3, windowSec: 300 })
  @HttpCode(200)
  async sendTest(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    const alert = await this.service.ownAlert(u.id, id);
    const count = await this.runner.process(alert, new Date(Date.now() - 30 * 86_400_000), { notify: false });
    return {
      count,
      message: count ? `Đã gửi email với ${count} việc làm phù hợp` : 'Chưa có việc làm nào phù hợp trong 30 ngày qua',
    };
  }
}
