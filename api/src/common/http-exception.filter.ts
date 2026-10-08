import {
  ArgumentsHost,
  Catch,
  ExceptionFilter,
  HttpException,
  HttpStatus,
  Logger,
} from '@nestjs/common';
import { Request, Response } from 'express';
import { QueryFailedError } from 'typeorm';

/**
 * Xử lý lỗi tập trung. Mọi lỗi trả về dạng:
 * { statusCode, message, path, timestamp, requestId }
 * Lỗi 5xx: ghi log đầy đủ (stack) nhưng KHÔNG lộ chi tiết kỹ thuật cho người dùng.
 */
@Catch()
export class AllExceptionsFilter implements ExceptionFilter {
  private readonly logger = new Logger('Exception');

  catch(exception: unknown, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const res = ctx.getResponse<Response>();
    const req = ctx.getRequest<Request & { id?: string; user?: { id: number } }>();

    let status = HttpStatus.INTERNAL_SERVER_ERROR;
    let message: unknown = 'Lỗi máy chủ, vui lòng thử lại sau';

    if (exception instanceof HttpException) {
      status = exception.getStatus();
      const body = exception.getResponse();
      message = typeof body === 'string' ? body : ((body as { message?: unknown }).message ?? body);
      if (status === HttpStatus.PAYLOAD_TOO_LARGE)
        message = 'Dữ liệu / file vượt quá dung lượng cho phép';
    } else if (
      exception instanceof QueryFailedError &&
      /UNIQUE|duplicate key/i.test(exception.message)
    ) {
      // Trùng khóa duy nhất (vd. bấm gửi 2 lần) -> 409 thay vì 500
      status = HttpStatus.CONFLICT;
      message = 'Dữ liệu đã tồn tại';
    }

    if (status >= 500) {
      const err = exception instanceof Error ? exception : new Error(String(exception));
      this.logger.error(
        `[${req.id ?? '-'}] ${req.method} ${req.url} user=${req.user?.id ?? '-'}: ${err.message}`,
        err.stack,
      );
    }

    if (res.headersSent) return;
    res.status(status).json({
      statusCode: status,
      message,
      path: req.url.split('?')[0],
      timestamp: new Date().toISOString(),
      requestId: req.id,
    });
  }
}
