import { Injectable } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { createHmac, timingSafeEqual } from 'crypto';

export interface FileTokenPayload {
  /** key file trong storage (private/...) */
  k: string;
  /** tên file khi tải về */
  n: string;
  /** hết hạn (giây, epoch) */
  e: number;
  /** id người được cấp link (để ghi log) */
  u: number;
}

const DEFAULT_TTL_SEC = 5 * 60; // link sống 5 phút

/**
 * Link tải file có chữ ký (signed URL): /api/files/signed/<token>
 * - Không cần header Authorization -> mở được trong tab mới / iframe.
 * - Hết hạn sau vài phút, sửa 1 ký tự là chữ ký sai.
 * Quyền truy cập được kiểm tra TRƯỚC khi cấp link (ở service của ứng viên / NTD / admin).
 */
@Injectable()
export class FileTokenService {
  private readonly secret: string;

  constructor(config: ConfigService) {
    // Khóa riêng cho file, suy ra từ JWT secret để không phải cấu hình thêm
    this.secret = createHmac('sha256', config.getOrThrow<string>('jwt.accessSecret')).update('file-links').digest('hex');
  }

  sign(p: Omit<FileTokenPayload, 'e'>, ttlSec = DEFAULT_TTL_SEC): { url: string; expiresAt: string } {
    const payload: FileTokenPayload = { ...p, e: Math.floor(Date.now() / 1000) + ttlSec };
    const body = Buffer.from(JSON.stringify(payload)).toString('base64url');
    const sig = createHmac('sha256', this.secret).update(body).digest('base64url');
    return { url: `/api/files/signed/${body}.${sig}`, expiresAt: new Date(payload.e * 1000).toISOString() };
  }

  verify(token: string): FileTokenPayload | null {
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const expected = createHmac('sha256', this.secret).update(body).digest();
    const actual = Buffer.from(sig, 'base64url');
    if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;
    try {
      const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as FileTokenPayload;
      if (typeof p.k !== 'string' || !p.k.startsWith('private/') || typeof p.e !== 'number') return null;
      if (p.e < Math.floor(Date.now() / 1000)) return null;
      return p;
    } catch {
      return null;
    }
  }
}
