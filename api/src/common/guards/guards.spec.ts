import { ExecutionContext, ForbiddenException, HttpException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { UserRole, UserStatus } from '../enums';
import { signJwt } from '../utils/jwt';
import { JwtAuthGuard } from './jwt-auth.guard';
import { RateLimitGuard } from './rate-limit.guard';
import { RolesGuard } from './roles.guard';

const SECRET = 'guard_test_secret_guard_test_secret';

function ctx(req: Record<string, unknown>): ExecutionContext {
  return {
    getType: () => 'http',
    getHandler: () => () => undefined,
    getClass: () => class {},
    switchToHttp: () => ({ getRequest: () => req }),
  } as unknown as ExecutionContext;
}

function reflectorReturning(value: unknown): Reflector {
  return { getAllAndOverride: () => value } as unknown as Reflector;
}

describe('RolesGuard', () => {
  it('cho qua khi route không yêu cầu role', () => {
    expect(new RolesGuard(reflectorReturning(undefined)).canActivate(ctx({}))).toBe(true);
  });
  it('cho qua khi đúng role', () => {
    const g = new RolesGuard(reflectorReturning([UserRole.ADMIN]));
    expect(g.canActivate(ctx({ user: { role: UserRole.ADMIN } }))).toBe(true);
  });
  it('chặn khi sai role', () => {
    const g = new RolesGuard(reflectorReturning([UserRole.ADMIN]));
    expect(() => g.canActivate(ctx({ user: { role: UserRole.CANDIDATE } }))).toThrow(ForbiddenException);
  });
});

describe('JwtAuthGuard', () => {
  const config = { getOrThrow: () => SECRET } as never;
  const makeGuard = (isPublic: boolean, user: unknown) =>
    new JwtAuthGuard(reflectorReturning(isPublic), config, { findOne: async () => user } as never);
  const bearer = (sub: number) => ({ headers: { authorization: `Bearer ${signJwt({ sub, role: 'X' }, SECRET, 60)}` } });

  it('route public không có token -> cho qua', async () => {
    await expect(makeGuard(true, null).canActivate(ctx({ headers: {} }))).resolves.toBe(true);
  });
  it('route bảo vệ không có token -> 401', async () => {
    await expect(makeGuard(false, null).canActivate(ctx({ headers: {} }))).rejects.toThrow(UnauthorizedException);
  });
  it('token hợp lệ -> gắn req.user', async () => {
    const req: Record<string, unknown> = bearer(5);
    const user = { id: 5, email: 'a@b.c', role: UserRole.EMPLOYER, status: UserStatus.ACTIVE, emailVerified: true };
    await expect(makeGuard(false, user).canActivate(ctx(req))).resolves.toBe(true);
    expect(req.user).toEqual({ id: 5, email: 'a@b.c', role: UserRole.EMPLOYER, emailVerified: true });
  });
  it('tài khoản bị khóa -> 403', async () => {
    const user = { id: 5, email: 'a@b.c', role: UserRole.EMPLOYER, status: UserStatus.LOCKED, emailVerified: true };
    await expect(makeGuard(false, user).canActivate(ctx(bearer(5)))).rejects.toThrow(ForbiddenException);
  });
});

describe('RateLimitGuard', () => {
  it('chặn khi vượt giới hạn', () => {
    const g = new RateLimitGuard(reflectorReturning({ limit: 2, windowSec: 60 }));
    const req = { ip: '1.1.1.1', method: 'POST', path: '/api/auth/login', route: { path: '/api/auth/login' } };
    expect(g.canActivate(ctx(req))).toBe(true);
    expect(g.canActivate(ctx(req))).toBe(true);
    expect(() => g.canActivate(ctx(req))).toThrow(HttpException);
    expect(g.canActivate(ctx({ ...req, ip: '2.2.2.2' }))).toBe(true);
  });
  it('route không khai báo vẫn có giới hạn mặc định (300/phút/IP)', () => {
    const g = new RateLimitGuard(reflectorReturning(undefined));
    const req = { ip: '3.3.3.3', method: 'GET', path: '/api/jobs' };
    for (let i = 0; i < 300; i++) g.canActivate(ctx(req));
    expect(() => g.canActivate(ctx(req))).toThrow(HttpException);
  });
});
