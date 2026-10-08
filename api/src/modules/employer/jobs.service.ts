import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomBytes } from 'crypto';
import { DataSource, In, Repository } from 'typeorm';
import { paginate } from '../../common/dto/pagination.dto';
import { JobStatus, NotificationType } from '../../common/enums';
import { todayVN } from '../../common/utils/date';
import { htmlToPlainText, sanitizeRichText } from '../../common/utils/rich-text';
import { slugify } from '../../common/utils/slug';
import { Application } from '../applications/entities/application.entity';
import { Category } from '../catalog/entities/category.entity';
import { Location } from '../catalog/entities/location.entity';
import { Skill } from '../catalog/entities/skill.entity';
import { Job } from '../jobs/entities/job.entity';
import { SettingsService } from '../content/settings.service';
import { NotificationsService } from '../notifications/notifications.service';
import { JobDto, MyJobsQuery, UpdateJobDto } from './dto/job.dto';
import { EmployerContext } from './employer-context.service';


const addDays = (date: string, days: number) => {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
};

@Injectable()
export class EmployerJobsService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly ctx: EmployerContext,
    private readonly notifications: NotificationsService,
    private readonly settings: SettingsService,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Skill) private readonly skills: Repository<Skill>,
    @InjectRepository(Location) private readonly locations: Repository<Location>,
  ) {}

  async list(userId: number, q: MyJobsQuery) {
    const company = await this.ctx.company(userId);
    const qb = this.jobs
      .createQueryBuilder('j')
      .leftJoinAndSelect('j.location', 'l')
      .addSelect('(SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id)', 'app_count')
      .addSelect(
        "(SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id AND a.status = 'SUBMITTED')",
        'new_count',
      )
      .where('j.company_id = :cid', { cid: company.id });
    if (q.status) qb.andWhere('j.status = :st', { st: q.status });
    if (q.q) qb.andWhere('j.title LIKE :kw', { kw: `%${q.q.replace(/[[\]%_]/g, (c) => `[${c}]`)}%` });

    const total = await qb.getCount();
    const { entities, raw } = await qb
      .orderBy('j.updated_at', 'DESC')
      .addOrderBy('j.id', 'DESC')
      .offset((q.page - 1) * q.limit)
      .limit(q.limit)
      .getRawAndEntities();

    const counts = await this.statusCounts(company.id);
    const items = entities.map((j, i) => ({
      id: j.id,
      slug: j.slug,
      title: j.title,
      status: j.status,
      rejectReason: j.rejectReason,
      deadline: j.deadline,
      publishedAt: j.publishedAt,
      featuredUntil: j.featuredUntil,
      updatedAt: j.updatedAt,
      viewCount: j.viewCount,
      location: j.location?.name ?? null,
      applications: Number(raw[i]?.app_count ?? 0),
      newApplications: Number(raw[i]?.new_count ?? 0),
    }));
    return { ...paginate(items, total, q.page, q.limit), counts };
  }

  async detail(userId: number, id: number) {
    const j = await this.own(userId, id, { categories: true, skills: true, location: true });
    return {
      id: j.id,
      slug: j.slug,
      title: j.title,
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
      locationId: j.locationId,
      workAddress: j.workAddress,
      status: j.status,
      rejectReason: j.rejectReason,
      publishedAt: j.publishedAt,
      featuredUntil: j.featuredUntil,
      viewCount: j.viewCount,
      categoryIds: (j.categories ?? []).map((c) => c.id),
      skillIds: (j.skills ?? []).map((s) => s.id),
    };
  }

  async create(userId: number, dto: JobDto) {
    const company = await this.ctx.company(userId);
    this.cleanContent(dto);
    this.checkSalary(dto.salaryMin, dto.salaryMax);
    await this.checkDeadline(dto.deadline);
    const { categories, skills } = await this.resolveRelations(dto);

    const { submit, categoryIds: _c, skillIds: _s, salaryMin, salaryMax, ...fields } = dto;
    const job = this.jobs.create({
      ...fields,
      salaryMin: salaryMin == null ? null : String(salaryMin),
      salaryMax: salaryMax == null ? null : String(salaryMax),
      companyId: company.id,
      postedById: userId,
      slug: this.makeSlug(dto.title),
      status: submit ? JobStatus.PENDING : JobStatus.DRAFT,
      categories,
      skills,
    });
    const saved = await this.jobs.save(job);
    if (submit) await this.notifyReview(saved.title);
    return this.detail(userId, saved.id);
  }

  async update(userId: number, id: number, dto: UpdateJobDto) {
    const job = await this.own(userId, id, { categories: true, skills: true });
    this.cleanContent(dto);
    if (job.status === JobStatus.PENDING) {
      throw new BadRequestException('Tin đang chờ duyệt, vui lòng đợi kết quả trước khi sửa');
    }
    this.checkSalary(
      dto.salaryMin !== undefined ? dto.salaryMin : job.salaryMin === null ? null : Number(job.salaryMin),
      dto.salaryMax !== undefined ? dto.salaryMax : job.salaryMax === null ? null : Number(job.salaryMax),
    );
    if (dto.deadline && dto.deadline !== job.deadline) await this.checkDeadline(dto.deadline);
    const { categories, skills } = await this.resolveRelations(dto);

    // Có thay đổi nội dung cần duyệt lại không? (so sánh giá trị thật, vì form gửi lên đủ mọi trường)
    const sameIds = (a: number[] | undefined, b: { id: number }[] | undefined) =>
      !a || [...new Set(a)].sort().join(',') === (b ?? []).map((x) => x.id).sort().join(',');
    const contentChanged =
      (['title', 'description', 'requirements', 'benefits'] as const).some(
        (f) => dto[f] !== undefined && (dto[f] ?? null) !== (job[f] ?? null),
      ) ||
      !sameIds(dto.categoryIds, job.categories) ||
      !sameIds(dto.skillIds, job.skills);

    const { submit, categoryIds, skillIds, salaryMin, salaryMax, ...fields } = dto;
    Object.assign(job, fields);
    if (salaryMin !== undefined) job.salaryMin = salaryMin === null ? null : String(salaryMin);
    if (salaryMax !== undefined) job.salaryMax = salaryMax === null ? null : String(salaryMax);
    if (categoryIds) job.categories = categories!;
    if (skillIds) job.skills = skills!;

    // Sửa nội dung tin đang hiển thị -> chuyển về chờ duyệt lại
    const needsReview = job.status === JobStatus.APPROVED && contentChanged;
    if (needsReview || (submit && (job.status === JobStatus.DRAFT || job.status === JobStatus.REJECTED))) {
      job.status = JobStatus.PENDING;
      job.rejectReason = null;
    }
    await this.jobs.save(job);
    if (job.status === JobStatus.PENDING) await this.notifyReview(job.title);
    return this.detail(userId, id);
  }

  async submit(userId: number, id: number) {
    const job = await this.own(userId, id);
    if (job.status !== JobStatus.DRAFT && job.status !== JobStatus.REJECTED) {
      throw new BadRequestException('Chỉ gửi duyệt được tin nháp hoặc tin bị từ chối');
    }
    await this.checkDeadline(job.deadline);
    await this.jobs.update(id, { status: JobStatus.PENDING, rejectReason: null });
    await this.notifyReview(job.title);
    return this.detail(userId, id);
  }

  async close(userId: number, id: number) {
    const job = await this.own(userId, id);
    if (job.status !== JobStatus.APPROVED) throw new BadRequestException('Chỉ đóng được tin đang hiển thị');
    await this.jobs.update(id, { status: JobStatus.CLOSED });
    return this.detail(userId, id);
  }

  /** Mở lại tin đã đóng (tin đã từng được duyệt) */
  async reopen(userId: number, id: number) {
    const job = await this.own(userId, id);
    if (job.status !== JobStatus.CLOSED && job.status !== JobStatus.EXPIRED) {
      throw new BadRequestException('Chỉ mở lại được tin đã đóng hoặc hết hạn');
    }
    if (job.deadline < todayVN()) throw new BadRequestException('Tin đã quá hạn nộp, vui lòng gia hạn');
    await this.jobs.update(id, { status: JobStatus.APPROVED });
    return this.detail(userId, id);
  }

  /** Gia hạn hạn nộp; tin hết hạn/đóng sẽ hiển thị lại */
  async extend(userId: number, id: number, deadline: string) {
    const job = await this.own(userId, id);
    if (job.status === JobStatus.PENDING) throw new BadRequestException('Tin đang chờ duyệt');
    await this.checkDeadline(deadline);
    if (deadline <= job.deadline) throw new BadRequestException('Hạn mới phải sau hạn hiện tại');
    const reopen = job.status === JobStatus.EXPIRED || job.status === JobStatus.CLOSED;
    await this.jobs.update(id, { deadline, ...(reopen && { status: JobStatus.APPROVED }) });
    return this.detail(userId, id);
  }

  async remove(userId: number, id: number) {
    await this.own(userId, id);
    if (await this.dataSource.getRepository(Application).existsBy({ jobId: id })) {
      throw new BadRequestException('Tin đã có người ứng tuyển, không thể xóa. Bạn có thể đóng tin.');
    }
    await this.jobs.delete(id);
  }

  // ===== Helpers =====

  /** Làm sạch HTML từ trình soạn thảo + kiểm tra mô tả không rỗng */
  private cleanContent(dto: UpdateJobDto) {
    for (const f of ['description', 'requirements', 'benefits'] as const) {
      if (dto[f] === undefined) continue;
      const clean = sanitizeRichText(dto[f]);
      // Trình soạn thảo trả "<p></p>" khi trống -> coi như không nhập
      (dto as Record<string, unknown>)[f] = clean && htmlToPlainText(clean) ? clean : null;
    }
    if (dto.description === null) throw new BadRequestException('Vui lòng nhập mô tả công việc');
  }

  async own(userId: number, id: number, relations: Record<string, boolean> = {}) {
    const company = await this.ctx.company(userId);
    const job = await this.jobs.findOne({ where: { id, companyId: company.id }, relations });
    if (!job) throw new NotFoundException('Không tìm thấy tin tuyển dụng');
    return job;
  }

  private async statusCounts(companyId: number) {
    const rows: { status: JobStatus; cnt: number }[] = await this.jobs
      .createQueryBuilder('j')
      .select('j.status', 'status')
      .addSelect('COUNT(*)', 'cnt')
      .where('j.company_id = :cid', { cid: companyId })
      .groupBy('j.status')
      .getRawMany();
    const counts = Object.fromEntries(Object.values(JobStatus).map((s) => [s, 0])) as Record<JobStatus, number>;
    rows.forEach((r) => (counts[r.status] = Number(r.cnt)));
    return counts;
  }

  private async resolveRelations(dto: UpdateJobDto) {
    if (dto.locationId && !(await this.locations.existsBy({ id: dto.locationId }))) {
      throw new BadRequestException('Tỉnh/thành không hợp lệ');
    }
    let categories: Category[] | undefined;
    let skills: Skill[] | undefined;
    if (dto.categoryIds) {
      const ids = [...new Set(dto.categoryIds)];
      categories = await this.categories.findBy({ id: In(ids) });
      if (categories.length !== ids.length) throw new BadRequestException('Ngành nghề không hợp lệ');
    }
    if (dto.skillIds) {
      const ids = [...new Set(dto.skillIds)];
      skills = ids.length ? await this.skills.findBy({ id: In(ids) }) : [];
      if (skills.length !== ids.length) throw new BadRequestException('Kỹ năng không hợp lệ');
    }
    return { categories, skills };
  }

  private checkSalary(min?: number | null, max?: number | null) {
    if (min != null && max != null && min > max) throw new BadRequestException('Lương tối thiểu phải nhỏ hơn lương tối đa');
  }

  private async checkDeadline(deadline: string) {
    const today = todayVN();
    const maxDays = await this.settings.get('jobMaxDays');
    if (deadline < today) throw new BadRequestException('Hạn nộp phải từ hôm nay trở đi');
    if (deadline > addDays(today, maxDays)) {
      throw new BadRequestException(`Hạn nộp tối đa ${maxDays} ngày kể từ hôm nay`);
    }
  }

  private makeSlug(title: string) {
    return `${slugify(title).slice(0, 200) || 'viec-lam'}-${randomBytes(3).toString('hex')}`;
  }

  private notifyReview(title: string) {
    return this.notifications.notifyAdmins({
      type: NotificationType.SYSTEM,
      title: 'Tin tuyển dụng chờ duyệt',
      message: title,
      link: '/admin/jobs?status=PENDING',
    });
  }
}
