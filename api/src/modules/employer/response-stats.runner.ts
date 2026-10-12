import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { DataSource } from 'typeorm';
import { NotificationType } from '../../common/enums';
import { RESPONSE_REMIND_DAYS, RESPONSE_STATUSES } from '../../common/utils/response-stats';
import { EmployerProfile } from '../companies/entities/employer-profile.entity';
import { NotificationsService } from '../notifications/notifications.service';

const IN_RESPONSE = RESPONSE_STATUSES.map((s) => `'${s}'`).join(',');

/**
 * Mỗi giờ:
 *  1. Tính lại chỉ số phản hồi của từng công ty (90 ngày gần nhất):
 *     - mẫu = hồ sơ không bị rút, đã được phản hồi HOẶC đã nộp quá 3 ngày (hồ sơ mới nộp chưa tính là "không phản hồi")
 *     - tỉ lệ = đã phản hồi / mẫu; thời gian TB = từ lúc nộp đến lần phản hồi đầu
 *  2. Nhắc NTD (tối đa 1 lần / 24 giờ) khi có hồ sơ chờ quá 3 ngày chưa phản hồi.
 * Mọi mốc thời gian tính bằng GETDATE() trong SQL để cùng chuẩn với created_at.
 */
@Injectable()
export class ResponseStatsRunner implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(ResponseStatsRunner.name);
  private timer?: NodeJS.Timeout;

  constructor(
    private readonly ds: DataSource,
    private readonly notifications: NotificationsService,
  ) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test') return;
    setTimeout(() => void this.run(), 20_000);
    this.timer = setInterval(() => void this.run(), 60 * 60 * 1000);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async run() {
    try {
      await this.backfill();
      await this.recompute();
      await this.remind();
    } catch (err) {
      this.logger.error(`Lỗi tính chỉ số phản hồi: ${(err as Error).message}`);
    }
  }

  /** Đơn cũ (trước khi có cột responded_at): lấy thời điểm đổi trạng thái gần nhất */
  async backfill() {
    await this.ds.query(`
      UPDATE applications
      SET responded_at = status_changed_at
      WHERE responded_at IS NULL AND status_changed_at IS NOT NULL AND status IN (${IN_RESPONSE})`);
  }

  async recompute() {
    await this.ds.query(`
      UPDATE c SET
        response_sample = ISNULL(s.sample, 0),
        response_rate = CASE WHEN s.sample > 0 THEN CAST(ROUND(100.0 * s.responded / s.sample, 0) AS tinyint) END,
        avg_response_hours = CASE WHEN s.avg_hours IS NULL THEN NULL WHEN s.avg_hours < 0 THEN 0 ELSE CAST(ROUND(s.avg_hours, 0) AS int) END
      FROM companies c
      LEFT JOIN (
        SELECT j.company_id,
               COUNT(*) AS sample,
               SUM(CASE WHEN a.responded_at IS NOT NULL THEN 1 ELSE 0 END) AS responded,
               AVG(CASE WHEN a.responded_at IS NOT NULL THEN DATEDIFF(minute, a.created_at, a.responded_at) / 60.0 END) AS avg_hours
        FROM applications a
        INNER JOIN jobs j ON j.id = a.job_id
        WHERE a.status <> 'WITHDRAWN'
          AND a.created_at >= DATEADD(day, -90, GETDATE())
          AND (a.responded_at IS NOT NULL OR a.created_at < DATEADD(day, -${RESPONSE_REMIND_DAYS}, GETDATE()))
        GROUP BY j.company_id
      ) s ON s.company_id = c.id`);
  }

  async remind() {
    const rows: { companyId: number; cnt: number }[] = await this.ds.query(`
      SELECT j.company_id AS companyId, COUNT(*) AS cnt
      FROM applications a
      INNER JOIN jobs j ON j.id = a.job_id
      INNER JOIN companies c ON c.id = j.company_id
      WHERE a.responded_at IS NULL
        AND a.status IN ('SUBMITTED', 'VIEWED')
        AND a.created_at < DATEADD(day, -${RESPONSE_REMIND_DAYS}, GETDATE())
        AND (c.response_reminded_at IS NULL OR c.response_reminded_at < DATEADD(hour, -24, GETDATE()))
      GROUP BY j.company_id`);
    if (!rows.length) return;

    const profiles = this.ds.getRepository(EmployerProfile);
    for (const r of rows) {
      const emps = await profiles.find({ where: { companyId: r.companyId }, select: { userId: true } });
      await this.notifications.create(
        emps.map((e) => ({
          userId: e.userId,
          type: NotificationType.SYSTEM,
          title: `${r.cnt} hồ sơ đang chờ bạn phản hồi quá ${RESPONSE_REMIND_DAYS} ngày`,
          message: 'Phản hồi sớm giúp công ty giữ nhãn "Phản hồi nhanh" và thu hút thêm ứng viên.',
          link: '/employer/applications?pending=1',
        })),
      );
      await this.ds.query(`UPDATE companies SET response_reminded_at = GETDATE() WHERE id = @0`, [r.companyId]);
    }
    this.logger.log(`Đã nhắc ${rows.length} công ty về hồ sơ chờ phản hồi`);
  }
}
