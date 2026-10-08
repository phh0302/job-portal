import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate } from '../../common/dto/pagination.dto';
import { Category } from '../catalog/entities/category.entity';
import { Location } from '../catalog/entities/location.entity';
import { Company } from '../companies/entities/company.entity';
import { Job } from '../jobs/entities/job.entity';
import { JobsService } from '../jobs/jobs.service';
import { SettingsService } from '../content/settings.service';
import { StorageService } from '../storage/storage.service';
import { JobAlertDto } from './dto/engagement.dto';
import { FollowedCompany } from './entities/followed-company.entity';
import { JobAlert } from './entities/job-alert.entity';
import { SavedJob } from './entities/saved-job.entity';


@Injectable()
export class EngagementService {
  constructor(
    private readonly jobsService: JobsService,
    private readonly storage: StorageService,
    private readonly settings: SettingsService,
    @InjectRepository(SavedJob) private readonly saved: Repository<SavedJob>,
    @InjectRepository(FollowedCompany) private readonly follows: Repository<FollowedCompany>,
    @InjectRepository(JobAlert) private readonly alerts: Repository<JobAlert>,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    @InjectRepository(Location) private readonly locations: Repository<Location>,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
  ) {}

  // ===== Việc đã lưu =====

  async saveJob(userId: number, jobId: number) {
    if (!(await this.jobs.existsBy({ id: jobId }))) throw new NotFoundException('Tin tuyển dụng không tồn tại');
    if (!(await this.saved.existsBy({ userId, jobId }))) await this.saved.insert({ userId, jobId });
    return { saved: true };
  }

  async unsaveJob(userId: number, jobId: number) {
    await this.saved.delete({ userId, jobId });
    return { saved: false };
  }

  async savedJobIds(userId: number) {
    const rows = await this.saved.find({ where: { userId }, select: { jobId: true } });
    return rows.map((r) => r.jobId);
  }

  async listSaved(userId: number, page: number, limit: number) {
    const [rows, total] = await this.saved.findAndCount({
      where: { userId },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const cards = await this.jobsService.cardsByIds(rows.map((r) => r.jobId));
    const savedAt = new Map(rows.map((r) => [r.jobId, r.createdAt]));
    return paginate(cards.map((c) => ({ ...c, savedAt: savedAt.get(c.id) })), total, page, limit);
  }

  // ===== Theo dõi công ty =====

  async follow(userId: number, companyId: number) {
    if (!(await this.companies.existsBy({ id: companyId }))) throw new NotFoundException('Công ty không tồn tại');
    if (!(await this.follows.existsBy({ userId, companyId }))) await this.follows.insert({ userId, companyId });
    return this.followState(userId, companyId);
  }

  async unfollow(userId: number, companyId: number) {
    await this.follows.delete({ userId, companyId });
    return this.followState(userId, companyId);
  }

  async followState(userId: number | null, companyId: number) {
    const [followers, following] = await Promise.all([
      this.follows.countBy({ companyId }),
      userId ? this.follows.existsBy({ userId, companyId }) : Promise.resolve(false),
    ]);
    return { following, followers };
  }

  async listFollowing(userId: number, page: number, limit: number) {
    const [rows, total] = await this.follows.findAndCount({
      where: { userId },
      relations: { company: { location: true } },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    const items = await Promise.all(
      rows.map(async (r) => ({
        id: r.company.id,
        name: r.company.name,
        slug: r.company.slug,
        logoUrl: this.storage.publicUrl(r.company.logoUrl),
        location: r.company.location?.name ?? null,
        verified: r.company.verificationStatus === 'VERIFIED',
        followedAt: r.createdAt,
        openJobs: (await this.jobsService.search({ companyId: r.company.id, page: 1, limit: 1, sort: 'newest' })).total,
      })),
    );
    return paginate(items, total, page, limit);
  }

  // ===== Thông báo việc làm (job alert) =====

  async listAlerts(userId: number) {
    const rows = await this.alerts.find({
      where: { userId },
      relations: { location: true, category: true },
      order: { createdAt: 'DESC' },
    });
    return rows.map((a) => this.alertView(a));
  }

  async createAlert(userId: number, dto: JobAlertDto) {
    const max = await this.settings.get('maxJobAlerts');
    if ((await this.alerts.countBy({ userId })) >= max) {
      throw new BadRequestException(`Bạn chỉ được tạo tối đa ${max} thông báo việc làm`);
    }
    await this.validateAlert(dto);
    if (!dto.keyword && !dto.locationId && !dto.categoryId) {
      throw new BadRequestException('Hãy nhập ít nhất từ khóa, địa điểm hoặc ngành nghề');
    }
    // lastSentAt = bây giờ: chỉ gửi những job đăng SAU khi tạo thông báo
    const saved = await this.alerts.save(this.alerts.create({ ...dto, userId, lastSentAt: new Date() }));
    return this.getAlert(userId, saved.id);
  }

  async updateAlert(userId: number, id: number, dto: JobAlertDto) {
    const a = await this.ownAlert(userId, id);
    await this.validateAlert(dto);
    const next = { keyword: a.keyword, locationId: a.locationId, categoryId: a.categoryId, ...dto };
    if (!next.keyword && !next.locationId && !next.categoryId) {
      throw new BadRequestException('Hãy nhập ít nhất từ khóa, địa điểm hoặc ngành nghề');
    }
    if (Object.keys(dto).length) await this.alerts.update(id, dto);
    return this.getAlert(userId, id);
  }

  async removeAlert(userId: number, id: number) {
    await this.ownAlert(userId, id);
    await this.alerts.delete(id);
  }

  async ownAlert(userId: number, id: number) {
    const a = await this.alerts.findOne({ where: { id, userId }, relations: { location: true, category: true, user: true } });
    if (!a) throw new NotFoundException('Không tìm thấy thông báo việc làm');
    return a;
  }

  private async getAlert(userId: number, id: number) {
    return this.alertView(await this.ownAlert(userId, id));
  }

  private async validateAlert(dto: JobAlertDto) {
    if (dto.locationId && !(await this.locations.existsBy({ id: dto.locationId }))) {
      throw new BadRequestException('Tỉnh/thành không hợp lệ');
    }
    if (dto.categoryId && !(await this.categories.existsBy({ id: dto.categoryId }))) {
      throw new BadRequestException('Ngành nghề không hợp lệ');
    }
  }

  alertView(a: JobAlert) {
    return {
      id: a.id,
      keyword: a.keyword,
      locationId: a.locationId,
      location: a.location?.name ?? null,
      categoryId: a.categoryId,
      category: a.category?.name ?? null,
      frequency: a.frequency,
      isActive: a.isActive,
      lastSentAt: a.lastSentAt,
      createdAt: a.createdAt,
      label: alertLabel(a),
    };
  }
}

export function alertLabel(a: Pick<JobAlert, 'keyword'> & { location?: { name: string } | null; category?: { name: string } | null }) {
  return [a.keyword && `"${a.keyword}"`, a.category?.name, a.location?.name].filter(Boolean).join(' · ') || 'Tất cả việc làm';
}
