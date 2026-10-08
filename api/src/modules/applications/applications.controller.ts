import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { AuthUser } from '../../common/types/auth-user';
import { ApplicationsService } from './applications.service';
import { ApplyDto, MyApplicationsQuery } from './dto/apply.dto';

@ApiTags('candidate')
@ApiBearerAuth()
@Roles(UserRole.CANDIDATE)
@Controller('candidate/applications')
export class CandidateApplicationsController {
  constructor(private readonly service: ApplicationsService) {}

  @Post()
  @RateLimit({ limit: 20, windowSec: 60 })
  apply(@CurrentUser() u: AuthUser, @Body() dto: ApplyDto) {
    return this.service.apply(u.id, dto);
  }

  @Get()
  list(@CurrentUser() u: AuthUser, @Query() q: MyApplicationsQuery) {
    return this.service.listMine(u.id, q.page, q.limit);
  }

  @Post(':id/withdraw')
  @HttpCode(200)
  withdraw(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.withdraw(u.id, id);
  }
}
