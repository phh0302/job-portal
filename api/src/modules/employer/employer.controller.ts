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
  Query,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { Transform, Type } from 'class-transformer';
import { IsInt, IsOptional, IsString, MaxLength, Min } from 'class-validator';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { PaginationDto } from '../../common/dto/pagination.dto';
import { UserRole } from '../../common/enums';
import { AuthUser } from '../../common/types/auth-user';
import type { UploadedFileData } from '../storage/storage.service';
import { EmployerApplicationsService } from './applications.service';
import { CandidateSearchService } from './candidate-search.service';
import { EmployerCompanyService } from './company.service';
import { EmployerDashboardService } from './dashboard.service';
import { ApplicationNoteDto, EmployerApplicationsQuery, UpdateApplicationStatusDto } from './dto/application.dto';
import { CompanyDto, EmployerProfileDto, UpdateCompanyDto } from './dto/company.dto';
import { ExtendJobDto, JobDto, MyJobsQuery, UpdateJobDto } from './dto/job.dto';
import { EmployerJobsService } from './jobs.service';
import { upload } from '../../common/upload';

const FILE_BODY = { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } };

class CandidateSearchQuery extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  q?: string;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  skillId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  locationId?: number;

  @ApiPropertyOptional()
  @IsOptional()
  @Type(() => Number)
  @IsInt()
  @Min(0)
  minExperience?: number;
}

@ApiTags('employer')
@ApiBearerAuth()
@Roles(UserRole.EMPLOYER)
@Controller('employer')
export class EmployerController {
  constructor(
    private readonly company: EmployerCompanyService,
    private readonly jobs: EmployerJobsService,
    private readonly applications: EmployerApplicationsService,
    private readonly dashboard: EmployerDashboardService,
    private readonly candidates: CandidateSearchService,
  ) {}

  // ===== 5.1 Hồ sơ & công ty =====

  @Get('me')
  me(@CurrentUser() u: AuthUser) {
    return this.company.me(u.id);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() u: AuthUser, @Body() dto: EmployerProfileDto) {
    return this.company.updateProfile(u.id, dto);
  }

  @Post('company')
  createCompany(@CurrentUser() u: AuthUser, @Body() dto: CompanyDto) {
    return this.company.create(u.id, dto);
  }

  @Patch('company')
  updateCompany(@CurrentUser() u: AuthUser, @Body() dto: UpdateCompanyDto) {
    return this.company.update(u.id, dto);
  }

  @Post('company/logo')
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY)
  @UseInterceptors(upload(2))
  uploadLogo(@CurrentUser() u: AuthUser, @UploadedFile() file: UploadedFileData) {
    return this.company.uploadImage(u.id, 'logo', file);
  }

  @Post('company/cover')
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY)
  @UseInterceptors(upload(3))
  uploadCover(@CurrentUser() u: AuthUser, @UploadedFile() file: UploadedFileData) {
    return this.company.uploadImage(u.id, 'cover', file);
  }

  @Post('company/verification')
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY)
  @UseInterceptors(upload(5))
  requestVerification(@CurrentUser() u: AuthUser, @UploadedFile() file: UploadedFileData) {
    return this.company.requestVerification(u.id, file);
  }

  // ===== 5.2 Tin tuyển dụng =====

  @Get('jobs')
  listJobs(@CurrentUser() u: AuthUser, @Query() q: MyJobsQuery) {
    return this.jobs.list(u.id, q);
  }

  @Get('jobs/:id')
  jobDetail(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.jobs.detail(u.id, id);
  }

  @Post('jobs')
  createJob(@CurrentUser() u: AuthUser, @Body() dto: JobDto) {
    return this.jobs.create(u.id, dto);
  }

  @Patch('jobs/:id')
  updateJob(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateJobDto) {
    return this.jobs.update(u.id, id, dto);
  }

  @Post('jobs/:id/submit')
  @HttpCode(200)
  submitJob(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.jobs.submit(u.id, id);
  }

  @Post('jobs/:id/close')
  @HttpCode(200)
  closeJob(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.jobs.close(u.id, id);
  }

  @Post('jobs/:id/reopen')
  @HttpCode(200)
  reopenJob(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.jobs.reopen(u.id, id);
  }

  @Post('jobs/:id/extend')
  @HttpCode(200)
  extendJob(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ExtendJobDto) {
    return this.jobs.extend(u.id, id, dto.deadline);
  }

  @Delete('jobs/:id')
  @HttpCode(204)
  removeJob(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.jobs.remove(u.id, id);
  }

  // ===== 5.3 Ứng viên =====

  @Get('applications')
  listApplications(@CurrentUser() u: AuthUser, @Query() q: EmployerApplicationsQuery) {
    return this.applications.list(u.id, q);
  }

  @Get('applications/:id')
  applicationDetail(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.applications.detail(u.id, id);
  }

  @Patch('applications/:id/status')
  updateStatus(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateApplicationStatusDto) {
    return this.applications.updateStatus(u.id, id, dto);
  }

  @Patch('applications/:id/note')
  updateNote(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ApplicationNoteDto) {
    return this.applications.updateNote(u.id, id, dto.employerNote);
  }

  /** Link xem/tải CV có chữ ký (hết hạn sau 5 phút) */
  @Get('applications/:id/resume-link')
  resumeLink(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.applications.resumeLink(u.id, id);
  }

  @Get('candidates')
  searchCandidates(@Query() q: CandidateSearchQuery) {
    return this.candidates.search(q);
  }

  @Get('candidates/:id')
  candidateDetail(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.candidates.detail(u.id, id);
  }

  // ===== 5.4 Thống kê =====

  @Get('dashboard')
  stats(@CurrentUser() u: AuthUser) {
    return this.dashboard.stats(u.id);
  }
}
