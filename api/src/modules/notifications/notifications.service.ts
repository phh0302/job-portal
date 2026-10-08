import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate } from '../../common/dto/pagination.dto';
import { ApplicationStatus, NotificationType, UserRole, UserStatus } from '../../common/enums';
import { User } from '../users/entities/user.entity';
import { MailService } from '../mail/mail.service';
import { Notification } from './entities/notification.entity';
import { RealtimeService } from './realtime.service';

export interface NewNotification {
  userId: number;
  type: NotificationType;
  title: string;
  message?: string | null;
  link?: string | null;
}

const STATUS_TEXT: Partial<Record<ApplicationStatus, string>> = {
  [ApplicationStatus.VIEWED]: 'Nhà tuyển dụng đã xem hồ sơ của bạn',
  [ApplicationStatus.SHORTLISTED]: 'Hồ sơ của bạn được đánh giá phù hợp',
  [ApplicationStatus.INTERVIEW]: 'Bạn được mời phỏng vấn',
  [ApplicationStatus.OFFERED]: 'Chúc mừng! Bạn nhận được lời mời làm việc',
  [ApplicationStatus.REJECTED]: 'Hồ sơ của bạn chưa phù hợp với vị trí này',
};

@Injectable()
export class NotificationsService {
  constructor(
    @InjectRepository(Notification) private readonly repo: Repository<Notification>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly mail: MailService,
    private readonly realtime: RealtimeService,
  ) {}

  async create(items: NewNotification | NewNotification[]) {
    const list = Array.isArray(items) ? items : [items];
    if (!list.length) return;
    await this.repo.insert(list);
    // Đẩy ngay tới trình duyệt đang mở (chuông cập nhật tức thì)
    for (const n of list) {
      this.realtime.publish(n.userId, 'notification', { type: n.type, title: n.title, message: n.message ?? null, link: n.link ?? null });
    }
  }

  /** Gửi thông báo cho tất cả admin đang hoạt động */
  async notifyAdmins(n: Omit<NewNotification, 'userId'>) {
    const admins = await this.users.find({
      where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE },
      select: { id: true },
    });
    await this.create(admins.map((a) => ({ ...n, userId: a.id })));
  }

  /**
   * Gọi khi nhà tuyển dụng đổi trạng thái đơn (mục 5.3).
   * Tạo thông báo trong web + gửi email cho ứng viên.
   */
  async notifyApplicationStatus(p: {
    userId: number;
    email: string;
    candidateName: string;
    jobTitle: string;
    companyName: string;
    status: ApplicationStatus;
    /** Lời nhắn của NTD (thư từ chối / ghi chú) */
    message?: string | null;
    /** Thông tin phỏng vấn (khi status = INTERVIEW) */
    interview?: { time: string; location: string } | null;
    sendEmail?: boolean;
  }) {
    const text = STATUS_TEXT[p.status];
    if (!text) return;
    await this.create({
      userId: p.userId,
      type: NotificationType.APPLICATION_STATUS,
      title: text,
      message: `${p.jobTitle} – ${p.companyName}`,
      link: '/candidate/applications',
    });
    if (p.sendEmail === false) return;
    if (p.status === ApplicationStatus.INTERVIEW && p.interview) {
      await this.mail.sendInterviewInvite(p.email, p.candidateName, p.jobTitle, p.companyName, p.interview, p.message ?? null);
    } else if (p.status === ApplicationStatus.REJECTED) {
      await this.mail.sendRejection(p.email, p.candidateName, p.jobTitle, p.companyName, p.message ?? null);
    } else {
      await this.mail.sendApplicationStatus(p.email, p.candidateName, text, p.jobTitle, p.companyName, p.message ?? null);
    }
  }

  async list(userId: number, page: number, limit: number, unreadOnly = false) {
    const [items, total] = await this.repo.findAndCount({
      where: { userId, ...(unreadOnly && { isRead: false }) },
      order: { createdAt: 'DESC', id: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
      select: { id: true, type: true, title: true, message: true, link: true, isRead: true, createdAt: true },
    });
    return paginate(items, total, page, limit);
  }

  unreadCount(userId: number) {
    return this.repo.countBy({ userId, isRead: false }).then((count) => ({ count }));
  }

  async markRead(userId: number, id: number) {
    const res = await this.repo.update({ id, userId }, { isRead: true });
    if (!res.affected) throw new NotFoundException('Không tìm thấy thông báo');
  }

  async markAllRead(userId: number) {
    await this.repo.update({ userId, isRead: false }, { isRead: true });
  }
}
