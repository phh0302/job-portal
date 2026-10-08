import { Body, Controller, Get, HttpCode, Post, Req, Res } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { ApiBearerAuth, ApiTags } from '@nestjs/swagger';
import { Request, Response } from 'express';
import { CurrentUser } from '../../common/decorators/current-user.decorator';
import { Public } from '../../common/decorators/public.decorator';
import { RateLimit } from '../../common/decorators/rate-limit.decorator';
import { AuthUser } from '../../common/types/auth-user';
import { AuthResult, AuthService, ClientMeta } from './auth.service';
import { TokenService } from './token.service';
import {
  ChangePasswordDto,
  EmailDto,
  LoginDto,
  RegisterDto,
  ResetPasswordDto,
  TokenDto,
} from './dto/auth.dto';

const REFRESH_COOKIE = 'jp_rt';
const COOKIE_PATH = '/api/auth';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    private readonly auth: AuthService,
    private readonly tokens: TokenService,
    private readonly config: ConfigService,
  ) {}

  @Public()
  @RateLimit({ limit: 5, windowSec: 60 })
  @Post('register')
  async register(@Body() dto: RegisterDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.withCookie(res, await this.auth.register(dto, meta(req)));
  }

  @Public()
  @RateLimit({ limit: 10, windowSec: 60 })
  @HttpCode(200)
  @Post('login')
  async login(@Body() dto: LoginDto, @Req() req: Request, @Res({ passthrough: true }) res: Response) {
    return this.withCookie(res, await this.auth.login(dto, meta(req)));
  }

  @Public()
  @RateLimit({ limit: 30, windowSec: 60 })
  @HttpCode(200)
  @Post('refresh')
  async refresh(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    try {
      return this.withCookie(res, await this.auth.refresh(readCookie(req, REFRESH_COOKIE), meta(req)));
    } catch (err) {
      this.clearCookie(res);
      throw err;
    }
  }

  @Public()
  @HttpCode(200)
  @Post('logout')
  async logout(@Req() req: Request, @Res({ passthrough: true }) res: Response) {
    await this.auth.logout(readCookie(req, REFRESH_COOKIE));
    this.clearCookie(res);
    return { message: 'Đã đăng xuất' };
  }

  @ApiBearerAuth()
  @Get('me')
  me(@CurrentUser() user: AuthUser) {
    return this.auth.me(user.id);
  }

  @Public()
  @RateLimit({ limit: 10, windowSec: 60 })
  @HttpCode(200)
  @Post('verify-email')
  verifyEmail(@Body() dto: TokenDto) {
    return this.auth.verifyEmail(dto.token);
  }

  @ApiBearerAuth()
  @RateLimit({ limit: 3, windowSec: 300 })
  @HttpCode(200)
  @Post('resend-verification')
  resendVerification(@CurrentUser() user: AuthUser) {
    return this.auth.resendVerification(user.id);
  }

  @Public()
  @RateLimit({ limit: 3, windowSec: 300 })
  @HttpCode(200)
  @Post('forgot-password')
  forgotPassword(@Body() dto: EmailDto) {
    return this.auth.forgotPassword(dto.email);
  }

  @Public()
  @RateLimit({ limit: 10, windowSec: 300 })
  @HttpCode(200)
  @Post('reset-password')
  resetPassword(@Body() dto: ResetPasswordDto) {
    return this.auth.resetPassword(dto);
  }

  @ApiBearerAuth()
  @RateLimit({ limit: 5, windowSec: 300 })
  @HttpCode(200)
  @Post('change-password')
  async changePassword(
    @CurrentUser() user: AuthUser,
    @Body() dto: ChangePasswordDto,
    @Res({ passthrough: true }) res: Response,
  ) {
    const result = await this.auth.changePassword(user.id, dto);
    this.clearCookie(res);
    return result;
  }

  // ===== Cookie refresh token (httpOnly — JavaScript phía web không đọc được) =====

  private withCookie(res: Response, result: AuthResult) {
    const { refreshToken, ...body } = result;
    res.cookie(REFRESH_COOKIE, refreshToken, {
      httpOnly: true,
      sameSite: 'lax',
      secure: this.config.get('nodeEnv') === 'production',
      path: COOKIE_PATH,
      maxAge: this.tokens.refreshTtlSec * 1000,
    });
    return body;
  }

  private clearCookie(res: Response) {
    res.clearCookie(REFRESH_COOKIE, { path: COOKIE_PATH });
  }
}

function meta(req: Request): ClientMeta {
  return { ip: req.ip, userAgent: req.headers['user-agent'] };
}

function readCookie(req: Request, name: string): string | undefined {
  const header = req.headers.cookie;
  if (!header) return undefined;
  for (const part of header.split(';')) {
    const idx = part.indexOf('=');
    if (idx > -1 && part.slice(0, idx).trim() === name) {
      return decodeURIComponent(part.slice(idx + 1).trim());
    }
  }
  return undefined;
}
