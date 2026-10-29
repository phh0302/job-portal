import { Body, Controller, Get, HttpCode, Param, ParseIntPipe, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import { IsInt, IsOptional } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { AuthUser } from '../../common/types/auth-user';
import { CandidateCheckService } from './candidate-check.service';

class CvCheckDto {
  /** Bỏ trống = kiểm tra bằng hồ sơ (chưa có CV) */
  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  resumeId?: number;
}

@ApiTags('candidate')
@ApiBearerAuth()
@Roles(UserRole.CANDIDATE)
@Controller('candidate')
export class CandidateCheckController {
  constructor(private readonly service: CandidateCheckService) {}

  @Get('cv-check/quota')
  quota(@CurrentUser() u: AuthUser) {
    return this.service.quota(u.id);
  }

  @Get('jobs/:jobId/cv-check')
  latest(@CurrentUser() u: AuthUser, @Param('jobId', ParseIntPipe) jobId: number) {
    return this.service.latest(u.id, jobId);
  }

  @Post('jobs/:jobId/cv-check')
  @HttpCode(200)
  @RateLimit({ limit: 6, windowSec: 60 })
  check(@CurrentUser() u: AuthUser, @Param('jobId', ParseIntPipe) jobId: number, @Body() dto: CvCheckDto) {
    return this.service.check(u.id, jobId, dto.resumeId);
  }
}
