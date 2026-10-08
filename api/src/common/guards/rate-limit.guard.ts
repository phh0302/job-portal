import {
  CanActivate,
  ExecutionContext,
  HttpException,
  HttpStatus,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Request } from 'express';
import { RATE_LIMIT_KEY, RateLimitOptions } from '../decorators/rate-limit.decorator';

/** Giới hạn mặc định cho mọi route không khai báo @RateLimit (chống spam / quét dữ liệu) */
const DEFAULT_LIMIT: RateLimitOptions = { limit: 300, windowSec: 60 };

/**
 * Rate limit đơn giản lưu trong bộ nhớ (đủ cho 1 instance API).
 * Khi chạy nhiều instance, chuyển sang Redis.
 */
@Injectable()
export class RateLimitGuard implements CanActivate {
  private readonly hits = new Map<string, { count: number; resetAt: number }>();
  private lastCleanup = Date.now();

  constructor(private readonly reflector: Reflector) {}

  canActivate(ctx: ExecutionContext): boolean {
    const opts = this.reflector.getAllAndOverride<RateLimitOptions>(RATE_LIMIT_KEY, [
      ctx.getHandler(),
      ctx.getClass(),
    ]);
    if (ctx.getType() !== 'http') return true;
    const req = ctx.switchToHttp().getRequest<Request>();
    // Route có @RateLimit: đếm riêng theo route; còn lại dùng chung 1 hạn mức theo IP
    const rule = opts ?? DEFAULT_LIMIT;
    const key = opts ? `${req.ip}:${req.method}:${req.route?.path ?? req.path}` : `${req.ip}:*`;
    const now = Date.now();
    this.cleanup(now);

    const entry = this.hits.get(key);
    if (!entry || entry.resetAt <= now) {
      this.hits.set(key, { count: 1, resetAt: now + rule.windowSec * 1000 });
      return true;
    }
    entry.count++;
    if (entry.count > rule.limit) {
      const wait = Math.ceil((entry.resetAt - now) / 1000);
      throw new HttpException(
        `Bạn thao tác quá nhanh, vui lòng thử lại sau ${wait} giây`,
        HttpStatus.TOO_MANY_REQUESTS,
      );
    }
    return true;
  }

  private cleanup(now: number) {
    if (now - this.lastCleanup < 60_000) return;
    this.lastCleanup = now;
    for (const [k, v] of this.hits) if (v.resetAt <= now) this.hits.delete(k);
  }
}
