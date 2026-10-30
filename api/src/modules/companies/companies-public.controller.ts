import { responseInfo } from '../../common/utils/response-stats';
import { Controller, Get, NotFoundException, Param, Query } from '@nestjs/common';
import { ApiPropertyOptional, ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Transform } from 'class-transformer';
import { IsOptional, IsString, MaxLength } from 'class-validator';
import { Repository } from 'typeorm';
import { Public } from '../../common/decorators/public.decorator';
import { PaginationDto, paginate } from '../../common/dto/pagination.dto';
import { JobStatus, ReviewStatus } from '../../common/enums';
import { todayVN } from '../../common/utils/date';
import { StorageService } from '../storage/storage.service';
import { Company } from './entities/company.entity';
import { aiLike, searchKeyword } from '../../common/utils/search';

class CompanyQuery extends PaginationDto {
  @ApiPropertyOptional()
  @IsOptional()
  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @MaxLength(100)
  q?: string;
}

/** Điểm đánh giá trung bình (1 chữ số thập phân) + số đánh giá đã duyệt */
function ratingOf(avg: unknown, cnt: unknown) {
  const count = Number(cnt ?? 0);
  return { average: count ? Math.round(Number(avg) * 10) / 10 : 0, count };
}

@ApiTags('companies')
@Public()
@Controller('companies')
export class CompaniesPublicController {
  constructor(
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    private readonly storage: StorageService,
  ) {}

  /** Danh sách công ty kèm số việc đang tuyển */
  @Get()
  async list(@Query() q: CompanyQuery) {
    const qb = this.companies
      .createQueryBuilder('c')
      .leftJoinAndSelect('c.location', 'l')
      .addSelect(
        `(SELECT COUNT(*) FROM jobs j WHERE j.company_id = c.id AND j.status = :approved AND j.deadline >= :today)`,
        'open_jobs',
      )
      .addSelect(`(SELECT AVG(CAST(r.rating AS float)) FROM company_reviews r WHERE r.company_id = c.id AND r.status = :rv)`, 'rating_avg')
      .addSelect(`(SELECT COUNT(*) FROM company_reviews r WHERE r.company_id = c.id AND r.status = :rv)`, 'rating_count')
      .setParameters({ approved: JobStatus.APPROVED, today: todayVN(), rv: ReviewStatus.APPROVED });
    if (q.q) qb.where(aiLike('c.name'), { kw: searchKeyword(q.q) }); // không phân biệt dấu

    const total = await qb.getCount();
    const { entities, raw } = await qb
      .orderBy('open_jobs', 'DESC')
      .addOrderBy('c.name', 'ASC')
      .offset((q.page - 1) * q.limit)
      .limit(q.limit)
      .getRawAndEntities();

    const items = entities.map((c, i) => ({
      ...this.card(c),
      openJobs: Number(raw[i]?.open_jobs ?? 0),
      rating: ratingOf(raw[i]?.rating_avg, raw[i]?.rating_count),
    }));
    return paginate(items, total, q.page, q.limit);
  }

  @Get(':slug')
  async detail(@Param('slug') slug: string) {
    const c = await this.companies.findOne({ where: { slug }, relations: { location: true } });
    if (!c) throw new NotFoundException('Không tìm thấy công ty');
    const [agg] = (await this.companies.query(
      `SELECT AVG(CAST(rating AS float)) AS avg, COUNT(*) AS cnt FROM company_reviews WHERE company_id = @0 AND status = @1`,
      [c.id, ReviewStatus.APPROVED],
    )) as { avg: number | null; cnt: number }[];
    return {
      rating: ratingOf(agg?.avg, agg?.cnt),
      ...this.card(c),
      coverUrl: this.storage.publicUrl(c.coverUrl),
      size: c.size,
      website: c.website,
      address: c.address,
      description: c.description,
    };
  }

  private card(c: Company) {
    return {
      id: c.id,
      name: c.name,
      slug: c.slug,
      logoUrl: this.storage.publicUrl(c.logoUrl),
      location: c.location?.name ?? null,
      response: responseInfo(c),
      verified: c.verificationStatus === 'VERIFIED',
    };
  }
}
