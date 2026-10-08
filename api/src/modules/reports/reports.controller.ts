import { Body, Controller, Get, Post } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { CreateReportDto, REPORT_REASONS } from './dto/report.dto';
import { ReportsService } from './reports.service';

@ApiTags('reports')
@Controller('reports')
export class ReportsController {
  constructor(private readonly service: ReportsService) {}

  @Public()
  @Get('reasons')
  reasons() {
    return REPORT_REASONS;
  }

  @ApiBearerAuth()
  @Post()
  @RateLimit({ limit: 5, windowSec: 600 })
  create(@CurrentUser() u: AuthUser, @Body() dto: CreateReportDto) {
    return this.service.create(u.id, dto);
  }
}
