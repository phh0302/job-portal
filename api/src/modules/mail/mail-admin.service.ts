import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate } from '../../common/dto/pagination.dto';
import { EmailOutbox, EmailStatus } from './entities/email-outbox.entity';
import { MailTransport } from './mail-transport.service';

/** Cho admin xem hàng đợi email và gửi lại email lỗi */
@Injectable()
export class MailAdminService {
  constructor(
    private readonly transport: MailTransport,
    @InjectRepository(EmailOutbox) private readonly outbox: Repository<EmailOutbox>,
  ) {}

  async list(q: { status?: EmailStatus; page: number; limit: number }) {
    const [rows, total] = await this.outbox.findAndCount({
      where: q.status ? { status: q.status } : {},
      select: { id: true, to: true, subject: true, status: true, attempts: true, lastError: true, nextAttemptAt: true, sentAt: true, createdAt: true },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    });
    const counts = Object.fromEntries(Object.values(EmailStatus).map((s) => [s, 0])) as Record<EmailStatus, number>;
    const grouped: { status: EmailStatus; cnt: number }[] = await this.outbox
      .createQueryBuilder('e')
      .select('e.status', 'status')
      .addSelect('COUNT(*)', 'cnt')
      .groupBy('e.status')
      .getRawMany();
    grouped.forEach((g) => (counts[g.status] = Number(g.cnt)));
    return { ...paginate(rows, total, q.page, q.limit), counts, smtpConfigured: !this.transport.isConsole };
  }

  async retry(id: string) {
    const mail = await this.outbox.findOneBy({ id });
    if (!mail) throw new NotFoundException('Không tìm thấy email');
    if (mail.status !== EmailStatus.FAILED) throw new BadRequestException('Chỉ gửi lại được email lỗi');
    await this.outbox.update(id, { status: EmailStatus.PENDING, attempts: 0, nextAttemptAt: new Date(), lastError: null });
    return { id, status: EmailStatus.PENDING };
  }
}
