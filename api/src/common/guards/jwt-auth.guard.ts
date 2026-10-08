import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { InjectRepository } from '@nestjs/typeorm';
import { Request } from 'express';
import { Repository } from 'typeorm';
import { User } from '../../modules/users/entities/user.entity';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { UserStatus } from '../enums';
import { AuthUser } from '../types/auth-user';
import { verifyJwt } from '../utils/jwt';

/**
 * Guard toàn cục: mọi route đều cần "Authorization: Bearer <accessToken>"
 * trừ route có @Public(). Tài khoản bị khóa sẽ bị chặn ngay (kiểm tra DB mỗi request).
 */
@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    private readonly reflector: Reflector,
    private readonly config: ConfigService,
    @InjectRepository(User) private readonly users: Repository<User>,
  ) {}

  async canActivate(ctx: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    const req = ctx.switchToHttp().getRequest<Request & { user?: AuthUser }>();
    const token = this.extractToken(req);

    if (!token) {
      if (isPublic) return true;
      throw new UnauthorizedException('Bạn chưa đăng nhập');
    }

    const payload = verifyJwt(token, this.config.getOrThrow<string>('jwt.accessSecret'));
    if (!payload) {
      if (isPublic) return true;
      throw new UnauthorizedException('Phiên đăng nhập đã hết hạn');
    }

    const user = await this.users.findOne({
      where: { id: payload.sub },
      select: { id: true, email: true, role: true, status: true, emailVerified: true },
    });
    if (!user) {
      if (isPublic) return true;
      throw new UnauthorizedException('Tài khoản không tồn tại');
    }
    if (user.status === UserStatus.LOCKED) {
      throw new ForbiddenException('Tài khoản của bạn đã bị khóa');
    }

    req.user = { id: user.id, email: user.email, role: user.role, emailVerified: user.emailVerified };
    return true;
  }

  private extractToken(req: Request): string | null {
    const header = req.headers.authorization;
    if (!header) return null;
    const [type, value] = header.split(' ');
    return type === 'Bearer' && value ? value : null;
  }
}
