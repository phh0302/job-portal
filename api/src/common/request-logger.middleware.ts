import { Injectable, Logger, NestMiddleware } from '@nestjs/common';
import { randomUUID } from 'crypto';
import { NextFunction, Request, Response } from 'express';
import { AuthUser } from './types/auth-user';

/**
 * Ghi log mỗi request: method, đường dẫn, mã trạng thái, thời gian xử lý, user, IP.
 * Gắn X-Request-Id để tra cứu lỗi (người dùng gửi mã này cho admin).
 */
@Injectable()
export class RequestLoggerMiddleware implements NestMiddleware {
  private readonly logger = new Logger('HTTP');

  use(req: Request & { id?: string; user?: AuthUser }, res: Response, next: NextFunction) {
    const incoming = req.headers['x-request-id'];
    req.id =
      typeof incoming === 'string' && /^[\w-]{8,64}$/.test(incoming) ? incoming : randomUUID();
    res.setHeader('X-Request-Id', req.id);
    const start = process.hrtime.bigint();

    res.on('finish', () => {
      const ms = Number(process.hrtime.bigint() - start) / 1e6;
      // Bỏ query string để không ghi token / dữ liệu nhạy cảm vào log
      const path = (req.originalUrl ?? req.url)
        .split('?')[0]
        .replace(/\/files\/signed\/[^/]+/, '/files/signed/***');
      const line = `${req.method} ${path} ${res.statusCode} ${ms.toFixed(0)}ms user=${req.user?.id ?? '-'} ip=${req.ip} id=${req.id}`;
      if (res.statusCode >= 500) this.logger.error(line);
      else if (res.statusCode >= 400) this.logger.warn(line);
      else if (process.env.LOG_REQUESTS !== 'false') this.logger.log(line);
    });
    next();
  }
}
