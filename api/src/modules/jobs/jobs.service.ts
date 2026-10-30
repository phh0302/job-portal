import { MIN_RESPONSE_SAMPLE, responseInfo } from '../../common/utils/response-stats';
import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, In, Repository, SelectQueryBuilder } from 'typeorm';
import { paginate } from '../../common/dto/pagination.dto';
import { todayVN } from '../../common/utils/date';
import { JobStatus } from '../../common/enums';
import { StorageService } from '../storage/storage.service';
import { SearchJobsDto } from './dto/search-jobs.dto';
import { Job } from './entities/job.entity';
import { aiLike, searchKeyword } from '../../common/utils/search';

/** Escape ký tự đặc biệt của LIKE trong SQL Server */

@Injectable()
export class JobsService {
  constructor(
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    private readonly storage: StorageService,
  ) {}

  /** Chỉ job đã duyệt và còn hạn mới hiển thị công khai */
  private openJobs(alias = 'j'): SelectQueryBuilder<Job> {
    return this.jobs
      .createQueryBuilder(alias)
      .where(`${alias}.status = :approved`, { approved: JobStatus.APPROVED })
      .andWhere(`${alias}.deadline >= :today`, { today: todayVN() });
  }

  /** publishedAfter: chỉ dùng nội bộ (job alert) */
  async search(dto: SearchJobsDto, publishedAfter?: Date) {
    const qb = this.openJobs('j')
      .leftJoinAndSelect('j.company', 'c')
      .leftJoinAndSelect('j.location', 'l');

    if (dto.q) {
      // Không phân biệt dấu: "ke toan" vẫn ra "Kế toán" (Q-02)
      const kw = searchKeyword(dto.q);
      qb.andWhere(
        new Brackets((w) =>
          w
            .where(aiLike('j.title'), { kw })
            .orWhere(aiLike('c.name'))
            .orWhere(
              `EXISTS (SELECT 1 FROM job_skills js INNER JOIN skills s ON s.id = js.skill_id WHERE js.job_id = j.id AND ${aiLike('s.name')})`,
            ),
        ),
      );
    }
    if (publishedAfter) qb.andWhere('j.published_at > :after', { after: publishedAfter });
    if (dto.locationId) qb.andWhere('j.location_id = :loc', { loc: dto.locationId });
    if (dto.companyId) qb.andWhere('j.company_id = :cid', { cid: dto.companyId });
    if (dto.categoryId) {
      qb.andWhere('EXISTS (SELECT 1 FROM job_categories jc WHERE jc.job_id = j.id AND jc.category_id = :cat)', {
        cat: dto.categoryId,
      });
    }
    if (dto.jobType) qb.andWhere('j.job_type = :jt', { jt: dto.jobType });
    if (dto.level) qb.andWhere('j.level = :lv', { lv: dto.level });
    if (dto.experience !== undefined) qb.andWhere('j.experience_years <= :exp', { exp: dto.experience });
    if (dto.fastResponse) {
      qb.andWhere('c.response_sample >= :minSample AND c.response_rate >= 80 AND c.avg_response_hours <= 72', { minSample: MIN_RESPONSE_SAMPLE });
    }
    if (dto.salaryMin) {
      qb.andWhere(
        new Brackets((w) =>
          w
            .where('j.salary_negotiable = 1')
            .orWhere('COALESCE(j.salary_max, j.salary_min) >= :smin', { smin: dto.salaryMin }),
        ),
      );
    }

    switch (dto.sort) {
      case 'salary':
        qb.orderBy('COALESCE(j.salary_max, j.salary_min, 0)', 'DESC').addOrderBy('j.published_at', 'DESC');
        break;
      case 'relevant':
        if (dto.q) {
          // Khớp ở tiêu đề xếp trước
          qb.addSelect(`CASE WHEN ${aiLike('j.title')} THEN 0 ELSE 1 END`, 'title_rank').orderBy('title_rank', 'ASC');
          qb.addOrderBy('j.published_at', 'DESC');
        } else {
          qb.orderBy('j.published_at', 'DESC');
        }
        break;
      default:
        qb.orderBy('j.published_at', 'DESC');
    }
    // Tin nổi bật (gói trả phí) lên đầu – trừ khi người dùng chọn sắp xếp theo lương
    if (dto.sort !== 'salary') {
      qb.addSelect('CASE WHEN j.featured_until > :fnow THEN 0 ELSE 1 END', 'featured_rank')
        .setParameter('fnow', new Date());
      const order = qb.expressionMap.orderBys;
      qb.orderBy('featured_rank', 'ASC');
      for (const [k, v] of Object.entries(order)) qb.addOrderBy(k, typeof v === 'string' ? v : v.order);
    }
    qb.addOrderBy('j.id', 'DESC');

    // Chỉ join quan hệ nhiều-một nên dùng offset/limit trực tiếp (OFFSET ... FETCH của SQL Server)
    const [rows, total] = await qb
      .offset((dto.page - 1) * dto.limit)
      .limit(dto.limit)
      .getManyAndCount();

    await this.attachSkills(rows);
    return paginate(rows.map((j) => this.toCard(j)), total, dto.page, dto.limit);
  }

  async findBySlug(slug: string) {
    const job = await this.openJobs('j')
      .andWhere('j.slug = :slug', { slug })
      .leftJoinAndSelect('j.company', 'c')
      .leftJoinAndSelect('c.location', 'cl')
      .leftJoinAndSelect('j.location', 'l')
      .leftJoinAndSelect('j.categories', 'cat')
      .leftJoinAndSelect('j.skills', 's')
      .getOne();
    if (!job) throw new NotFoundException('Tin tuyển dụng không tồn tại hoặc đã hết hạn');

    await this.jobs.increment({ id: job.id }, 'viewCount', 1);
    return {
      ...this.toCard(job),
      description: job.description,
      requirements: job.requirements,
      benefits: job.benefits,
      quantity: job.quantity,
      workAddress: job.workAddress,
      viewCount: job.viewCount + 1,
      categories: (job.categories ?? []).map((c) => ({ id: c.id, name: c.name, slug: c.slug })),
      company: {
        ...this.toCard(job).company,
        size: job.company.size,
        website: job.company.website,
        address: job.company.address,
        location: job.company.location?.name ?? null,
        description: job.company.description,
      },
    };
  }

  /** Việc làm tương tự: cùng ngành hoặc cùng kỹ năng, ưu tiên cùng tỉnh */
  async similar(slug: string, limit = 6) {
    const base = await this.jobs.findOne({ where: { slug }, relations: { categories: true, skills: true } });
    if (!base) return [];
    const catIds = (base.categories ?? []).map((c) => c.id);
    const skillIds = (base.skills ?? []).map((s) => s.id);
    if (!catIds.length && !skillIds.length) return [];

    const qb = this.openJobs('j')
      .leftJoinAndSelect('j.company', 'c')
      .leftJoinAndSelect('j.location', 'l')
      .andWhere('j.id <> :id', { id: base.id })
      .andWhere(
        new Brackets((w) => {
          if (catIds.length)
            w.orWhere('EXISTS (SELECT 1 FROM job_categories jc WHERE jc.job_id = j.id AND jc.category_id IN (:...catIds))', { catIds });
          if (skillIds.length)
            w.orWhere('EXISTS (SELECT 1 FROM job_skills js WHERE js.job_id = j.id AND js.skill_id IN (:...skillIds))', { skillIds });
        }),
      )
      .addSelect(`CASE WHEN j.location_id = :loc THEN 0 ELSE 1 END`, 'same_loc')
      .setParameter('loc', base.locationId ?? -1)
      .orderBy('same_loc', 'ASC')
      .addOrderBy('j.published_at', 'DESC')
      .limit(limit);

    const rows = await qb.getMany();
    await this.attachSkills(rows);
    return rows.map((j) => this.toCard(j));
  }

  /** Thẻ job theo danh sách id, giữ nguyên thứ tự; kèm cờ isOpen (còn nhận hồ sơ không) */
  async cardsByIds(ids: number[]) {
    if (!ids.length) return [];
    const rows = await this.jobs.find({ where: { id: In(ids) }, relations: { company: true, location: true } });
    await this.attachSkills(rows);
    const today = todayVN();
    const map = new Map(rows.map((j) => [j.id, j]));
    return ids
      .map((id) => map.get(id))
      .filter((j): j is Job => !!j)
      .map((j) => ({ ...this.toCard(j), isOpen: j.status === JobStatus.APPROVED && j.deadline >= today }));
  }

  /** Nạp kỹ năng cho danh sách job bằng 1 query (tránh join nhiều-nhiều khi phân trang) */
  private async attachSkills(rows: Job[]) {
    if (!rows.length) return;
    const withSkills = await this.jobs.find({
      where: { id: In(rows.map((r) => r.id)) },
      relations: { skills: true },
      select: { id: true, skills: { id: true, name: true, slug: true } },
    });
    const map = new Map(withSkills.map((j) => [j.id, j.skills ?? []]));
    rows.forEach((r) => (r.skills = map.get(r.id) ?? []));
  }

  toCard(j: Job) {
    return {
      id: j.id,
      slug: j.slug,
      title: j.title,
      salaryMin: j.salaryMin === null ? null : Number(j.salaryMin),
      salaryMax: j.salaryMax === null ? null : Number(j.salaryMax),
      salaryNegotiable: j.salaryNegotiable,
      jobType: j.jobType,
      level: j.level,
      experienceYears: j.experienceYears,
      deadline: j.deadline,
      publishedAt: j.publishedAt,
      featured: !!j.featuredUntil && j.featuredUntil > new Date(),
      location: j.location ? { id: j.location.id, name: j.location.name } : null,
      skills: (j.skills ?? []).map((s) => ({ id: s.id, name: s.name, slug: s.slug })),
      company: {
        id: j.company.id,
        name: j.company.name,
        slug: j.company.slug,
        logoUrl: this.storage.publicUrl(j.company.logoUrl),
        verified: j.company.verificationStatus === 'VERIFIED',
        response: responseInfo(j.company),
      },
    };
  }
}
