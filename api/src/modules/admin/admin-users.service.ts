import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Brackets, Repository } from 'typeorm';
import { paginate } from '../../common/dto/pagination.dto';
import { NotificationType, UserRole, UserStatus } from '../../common/enums';
import { AuthUser } from '../../common/types/auth-user';
import { hashPassword } from '../../common/utils/password';
import { Application } from '../applications/entities/application.entity';
import { AuditService } from '../audit/audit.service';
import { TokenService } from '../auth/token.service';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { User } from '../users/entities/user.entity';
import { AdminUsersQuery, CreateAdminDto } from './dto/admin.dto';

@Injectable()
export class AdminUsersService {
  constructor(
    private readonly tokens: TokenService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
    private readonly notifications: NotificationsService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async list(q: AdminUsersQuery) {
    const qb = this.users
      .createQueryBuilder('u')
      .leftJoinAndSelect('u.candidateProfile', 'cp')
      .leftJoinAndSelect('u.employerProfile', 'ep')
      .leftJoinAndSelect('ep.company', 'c');
    if (q.role) qb.andWhere('u.role = :role', { role: q.role });
    if (q.status) qb.andWhere('u.status = :st', { st: q.status });
    if (q.q) {
      const kw = `%${q.q.replace(/[[\]%_]/g, (ch) => `[${ch}]`)}%`;
      qb.andWhere(new Brackets((w) => w.where('u.email LIKE :kw', { kw }).orWhere('cp.full_name LIKE :kw').orWhere('ep.full_name LIKE :kw').orWhere('c.name LIKE :kw')));
    }
    const [rows, total] = await qb.orderBy('u.created_at', 'DESC').offset((q.page - 1) * q.limit).limit(q.limit).getManyAndCount();
    return paginate(rows.map((u) => this.row(u)), total, q.page, q.limit);
  }

  async detail(id: number) {
    const u = await this.users.findOne({
      where: { id },
      relations: { candidateProfile: { location: true }, employerProfile: { company: true } },
    });
    if (!u) throw new NotFoundException('Không tìm thấy người dùng');
    const extra: Record<string, unknown> = {};
    if (u.candidateProfile) {
      extra.applications = await this.users.manager.countBy(Application, { candidateId: u.candidateProfile.id });
      extra.candidate = {
        id: u.candidateProfile.id,
        phone: u.candidateProfile.phone,
        headline: u.candidateProfile.headline,
        location: u.candidateProfile.location?.name ?? null,
        isPublic: u.candidateProfile.isPublic,
        avatarUrl: this.storage.publicUrl(u.candidateProfile.avatarUrl),
      };
    }
    if (u.employerProfile) {
      extra.employer = { phone: u.employerProfile.phone, position: u.employerProfile.position };
    }
    return { ...this.row(u), lockedReason: u.lockedReason, lastLoginAt: u.lastLoginAt, ...extra };
  }

  async lock(actor: AuthUser, id: number, reason: string, ip?: string) {
    const target = await this.guardTarget(actor, id);
    if (target.status === UserStatus.LOCKED) throw new BadRequestException('Tài khoản đã bị khóa');
    await this.users.update(id, { status: UserStatus.LOCKED, lockedReason: reason });
    await this.tokens.revokeAllRefresh(id); // đăng xuất khỏi mọi thiết bị
    await this.audit.log({ actorId: actor.id, action: 'USER_LOCK', entityType: 'user', entityId: id, metadata: { email: target.email, reason }, ip });
    return this.detail(id);
  }

  async unlock(actor: AuthUser, id: number, ip?: string) {
    const target = await this.guardTarget(actor, id);
    if (target.status !== UserStatus.LOCKED) throw new BadRequestException('Tài khoản không bị khóa');
    await this.users.update(id, { status: UserStatus.ACTIVE, lockedReason: null });
    await this.notifications.create({ userId: id, type: NotificationType.SYSTEM, title: 'Tài khoản của bạn đã được mở khóa' });
    await this.audit.log({ actorId: actor.id, action: 'USER_UNLOCK', entityType: 'user', entityId: id, metadata: { email: target.email }, ip });
    return this.detail(id);
  }

  /** Chỉ super admin được tạo admin */
  async createAdmin(actor: AuthUser, dto: CreateAdminDto, ip?: string) {
    await this.requireSuper(actor);
    if (await this.users.existsBy({ email: dto.email })) throw new ConflictException('Email đã được sử dụng');
    const u = await this.users.save(
      this.users.create({
        email: dto.email,
        passwordHash: await hashPassword(dto.password),
        role: UserRole.ADMIN,
        emailVerified: true,
        isSuperAdmin: dto.isSuperAdmin ?? false,
      }),
    );
    await this.audit.log({ actorId: actor.id, action: 'ADMIN_CREATE', entityType: 'user', entityId: u.id, metadata: { email: u.email, isSuperAdmin: u.isSuperAdmin }, ip });
    return this.detail(u.id);
  }

  async isSuper(userId: number) {
    return (await this.users.findOne({ where: { id: userId }, select: { id: true, isSuperAdmin: true } }))?.isSuperAdmin ?? false;
  }

  private async requireSuper(actor: AuthUser) {
    if (!(await this.isSuper(actor.id))) throw new ForbiddenException('Chỉ super admin mới thực hiện được thao tác này');
  }

  /** Không tự khóa mình; khóa admin khác cần super admin; không ai khóa được super admin */
  private async guardTarget(actor: AuthUser, id: number) {
    if (actor.id === id) throw new BadRequestException('Bạn không thể tự khóa / mở khóa tài khoản của mình');
    const target = await this.users.findOneBy({ id });
    if (!target) throw new NotFoundException('Không tìm thấy người dùng');
    if (target.isSuperAdmin) throw new ForbiddenException('Không thể thao tác với tài khoản super admin');
    if (target.role === UserRole.ADMIN) await this.requireSuper(actor);
    return target;
  }

  private row(u: User) {
    return {
      id: u.id,
      email: u.email,
      role: u.role,
      status: u.status,
      emailVerified: u.emailVerified,
      isSuperAdmin: u.isSuperAdmin,
      createdAt: u.createdAt,
      fullName: u.candidateProfile?.fullName ?? u.employerProfile?.fullName ?? (u.role === UserRole.ADMIN ? 'Quản trị viên' : null),
      company: u.employerProfile?.company ? { id: u.employerProfile.company.id, name: u.employerProfile.company.name, slug: u.employerProfile.company.slug } : null,
    };
  }
}
