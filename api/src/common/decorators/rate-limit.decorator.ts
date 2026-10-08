import { SetMetadata } from '@nestjs/common';

export const RATE_LIMIT_KEY = 'rateLimit';
export interface RateLimitOptions {
  /** Số request tối đa */
  limit: number;
  /** Trong khoảng thời gian (giây) */
  windowSec: number;
}
/** Giới hạn số request theo IP, vd: @RateLimit({ limit: 5, windowSec: 60 }) */
export const RateLimit = (opts: RateLimitOptions) => SetMetadata(RATE_LIMIT_KEY, opts);
