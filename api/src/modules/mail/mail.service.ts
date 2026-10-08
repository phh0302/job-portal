import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { EmailOutbox, EmailStatus } from './entities/email-outbox.entity';
import { MailOptions, MailTransport } from './mail-transport.service';

/**
 * Soạn & xếp email vào hàng đợi (bảng email_outbox). MailQueueWorker gửi nền và tự thử lại khi lỗi,
 * nên request của người dùng không phải chờ SMTP và không mất email khi SMTP tạm lỗi.
 * MAIL_QUEUE=false (hoặc khi chạy test) -> gửi trực tiếp.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly transport: MailTransport,
    @InjectRepository(EmailOutbox) private readonly outbox: Repository<EmailOutbox>,
  ) {}

  private get queueEnabled() {
    return process.env.MAIL_QUEUE !== 'false' && process.env.NODE_ENV !== 'test';
  }

  async send(opts: MailOptions): Promise<void> {
    try {
      if (this.queueEnabled) {
        await this.outbox.insert({
          to: opts.to.slice(0, 255),
          subject: opts.subject.slice(0, 300),
          html: opts.html,
          status: EmailStatus.PENDING,
          nextAttemptAt: new Date(),
        });
      } else {
        await this.transport.deliver(opts);
      }
    } catch (err) {
      // Không làm hỏng nghiệp vụ chính vì lỗi email
      this.logger.error(`Không xếp/gửi được email tới ${opts.to}: ${(err as Error).message}`);
    }
  }

  // ===== Mẫu email =====

  sendVerifyEmail(to: string, name: string, link: string) {
    return this.send({
      to,
      subject: 'Xác minh email tài khoản JobPortal',
      html: layout(
        `Chào ${escapeHtml(name)},`,
        'Cảm ơn bạn đã đăng ký JobPortal. Bấm nút dưới đây để xác minh email (link có hiệu lực 24 giờ).',
        'Xác minh email',
        link,
      ),
    });
  }

  sendResetPassword(to: string, link: string) {
    return this.send({
      to,
      subject: 'Đặt lại mật khẩu JobPortal',
      html: layout(
        'Yêu cầu đặt lại mật khẩu',
        'Bấm nút dưới đây để đặt mật khẩu mới (link có hiệu lực 30 phút). Nếu bạn không yêu cầu, hãy bỏ qua email này.',
        'Đặt lại mật khẩu',
        link,
      ),
    });
  }

  sendApplicationStatus(to: string, name: string, headline: string, jobTitle: string, companyName: string, note: string | null = null) {
    const web = this.config.get<string>('webUrl');
    return this.send({
      to,
      subject: `${headline} – ${jobTitle}`,
      html: layout(
        `Chào ${escapeHtml(name)},`,
        `${escapeHtml(headline)} cho vị trí <b>${escapeHtml(jobTitle)}</b> tại ${escapeHtml(companyName)}.` + noteBlock(note),
        'Xem đơn ứng tuyển',
        `${web}/candidate/applications`,
      ),
    });
  }

  /** Lời mời tham gia đội tuyển dụng của công ty */
  sendTeamInvitation(to: string, inviterName: string, companyName: string, link: string) {
    return this.send({
      to,
      subject: `${inviterName} mời bạn tham gia ${companyName} trên JobPortal`,
      html: layout(
        'Lời mời tham gia đội tuyển dụng',
        `${escapeHtml(inviterName)} mời bạn cùng quản lý tin tuyển dụng và ứng viên của <b>${escapeHtml(companyName)}</b>. ` +
          'Bấm nút dưới đây để chấp nhận (link có hiệu lực 7 ngày). Nếu chưa có tài khoản, bạn sẽ được hướng dẫn đăng ký bằng chính email này.',
        'Tham gia công ty',
        link,
      ),
    });
  }

  /** Mẫu thư mời phỏng vấn */
  sendInterviewInvite(
    to: string,
    name: string,
    jobTitle: string,
    companyName: string,
    interview: { time: string; location: string },
    note: string | null,
  ) {
    const web = this.config.get<string>('webUrl');
    return this.send({
      to,
      subject: `Thư mời phỏng vấn – ${jobTitle} – ${companyName}`,
      html: layout(
        `Chào ${escapeHtml(name)},`,
        `${escapeHtml(companyName)} trân trọng mời bạn tham gia phỏng vấn cho vị trí <b>${escapeHtml(jobTitle)}</b>.<br><br>` +
          `<b>Thời gian:</b> ${escapeHtml(interview.time)}<br><b>Địa điểm / hình thức:</b> ${escapeHtml(interview.location)}` +
          noteBlock(note) +
          '<br><br>Vui lòng phản hồi email này để xác nhận tham gia.',
        'Xem chi tiết',
        `${web}/candidate/applications`,
      ),
    });
  }

  /** Mẫu thư từ chối lịch sự */
  sendRejection(to: string, name: string, jobTitle: string, companyName: string, note: string | null) {
    const web = this.config.get<string>('webUrl');
    return this.send({
      to,
      subject: `Kết quả ứng tuyển – ${jobTitle} – ${companyName}`,
      html: layout(
        `Chào ${escapeHtml(name)},`,
        `Cảm ơn bạn đã quan tâm đến vị trí <b>${escapeHtml(jobTitle)}</b> tại ${escapeHtml(companyName)}. ` +
          'Sau khi cân nhắc, chúng tôi rất tiếc hồ sơ của bạn chưa phù hợp với yêu cầu ở thời điểm này. ' +
          'Chúng tôi sẽ lưu hồ sơ và liên hệ khi có cơ hội phù hợp hơn.' +
          noteBlock(note) +
          '<br><br>Chúc bạn sớm tìm được công việc như ý!',
        'Tìm việc khác',
        `${web}/jobs`,
      ),
    });
  }

  sendJobAlert(to: string, name: string, alertLabel: string, jobs: { title: string; company: string; salary: string; url: string }[], manageUrl: string) {
    const rows = jobs
      .map(
        (j) =>
          `<li style="margin-bottom:10px"><a href="${j.url}" style="color:#2563eb;font-weight:bold">${escapeHtml(j.title)}</a><br>` +
          `<span style="color:#475569">${escapeHtml(j.company)} · ${escapeHtml(j.salary)}</span></li>`,
      )
      .join('');
    return this.send({
      to,
      subject: `${jobs.length} việc làm mới phù hợp: ${alertLabel}`,
      html: `<div style="font-family:Arial,sans-serif;max-width:560px;margin:auto">
  <h2 style="color:#2563eb">JobPortal</h2>
  <p>Chào ${escapeHtml(name)}, có <b>${jobs.length}</b> việc làm mới khớp với thông báo <b>${escapeHtml(alertLabel)}</b>:</p>
  <ul style="padding-left:18px">${rows}</ul>
  <p style="font-size:12px;color:#64748b">Quản lý thông báo việc làm: ${manageUrl}</p>
</div>`,
    });
  }
}

function noteBlock(note: string | null) {
  return note ? `<br><br><i>Lời nhắn từ nhà tuyển dụng:</i><br>${escapeHtml(note).replace(/\n/g, '<br>')}` : '';
}

function escapeHtml(s: string) {
  return s.replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' })[c]!);
}

function layout(title: string, text: string, button: string, link: string) {
  return `<div style="font-family:Arial,sans-serif;max-width:520px;margin:auto">
  <h2 style="color:#2563eb">JobPortal</h2>
  <p><b>${title}</b></p>
  <p>${text}</p>
  <p><a href="${link}" style="display:inline-block;background:#2563eb;color:#fff;padding:10px 18px;border-radius:6px;text-decoration:none">${button}</a></p>
  <p style="font-size:12px;color:#64748b">Hoặc mở link: ${link}</p>
</div>`;
}
