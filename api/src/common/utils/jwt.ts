import { createHmac, timingSafeEqual } from 'crypto';

/**
 * JWT HS256 tối giản dựa trên crypto của Node (không cần thư viện ngoài).
 * Chỉ dùng cho access token nội bộ của hệ thống.
 */

export interface JwtPayload {
  sub: number;
  role: string;
  iat?: number;
  exp?: number;
}

const b64url = (buf: Buffer | string) => Buffer.from(buf).toString('base64url');

/** "15m" | "7d" | "3600" -> số giây */
export function parseDuration(value: string): number {
  const m = /^(\d+)\s*([smhd]?)$/.exec(value.trim());
  if (!m) throw new Error(`Thời hạn không hợp lệ: ${value}`);
  const n = parseInt(m[1], 10);
  const unit = { '': 1, s: 1, m: 60, h: 3600, d: 86400 }[m[2] as '' | 's' | 'm' | 'h' | 'd'];
  return n * unit;
}

export function signJwt(payload: JwtPayload, secret: string, expiresInSec: number): string {
  const now = Math.floor(Date.now() / 1000);
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify({ ...payload, iat: now, exp: now + expiresInSec }));
  const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest('base64url');
  return `${header}.${body}.${sig}`;
}

/** Trả về payload nếu hợp lệ và chưa hết hạn, ngược lại trả về null */
export function verifyJwt(token: string, secret: string): JwtPayload | null {
  const parts = token.split('.');
  if (parts.length !== 3) return null;
  const [header, body, sig] = parts;

  const expected = createHmac('sha256', secret).update(`${header}.${body}`).digest();
  const actual = Buffer.from(sig, 'base64url');
  if (actual.length !== expected.length || !timingSafeEqual(actual, expected)) return null;

  try {
    const h = JSON.parse(Buffer.from(header, 'base64url').toString('utf8'));
    if (h.alg !== 'HS256') return null;
    const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as JwtPayload;
    if (typeof p.exp !== 'number' || p.exp < Math.floor(Date.now() / 1000)) return null;
    if (typeof p.sub !== 'number') return null;
    return p;
  } catch {
    return null;
  }
}
