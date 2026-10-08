import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { IsNull, MoreThan, Not, Repository } from 'typeorm';
import { CompanyRole, NotificationType, UserRole } from '../../common/enums';
import { CompanyInvitation } from '../companies/entities/company-invitation.entity';
import { Company } from '../companies/entities/company.entity';
import { EmployerProfile } from '../companies/entities/employer-profile.entity';
import { MailService } from '../mail/mail.service';
import { NotificationsService } from '../notifications/notifications.service';
import { User } from '../users/entities/user.entity';
import { EmployerContext } from './employer-context.service';

const INVITE_TTL_MS = 7 * 86_400_000;
const MAX_PENDING_INVITES = 20;
const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');

/**
 * Đội tuyển dụng của công ty: nhiều tài khoản NTD dùng chung 1 công ty.
 * - OWNER: sửa hồ sơ công ty, xác minh, mời / xóa thành viên, đổi vai trò.
 * - MEMBER: đăng tin & xử lý ứng viên của công ty.
 * Công ty luôn phải còn ít nhất 1 OWNER.
 */
@Injectable()
export class EmployerTeamService {
  constructor(
    private readonly ctx: EmployerContext,
    private readonly config: ConfigService,
    private readonly mail: MailService,
    private readonly notifications: NotificationsService,
    @InjectRepository(EmployerProfile) private readonly profiles: Repository<EmployerProfile>,
    @InjectRepository(CompanyInvitation) private readonly invites: Repository<CompanyInvitation>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async team(userId: number) {
    const me = await this.ctx.profile(userId);
    const company = await this.ctx.company(userId);
    const members = await this.profiles.find({ where: { companyId: company.id }, relations: { user: true }, order: { companyRole: 'DESC', createdAt: 'ASC' } });
    const isOwner = me.companyRole === CompanyRole.OWNER;
    const pending = isOwner
      ? await this.invites.find({
          where: { companyId: company.id, acceptedAt: IsNull(), revokedAt: IsNull(), expiresAt: MoreThan(new Date()) },
          relations: { invitedBy: true },
          order: { createdAt: 'DESC' },
        })
      : [];
    return {
      myRole: me.companyRole,
      members: members.map((m) => ({
        userId: m.userId,
        fullName: m.fullName,
        email: m.user.email,
        position: m.position,
        role: m.companyRole,
        isMe: m.userId === userId,
        active: m.user.status === 'ACTIVE',
      })),
      invitations: pending.map((i) => ({
        id: i.id,
        email: i.email,
        role: i.role,
        expiresAt: i.expiresAt,
        createdAt: i.createdAt,
        invitedBy: i.invitedBy?.email ?? null,
      })),
    };
  }

  /** Mời đồng nghiệp. Trả link mời 1 lần để chủ tài khoản có thể gửi tay (khi email chưa cấu hình) */
  async invite(userId: number, email: string, role: CompanyRole) {
    const company = await this.ctx.ownerCompany(userId);
    const inviter = await this.ctx.profile(userId);

    const existing = await this.users.findOne({ where: { email }, relations: { employerProfile: true } });
    if (existing) {
      if (existing.role !== UserRole.EMPLOYER) throw new BadRequestException('Email này đang là tài khoản ứng viên / quản trị, không thể mời làm nhà tuyển dụng');
      if (existing.employerProfile?.companyId === company.id) throw new ConflictException('Người này đã là thành viên của công ty');
      if (existing.employerProfile?.companyId) throw new ConflictException('Tài khoản này đang thuộc một công ty khác');
    }
    const pendingCount = await this.invites.countBy({ companyId: company.id, acceptedAt: IsNull(), revokedAt: IsNull(), expiresAt: MoreThan(new Date()) });
    if (pendingCount >= MAX_PENDING_INVITES) throw new BadRequestException(`Tối đa ${MAX_PENDING_INVITES} lời mời đang chờ`);

    // Thu hồi lời mời cũ cùng email (nếu có) rồi tạo mới
    await this.invites.update({ companyId: company.id, email, acceptedAt: IsNull(), revokedAt: IsNull() }, { revokedAt: new Date() });
    const token = randomBytes(32).toString('base64url');
    const inv = await this.invites.save(
      this.invites.create({ companyId: company.id, email, role, tokenHash: sha256(token), invitedById: userId, expiresAt: new Date(Date.now() + INVITE_TTL_MS) }),
    );
    const link = `${this.config.get<string>('webUrl')}/join-company?token=${encodeURIComponent(token)}`;
    await this.mail.sendTeamInvitation(email, inviter.fullName, company.name, link);
    if (existing) {
      await this.notifications.create({ userId: existing.id, type: NotificationType.SYSTEM, title: `Lời mời tham gia ${company.name}`, message: `Từ ${inviter.fullName}`, link: `/join-company?token=${encodeURIComponent(token)}` });
    }
    return { id: inv.id, email, role, expiresAt: inv.expiresAt, link };
  }

  async revokeInvitation(userId: number, id: number) {
    const company = await this.ctx.ownerCompany(userId);
    const res = await this.invites.update({ id, companyId: company.id, acceptedAt: IsNull(), revokedAt: IsNull() }, { revokedAt: new Date() });
    if (!res.affected) throw new NotFoundException('Không tìm thấy lời mời');
  }

  /** Thông tin lời mời (trang tham gia, không cần đăng nhập) */
  async preview(token: string) {
    const inv = await this.findValid(token);
    return { companyName: inv.company.name, companySlug: inv.company.slug, email: inv.email, role: inv.role, expiresAt: inv.expiresAt };
  }

  async accept(userId: number, token: string) {
    const inv = await this.findValid(token);
    const user = await this.users.findOneByOrFail({ id: userId });
    if (user.email.toLowerCase() !== inv.email.toLowerCase()) {
      throw new ForbiddenException(`Lời mời dành cho ${inv.email}. Vui lòng đăng nhập đúng tài khoản này.`);
    }
    const me = await this.ctx.profile(userId);
    if (me.companyId === inv.companyId) throw new ConflictException('Bạn đã là thành viên của công ty này');
    if (me.companyId) throw new ConflictException('Tài khoản của bạn đang thuộc một công ty khác. Hãy rời công ty đó trước.');

    const claim = await this.invites.update({ id: inv.id, acceptedAt: IsNull(), revokedAt: IsNull() }, { acceptedAt: new Date() });
    if (!claim.affected) throw new BadRequestException('Lời mời đã được sử dụng');
    await this.profiles.update(me.id, { companyId: inv.companyId, companyRole: inv.role });

    const owners = await this.profiles.find({ where: { companyId: inv.companyId, companyRole: CompanyRole.OWNER, userId: Not(userId) }, select: { userId: true } });
    await this.notifications.create(
      owners.map((o) => ({ userId: o.userId, type: NotificationType.SYSTEM, title: 'Thành viên mới đã tham gia', message: `${me.fullName} (${user.email})`, link: '/employer/team' })),
    );
    return { companyId: inv.companyId, companyName: inv.company.name, role: inv.role };
  }

  async changeRole(userId: number, memberUserId: number, role: CompanyRole) {
    const company = await this.ctx.ownerCompany(userId);
    const member = await this.member(company.id, memberUserId);
    if (member.companyRole === role) return this.team(userId);
    if (member.companyRole === CompanyRole.OWNER && role === CompanyRole.MEMBER) await this.ensureAnotherOwner(company.id, memberUserId);
    await this.profiles.update(member.id, { companyRole: role });
    await this.notifications.create({
      userId: memberUserId,
      type: NotificationType.SYSTEM,
      title: role === CompanyRole.OWNER ? `Bạn đã trở thành quản trị viên của ${company.name}` : `Vai trò của bạn tại ${company.name} đã đổi thành thành viên`,
      link: '/employer/team',
    });
    return this.team(userId);
  }

  async removeMember(userId: number, memberUserId: number) {
    if (memberUserId === userId) throw new BadRequestException('Dùng chức năng "Rời công ty" để tự rời');
    const company = await this.ctx.ownerCompany(userId);
    const member = await this.member(company.id, memberUserId);
    if (member.companyRole === CompanyRole.OWNER) await this.ensureAnotherOwner(company.id, memberUserId);
    await this.detach(member.id);
    await this.notifications.create({ userId: memberUserId, type: NotificationType.SYSTEM, title: `Bạn đã được gỡ khỏi ${company.name}`, link: '/employer' });
    return this.team(userId);
  }

  async leave(userId: number) {
    const me = await this.ctx.profile(userId);
    if (!me.companyId) throw new BadRequestException('Bạn chưa thuộc công ty nào');
    const others = await this.profiles.countBy({ companyId: me.companyId, userId: Not(userId) });
    if (!others) throw new BadRequestException('Bạn là thành viên duy nhất của công ty, không thể rời');
    if (me.companyRole === CompanyRole.OWNER) await this.ensureAnotherOwner(me.companyId, userId);
    await this.detach(me.id);
    return { left: true };
  }

  // ===== Helpers =====

  private async findValid(token: string) {
    const inv = await this.invites.findOne({ where: { tokenHash: sha256(token) }, relations: { company: true } });
    if (!inv || inv.revokedAt) throw new NotFoundException('Lời mời không hợp lệ hoặc đã bị thu hồi');
    if (inv.acceptedAt) throw new BadRequestException('Lời mời đã được sử dụng');
    if (inv.expiresAt < new Date()) throw new BadRequestException('Lời mời đã hết hạn, hãy nhờ người mời gửi lại');
    return inv;
  }

  private async member(companyId: number, memberUserId: number) {
    const m = await this.profiles.findOneBy({ companyId, userId: memberUserId });
    if (!m) throw new NotFoundException('Không tìm thấy thành viên');
    return m;
  }

  private async ensureAnotherOwner(companyId: number, exceptUserId: number) {
    const n = await this.profiles.countBy({ companyId, companyRole: CompanyRole.OWNER, userId: Not(exceptUserId) });
    if (!n) throw new BadRequestException('Công ty cần ít nhất 1 quản trị viên. Hãy chỉ định người khác làm quản trị viên trước.');
  }

  /** Gỡ khỏi công ty: về trạng thái "chưa có công ty", có thể tạo / tham gia công ty khác */
  private async detach(profileId: number) {
    await this.profiles.update(profileId, { companyId: null, companyRole: CompanyRole.OWNER });
  }
}
