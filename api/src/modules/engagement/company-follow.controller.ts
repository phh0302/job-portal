import { Controller, Get, Param, ParseIntPipe } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '../../common/enums';
import { AuthUser } from '../../common/types/auth-user';
import { EngagementService } from './engagement.service';

@ApiTags('companies')
@Public()
@Controller('companies')
export class CompanyFollowController {
  constructor(private readonly service: EngagementService) {}

  /** Số người theo dõi + người đang xem có theo dõi không */
  @Get(':id/followers')
  state(@Param('id', ParseIntPipe) id: number, @CurrentUser() user?: AuthUser) {
    return this.service.followState(user?.role === UserRole.CANDIDATE ? user.id : null, id);
  }
}
