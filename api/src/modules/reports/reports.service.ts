import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ReportStatus, ReportTargetType } from '../../common/enums';
import { Company } from '../companies/entities/company.entity';
import { Job } from '../jobs/entities/job.entity';
import { CreateReportDto } from './dto/report.dto';
import { Report } from './entities/report.entity';

@Injectable()
export class ReportsService {
  constructor(
    @InjectRepository(Report) private readonly reports: Repository<Report>,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
  ) {}

  /** Người dùng gửi báo cáo; admin xử lý ở mục 6.3 */
  async create(userId: number, dto: CreateReportDto) {
    const isJob = dto.targetType === ReportTargetType.JOB;
    const exists = isJob
      ? await this.jobs.existsBy({ id: dto.targetId })
      : await this.companies.existsBy({ id: dto.targetId });
    if (!exists) throw new NotFoundException(isJob ? 'Tin tuyển dụng không tồn tại' : 'Công ty không tồn tại');

    const target = isJob ? { jobId: dto.targetId } : { companyId: dto.targetId };
    if (await this.reports.existsBy({ reporterId: userId, status: ReportStatus.OPEN, ...target })) {
      throw new ConflictException('Bạn đã báo cáo nội dung này, chúng tôi đang xem xét');
    }
    const r = await this.reports.save(
      this.reports.create({
        reporterId: userId,
        targetType: dto.targetType,
        ...target,
        reason: dto.reason,
        details: dto.details ?? null,
      }),
    );
    return { id: r.id, message: 'Cảm ơn bạn đã báo cáo. Quản trị viên sẽ xem xét sớm.' };
  }
}
