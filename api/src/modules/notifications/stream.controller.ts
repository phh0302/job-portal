import { Controller, Get, MessageEvent, Query, Sse, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { createHmac, timingSafeEqual } from 'crypto';
import { Observable } from 'rxjs';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { RealtimeService } from './realtime.service';

const TOKEN_TTL_SEC = 60;

/**
 * Kết nối realtime (SSE). EventSource của trình duyệt không gửi được header Authorization,
 * nên client xin trước 1 "stream token" (sống 60 giây, chỉ dùng để mở kết nối) rồi mở:
 *   GET /api/notifications/stream?token=...
 */
@ApiTags('notifications')
@Controller('notifications')
export class NotificationsStreamController {
  private readonly secret: string;

  constructor(
    private readonly realtime: RealtimeService,
    config: ConfigService,
  ) {
    this.secret = createHmac('sha256', config.getOrThrow<string>('jwt.accessSecret')).update('sse-stream').digest('hex');
  }

  @ApiBearerAuth()
  @Get('stream-token')
  token(@CurrentUser() u: AuthUser) {
    const body = Buffer.from(JSON.stringify({ u: u.id, e: Math.floor(Date.now() / 1000) + TOKEN_TTL_SEC })).toString('base64url');
    return { token: `${body}.${this.sign(body)}` };
  }

  @Public()
  @Sse('stream')
  stream(@Query('token') token: string | undefined): Observable<MessageEvent> {
    const userId = this.verify(token ?? '');
    if (!userId) throw new UnauthorizedException('Phiên realtime không hợp lệ');
    return this.realtime.stream(userId);
  }

  private sign(body: string) {
    return createHmac('sha256', this.secret).update(body).digest('base64url');
  }

  verify(token: string): number | null {
    const [body, sig] = token.split('.');
    if (!body || !sig) return null;
    const a = Buffer.from(sig, 'base64url');
    const b = Buffer.from(this.sign(body), 'base64url');
    if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
    try {
      const p = JSON.parse(Buffer.from(body, 'base64url').toString('utf8')) as { u: number; e: number };
      return typeof p.u === 'number' && p.e >= Math.floor(Date.now() / 1000) ? p.u : null;
    } catch {
      return null;
    }
  }
}
