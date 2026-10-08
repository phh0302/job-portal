import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';

export interface MailOptions {
  to: string;
  subject: string;
  html: string;
}

interface Transport {
  sendMail(opts: MailOptions & { from: string; text?: string }): Promise<unknown>;
}

/**
 * Gửi email thật qua SMTP (nodemailer) — hoặc in ra console khi chưa cấu hình SMTP (dev).
 * Ném lỗi khi gửi thất bại để hàng đợi thử lại.
 */
@Injectable()
export class MailTransport implements OnModuleInit {
  private readonly logger = new Logger('Mail');
  private transport: Transport | null = null;

  constructor(private readonly config: ConfigService) {}

  onModuleInit() {
    const host = this.config.get<string>('mail.host');
    if (!host) {
      this.logger.warn('Chưa cấu hình SMTP — email sẽ được in ra console');
      return;
    }
    try {
      // eslint-disable-next-line @typescript-eslint/no-require-imports
      const nodemailer = require('nodemailer');
      this.transport = nodemailer.createTransport({
        host,
        port: this.config.get<number>('mail.port'),
        secure: this.config.get<boolean>('mail.secure'),
        auth: { user: this.config.get('mail.user'), pass: this.config.get('mail.pass') },
        pool: true,
        maxConnections: 3,
      });
      this.logger.log(`SMTP: ${host}`);
    } catch {
      this.logger.error('Đã cấu hình SMTP nhưng chưa cài nodemailer: chạy "npm i nodemailer"');
    }
  }

  get isConsole() {
    return !this.transport;
  }

  async deliver(opts: MailOptions): Promise<void> {
    if (!this.transport) {
      this.logger.log(
        `\n──── EMAIL (dev) ────\nTo: ${opts.to}\nSubject: ${opts.subject}\n${htmlToText(opts.html)}\n─────────────────────`,
      );
      return;
    }
    await this.transport.sendMail({ from: this.config.get<string>('mail.from')!, ...opts, text: htmlToText(opts.html) });
  }
}

export function htmlToText(html: string) {
  return html
    .replace(/<a [^>]*href="([^"]+)"[^>]*>([^<]+)<\/a>/g, '$2: $1')
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/(p|li|h\d|div)>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/\n\s*\n/g, '\n')
    .trim();
}
