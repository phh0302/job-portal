import { Controller, Get, Param, Query } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { UserRole } from '../../common/enums';
import { AuthUser } from '../../common/types/auth-user';
import { ApplicationsService } from '../applications/applications.service';
import { SearchJobsDto } from './dto/search-jobs.dto';
import { JobsService } from './jobs.service';

@ApiTags('jobs')
@Public()
@Controller('jobs')
export class JobsController {
  constructor(
    private readonly jobs: JobsService,
    private readonly applications: ApplicationsService,
  ) {}

  @Get()
  search(@Query() dto: SearchJobsDto) {
    return this.jobs.search(dto);
  }

  /** Nếu là ứng viên đã đăng nhập, kèm trạng thái đơn ứng tuyển của họ */
  @Get(':slug')
  async detail(@Param('slug') slug: string, @CurrentUser() user?: AuthUser) {
    const job = await this.jobs.findBySlug(slug);
    const myApplication =
      user?.role === UserRole.CANDIDATE ? await this.applications.findMineForJob(user.id, job.id) : null;
    return { ...job, myApplication };
  }

  @Get(':slug/similar')
  similar(@Param('slug') slug: string) {
    return this.jobs.similar(slug);
  }
}
