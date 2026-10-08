import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Repository } from 'typeorm';
import { paginate } from '../../common/dto/pagination.dto';
import { CompanyVerification, JobStatus, NotificationType, ReportStatus, ReportTargetType, UserStatus } from '../../common/enums';
import { AuthUser } from '../../common/types/auth-user';
import { Application } from '../applications/entities/application.entity';
import { AuditService } from '../audit/audit.service';
import { TokenService } from '../auth/token.service';
import { Company } from '../companies/entities/company.entity';
import { EmployerProfile } from '../companies/entities/employer-profile.entity';
import { Job } from '../jobs/entities/job.entity';
import { NewNotification, NotificationsService } from '../notifications/notifications.service';
import { Report } from '../reports/entities/report.entity';
import { FileTokenService } from '../storage/file-token.service';
import { StorageService } from '../storage/storage.service';
import { User } from '../users/entities/user.entity';
import { AdminCompaniesQuery, AdminJobsQuery, AdminReportsQuery, ResolveReportDto } from './dto/admin.dto';

const esc = (s: string) => `%${s.replace(/[[\]%_]/g, (c) => `[${c}]`)}%`;

@Injectable()
export class AdminModerationService {
  constructor(
    private readonly audit: AuditService,
    private readonly notifications: NotificationsService,
    private readonly storage: StorageService,
    private readonly tokens: TokenService,
    private readonly fileTokens: FileTokenService,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    @InjectRepository(Report) private readonly reports: Repository<Report>,
    @InjectRepository(EmployerProfile) private readonly employers: Repository<EmployerProfile>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  // ================= Tin tuyển dụng =================

  async listJobs(q: AdminJobsQuery) {
    const qb = this.jobs
      .createQueryBuilder('j')
      .innerJoinAndSelect('j.company', 'c')
      .leftJoinAndSelect('j.location', 'l')
      .addSelect("(SELECT COUNT(*) FROM reports r WHERE r.job_id = j.id AND r.status = 'OPEN')", 'open_reports');
    if (q.status) qb.andWhere('j.status = :st', { st: q.status });
    if (q.q) qb.andWhere('(j.title LIKE :kw OR c.name LIKE :kw)', { kw: esc(q.q) });
    const total = await qb.getCount();
    // Tin chờ duyệt: cũ nhất lên trước (xử lý theo thứ tự)
    const { entities, raw } = await qb
      .orderBy('j.updated_at', q.status === JobStatus.PENDING ? 'ASC' : 'DESC')
      .offset((q.page - 1) * q.limit)
      .limit(q.limit)
      .getRawAndEntities();
    return paginate(
      entities.map((j, i) => ({
        id: j.id,
        slug: j.slug,
        title: j.title,
        status: j.status,
        updatedAt: j.updatedAt,
        deadline: j.deadline,
        location: j.location?.name ?? null,
        rejectReason: j.rejectReason,
        openReports: Number(raw[i]?.open_reports ?? 0),
        company: { id: j.company.id, name: j.company.name, verificationStatus: j.company.verificationStatus },
      })),
      total,
      q.page,
      q.limit,
    );
  }

  async jobDetail(id: number) {
    const j = await this.jobs.findOne({ where: { id }, relations: { company: true, location: true, categories: true, skills: true, postedBy: true } });
    if (!j) throw new NotFoundException('Không tìm thấy tin');
    return {
      id: j.id,
      slug: j.slug,
      title: j.title,
      status: j.status,
      rejectReason: j.rejectReason,
      description: j.description,
      requirements: j.requirements,
      benefits: j.benefits,
      salaryMin: j.salaryMin === null ? null : Number(j.salaryMin),
      salaryMax: j.salaryMax === null ? null : Number(j.salaryMax),
      salaryNegotiable: j.salaryNegotiable,
      jobType: j.jobType,
      level: j.level,
      experienceYears: j.experienceYears,
      quantity: j.quantity,
      deadline: j.deadline,
      workAddress: j.workAddress,
      location: j.location?.name ?? null,
      categories: (j.categories ?? []).map((c) => c.name),
      skills: (j.skills ?? []).map((s) => s.name),
      postedBy: j.postedBy?.email ?? null,
      publishedAt: j.publishedAt,
      updatedAt: j.updatedAt,
      applications: await this.jobs.manager.countBy(Application, { jobId: j.id }),
      company: {
        id: j.company.id,
        name: j.company.name,
        slug: j.company.slug,
        taxCode: j.company.taxCode,
        verificationStatus: j.company.verificationStatus,
        logoUrl: this.storage.publicUrl(j.company.logoUrl),
      },
    };
  }

  async approveJob(actor: AuthUser, id: number, ip?: string) {
    const j = await this.findJob(id);
    if (j.status !== JobStatus.PENDING) throw new BadRequestException('Chỉ duyệt được tin đang chờ duyệt');
    await this.jobs.update(id, { status: JobStatus.APPROVED, rejectReason: null, publishedAt: j.publishedAt ?? new Date() });
    await this.notifyCompany(j.companyId, { type: NotificationType.JOB_APPROVED, title: 'Tin tuyển dụng đã được duyệt', message: j.title, link: '/employer/jobs?status=APPROVED' });
    await this.audit.log({ actorId: actor.id, action: 'JOB_APPROVE', entityType: 'job', entityId: id, metadata: { title: j.title }, ip });
    return this.jobDetail(id);
  }

  async rejectJob(actor: AuthUser, id: number, reason: string, ip?: string) {
    const j = await this.findJob(id);
    if (j.status !== JobStatus.PENDING) throw new BadRequestException('Chỉ từ chối được tin đang chờ duyệt');
    await this.jobs.update(id, { status: JobStatus.REJECTED, rejectReason: reason });
    await this.notifyCompany(j.companyId, { type: NotificationType.JOB_REJECTED, title: 'Tin tuyển dụng bị từ chối', message: `${j.title}: ${reason}`, link: '/employer/jobs?status=REJECTED' });
    await this.audit.log({ actorId: actor.id, action: 'JOB_REJECT', entityType: 'job', entityId: id, metadata: { title: j.title, reason }, ip });
    return this.jobDetail(id);
  }

  /** Gỡ tin đang hiển thị vì vi phạm (chuyển REJECTED kèm lý do để NTD sửa lại) */
  async hideJob(actor: AuthUser, id: number, reason: string, ip?: string) {
    const j = await this.findJob(id);
    if (j.status !== JobStatus.APPROVED) throw new BadRequestException('Chỉ gỡ được tin đang hiển thị');
    await this.jobs.update(id, { status: JobStatus.REJECTED, rejectReason: `Gỡ do vi phạm: ${reason}` });
    await this.notifyCompany(j.companyId, { type: NotificationType.JOB_REJECTED, title: 'Tin tuyển dụng bị gỡ do vi phạm', message: `${j.title}: ${reason}`, link: '/employer/jobs?status=REJECTED' });
    await this.audit.log({ actorId: actor.id, action: 'JOB_HIDE', entityType: 'job', entityId: id, metadata: { title: j.title, reason }, ip });
    return this.jobDetail(id);
  }

  // ================= Công ty =================

  async listCompanies(q: AdminCompaniesQuery) {
    const qb = this.companies
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.location', 'l')
      .addSelect('(SELECT COUNT(*) FROM jobs j WHERE j.company_id = c.id)', 'job_count')
      .addSelect('(SELECT COUNT(*) FROM employer_profiles e WHERE e.company_id = c.id)', 'employer_count');
    if (q.status) qb.andWhere('c.verification_status = :st', { st: q.status });
    if (q.q) qb.andWhere('(c.name LIKE :kw OR c.tax_code LIKE :kw)', { kw: esc(q.q) });
    const total = await qb.getCount();
    const { entities, raw } = await qb
      .orderBy('c.updated_at', q.status === CompanyVerification.PENDING ? 'ASC' : 'DESC')
      .offset((q.page - 1) * q.limit)
      .limit(q.limit)
      .getRawAndEntities();
    return paginate(
      entities.map((c, i) => ({
        id: c.id,
        name: c.name,
        slug: c.slug,
        taxCode: c.taxCode,
        website: c.website,
        address: c.address,
        location: c.location?.name ?? null,
        logoUrl: this.storage.publicUrl(c.logoUrl),
        verificationStatus: c.verificationStatus,
        verificationNote: c.verificationNote,
        hasLicense: !!c.licenseUrl,
        updatedAt: c.updatedAt,
        jobs: Number(raw[i]?.job_count ?? 0),
        employers: Number(raw[i]?.employer_count ?? 0),
      })),
      total,
      q.page,
      q.limit,
    );
  }

  async licenseLink(actorId: number, id: number) {
    const c = await this.findCompany(id);
    if (!c.licenseUrl) throw new NotFoundException('Công ty chưa gửi giấy phép');
    return this.fileTokens.sign({ k: c.licenseUrl, n: `giay-phep-${c.slug}${c.licenseUrl.slice(c.licenseUrl.lastIndexOf('.'))}`, u: actorId });
  }

  async verifyCompany(actor: AuthUser, id: number, ip?: string) {
    const c = await this.findCompany(id);
    if (c.verificationStatus !== CompanyVerification.PENDING) throw new BadRequestException('Công ty không ở trạng thái chờ xác minh');
    await this.companies.update(id, { verificationStatus: CompanyVerification.VERIFIED, verifiedAt: new Date(), verificationNote: null });
    await this.notifyCompany(id, { type: NotificationType.COMPANY_VERIFIED, title: 'Công ty đã được xác minh', message: c.name, link: '/employer/company' });
    await this.audit.log({ actorId: actor.id, action: 'COMPANY_VERIFY', entityType: 'company', entityId: id, metadata: { name: c.name }, ip });
    return { id, verificationStatus: CompanyVerification.VERIFIED };
  }

  async rejectCompany(actor: AuthUser, id: number, reason: string, ip?: string) {
    const c = await this.findCompany(id);
    if (c.verificationStatus !== CompanyVerification.PENDING && c.verificationStatus !== CompanyVerification.VERIFIED) {
      throw new BadRequestException('Không có yêu cầu xác minh để từ chối');
    }
    await this.companies.update(id, { verificationStatus: CompanyVerification.REJECTED, verificationNote: reason, verifiedAt: null });
    await this.notifyCompany(id, { type: NotificationType.COMPANY_REJECTED, title: 'Yêu cầu xác minh công ty bị từ chối', message: reason, link: '/employer/company' });
    await this.audit.log({ actorId: actor.id, action: 'COMPANY_REJECT', entityType: 'company', entityId: id, metadata: { name: c.name, reason }, ip });
    return { id, verificationStatus: CompanyVerification.REJECTED };
  }

  // ================= Báo cáo vi phạm =================

  async listReports(q: AdminReportsQuery) {
    const [rows, total] = await this.reports.findAndCount({
      where: q.status ? { status: q.status } : {},
      relations: { reporter: true, job: { company: true }, company: true, resolvedBy: true },
      order: { createdAt: q.status === ReportStatus.OPEN ? 'ASC' : 'DESC' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    });
    return paginate(
      rows.map((r) => ({
        id: r.id,
        targetType: r.targetType,
        reason: r.reason,
        details: r.details,
        status: r.status,
        createdAt: r.createdAt,
        reporter: r.reporter ? { id: r.reporter.id, email: r.reporter.email } : null,
        job: r.job ? { id: r.job.id, title: r.job.title, slug: r.job.slug, status: r.job.status, company: r.job.company?.name } : null,
        company: r.company ? { id: r.company.id, name: r.company.name, slug: r.company.slug } : null,
        resolutionNote: r.resolutionNote,
        resolvedAt: r.resolvedAt,
        resolvedBy: r.resolvedBy?.email ?? null,
      })),
      total,
      q.page,
      q.limit,
    );
  }

  /**
   * Xử lý báo cáo. Các báo cáo đang mở khác cùng đối tượng cũng được đóng theo.
   * - HIDE_JOB: gỡ tin (chỉ với báo cáo tin)
   * - WARN: gửi cảnh cáo tới NTD của công ty
   * - LOCK_USER: khóa toàn bộ tài khoản NTD của công ty
   */
  async resolveReport(actor: AuthUser, id: number, dto: ResolveReportDto, ip?: string) {
    const r = await this.reports.findOne({ where: { id }, relations: { job: true, company: true } });
    if (!r) throw new NotFoundException('Không tìm thấy báo cáo');
    if (r.status !== ReportStatus.OPEN) throw new BadRequestException('Báo cáo đã được xử lý');

    const companyId = r.targetType === ReportTargetType.JOB ? r.job?.companyId : r.companyId;
    const targetName = r.targetType === ReportTargetType.JOB ? `tin "${r.job?.title}"` : `công ty "${r.company?.name}"`;

    if (dto.action === 'HIDE_JOB') {
      if (r.targetType !== ReportTargetType.JOB || !r.job) throw new BadRequestException('Chỉ ẩn được khi báo cáo là tin tuyển dụng');
      if (r.job.status === JobStatus.APPROVED) await this.hideJob(actor, r.job.id, dto.note, ip);
    }
    if (dto.action === 'WARN' && companyId) {
      await this.notifyCompany(companyId, {
        type: NotificationType.SYSTEM,
        title: 'Cảnh cáo vi phạm từ quản trị viên',
        message: `Liên quan ${targetName}: ${dto.note}. Tái phạm có thể bị khóa tài khoản.`,
        link: '/employer/jobs',
      });
    }
    if (dto.action === 'LOCK_USER' && companyId) {
      const emps = await this.employers.find({ where: { companyId }, select: { userId: true } });
      const ids = emps.map((e) => e.userId);
      if (ids.length) {
        await this.users.update({ id: In(ids) }, { status: UserStatus.LOCKED, lockedReason: `Vi phạm: ${dto.note}` });
        for (const uid of ids) await this.tokens.revokeAllRefresh(uid);
      }
    }

    // Đóng mọi báo cáo đang mở cùng đối tượng
    const sameTarget = r.targetType === ReportTargetType.JOB ? { jobId: r.jobId! } : { companyId: r.companyId! };
    const res = await this.reports.update(
      { ...sameTarget, status: ReportStatus.OPEN },
      { status: ReportStatus.RESOLVED, resolvedById: actor.id, resolvedAt: new Date(), resolutionNote: `[${dto.action}] ${dto.note}` },
    );
    await this.audit.log({ actorId: actor.id, action: 'REPORT_RESOLVE', entityType: 'report', entityId: id, metadata: { action: dto.action, note: dto.note, target: targetName, closed: res.affected }, ip });
    return { id, status: ReportStatus.RESOLVED, closed: res.affected ?? 1 };
  }

  async dismissReport(actor: AuthUser, id: number, note: string, ip?: string) {
    const r = await this.reports.findOneBy({ id });
    if (!r) throw new NotFoundException('Không tìm thấy báo cáo');
    if (r.status !== ReportStatus.OPEN) throw new BadRequestException('Báo cáo đã được xử lý');
    await this.reports.update(id, { status: ReportStatus.DISMISSED, resolvedById: actor.id, resolvedAt: new Date(), resolutionNote: note });
    await this.audit.log({ actorId: actor.id, action: 'REPORT_DISMISS', entityType: 'report', entityId: id, metadata: { note }, ip });
    return { id, status: ReportStatus.DISMISSED };
  }

  // ================= Helpers =================

  private async findJob(id: number) {
    const j = await this.jobs.findOneBy({ id });
    if (!j) throw new NotFoundException('Không tìm thấy tin');
    return j;
  }

  private async findCompany(id: number) {
    const c = await this.companies.findOneBy({ id });
    if (!c) throw new NotFoundException('Không tìm thấy công ty');
    return c;
  }

  private async notifyCompany(companyId: number, n: Omit<NewNotification, 'userId'>) {
    const emps = await this.employers.find({ where: { companyId }, select: { userId: true } });
    await this.notifications.create(emps.map((e) => ({ ...n, userId: e.userId })));
  }
}
