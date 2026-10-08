import { Body, Controller, Delete, Get, HttpCode, Param, ParseIntPipe, Patch, Post, Put, Query, Req } from '@nestjs/common';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Roles } from '../../common/decorators/roles.decorator';
import { UserRole } from '../../common/enums';
import { AuthUser } from '../../common/types/auth-user';
import { AuditService } from '../audit/audit.service';
import { MailAdminService } from '../mail/mail-admin.service';
import { PagesService } from '../content/pages.service';
import { SettingsService } from '../content/settings.service';
import { AdminCatalogService } from './admin-catalog.service';
import { AdminDashboardService } from './admin-dashboard.service';
import { AdminModerationService } from './admin-moderation.service';
import { AdminUsersService } from './admin-users.service';
import {
  AdminCompaniesQuery,
  AdminJobsQuery,
  AdminReportsQuery,
  AdminUsersQuery,
  AuditQuery,
  CategoryDto,
  CreateAdminDto,
  EmailQuery,
  GrowthQuery,
  LocationDto,
  LockUserDto,
  NameDto,
  PageDto,
  ReasonDto,
  ResolveReportDto,
} from './dto/admin.dto';

@ApiTags('admin')
@ApiBearerAuth()
@Roles(UserRole.ADMIN)
@Controller('admin')
export class AdminController {
  constructor(
    private readonly dashboard: AdminDashboardService,
    private readonly users: AdminUsersService,
    private readonly moderation: AdminModerationService,
    private readonly catalog: AdminCatalogService,
    private readonly pages: PagesService,
    private readonly settings: SettingsService,
    private readonly audit: AuditService,
    private readonly mailAdmin: MailAdminService,
  ) {}

  // ===== 6.1 Dashboard =====
  @Get('dashboard')
  overview() {
    return this.dashboard.overview();
  }

  @Get('dashboard/growth')
  growth(@Query() q: GrowthQuery) {
    return this.dashboard.growth(q.period);
  }

  // ===== 6.2 Người dùng =====
  @Get('users')
  listUsers(@Query() q: AdminUsersQuery) {
    return this.users.list(q);
  }

  @Get('users/:id')
  userDetail(@Param('id', ParseIntPipe) id: number) {
    return this.users.detail(id);
  }

  @Post('users/:id/lock')
  @HttpCode(200)
  lock(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: LockUserDto, @Req() req: Request) {
    return this.users.lock(u, id, dto.reason, req.ip);
  }

  @Post('users/:id/unlock')
  @HttpCode(200)
  unlock(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.users.unlock(u, id, req.ip);
  }

  @Post('admins')
  createAdmin(@CurrentUser() u: AuthUser, @Body() dto: CreateAdminDto, @Req() req: Request) {
    return this.users.createAdmin(u, dto, req.ip);
  }

  @Get('me')
  async me(@CurrentUser() u: AuthUser) {
    return { isSuperAdmin: await this.users.isSuper(u.id) };
  }

  // ===== 6.3 Kiểm duyệt =====
  @Get('jobs')
  listJobs(@Query() q: AdminJobsQuery) {
    return this.moderation.listJobs(q);
  }

  @Get('jobs/:id')
  jobDetail(@Param('id', ParseIntPipe) id: number) {
    return this.moderation.jobDetail(id);
  }

  @Post('jobs/:id/approve')
  @HttpCode(200)
  approve(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.moderation.approveJob(u, id, req.ip);
  }

  @Post('jobs/:id/reject')
  @HttpCode(200)
  reject(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ReasonDto, @Req() req: Request) {
    return this.moderation.rejectJob(u, id, dto.reason, req.ip);
  }

  @Post('jobs/:id/hide')
  @HttpCode(200)
  hide(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ReasonDto, @Req() req: Request) {
    return this.moderation.hideJob(u, id, dto.reason, req.ip);
  }

  @Get('companies')
  listCompanies(@Query() q: AdminCompaniesQuery) {
    return this.moderation.listCompanies(q);
  }

  @Get('companies/:id/license-link')
  licenseLink(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) {
    return this.moderation.licenseLink(u.id, id);
  }

  @Post('companies/:id/verify')
  @HttpCode(200)
  verify(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    return this.moderation.verifyCompany(u, id, req.ip);
  }

  @Post('companies/:id/reject')
  @HttpCode(200)
  rejectCompany(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ReasonDto, @Req() req: Request) {
    return this.moderation.rejectCompany(u, id, dto.reason, req.ip);
  }

  @Get('reports')
  listReports(@Query() q: AdminReportsQuery) {
    return this.moderation.listReports(q);
  }

  @Post('reports/:id/resolve')
  @HttpCode(200)
  resolve(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ResolveReportDto, @Req() req: Request) {
    return this.moderation.resolveReport(u, id, dto, req.ip);
  }

  @Post('reports/:id/dismiss')
  @HttpCode(200)
  dismiss(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: ReasonDto, @Req() req: Request) {
    return this.moderation.dismissReport(u, id, dto.reason, req.ip);
  }

  // ===== 6.4 Danh mục =====
  @Get('categories') listCategories() { return this.catalog.list('category'); }
  @Post('categories') createCategory(@CurrentUser() u: AuthUser, @Body() dto: CategoryDto) { return this.catalog.create(u, 'category', dto); }
  @Patch('categories/:id') updateCategory(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: CategoryDto) { return this.catalog.update(u, 'category', id, dto); }
  @Delete('categories/:id') @HttpCode(204) removeCategory(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) { return this.catalog.remove(u, 'category', id); }

  @Get('skills') listSkills() { return this.catalog.list('skill'); }
  @Post('skills') createSkill(@CurrentUser() u: AuthUser, @Body() dto: NameDto) { return this.catalog.create(u, 'skill', dto); }
  @Patch('skills/:id') updateSkill(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: NameDto) { return this.catalog.update(u, 'skill', id, dto); }
  @Delete('skills/:id') @HttpCode(204) removeSkill(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) { return this.catalog.remove(u, 'skill', id); }

  @Get('locations') listLocations() { return this.catalog.list('location'); }
  @Post('locations') createLocation(@CurrentUser() u: AuthUser, @Body() dto: LocationDto) { return this.catalog.create(u, 'location', dto); }
  @Patch('locations/:id') updateLocation(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Body() dto: LocationDto) { return this.catalog.update(u, 'location', id, dto); }
  @Delete('locations/:id') @HttpCode(204) removeLocation(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number) { return this.catalog.remove(u, 'location', id); }

  // ===== Trang tĩnh & cấu hình =====
  @Get('pages') listPages() { return this.pages.adminList(); }

  @Put('pages/:slug')
  async savePage(@CurrentUser() u: AuthUser, @Param('slug') slug: string, @Body() dto: PageDto, @Req() req: Request) {
    const page = await this.pages.upsert(slug, dto, u.id);
    await this.audit.log({ actorId: u.id, action: 'PAGE_UPDATE', entityType: 'page', entityId: slug, metadata: { title: dto.title }, ip: req.ip });
    return page;
  }

  @Get('settings')
  async getSettings() {
    return { values: await this.settings.all(), definitions: this.settings.definitions() };
  }

  @Put('settings')
  async saveSettings(@CurrentUser() u: AuthUser, @Body() body: Record<string, unknown>, @Req() req: Request) {
    const values = await this.settings.update(body);
    await this.audit.log({ actorId: u.id, action: 'SETTINGS_UPDATE', entityType: 'settings', metadata: body, ip: req.ip });
    return { values, definitions: this.settings.definitions() };
  }

  // ===== Hàng đợi email =====
  @Get('emails')
  emails(@Query() q: EmailQuery) {
    return this.mailAdmin.list(q);
  }

  @Post('emails/:id/retry')
  @HttpCode(200)
  async retryEmail(@CurrentUser() u: AuthUser, @Param('id', ParseIntPipe) id: number, @Req() req: Request) {
    const r = await this.mailAdmin.retry(String(id));
    await this.audit.log({ actorId: u.id, action: 'EMAIL_RETRY', entityType: 'email', entityId: id, ip: req.ip });
    return r;
  }

  // ===== Audit log =====
  @Get('audit-logs')
  auditLogs(@Query() q: AuditQuery) {
    return this.audit.list(q);
  }

  @Get('audit-logs/actions')
  auditActions() {
    return this.audit.actions();
  }
}
