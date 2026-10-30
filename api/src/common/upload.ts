import {
  CallHandler,
  ExecutionContext,
  Injectable,
  mixin,
  NestInterceptor,
  PayloadTooLargeException,
  Type,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { Observable } from 'rxjs';

/**
 * Nhận 1 file (trường "file", lưu trong bộ nhớ) tối đa `maxMb` MB.
 * File vượt giới hạn -> 413 "File tối đa {maxMb}MB" (thay vì câu chung chung) – BUG-13.
 */
export function upload(maxMb: number): Type<NestInterceptor> {
  const Base = FileInterceptor('file', { limits: { fileSize: maxMb * 1024 * 1024 + 1, files: 1 } });

  @Injectable()
  class LimitedUpload extends Base {
    async intercept(ctx: ExecutionContext, next: CallHandler): Promise<Observable<unknown>> {
      try {
        return await super.intercept(ctx, next);
      } catch (e) {
        if (e instanceof PayloadTooLargeException) throw new PayloadTooLargeException(`File tối đa ${maxMb}MB`);
        throw e;
      }
    }
  }
  return mixin(LimitedUpload);
}
