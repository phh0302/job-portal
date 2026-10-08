import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, LessThanOrEqual, Repository } from 'typeorm';
import { EmailOutbox, EmailStatus } from './entities/email-outbox.entity';
import { MailTransport } from './mail-transport.service';

const POLL_MS = 5_000;
const BATCH = 20;
/** Thời gian chờ trước lần thử lại thứ n (phút) — sau lần cuối thì đánh dấu FAILED */
export const RETRY_DELAYS_MIN = [1, 5, 30, 120, 360];
export const MAX_ATTEMPTS = RETRY_DELAYS_MIN.length + 1;
const STUCK_MS = 10 * 60_000;
const KEEP_SENT_DAYS = 30;

/** Thời điểm thử lại sau `attempts` lần thất bại; null = hết lượt */
export function nextRetryAt(attempts: number, now = Date.now()): Date | null {
  if (attempts >= MAX_ATTEMPTS) return null;
  return new Date(now + RETRY_DELAYS_MIN[attempts - 1] * 60_000);
}

/** Worker gửi email nền từ bảng email_outbox */
@Injectable()
export class MailQueueWorker implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger('MailQueue');
  private timer?: NodeJS.Timeout;
  private running = false;
  private lastCleanup = 0;

  constructor(
    private readonly transport: MailTransport,
    @InjectRepository(EmailOutbox) private readonly outbox: Repository<EmailOutbox>,
  ) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test' || process.env.MAIL_QUEUE === 'false') return;
    this.timer = setInterval(() => void this.tick(), POLL_MS);
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async tick() {
    if (this.running) return;
    this.running = true;
    try {
      await this.housekeeping();
      const due = await this.outbox.find({
        where: { status: EmailStatus.PENDING, nextAttemptAt: LessThanOrEqual(new Date()) },
        order: { nextAttemptAt: 'ASC' },
        take: BATCH,
      });
      for (const mail of due) await this.process(mail);
    } catch (err) {
      // Bảng chưa tồn tại (chưa chạy migration) hoặc DB tạm mất kết nối -> thử lại ở lượt sau
      this.logger.debug(`Bỏ qua lượt gửi: ${(err as Error).message}`);
    } finally {
      this.running = false;
    }
  }

  async process(mail: EmailOutbox) {
    // "Giữ chỗ" bản ghi: chỉ 1 worker (kể cả khi chạy nhiều instance API) được gửi
    const claim = await this.outbox.update(
      { id: mail.id, status: EmailStatus.PENDING },
      { status: EmailStatus.SENDING, lockedAt: new Date() },
    );
    if (!claim.affected) return;

    try {
      await this.transport.deliver({ to: mail.to, subject: mail.subject, html: mail.html });
      await this.outbox.update(mail.id, { status: EmailStatus.SENT, sentAt: new Date(), lockedAt: null, lastError: null, attempts: mail.attempts + 1 });
    } catch (err) {
      const attempts = mail.attempts + 1;
      const retryAt = nextRetryAt(attempts);
      const message = (err as Error).message?.slice(0, 1000) ?? 'Lỗi không xác định';
      await this.outbox.update(mail.id, {
        attempts,
        lastError: message,
        lockedAt: null,
        status: retryAt ? EmailStatus.PENDING : EmailStatus.FAILED,
        ...(retryAt && { nextAttemptAt: retryAt }),
      });
      this.logger.warn(`Gửi email #${mail.id} tới ${mail.to} lỗi (lần ${attempts}): ${message}${retryAt ? '' : ' — đã ngừng thử lại'}`);
    }
  }

  /** Trả lại email bị kẹt ở SENDING (API tắt giữa chừng) + dọn email đã gửi quá cũ */
  private async housekeeping() {
    await this.outbox.update(
      { status: EmailStatus.SENDING, lockedAt: LessThan(new Date(Date.now() - STUCK_MS)) },
      { status: EmailStatus.PENDING, lockedAt: null },
    );
    if (Date.now() - this.lastCleanup > 3600_000) {
      this.lastCleanup = Date.now();
      await this.outbox.delete({
        status: In([EmailStatus.SENT]),
        sentAt: LessThan(new Date(Date.now() - KEEP_SENT_DAYS * 86_400_000)),
      });
    }
  }
}
