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
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { ApiBearerAuth, ApiBody, ApiConsumes, ApiTags } from '@nestjs/swagger';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { AuthUser } from '../../common/types/auth-user';
import type { UploadedFileData } from '../storage/storage.service';
import { CandidatesService } from './candidates.service';
import { CvSettingsDto } from './dto/cv-settings.dto';
import {
  EducationDto,
  ExperienceDto,
  UpdateEducationDto,
  UpdateExperienceDto,
  UpdateProfileDto,
  UpdateSkillsDto,
} from './dto/candidate.dto';

/** multer mặc định lưu file trong bộ nhớ (buffer) khi không cấu hình storage/dest */
const upload = (maxMb: number) =>
  FileInterceptor('file', { limits: { fileSize: maxMb * 1024 * 1024 + 1, files: 1 } });
const FILE_BODY = { schema: { type: 'object', properties: { file: { type: 'string', format: 'binary' } } } };

@ApiTags('candidate')
@ApiBearerAuth()
@Roles(UserRole.CANDIDATE)
@Controller('candidate')
export class CandidatesController {
  constructor(private readonly service: CandidatesService) {}

  // ===== Hồ sơ =====

  @Get('profile')
  getProfile(@CurrentUser() u: AuthUser) {
    return this.service.getFullProfile(u.id);
  }

  @Patch('profile')
  updateProfile(@CurrentUser() u: AuthUser, @Body() dto: UpdateProfileDto) {
    return this.service.updateProfile(u.id, dto);
  }

  @Post('profile/avatar')
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY)
  @UseInterceptors(upload(2))
  uploadAvatar(@CurrentUser() u: AuthUser, @UploadedFile() file: UploadedFileData) {
    return this.service.updateAvatar(u.id, file);
  }

  // ===== CV online =====

  @Get('cv-settings')
  getCvSettings(@CurrentUser() u: AuthUser) {
    return this.service.getCvSettings(u.id);
  }

  @Put('cv-settings')
  saveCvSettings(@CurrentUser() u: AuthUser, @Body() dto: CvSettingsDto) {
    return this.service.saveCvSettings(u.id, dto);
  }

  @Put('skills')
  updateSkills(@CurrentUser() u: AuthUser, @Body() dto: UpdateSkillsDto) {
    return this.service.updateSkills(u.id, dto.skillIds);
  }

  // ===== Học vấn =====

  @Post('educations')
  addEducation(@CurrentUser() u: AuthUser, @Body() dto: EducationDto) {
    return this.service.addEducation(u.id, dto);
  }

  @Patch('educations/:id')
  updateEducation(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateEducationDto) {
    return this.service.updateEducation(u.id, id, dto);
  }

  @Delete('educations/:id')
  @HttpCode(204)
  removeEducation(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.removeEducation(u.id, id);
  }

  // ===== Kinh nghiệm =====

  @Post('experiences')
  addExperience(@CurrentUser() u: AuthUser, @Body() dto: ExperienceDto) {
    return this.service.addExperience(u.id, dto);
  }

  @Patch('experiences/:id')
  updateExperience(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: UpdateExperienceDto) {
    return this.service.updateExperience(u.id, id, dto);
  }

  @Delete('experiences/:id')
  @HttpCode(204)
  removeExperience(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.removeExperience(u.id, id);
  }

  // ===== CV =====

  @Get('resumes')
  listResumes(@CurrentUser() u: AuthUser) {
    return this.service.listResumes(u.id);
  }

  @Post('resumes')
  @ApiConsumes('multipart/form-data')
  @ApiBody(FILE_BODY)
  @UseInterceptors(upload(20)) // giới hạn thật lấy từ cấu hình hệ thống
  uploadResume(@CurrentUser() u: AuthUser, @UploadedFile() file: UploadedFileData) {
    return this.service.uploadResume(u.id, file);
  }

  @Patch('resumes/:id/default')
  setDefault(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.setDefaultResume(u.id, id);
  }

  @Delete('resumes/:id')
  @HttpCode(204)
  removeResume(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.removeResume(u.id, id);
  }

  /** Link tải/xem CV có chữ ký (hết hạn sau 5 phút) */
  @Get('resumes/:id/link')
  resumeLink(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.service.resumeLink(u.id, id);
  }
}
