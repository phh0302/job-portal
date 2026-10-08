import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationStatus, JobStatus } from '../../common/enums';
import { todayVN } from '../../common/utils/date';
import { Application } from '../applications/entities/application.entity';
import { Job } from '../jobs/entities/job.entity';
import { EmployerContext } from './employer-context.service';

const DAYS = 30;

@Injectable()
export class EmployerDashboardService {
  constructor(
    private readonly ctx: EmployerContext,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(Application) private readonly apps: Repository<Application>,
  ) {}

  async stats(userId: number) {
    const company = await this.ctx.company(userId);
    const cid = company.id;
    const today = todayVN();

    const [jobAgg] = await this.jobs
      .createQueryBuilder('j')
      .select('COUNT(*)', 'total')
      .addSelect(`SUM(CASE WHEN j.status = '${JobStatus.APPROVED}' AND j.deadline >= :today THEN 1 ELSE 0 END)`, 'open')
      .addSelect(`SUM(CASE WHEN j.status = '${JobStatus.PENDING}' THEN 1 ELSE 0 END)`, 'pending')
      .addSelect('COALESCE(SUM(j.view_count), 0)', 'views')
      .where('j.company_id = :cid', { cid, today })
      .getRawMany();

    const byStatusRows: { status: ApplicationStatus; cnt: number }[] = await this.apps
      .createQueryBuilder('a')
      .innerJoin('a.job', 'j')
      .select('a.status', 'status')
      .addSelect('COUNT(*)', 'cnt')
      .where('j.company_id = :cid', { cid })
      .groupBy('a.status')
      .getRawMany();
    const byStatus = Object.fromEntries(Object.values(ApplicationStatus).map((s) => [s, 0])) as Record<ApplicationStatus, number>;
    byStatusRows.forEach((r) => (byStatus[r.status] = Number(r.cnt)));

    // Phễu tuyển dụng (ước lượng theo trạng thái hiện tại; đơn bị từ chối tính là "đã xem")
    const S = ApplicationStatus;
    const sum = (...ss: ApplicationStatus[]) => ss.reduce((n, s) => n + byStatus[s], 0);
    const applied = sum(S.SUBMITTED, S.VIEWED, S.SHORTLISTED, S.INTERVIEW, S.OFFERED, S.REJECTED);
    const funnel = [
      { key: 'applied', label: 'Ứng tuyển', count: applied },
      { key: 'viewed', label: 'Đã xem', count: sum(S.VIEWED, S.SHORTLISTED, S.INTERVIEW, S.OFFERED, S.REJECTED) },
      { key: 'shortlisted', label: 'Phù hợp', count: sum(S.SHORTLISTED, S.INTERVIEW, S.OFFERED) },
      { key: 'interview', label: 'Phỏng vấn', count: sum(S.INTERVIEW, S.OFFERED) },
      { key: 'offered', label: 'Offer', count: sum(S.OFFERED) },
    ].map((f) => ({ ...f, rate: applied ? Math.round((f.count / applied) * 1000) / 10 : 0 }));

    // Số đơn theo ngày (giờ VN) trong 30 ngày
    const from = new Date(`${today}T00:00:00+07:00`);
    from.setUTCDate(from.getUTCDate() - (DAYS - 1));
    const dailyRows: { day: string | Date; cnt: number }[] = await this.apps
      .createQueryBuilder('a')
      .innerJoin('a.job', 'j')
      .select('CAST(DATEADD(hour, 7, a.created_at) AS date)', 'day')
      .addSelect('COUNT(*)', 'cnt')
      .where('j.company_id = :cid', { cid })
      .andWhere('a.created_at >= :from', { from })
      .groupBy('CAST(DATEADD(hour, 7, a.created_at) AS date)')
      .getRawMany();
    const dailyMap = new Map(
      dailyRows.map((r) => [typeof r.day === 'string' ? r.day.slice(0, 10) : r.day.toISOString().slice(0, 10), Number(r.cnt)]),
    );
    const daily = Array.from({ length: DAYS }, (_, i) => {
      const d = new Date(from.getTime() + i * 86_400_000 + 7 * 3600_000).toISOString().slice(0, 10);
      return { date: d, count: dailyMap.get(d) ?? 0 };
    });

    const topJobs: { id: number; title: string; views: number; apps: number }[] = await this.jobs
      .createQueryBuilder('j')
      .select('j.id', 'id')
      .addSelect('j.title', 'title')
      .addSelect('j.view_count', 'views')
      .addSelect('(SELECT COUNT(*) FROM applications a WHERE a.job_id = j.id)', 'apps')
      .where('j.company_id = :cid', { cid })
      .orderBy('apps', 'DESC')
      .addOrderBy('j.view_count', 'DESC')
      .limit(5)
      .getRawMany();

    return {
      jobs: {
        total: Number(jobAgg?.total ?? 0),
        open: Number(jobAgg?.open ?? 0),
        pending: Number(jobAgg?.pending ?? 0),
        views: Number(jobAgg?.views ?? 0),
      },
      applications: { total: Object.values(byStatus).reduce((a, b) => a + b, 0), new: byStatus.SUBMITTED, byStatus },
      funnel,
      daily,
      topJobs: topJobs.map((t) => ({
        id: Number(t.id),
        title: t.title,
        views: Number(t.views),
        applications: Number(t.apps),
        conversion: Number(t.views) ? Math.round((Number(t.apps) / Number(t.views)) * 1000) / 10 : 0,
      })),
    };
  }
}
