import { ConflictException, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { UserRole, UserStatus } from '../../common/enums';
import { hashPassword } from '../../common/utils/password';
import { AuthService } from './auth.service';

function setup(opts: { user?: Record<string, unknown> | null; refreshRow?: Record<string, unknown> | null } = {}) {
  const user = opts.user === undefined ? null : opts.user;
  const users = {
    exists: jest.fn().mockResolvedValue(!!user),
    findOneBy: jest.fn().mockResolvedValue(user),
    findOne: jest.fn().mockResolvedValue(user ? { ...user, candidateProfile: { fullName: 'An' } } : null),
    update: jest.fn(),
    createQueryBuilder: () => {
      const qb = { addSelect: () => qb, where: () => qb, getOne: async () => user };
      return qb;
    },
  };
  const tokens = {
    signAccess: jest.fn().mockReturnValue('access'),
    accessTtlSec: 900,
    issueRefresh: jest.fn().mockResolvedValue('refresh-new'),
    findRefresh: jest.fn().mockResolvedValue(opts.refreshRow ?? null),
    revokeRefresh: jest.fn(),
    revokeAllRefresh: jest.fn(),
    issueUserToken: jest.fn().mockResolvedValue('tok'),
  };
  const mail = { sendVerifyEmail: jest.fn(), sendResetPassword: jest.fn() };
  const service = new AuthService({} as never, { get: () => 'http://web' } as never, tokens as never, mail as never, users as never);
  return { service, users, tokens, mail };
}

describe('AuthService', () => {
  it('đăng ký trùng email -> 409', async () => {
    const { service } = setup({ user: { id: 1 } });
    await expect(
      service.register({ email: 'a@b.vn', password: 'Abc12345', fullName: 'A', role: UserRole.CANDIDATE }, {}),
    ).rejects.toThrow(ConflictException);
  });

  it('đăng nhập sai mật khẩu -> 401 (không lộ email có tồn tại hay không)', async () => {
    const { service } = setup({ user: { id: 1, passwordHash: await hashPassword('Dung12345'), status: UserStatus.ACTIVE } });
    await expect(service.login({ email: 'a@b.vn', password: 'Sai12345' }, {})).rejects.toThrow('Email hoặc mật khẩu không đúng');
    const none = setup({ user: null });
    await expect(none.service.login({ email: 'x@b.vn', password: 'Sai12345' }, {})).rejects.toThrow('Email hoặc mật khẩu không đúng');
  });

  it('tài khoản bị khóa không đăng nhập được', async () => {
    const { service } = setup({ user: { id: 1, passwordHash: await hashPassword('Dung12345'), status: UserStatus.LOCKED } });
    await expect(service.login({ email: 'a@b.vn', password: 'Dung12345' }, {})).rejects.toThrow(ForbiddenException);
  });

  it('đăng nhập đúng -> trả access token + refresh token', async () => {
    const { service, users } = setup({
      user: { id: 7, email: 'a@b.vn', role: UserRole.CANDIDATE, passwordHash: await hashPassword('Dung12345'), status: UserStatus.ACTIVE },
    });
    const r = await service.login({ email: 'a@b.vn', password: 'Dung12345' }, {});
    expect(r).toMatchObject({ accessToken: 'access', refreshToken: 'refresh-new', user: { id: 7, fullName: 'An' } });
    expect(users.update).toHaveBeenCalledWith(7, expect.objectContaining({ lastLoginAt: expect.any(Date) }));
  });

  it('refresh: xoay vòng token (thu hồi token cũ, cấp token mới)', async () => {
    const { service, tokens } = setup({
      user: { id: 7, role: UserRole.CANDIDATE, status: UserStatus.ACTIVE },
      refreshRow: { id: 3, userId: 7, revokedAt: null, expiresAt: new Date(Date.now() + 60_000) },
    });
    const r = await service.refresh('old', {});
    expect(tokens.revokeRefresh).toHaveBeenCalledWith(3);
    expect(r.refreshToken).toBe('refresh-new');
  });

  it('refresh: dùng lại token đã thu hồi -> nghi bị đánh cắp, đăng xuất mọi thiết bị', async () => {
    const { service, tokens } = setup({
      user: { id: 7, status: UserStatus.ACTIVE },
      refreshRow: { id: 3, userId: 7, revokedAt: new Date(), expiresAt: new Date(Date.now() + 60_000) },
    });
    await expect(service.refresh('old', {})).rejects.toThrow(UnauthorizedException);
    expect(tokens.revokeAllRefresh).toHaveBeenCalledWith(7);
  });

  it('refresh: token hết hạn / thiếu -> 401', async () => {
    const expired = setup({ refreshRow: { id: 3, userId: 7, revokedAt: null, expiresAt: new Date(Date.now() - 1000) } });
    await expect(expired.service.refresh('x', {})).rejects.toThrow(UnauthorizedException);
    await expect(expired.service.refresh(undefined, {})).rejects.toThrow(UnauthorizedException);
  });

  it('quên mật khẩu: luôn trả cùng một thông báo', async () => {
    const exists = setup({ user: { id: 1, email: 'a@b.vn', status: UserStatus.ACTIVE } });
    const none = setup({ user: null });
    const a = await exists.service.forgotPassword('a@b.vn');
    const b = await none.service.forgotPassword('x@b.vn');
    expect(a).toEqual(b);
    expect(exists.mail.sendResetPassword).toHaveBeenCalled();
    expect(none.mail.sendResetPassword).not.toHaveBeenCalled();
  });
});
