import { Controller, DefaultValuePipe, Get, ParseIntPipe, Query } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { AuthUser } from '../../common/types/auth-user';
import { RecommendationsService } from './recommendations.service';

@ApiTags('candidate')
@ApiBearerAuth()
@Roles(UserRole.CANDIDATE)
@Controller('candidate/recommendations')
export class RecommendationsController {
  constructor(private readonly service: RecommendationsService) {}

  /** Việc làm gợi ý, sắp theo % phù hợp */
  @Get()
  list(@CurrentUser() u: AuthUser, @Query('limit', new DefaultValuePipe(20), ParseIntPipe) limit: number) {
    return this.service.recommend(u.id, Math.min(Math.max(limit, 1), 50));
  }

  /** Nhận xét của AI (Claude) cho các việc đứng đầu — có cache, giới hạn tần suất để tiết kiệm chi phí */
  @Get('insights')
  @RateLimit({ limit: 10, windowSec: 3600 })
  insights(@CurrentUser() u: AuthUser) {
    return this.service.insights(u.id);
  }
}
