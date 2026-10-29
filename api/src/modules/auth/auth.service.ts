import {
  BadRequestException,
  ConflictException,
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { DataSource, Repository } from 'typeorm';
import { UserRole, UserStatus, UserTokenType } from '../../common/enums';
import { accountLocked } from '../../common/utils/account-locked';
import { hashPassword, verifyPassword } from '../../common/utils/password';
import { CandidateProfile } from '../candidates/entities/candidate-profile.entity';
import { EmployerProfile } from '../companies/entities/employer-profile.entity';
import { MailService } from '../mail/mail.service';
import { User } from '../users/entities/user.entity';
import { ChangePasswordDto, LoginDto, RegisterDto, ResetPasswordDto } from './dto/auth.dto';
import { TokenService } from './token.service';

const VERIFY_EMAIL_TTL = 24 * 3600; // 24 giờ
const RESET_PASSWORD_TTL = 30 * 60; // 30 phút

export interface ClientMeta {
  ip?: string;
  userAgent?: string;
}

export interface PublicUser {
  id: number;
  email: string;
  role: UserRole;
  emailVerified: boolean;
  fullName: string;
  companyId: number | null;
  isSuperAdmin: boolean;
}

export interface AuthResult {
  accessToken: string;
  expiresIn: number;
  user: PublicUser;
  /** Chỉ dùng nội bộ để set cookie, không trả về body */
  refreshToken: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly dataSource: DataSource,
    private readonly config: ConfigService,
    private readonly tokens: TokenService,
    private readonly mail: MailService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  // ===== Đăng ký / đăng nhập =====

  async register(dto: RegisterDto, meta: ClientMeta): Promise<AuthResult> {
    if (await this.users.exists({ where: { email: dto.email } })) {
      throw new ConflictException('Email này đã được đăng ký');
    }
    const passwordHash = await hashPassword(dto.password);

    const user = await this.dataSource.transaction(async (m) => {
      const u = await m.save(User, m.create(User, { email: dto.email, passwordHash, role: dto.role }));
      if (dto.role === UserRole.CANDIDATE) {
        await m.save(CandidateProfile, m.create(CandidateProfile, { userId: u.id, fullName: dto.fullName }));
      } else {
        await m.save(EmployerProfile, m.create(EmployerProfile, { userId: u.id, fullName: dto.fullName }));
      }
      return u;
    });

    await this.sendVerification(user.id, user.email, dto.fullName);
    return this.createSession(user.id, meta);
  }

  async login(dto: LoginDto, meta: ClientMeta): Promise<AuthResult> {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.email = :email', { email: dto.email })
      .getOne();

    if (!user || !(await verifyPassword(dto.password, user.passwordHash))) {
      throw new UnauthorizedException('Email hoặc mật khẩu không đúng');
    }
    if (user.status === UserStatus.LOCKED) {
      throw accountLocked();
    }

    await this.users.update(user.id, { lastLoginAt: new Date() });
    return this.createSession(user.id, meta);
  }

  /** Đổi refresh token cũ lấy cặp token mới (rotation) */
  async refresh(refreshToken: string | undefined, meta: ClientMeta): Promise<AuthResult> {
    if (!refreshToken) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    const row = await this.tokens.findRefresh(refreshToken);
    if (!row) throw new UnauthorizedException('Phiên đăng nhập không hợp lệ');

    if (row.revokedAt) {
      // Token đã bị dùng/thu hồi mà vẫn bị gửi lại -> nghi bị đánh cắp: huỷ mọi phiên
      await this.tokens.revokeAllRefresh(row.userId);
      throw new UnauthorizedException('Phiên đăng nhập không hợp lệ, vui lòng đăng nhập lại');
    }
    if (row.expiresAt < new Date()) throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');

    const user = await this.users.findOneBy({ id: row.userId });
    if (!user) throw new UnauthorizedException('Tài khoản không tồn tại');
    if (user.status === UserStatus.LOCKED) throw accountLocked();

    await this.tokens.revokeRefresh(row.id);
    return this.createSession(user.id, meta);
  }

  async logout(refreshToken: string | undefined) {
    if (!refreshToken) return;
    const row = await this.tokens.findRefresh(refreshToken);
    if (row) await this.tokens.revokeRefresh(row.id);
  }

  async me(userId: number): Promise<PublicUser> {
    return this.toPublicUser(userId);
  }

  // ===== Xác minh email =====

  async verifyEmail(token: string) {
    const userId = await this.tokens.consumeUserToken(token, UserTokenType.VERIFY_EMAIL);
    if (!userId) throw new BadRequestException('Link xác minh không hợp lệ hoặc đã hết hạn');
    await this.users.update(userId, { emailVerified: true });
    return { message: 'Xác minh email thành công' };
  }

  async resendVerification(userId: number) {
    const user = await this.toPublicUser(userId);
    if (user.emailVerified) return { message: 'Email đã được xác minh' };
    await this.sendVerification(user.id, user.email, user.fullName);
    return { message: 'Đã gửi lại email xác minh' };
  }

  // ===== Mật khẩu =====

  /** Luôn trả cùng 1 thông báo để không lộ email nào đã đăng ký */
  async forgotPassword(email: string) {
    const user = await this.users.findOneBy({ email });
    if (user && user.status === UserStatus.ACTIVE) {
      const token = await this.tokens.issueUserToken(user.id, UserTokenType.RESET_PASSWORD, RESET_PASSWORD_TTL);
      await this.mail.sendResetPassword(user.email, this.webLink('/reset-password', token));
    }
    return { message: 'Nếu email tồn tại, chúng tôi đã gửi hướng dẫn đặt lại mật khẩu' };
  }

  async resetPassword(dto: ResetPasswordDto) {
    const userId = await this.tokens.consumeUserToken(dto.token, UserTokenType.RESET_PASSWORD);
    if (!userId) throw new BadRequestException('Link đặt lại mật khẩu không hợp lệ hoặc đã hết hạn');
    // Bấm link trong email => email chắc chắn thuộc về user
    await this.users.update(userId, { passwordHash: await hashPassword(dto.newPassword), emailVerified: true });
    await this.tokens.revokeAllRefresh(userId);
    return { message: 'Đặt lại mật khẩu thành công, vui lòng đăng nhập lại' };
  }

  async changePassword(userId: number, dto: ChangePasswordDto) {
    const user = await this.users
      .createQueryBuilder('u')
      .addSelect('u.passwordHash')
      .where('u.id = :id', { id: userId })
      .getOne();
    if (!user) throw new NotFoundException('Tài khoản không tồn tại');
    if (!(await verifyPassword(dto.currentPassword, user.passwordHash))) {
      throw new BadRequestException('Mật khẩu hiện tại không đúng');
    }
    if (dto.currentPassword === dto.newPassword) {
      throw new BadRequestException('Mật khẩu mới phải khác mật khẩu hiện tại');
    }
    await this.users.update(userId, { passwordHash: await hashPassword(dto.newPassword) });
    await this.tokens.revokeAllRefresh(userId);
    return { message: 'Đổi mật khẩu thành công, vui lòng đăng nhập lại' };
  }

  // ===== Helpers =====

  private async createSession(userId: number, meta: ClientMeta): Promise<AuthResult> {
    const user = await this.toPublicUser(userId);
    return {
      accessToken: this.tokens.signAccess(user),
      expiresIn: this.tokens.accessTtlSec,
      user,
      refreshToken: await this.tokens.issueRefresh(userId, meta),
    };
  }

  private async toPublicUser(userId: number): Promise<PublicUser> {
    const u = await this.users.findOne({
      where: { id: userId },
      relations: { candidateProfile: true, employerProfile: true },
    });
    if (!u) throw new NotFoundException('Tài khoản không tồn tại');
    const fullName =
      u.candidateProfile?.fullName ??
      u.employerProfile?.fullName ??
      (u.role === UserRole.ADMIN ? 'Quản trị viên' : u.email);
    return {
      id: u.id,
      email: u.email,
      role: u.role,
      emailVerified: u.emailVerified,
      fullName,
      companyId: u.employerProfile?.companyId ?? null,
      isSuperAdmin: u.isSuperAdmin,
    };
  }

  private async sendVerification(userId: number, email: string, name: string) {
    const token = await this.tokens.issueUserToken(userId, UserTokenType.VERIFY_EMAIL, VERIFY_EMAIL_TTL);
    await this.mail.sendVerifyEmail(email, name, this.webLink('/verify-email', token));
  }

  private webLink(path: string, token: string) {
    return `${this.config.get<string>('webUrl')}${path}?token=${encodeURIComponent(token)}`;
  }
}
