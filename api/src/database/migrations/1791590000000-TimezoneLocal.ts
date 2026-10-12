import { MigrationInterface, QueryRunner } from 'typeorm';

/**
 * Chuyển các cột thời gian do Node ghi (trước đây ghi theo UTC) sang GIỜ MÁY CHỦ,
 * cho cùng mốc với created_at/updated_at (SQL Server tự điền bằng GETDATE()).
 * Đi kèm thay đổi typeorm.config: useUTC = false.
 *
 * - Máy chủ chạy UTC (Docker/Azure): độ lệch = 0 → không đổi gì.
 * - Máy Windows giờ VN: cộng 7 giờ.
 * - Bỏ qua cột chưa tồn tại (khi migration thêm cột chạy sau).
 */
const COLUMNS: [table: string, column: string][] = [
  ['applications', 'status_changed_at'],
  ['applications', 'last_message_at'],
  ['applications', 'employer_read_at'],
  ['applications', 'candidate_read_at'],
  ['refresh_tokens', 'expires_at'],
  ['refresh_tokens', 'revoked_at'],
  ['user_tokens', 'expires_at'],
  ['user_tokens', 'used_at'],
  ['plan_orders', 'paid_at'],
  ['company_invitations', 'expires_at'],
  ['company_invitations', 'accepted_at'],
  ['company_invitations', 'revoked_at'],
  ['companies', 'verified_at'],
  ['companies', 'plan_expires_at'],
  ['job_alerts', 'last_sent_at'],
  ['jobs', 'published_at'],
  ['jobs', 'featured_until'],
  ['email_outbox', 'next_attempt_at'],
  ['email_outbox', 'locked_at'],
  ['email_outbox', 'sent_at'],
  ['reports', 'resolved_at'],
  ['company_reviews', 'replied_at'],
  ['users', 'last_login_at'],
];
// Không đổi: applications.responded_at, companies.response_reminded_at (đã ghi bằng GETDATE())

export class TimezoneLocal1791590000000 implements MigrationInterface {
  name = 'TimezoneLocal1791590000000';

  public async up(q: QueryRunner): Promise<void> {
    await this.shift(q, 1);
  }

  public async down(q: QueryRunner): Promise<void> {
    await this.shift(q, -1);
  }

  private async shift(q: QueryRunner, sign: 1 | -1) {
    for (const [table, column] of COLUMNS) {
      await q.query(`
        IF COL_LENGTH(N'${table}', N'${column}') IS NOT NULL
          EXEC(N'UPDATE [${table}] SET [${column}] = DATEADD(minute, ${sign} * DATEDIFF(minute, GETUTCDATE(), GETDATE()), [${column}]) WHERE [${column}] IS NOT NULL')`);
    }
  }
}
