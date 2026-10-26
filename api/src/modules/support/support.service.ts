import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, Not, Repository } from 'typeorm';
import { paginate } from '../../common/dto/pagination.dto';
import { FaqAudience, NotificationType, SupportSender, SupportStatus, UserRole, UserStatus } from '../../common/enums';
import { AuthUser } from '../../common/types/auth-user';
import { NotificationsService } from '../notifications/notifications.service';
import { RealtimeService } from '../notifications/realtime.service';
import { User } from '../users/entities/user.entity';
import { AdminTicketsQuery, FaqDto } from './dto/support.dto';
import { FaqArticle } from './entities/faq-article.entity';
import { SupportMessage } from './entities/support-message.entity';
import { SupportTicket } from './entities/support-ticket.entity';
import { searchFaqs, wantsHuman } from './faq-search';
import { SupportBotService } from './support-bot.service';

const ESCALATED_TEXT =
  'Mình đã chuyển cuộc trò chuyện tới nhân viên hỗ trợ. Nhân viên sẽ trả lời ngay tại đây (thường trong giờ hành chính 8:00–17:30). Bạn có thể đóng cửa sổ, khi có trả lời sẽ có thông báo.';

/**
 * Hỗ trợ khách hàng: trợ lý tự động trả lời trước, người dùng có thể "Gặp nhân viên" → admin chat trực tiếp.
 * Mỗi người dùng có tối đa 1 cuộc hỗ trợ đang mở.
 */
@Injectable()
export class SupportService {
  constructor(
    @InjectRepository(SupportTicket) private readonly tickets: Repository<SupportTicket>,
    @InjectRepository(SupportMessage) private readonly messages: Repository<SupportMessage>,
    @InjectRepository(FaqArticle) private readonly faqs: Repository<FaqArticle>,
    @InjectRepository(User) private readonly users: Repository<User>,
    private readonly bot: SupportBotService,
    private readonly notifications: NotificationsService,
    private readonly realtime: RealtimeService,
  ) {}

  // ================= FAQ (công khai) =================

  private audienceOf(role?: UserRole): FaqAudience[] {
    if (role === UserRole.CANDIDATE) return [FaqAudience.ALL, FaqAudience.CANDIDATE];
    if (role === UserRole.EMPLOYER) return [FaqAudience.ALL, FaqAudience.EMPLOYER];
    return [FaqAudience.ALL, FaqAudience.CANDIDATE, FaqAudience.EMPLOYER];
  }

  private activeFaqs(role?: UserRole, audience?: FaqAudience) {
    const aud = audience ? [FaqAudience.ALL, audience] : this.audienceOf(role);
    return this.faqs.find({ where: { isActive: true, audience: In(aud) }, order: { sortOrder: 'ASC', id: 'ASC' } });
  }

  async publicFaqs(q: string | undefined, audience: FaqAudience | undefined, role?: UserRole) {
    const list = await this.activeFaqs(role, audience);
    const picked = q ? searchFaqs(q, list, 8).map((m) => m.faq) : list.slice(0, 8);
    return picked.map((f) => ({ id: f.id, question: f.question, answer: f.answer, audience: f.audience }));
  }

  // ================= Người dùng =================

  private openTicket(userId: number) {
    return this.tickets.findOne({ where: { userId, status: Not(SupportStatus.CLOSED) }, order: { id: 'DESC' } });
  }

  async mine(userId: number) {
    const t = await this.openTicket(userId);
    if (!t) return { ticket: null, messages: [], aiEnabled: this.bot.aiEnabled };
    if (!t.userReadAt || t.userReadAt < t.lastMessageAt) await this.tickets.update(t.id, { userReadAt: t.lastMessageAt });
    return { ticket: this.ticketView(t), messages: await this.thread(t.id), aiEnabled: this.bot.aiEnabled };
  }

  async unreadForUser(userId: number) {
    const t = await this.openTicket(userId);
    return { unread: !!t && (!t.userReadAt || t.userReadAt < t.lastMessageAt) };
  }

  async send(user: AuthUser, body: string) {
    let t = await this.openTicket(user.id);
    const now = new Date();
    if (!t) {
      t = await this.tickets.save(
        this.tickets.create({ userId: user.id, status: SupportStatus.BOT, subject: body.replace(/\s+/g, ' ').slice(0, 200), lastMessageAt: now, userReadAt: now }),
      );
    }
    // Admin đã đọc hết trước tin này chưa? (tính TRƯỚC khi lưu tin mới)
    const adminHadRead = !t.adminReadAt || t.adminReadAt >= t.lastMessageAt;
    await this.addMessage(t, SupportSender.USER, body, user.id);

    if (t.status === SupportStatus.BOT) {
      if (wantsHuman(body)) {
        await this.escalate(user.id);
      } else {
        const history = (await this.thread(t.id, 20))
          .filter((m) => m.senderType === SupportSender.USER || m.senderType === SupportSender.BOT)
          .map((m) => ({ role: m.senderType === SupportSender.USER ? ('user' as const) : ('assistant' as const), text: m.body }));
        const reply = await this.bot.reply(user.id, user.role, history, await this.activeFaqs(user.role));
        await this.addMessage(t, SupportSender.BOT, reply.text, null, reply.faqIds);
        if (reply.handoff) await this.escalate(user.id);
      }
    } else {
      // Đang chờ / đang chat với nhân viên → báo admin
      await this.pushAdmins(t.id);
      if (adminHadRead && t.assignedAdminId) {
        await this.notifications.create({
          userId: t.assignedAdminId,
          type: NotificationType.SUPPORT,
          title: 'Khách hàng vừa nhắn trong cuộc hỗ trợ',
          message: body.slice(0, 120),
          link: `/admin/support?id=${t.id}`,
        });
      }
    }
    // Người gửi đã đọc tới tin của chính mình (và câu trả lời của bot)
    const fresh = await this.tickets.findOneByOrFail({ id: t.id });
    await this.tickets.update(t.id, { userReadAt: fresh.lastMessageAt });
    return { ticket: this.ticketView({ ...fresh, userReadAt: fresh.lastMessageAt }), messages: await this.thread(t.id), aiEnabled: this.bot.aiEnabled };
  }

  async escalate(userId: number) {
    const t = await this.openTicket(userId);
    if (!t) throw new BadRequestException('Bạn chưa có cuộc hỗ trợ nào. Hãy nhập câu hỏi trước.');
    if (t.status !== SupportStatus.BOT) return this.mine(userId);
    await this.tickets.update(t.id, { status: SupportStatus.WAITING, escalatedAt: new Date() });
    t.status = SupportStatus.WAITING;
    await this.addMessage(t, SupportSender.SYSTEM, ESCALATED_TEXT, null);
    const u = await this.users.findOneBy({ id: userId });
    await this.notifications.notifyAdmins({
      type: NotificationType.SUPPORT,
      title: 'Yêu cầu hỗ trợ mới',
      message: `${u?.email ?? 'Người dùng'}: ${t.subject}`,
      link: `/admin/support?id=${t.id}`,
    });
    await this.pushAdmins(t.id);
    return this.mine(userId);
  }

  async closeMine(userId: number) {
    const t = await this.openTicket(userId);
    if (!t) return { ok: true };
    await this.addMessage(t, SupportSender.SYSTEM, 'Người dùng đã kết thúc cuộc hỗ trợ.', null);
    await this.tickets.update(t.id, { status: SupportStatus.CLOSED, closedAt: new Date() });
    await this.pushAdmins(t.id);
    return { ok: true };
  }

  // ================= Admin =================

  async adminList(q: AdminTicketsQuery) {
    const qb = this.tickets
      .createQueryBuilder('t')
      .innerJoinAndSelect('t.user', 'u')
      .leftJoinAndSelect('u.candidateProfile', 'cp')
      .leftJoinAndSelect('u.employerProfile', 'ep')
      .leftJoinAndSelect('ep.company', 'co');
    if (q.status) qb.where('t.status = :st', { st: q.status });
    else qb.where('t.status <> :closed', { closed: SupportStatus.CLOSED });
    const [rows, total] = await qb
      .orderBy(`CASE WHEN t.status = '${SupportStatus.WAITING}' THEN 0 ELSE 1 END`, 'ASC')
      .addOrderBy('t.last_message_at', 'DESC')
      .offset((q.page - 1) * q.limit)
      .limit(q.limit)
      .getManyAndCount();
    return paginate(rows.map((t) => ({ ...this.ticketView(t), unreadForAdmin: this.adminUnread(t), user: this.userView(t.user) })), total, q.page, q.limit);
  }

  async adminCounts() {
    const [waiting, unread] = await Promise.all([
      this.tickets.countBy({ status: SupportStatus.WAITING }),
      this.tickets
        .createQueryBuilder('t')
        .where('t.status IN (:...st)', { st: [SupportStatus.WAITING, SupportStatus.OPEN] })
        .andWhere('(t.admin_read_at IS NULL OR t.admin_read_at < t.last_message_at)')
        .getCount(),
    ]);
    return { waiting, unread };
  }

  async adminDetail(id: number) {
    const t = await this.tickets.findOne({
      where: { id },
      relations: { user: { candidateProfile: true, employerProfile: { company: true } } },
    });
    if (!t) throw new NotFoundException('Không tìm thấy cuộc hỗ trợ');
    if (this.adminUnread(t)) await this.tickets.update(id, { adminReadAt: t.lastMessageAt });
    return { ticket: this.ticketView(t), user: this.userView(t.user), messages: await this.thread(id, 200) };
  }

  async adminReply(admin: AuthUser, id: number, body: string) {
    const t = await this.tickets.findOneBy({ id });
    if (!t) throw new NotFoundException('Không tìm thấy cuộc hỗ trợ');
    if (t.status === SupportStatus.CLOSED) throw new BadRequestException('Cuộc hỗ trợ đã đóng');
    const userHadRead = !t.userReadAt || t.userReadAt >= t.lastMessageAt;
    await this.tickets.update(id, { status: SupportStatus.OPEN, assignedAdminId: t.assignedAdminId ?? admin.id });
    t.status = SupportStatus.OPEN;
    const at = await this.addMessage(t, SupportSender.ADMIN, body, admin.id);
    await this.tickets.update(id, { adminReadAt: at });
    if (userHadRead) {
      await this.notifications.create({
        userId: t.userId,
        type: NotificationType.SUPPORT,
        title: 'Nhân viên hỗ trợ đã trả lời bạn',
        message: body.slice(0, 120),
        link: '/?support=open',
      });
    }
    return this.adminDetail(id);
  }

  async adminClose(admin: AuthUser, id: number) {
    const t = await this.tickets.findOneBy({ id });
    if (!t) throw new NotFoundException('Không tìm thấy cuộc hỗ trợ');
    if (t.status === SupportStatus.CLOSED) return this.adminDetail(id);
    await this.addMessage(t, SupportSender.SYSTEM, 'Nhân viên đã đóng cuộc hỗ trợ. Nếu cần thêm, bạn cứ nhắn để mở cuộc mới nhé.', null);
    await this.tickets.update(id, { status: SupportStatus.CLOSED, closedAt: new Date(), assignedAdminId: t.assignedAdminId ?? admin.id });
    return this.adminDetail(id);
  }

  // ----- FAQ (admin) -----

  async adminFaqs() {
    return this.faqs.find({ order: { sortOrder: 'ASC', id: 'ASC' } });
  }

  async createFaq(dto: FaqDto) {
    return this.faqs.save(this.faqs.create({ ...dto, keywords: dto.keywords || null, sortOrder: dto.sortOrder ?? 0 }));
  }

  async updateFaq(id: number, dto: FaqDto) {
    if (!(await this.faqs.existsBy({ id }))) throw new NotFoundException('Không tìm thấy câu hỏi');
    await this.faqs.update(id, { ...dto, keywords: dto.keywords || null, sortOrder: dto.sortOrder ?? 0 });
    return this.faqs.findOneByOrFail({ id });
  }

  async removeFaq(id: number) {
    const res = await this.faqs.delete(id);
    if (!res.affected) throw new NotFoundException('Không tìm thấy câu hỏi');
  }

  // ================= Hỗ trợ =================

  /** Lưu tin + cập nhật thời điểm tin cuối + đẩy realtime cho người dùng. Trả về thời điểm tin. */
  private async addMessage(t: SupportTicket, sender: SupportSender, body: string, senderUserId: number | null, faqIds?: number[]) {
    const m = await this.messages.save(
      this.messages.create({ ticketId: t.id, senderType: sender, body, senderUserId, faqIds: faqIds?.length ? JSON.stringify(faqIds) : null }),
    );
    const at = m.createdAt ?? new Date();
    await this.tickets.update(t.id, { lastMessageAt: at });
    t.lastMessageAt = at;
    this.realtime.publish(t.userId, 'support', { ticketId: t.id, status: t.status });
    return at;
  }

  private async pushAdmins(ticketId: number) {
    const admins = await this.users.find({ where: { role: UserRole.ADMIN, status: UserStatus.ACTIVE }, select: { id: true } });
    for (const a of admins) this.realtime.publish(a.id, 'support', { ticketId });
  }

  private async thread(ticketId: number, take = 100) {
    const rows = await this.messages.find({ where: { ticketId }, order: { id: 'DESC' }, take });
    return rows.reverse().map((m) => ({
      id: m.id,
      senderType: m.senderType,
      body: m.body,
      createdAt: m.createdAt,
      faqIds: m.faqIds ? (JSON.parse(m.faqIds) as number[]) : [],
    }));
  }

  private adminUnread(t: SupportTicket) {
    return (t.status === SupportStatus.WAITING || t.status === SupportStatus.OPEN) && (!t.adminReadAt || t.adminReadAt < t.lastMessageAt);
  }

  private ticketView(t: SupportTicket) {
    return {
      id: t.id,
      status: t.status,
      subject: t.subject,
      createdAt: t.createdAt,
      lastMessageAt: t.lastMessageAt,
      escalatedAt: t.escalatedAt,
      closedAt: t.closedAt,
      unread: !t.userReadAt || t.userReadAt < t.lastMessageAt,
    };
  }

  private userView(u: User) {
    const name = u.candidateProfile?.fullName ?? u.employerProfile?.fullName ?? null;
    return {
      id: u.id,
      email: u.email,
      role: u.role,
      status: u.status,
      name,
      company: u.employerProfile?.company ? { id: u.employerProfile.company.id, name: u.employerProfile.company.name, slug: u.employerProfile.company.slug } : null,
    };
  }
}
