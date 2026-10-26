import { Controller, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { AuthUser } from '../../common/types/auth-user';
import { ScreeningService } from './screening.service';

@ApiTags('employer')
@ApiBearerAuth()
@Roles(UserRole.EMPLOYER)
@Controller('employer')
export class ScreeningController {
  constructor(private readonly service: ScreeningService) {}

  @Get('screening/quota')
  quota(@CurrentUser() u: AuthUser) {
    return this.service.quota(u.id);
  }

  @Get('applications/:id/screening')
  latest(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.latest(u.id, id);
  }

  @Post('applications/:id/screening')
  @HttpCode(200)
  @RateLimit({ limit: 10, windowSec: 60 })
  screen(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.screen(u.id, id);
  }

  @Post('jobs/:id/screen-new')
  @HttpCode(200)
  @RateLimit({ limit: 5, windowSec: 60 })
  screenNew(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.screenNew(u.id, id);
  }
}
