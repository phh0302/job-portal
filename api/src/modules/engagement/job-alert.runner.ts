import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { AlertFrequency, NotificationType, UserStatus } from '../../common/enums';
import { CandidateProfile } from '../candidates/entities/candidate-profile.entity';
import { JobsService } from '../jobs/jobs.service';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { alertLabel } from './engagement.service';
import { JobAlert } from './entities/job-alert.entity';

const CHECK_EVERY_MS = 30 * 60 * 1000; // 30 phút kiểm tra 1 lần
const PERIOD_MS: Record<AlertFrequency, number> = {
  [AlertFrequency.DAILY]: 24 * 3600 * 1000,
  [AlertFrequency.WEEKLY]: 7 * 24 * 3600 * 1000,
};
const MAX_JOBS_PER_EMAIL = 10;

const fmtSalary = (min: number | null, max: number | null, neg: boolean) => {
  if (neg || (min === null && max === null)) return 'Thỏa thuận';
  const m = (n: number) => `${Math.round(n / 100_000) / 10}`;
  if (min !== null && max !== null) return `${m(min)} – ${m(max)} triệu`;
  return min !== null ? `Từ ${m(min)} triệu` : `Đến ${m(max!)} triệu`;
};

/**
 * Gửi email "việc làm mới phù hợp" theo lịch (hằng ngày / hằng tuần).
 * Dùng setInterval đơn giản; khi chạy nhiều instance API nên chuyển sang hàng đợi (BullMQ).
 */
@Injectable()
export class JobAlertRunner implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(JobAlertRunner.name);
  private timer?: NodeJS.Timeout;
  private running = false;

  constructor(
    private readonly config: ConfigService,
    private readonly jobs: JobsService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
    @InjectRepository(JobAlert) private readonly alerts: Repository<JobAlert>,
  ) {}

  onApplicationBootstrap() {
    if (process.env.JOB_ALERTS_ENABLED === 'false' || process.env.NODE_ENV === 'test') return;
    this.timer = setInterval(() => void this.runDue(), CHECK_EVERY_MS);
    setTimeout(() => void this.runDue(), 15_000); // chạy 1 lần sau khi khởi động
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  /** Xử lý các alert đã đến hạn */
  async runDue() {
    if (this.running) return;
    this.running = true;
    try {
      const now = Date.now();
      const active = await this.alerts.find({
        where: { isActive: true },
        relations: { user: true, location: true, category: true },
      });
      const due = active.filter(
        (a) => a.user.status === UserStatus.ACTIVE && (!a.lastSentAt || now - a.lastSentAt.getTime() >= PERIOD_MS[a.frequency]),
      );
      let sent = 0;
      for (const a of due) {
        try {
          if ((await this.process(a, a.lastSentAt ?? new Date(now - PERIOD_MS[a.frequency]))) > 0) sent++;
          await this.alerts.update(a.id, { lastSentAt: new Date(now) });
        } catch (err) {
          this.logger.error(`Job alert #${a.id} lỗi: ${(err as Error).message}`);
        }
      }
      if (due.length) this.logger.log(`Job alert: xử lý ${due.length}, gửi ${sent} email`);
    } finally {
      this.running = false;
    }
  }

  /** Tìm job mới đăng sau `since` khớp alert, gửi email + thông báo. Trả về số job tìm được. */
  async process(a: JobAlert, since: Date, opts: { notify?: boolean } = { notify: true }): Promise<number> {
    const result = await this.jobs.search(
      {
        q: a.keyword ?? undefined,
        locationId: a.locationId ?? undefined,
        categoryId: a.categoryId ?? undefined,
        page: 1,
        limit: MAX_JOBS_PER_EMAIL,
        sort: 'newest',
      },
      since,
    );
    if (!result.total) return 0;

    const web = this.config.get<string>('webUrl');
    const label = alertLabel(a);
    const name = await this.displayName(a);
    await this.mail.sendJobAlert(
      a.user.email,
      name,
      label,
      result.items.map((j) => ({
        title: j.title,
        company: j.company.name,
        salary: fmtSalary(j.salaryMin, j.salaryMax, j.salaryNegotiable),
        url: `${web}/jobs/${j.slug}`,
      })),
      `${web}/candidate/job-alerts`,
    );
    if (opts.notify) {
      await this.notifications.create({
        userId: a.userId,
        type: NotificationType.JOB_ALERT,
        title: `${result.total} việc làm mới phù hợp`,
        message: label,
        link: `/jobs?${new URLSearchParams(
          Object.entries({ q: a.keyword, locationId: a.locationId, categoryId: a.categoryId })
            .filter(([, v]) => v !== null && v !== undefined && v !== '')
            .map(([k, v]) => [k, String(v)]),
        )}`,
      });
    }
    return result.total;
  }

  private async displayName(a: JobAlert) {
    const p = await this.alerts.manager.findOne(CandidateProfile, { where: { userId: a.userId }, select: { fullName: true } });
    return p?.fullName ?? a.user.email;
  }
}
