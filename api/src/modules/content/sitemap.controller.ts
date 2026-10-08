import { Controller, Get, Header } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { MoreThanOrEqual, Repository } from 'typeorm';
import { Public } from '../../common/decorators/public.decorator';
import { JobStatus } from '../../common/enums';
import { todayVN } from '../../common/utils/date';
import { Company } from '../companies/entities/company.entity';
import { Job } from '../jobs/entities/job.entity';
import { StaticPage } from './entities/static-page.entity';

const xmlEscape = (s: string) => s.replace(/[<>&'"]/g, (c) => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', "'": '&apos;', '"': '&quot;' })[c]!);

/** sitemap.xml cho công cụ tìm kiếm: trang chủ, tin đang tuyển, công ty, trang tĩnh */
@ApiTags('content')
@Public()
@Controller()
export class SitemapController {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    @InjectRepository(StaticPage) private readonly pages: Repository<StaticPage>,
  ) {}

  @Get('sitemap.xml')
  @Header('Content-Type', 'application/xml; charset=utf-8')
  @Header('Cache-Control', 'public, max-age=3600')
  async sitemap() {
    const web = this.config.get<string>('webUrl')!.replace(/\/$/, '');
    const [jobs, companies, pages] = await Promise.all([
      this.jobs.find({
        where: { status: JobStatus.APPROVED, deadline: MoreThanOrEqual(todayVN()) },
        select: { slug: true, updatedAt: true },
        order: { publishedAt: 'DESC' },
        take: 5000,
      }),
      this.companies.find({ select: { slug: true, updatedAt: true }, take: 5000 }),
      this.pages.find({ where: { isPublished: true }, select: { slug: true, updatedAt: true } }),
    ]);
    const url = (loc: string, lastmod?: Date, priority = '0.5') =>
      `<url><loc>${xmlEscape(web + loc)}</loc>${lastmod ? `<lastmod>${lastmod.toISOString().slice(0, 10)}</lastmod>` : ''}<priority>${priority}</priority></url>`;
    return [
      '<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">',
      url('/', undefined, '1.0'),
      url('/jobs', undefined, '0.9'),
      url('/companies', undefined, '0.7'),
      ...jobs.map((j) => url(`/jobs/${j.slug}`, j.updatedAt, '0.8')),
      ...companies.map((c) => url(`/companies/${c.slug}`, c.updatedAt, '0.6')),
      ...pages.map((p) => url(`/pages/${p.slug}`, p.updatedAt, '0.3')),
      '</urlset>',
    ].join('\n');
  }
}
