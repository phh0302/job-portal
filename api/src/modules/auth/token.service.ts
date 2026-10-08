import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash, randomBytes } from 'crypto';
import { IsNull, LessThan, Repository } from 'typeorm';
import { UserTokenType } from '../../common/enums';
import { parseDuration, signJwt } from '../../common/utils/jwt';
import { User } from '../users/entities/user.entity';
import { RefreshToken } from './entities/refresh-token.entity';
import { UserToken } from './entities/user-token.entity';

export const sha256 = (v: string) => createHash('sha256').update(v).digest('hex');
const randomToken = () => randomBytes(32).toString('base64url');

/** Quản lý access token, refresh token và token 1 lần (email / reset mật khẩu) */
@Injectable()
export class TokenService {
  constructor(
    private readonly config: ConfigService,
    @InjectRepository(RefreshToken) private readonly refreshRepo: Repository<RefreshToken>,
    @InjectRepository(UserToken) private readonly userTokenRepo: Repository<UserToken>,
  ) {}

  get accessTtlSec() {
    return parseDuration(this.config.get<string>('jwt.accessExpires')!);
  }

  get refreshTtlSec() {
    return parseDuration(this.config.get<string>('jwt.refreshExpires')!);
  }

  signAccess(user: Pick<User, 'id' | 'role'>): string {
    return signJwt(
      { sub: user.id, role: user.role },
      this.config.getOrThrow<string>('jwt.accessSecret'),
      this.accessTtlSec,
    );
  }

  // ===== Refresh token =====

  async issueRefresh(userId: number, meta: { ip?: string; userAgent?: string }): Promise<string> {
    const token = randomToken();
    await this.refreshRepo.insert({
      userId,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + this.refreshTtlSec * 1000),
      userAgent: meta.userAgent?.slice(0, 300) ?? null,
      ipAddress: meta.ip?.slice(0, 45) ?? null,
    });
    return token;
  }

  findRefresh(token: string) {
    return this.refreshRepo.findOne({ where: { tokenHash: sha256(token) } });
  }

  async revokeRefresh(id: number) {
    await this.refreshRepo.update({ id, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  /** Thu hồi mọi phiên đăng nhập của user (đổi/đặt lại mật khẩu, phát hiện token bị đánh cắp) */
  async revokeAllRefresh(userId: number) {
    await this.refreshRepo.update({ userId, revokedAt: IsNull() }, { revokedAt: new Date() });
  }

  // ===== Token 1 lần =====

  async issueUserToken(userId: number, type: UserTokenType, ttlSec: number): Promise<string> {
    // Huỷ các token cùng loại chưa dùng
    await this.userTokenRepo.update({ userId, type, usedAt: IsNull() }, { usedAt: new Date() });
    const token = randomToken();
    await this.userTokenRepo.insert({
      userId,
      type,
      tokenHash: sha256(token),
      expiresAt: new Date(Date.now() + ttlSec * 1000),
    });
    return token;
  }

  /** Dùng token: trả về userId nếu hợp lệ, null nếu sai/hết hạn/đã dùng */
  async consumeUserToken(token: string, type: UserTokenType): Promise<number | null> {
    const row = await this.userTokenRepo.findOne({ where: { tokenHash: sha256(token), type } });
    if (!row || row.usedAt || row.expiresAt < new Date()) return null;
    const res = await this.userTokenRepo.update({ id: row.id, usedAt: IsNull() }, { usedAt: new Date() });
    return res.affected ? row.userId : null;
  }

  /** Dọn token hết hạn (gọi định kỳ sau này bằng cron) */
  async purgeExpired() {
    const now = new Date();
    await this.refreshRepo.delete({ expiresAt: LessThan(now) });
    await this.userTokenRepo.delete({ expiresAt: LessThan(now) });
  }
}
