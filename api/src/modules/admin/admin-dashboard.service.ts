import { Injectable } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { CompanyVerification, JobStatus, OrderStatus, ReportStatus, ReviewStatus, SupportStatus, UserRole } from '../../common/enums';
import { sqlToVN, todayVN } from '../../common/utils/date';
import { Application } from '../applications/entities/application.entity';
import { Company } from '../companies/entities/company.entity';
import { Job } from '../jobs/entities/job.entity';
import { Report } from '../reports/entities/report.entity';
import { CompanyReview } from '../reviews/entities/company-review.entity';
import { PlanOrder } from '../billing/entities/plan-order.entity';
import { SupportTicket } from '../support/entities/support-ticket.entity';
import { User } from '../users/entities/user.entity';

type Count = { k: string; cnt: number };

@Injectable()
export class AdminDashboardService {
  constructor(private readonly ds: DataSource) {}

  async overview() {
    const group = async (entity: typeof User | typeof Company | typeof Job, col: string): Promise<Record<string, number>> => {
      const rows: Count[] = await this.ds.getRepository(entity).createQueryBuilder('t').select(`t.${col}`, 'k').addSelect('COUNT(*)', 'cnt').groupBy(`t.${col}`).getRawMany();
      return Object.fromEntries(rows.map((r) => [r.k, Number(r.cnt)]));
    };
    const [users, companies, jobs, applications, openReports, openJobs, pendingReviews, pendingOrders, pendingSupport] = await Promise.all([
      group(User, 'role'),
      group(Company, 'verification_status'),
      group(Job, 'status'),
      this.ds.getRepository(Application).count(),
      this.ds.getRepository(Report).countBy({ status: ReportStatus.OPEN }),
      this.ds
        .getRepository(Job)
        .createQueryBuilder('j')
        .where('j.status = :s AND j.deadline >= :t', { s: JobStatus.APPROVED, t: todayVN() })
        .getCount(),
      this.ds.getRepository(CompanyReview).countBy({ status: ReviewStatus.PENDING }),
      this.ds.getRepository(PlanOrder).countBy({ status: OrderStatus.PENDING }),
      this.ds
        .getRepository(SupportTicket)
        .createQueryBuilder('t')
        .where('t.status IN (:...st)', { st: [SupportStatus.WAITING, SupportStatus.OPEN] })
        .andWhere('(t.admin_read_at IS NULL OR t.admin_read_at < t.last_message_at)')
        .getCount(),
    ]);
    const sum = (r: Record<string, number>) => Object.values(r).reduce((a, b) => a + b, 0);
    return {
      users: { total: sum(users), candidates: users[UserRole.CANDIDATE] ?? 0, employers: users[UserRole.EMPLOYER] ?? 0, admins: users[UserRole.ADMIN] ?? 0 },
      companies: { total: sum(companies), verified: companies[CompanyVerification.VERIFIED] ?? 0, byStatus: companies },
      jobs: { total: sum(jobs), open: openJobs, byStatus: jobs },
      applications: { total: applications },
      todo: {
        pendingJobs: jobs[JobStatus.PENDING] ?? 0,
        pendingCompanies: companies[CompanyVerification.PENDING] ?? 0,
        openReports,
        pendingReviews,
        pendingOrders,
        pendingSupport,
      },
    };
  }

  /** Số bản ghi mới theo ngày (30 ngày) hoặc theo tháng (12 tháng), giờ VN */
  async growth(period: 'day' | 'month') {
    const n = period === 'day' ? 30 : 12;
    const today = todayVN();
    const keys: string[] = [];
    if (period === 'day') {
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(`${today}T00:00:00Z`);
        d.setUTCDate(d.getUTCDate() - i);
        keys.push(d.toISOString().slice(0, 10));
      }
    } else {
      const [y, m] = today.split('-').map(Number);
      for (let i = n - 1; i >= 0; i--) {
        const d = new Date(Date.UTC(y, m - 1 - i, 1));
        keys.push(d.toISOString().slice(0, 7));
      }
    }
    const from = new Date(`${period === 'day' ? keys[0] : `${keys[0]}-01`}T00:00:00+07:00`);
    const expr = `CONVERT(char(${period === 'day' ? 10 : 7}), ${sqlToVN('t.created_at')}, 23)`;

    const series = async (entity: typeof User | typeof Job | typeof Application) => {
      const rows: Count[] = await this.ds
        .getRepository(entity)
        .createQueryBuilder('t')
        .select(expr, 'k')
        .addSelect('COUNT(*)', 'cnt')
        .where('t.created_at >= :from', { from })
        .groupBy(expr)
        .getRawMany();
      const map = new Map(rows.map((r) => [r.k.trim(), Number(r.cnt)]));
      return keys.map((k) => ({ key: k, count: map.get(k) ?? 0 }));
    };
    const [users, jobs, applications] = await Promise.all([series(User), series(Job), series(Application)]);
    return { period, users, jobs, applications };
  }
}
