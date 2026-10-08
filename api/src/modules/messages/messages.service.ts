import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, LessThan, Repository } from 'typeorm';
import { paginate } from '../../common/dto/pagination.dto';
import { ApplicationStatus, NotificationType, UserRole } from '../../common/enums';
import { Application } from '../applications/entities/application.entity';
import { CandidateProfile } from '../candidates/entities/candidate-profile.entity';
import { EmployerProfile } from '../companies/entities/employer-profile.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../notifications/realtime.service';
import { StorageService } from '../storage/storage.service';
import { ApplicationMessage } from './entities/application-message.entity';

export type ChatSide = 'EMPLOYER' | 'CANDIDATE';
const PAGE = 50;

/**
 * Chat theo đơn ứng tuyển.
 * - Chỉ NTD mở cuộc trò chuyện; ứng viên trả lời khi NTD đã nhắn trước.
 * - Phía NTD dùng chung 1 hộp thư cho cả công ty (đọc/chưa đọc tính theo công ty).
 * - Đơn đã rút: chỉ xem lại, không gửi thêm.
 */
@Injectable()
export class MessagesService {
  constructor(
    @InjectRepository(ApplicationMessage) private readonly messages: Repository<ApplicationMessage>,
    @InjectRepository(Application) private readonly apps: Repository<Application>,
    @InjectRepository(EmployerProfile) private readonly employers: Repository<EmployerProfile>,
    @InjectRepository(CandidateProfile) private readonly candidates: Repository<CandidateProfile>,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeService,
    private readonly storage: StorageService,
  ) {}

  // ---------- Quyền truy cập ----------

  private async employerCompanyId(userId: number): Promise<number> {
    const p = await this.employers.findOneBy({ userId });
    if (!p?.companyId) throw new ForbiddenException('Bạn cần tạo hồ sơ công ty trước');
    return p.companyId;
  }

  private async candidateProfileId(userId: number): Promise<number> {
    const p = await this.candidates.findOne({ where: { userId }, select: { id: true } });
    if (!p) throw new NotFoundException('Không tìm thấy đơn ứng tuyển');
    return p.id;
  }

  /** Lấy đơn mà user có quyền xem; không có quyền → 404 */
  private async ownApplication(side: ChatSide, userId: number, applicationId: number) {
    const a = await this.apps.findOne({
      where: { id: applicationId },
      relations: { job: { company: true }, candidate: true },
    });
    if (!a) throw new NotFoundException('Không tìm thấy đơn ứng tuyển');
    if (side === 'EMPLOYER') {
      if (a.job.companyId !== (await this.employerCompanyId(userId))) throw new NotFoundException('Không tìm thấy đơn ứng tuyển');
    } else if (a.candidateId !== (await this.candidateProfileId(userId))) {
      throw new NotFoundException('Không tìm thấy đơn ứng tuyển');
    }
    return a;
  }

  // ---------- Hộp thư ----------

  async conversations(side: ChatSide, userId: number, page: number, limit: number) {
    const qb = this.apps
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.job', 'j')
      .innerJoinAndSelect('j.company', 'co')
      .innerJoinAndSelect('a.candidate', 'c')
      .where('a.last_message_at IS NOT NULL');
    if (side === 'EMPLOYER') qb.andWhere('j.company_id = :cid', { cid: await this.employerCompanyId(userId) });
    else qb.andWhere('a.candidate_id = :cid', { cid: await this.candidateProfileId(userId) });

    const [rows, total] = await qb
      .orderBy('a.last_message_at', 'DESC')
      .offset((page - 1) * limit)
      .limit(limit)
      .getManyAndCount();

    const last = await this.lastMessages(rows.map((a) => a.id));
    return paginate(
      rows.map((a) => ({
        applicationId: a.id,
        status: a.status,
        lastMessageAt: a.lastMessageAt,
        unread: this.isUnread(side, a),
        lastMessage: last.get(a.id) ?? null,
        job: { id: a.job.id, title: a.job.title, slug: a.job.slug },
        company: { name: a.job.company.name, logoUrl: this.storage.publicUrl(a.job.company.logoUrl) },
        candidate: { fullName: a.candidate.fullName, avatarUrl: this.storage.publicUrl(a.candidate.avatarUrl) },
      })),
      total,
      page,
      limit,
    );
  }

  async unreadCount(side: ChatSide, userId: number) {
    const qb = this.apps.createQueryBuilder('a').where('a.last_message_at IS NOT NULL');
    if (side === 'EMPLOYER') {
      qb.innerJoin('a.job', 'j')
        .andWhere('j.company_id = :cid', { cid: await this.employerCompanyId(userId) })
        .andWhere('(a.employer_read_at IS NULL OR a.employer_read_at < a.last_message_at)');
    } else {
      qb.andWhere('a.candidate_id = :cid', { cid: await this.candidateProfileId(userId) }).andWhere(
        '(a.candidate_read_at IS NULL OR a.candidate_read_at < a.last_message_at)',
      );
    }
    return { count: await qb.getCount() };
  }

  // ---------- Một cuộc trò chuyện ----------

  async thread(side: ChatSide, userId: number, applicationId: number, before?: number) {
    const a = await this.ownApplication(side, userId, applicationId);
    const rows = await this.messages.find({
      where: { applicationId, ...(before ? { id: LessThan(before) } : {}) },
      order: { id: 'DESC' },
      take: PAGE + 1,
    });
    const hasMore = rows.length > PAGE;
    const page = rows.slice(0, PAGE).reverse();
    const names = await this.senderNames(page, a);

    // Mở cuộc trò chuyện = đã đọc (chỉ khi xem trang mới nhất)
    if (!before && this.isUnread(side, a)) {
      await this.apps.update(a.id, side === 'EMPLOYER' ? { employerReadAt: a.lastMessageAt } : { candidateReadAt: a.lastMessageAt });
    }

    return {
      application: {
        id: a.id,
        status: a.status,
        job: { id: a.job.id, title: a.job.title, slug: a.job.slug },
        company: { name: a.job.company.name, logoUrl: this.storage.publicUrl(a.job.company.logoUrl) },
        candidate: { fullName: a.candidate.fullName, avatarUrl: this.storage.publicUrl(a.candidate.avatarUrl) },
      },
      canSend: this.canSend(side, a),
      hint: this.sendHint(side, a),
      hasMore,
      messages: page.map((m) => this.view(m, userId, names)),
    };
  }

  async send(side: ChatSide, userId: number, applicationId: number, body: string) {
    const a = await this.ownApplication(side, userId, applicationId);
    if (!this.canSend(side, a)) throw new BadRequestException(this.sendHint(side, a) ?? 'Không thể gửi tin nhắn');

    const wasUnreadForRecipient = this.isUnread(side === 'EMPLOYER' ? 'CANDIDATE' : 'EMPLOYER', a);
    const msg = await this.messages.save(
      this.messages.create({
        applicationId,
        senderUserId: userId,
        senderRole: side === 'EMPLOYER' ? UserRole.EMPLOYER : UserRole.CANDIDATE,
        body,
      }),
    );
    // Người gửi coi như đã đọc tới tin của chính mình
    const at = msg.createdAt;
    await this.apps.update(
      a.id,
      side === 'EMPLOYER' ? { lastMessageAt: at, employerReadAt: at } : { lastMessageAt: at, candidateReadAt: at },
    );

    const names = await this.senderNames([msg], a);
    const employerUserIds = (await this.employers.find({ where: { companyId: a.job.companyId }, select: { userId: true } })).map((e) => e.userId);
    const payload = { applicationId, message: { ...this.view(msg, -1, names) } };

    // Realtime: ứng viên + cả đội tuyển dụng (mọi tab đang mở)
    for (const uid of [a.candidate.userId, ...employerUserIds]) this.realtime.publish(uid, 'message', payload);

    // Thông báo trong web: chỉ khi phía nhận chưa có tin chưa đọc (tránh spam mỗi tin 1 thông báo)
    if (!wasUnreadForRecipient) {
      const recipients = side === 'EMPLOYER' ? [a.candidate.userId] : employerUserIds;
      await this.notifications.create(
        recipients.map((uid) => ({
          userId: uid,
          type: NotificationType.NEW_MESSAGE,
          title: side === 'EMPLOYER' ? `Tin nhắn mới từ ${a.job.company.name}` : `${a.candidate.fullName} đã trả lời tin nhắn`,
          message: `${a.job.title}: ${body.slice(0, 120)}`,
          link: side === 'EMPLOYER' ? `/candidate/messages/${a.id}` : `/employer/messages/${a.id}`,
        })),
      );
    }
    return this.view(msg, userId, names);
  }

  // ---------- Hỗ trợ ----------

  private isUnread(side: ChatSide, a: Application) {
    if (!a.lastMessageAt) return false;
    const read = side === 'EMPLOYER' ? a.employerReadAt : a.candidateReadAt;
    return !read || read < a.lastMessageAt;
  }

  private canSend(side: ChatSide, a: Application) {
    if (a.status === ApplicationStatus.WITHDRAWN) return false;
    if (side === 'CANDIDATE' && !a.lastMessageAt) return false;
    return true;
  }

  private sendHint(side: ChatSide, a: Application): string | null {
    if (a.status === ApplicationStatus.WITHDRAWN) return 'Đơn đã rút, không thể gửi thêm tin nhắn';
    if (side === 'CANDIDATE' && !a.lastMessageAt) return 'Bạn có thể trả lời khi nhà tuyển dụng nhắn tin trước';
    return null;
  }

  private async senderNames(list: ApplicationMessage[], a: Application) {
    const ids = [...new Set(list.filter((m) => m.senderRole === UserRole.EMPLOYER).map((m) => m.senderUserId))];
    const map = new Map<number, string>();
    if (ids.length) {
      for (const p of await this.employers.find({ where: { userId: In(ids) }, select: { userId: true, fullName: true } })) {
        map.set(p.userId, p.fullName);
      }
    }
    map.set(a.candidate.userId, a.candidate.fullName);
    return map;
  }

  private view(m: ApplicationMessage, userId: number, names: Map<number, string>) {
    return {
      id: m.id,
      body: m.body,
      createdAt: m.createdAt,
      senderRole: m.senderRole,
      senderUserId: m.senderUserId,
      senderName: names.get(m.senderUserId) ?? (m.senderRole === UserRole.EMPLOYER ? 'Nhà tuyển dụng' : 'Ứng viên'),
      mine: m.senderUserId === userId,
    };
  }

  private async lastMessages(appIds: number[]) {
    const map = new Map<number, { body: string; senderRole: UserRole; createdAt: Date }>();
    if (!appIds.length) return map;
    const rows = await this.messages
      .createQueryBuilder('m')
      .where((qb) => {
        const sub = qb
          .subQuery()
          .select('MAX(x.id)')
          .from(ApplicationMessage, 'x')
          .where('x.application_id IN (:...ids)')
          .groupBy('x.application_id')
          .getQuery();
        return `m.id IN ${sub}`;
      })
      .setParameter('ids', appIds)
      .getMany();
    for (const m of rows) map.set(m.applicationId, { body: m.body.slice(0, 140), senderRole: m.senderRole, createdAt: m.createdAt });
    return map;
  }
}
