import { Controller, ForbiddenException, Get, Logger, Param, Query, Res } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Response } from 'express';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { FileTokenService } from './file-token.service';
import { StorageService } from './storage.service';

const INLINE_TYPES: Record<string, string> = { '.pdf': 'application/pdf', '.png': 'image/png', '.jpg': 'image/jpeg', '.jpeg': 'image/jpeg' };

@ApiTags('files')
@Public()
@Controller('files')
export class FilesController {
  private readonly logger = new Logger(FilesController.name);

  constructor(
    private readonly tokens: FileTokenService,
    private readonly storage: StorageService,
  ) {}

  /** Tải file riêng tư bằng link có chữ ký. ?download=1 để buộc tải về thay vì xem trên trình duyệt */
  @Get('signed/:token')
  @RateLimit({ limit: 60, windowSec: 60 })
  serve(@Param('token') token: string, @Query('download') download: string | undefined, @Res() res: Response) {
    const p = this.tokens.verify(token);
    if (!p) throw new ForbiddenException('Link tải file không hợp lệ hoặc đã hết hạn');

    const ext = p.k.slice(p.k.lastIndexOf('.')).toLowerCase();
    const inline = download !== '1' && !!INLINE_TYPES[ext];
    res.setHeader('Cache-Control', 'private, no-store');
    res.setHeader('X-Content-Type-Options', 'nosniff');
    res.setHeader('Referrer-Policy', 'no-referrer');
    // Cho phép web (khác origin khi deploy) nhúng PDF trong iframe
    res.removeHeader('X-Frame-Options');
    res.setHeader('Content-Security-Policy', "default-src 'none'; style-src 'unsafe-inline'; frame-ancestors *");
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.setHeader(
      'Content-Disposition',
      `${inline ? 'inline' : 'attachment'}; filename*=UTF-8''${encodeURIComponent(p.n)}`,
    );
    if (inline) res.type(INLINE_TYPES[ext]);
    this.logger.log(`user#${p.u} tải ${p.k}`);
    res.sendFile(this.storage.fullPath(p.k), (err) => {
      if (err && !res.headersSent) res.status(404).json({ statusCode: 404, message: 'File không tồn tại' });
    });
  }
}
