import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { CompanyRole, UserRole } from '../../common/enums';
import { EmployerTeamService } from './team.service';

type P = { id: number; userId: number; companyId: number | null; companyRole: CompanyRole; fullName: string };

function setup(o: { me?: Partial<P>; profiles?: P[]; existingUser?: Record<string, unknown> | null; invite?: Record<string, unknown> | null; userEmail?: string } = {}) {
  const profiles: P[] = o.profiles ?? [
    { id: 1, userId: 10, companyId: 5, companyRole: CompanyRole.OWNER, fullName: 'Chủ' },
    { id: 2, userId: 20, companyId: 5, companyRole: CompanyRole.MEMBER, fullName: 'Thành viên' },
  ];
  const me = { ...profiles[0], ...o.me };
  const company = { id: 5, name: 'ABC', slug: 'abc' };
  const ctx = {
    profile: jest.fn(async (uid: number) => profiles.find((p) => p.userId === uid) ?? me),
    company: async () => company,
    ownerCompany: jest.fn(async (uid: number) => {
      const p = profiles.find((x) => x.userId === uid)!;
      if (p.companyRole !== CompanyRole.OWNER) throw new ForbiddenException('Chỉ quản trị viên');
      return company;
    }),
  };
  const count = (where: Partial<P> & { userId?: unknown }) =>
    profiles.filter((p) => p.companyId === where.companyId && (!where.companyRole || p.companyRole === where.companyRole) && (typeof where.userId !== 'object' || p.userId !== (where.userId as { _value: number })._value)).length;
  const profilesRepo = {
    find: async () => profiles.filter((p) => p.companyRole === CompanyRole.OWNER).map((p) => ({ userId: p.userId })),
    findOneBy: async (w: { companyId: number; userId: number }) => profiles.find((p) => p.companyId === w.companyId && p.userId === w.userId) ?? null,
    countBy: async (w: Partial<P>) => count(w),
    update: jest.fn(async (id: number, patch: Partial<P>) => Object.assign(profiles.find((p) => p.id === id)!, patch)),
  };
  const invites = {
    countBy: async () => 0,
    update: jest.fn(async () => ({ affected: 1 })),
    create: (x: object) => x,
    save: jest.fn(async (x: object) => ({ id: 77, ...x })),
    findOne: async () => (o.invite === undefined ? { id: 77, companyId: 5, email: 'moi@x.vn', role: CompanyRole.MEMBER, expiresAt: new Date(Date.now() + 86_400_000), acceptedAt: null, revokedAt: null, company } : o.invite),
  };
  const users = {
    findOne: async () => o.existingUser ?? null,
    findOneByOrFail: async () => ({ id: 30, email: o.userEmail ?? 'moi@x.vn' }),
  };
  const mail = { sendTeamInvitation: jest.fn() };
  const notifications = { create: jest.fn() };
  const svc = new EmployerTeamService(ctx as never, { get: () => 'http://web' } as never, mail as never, notifications as never, profilesRepo as never, invites as never, {} as never, users as never);
  jest.spyOn(svc, 'team').mockResolvedValue({} as never);
  return { svc, profiles, mail, invites, profilesRepo };
}

describe('EmployerTeamService', () => {
  it('chủ công ty mời đồng nghiệp: gửi email chứa link, chỉ lưu hash token', async () => {
    const { svc, mail, invites } = setup();
    const r = await svc.invite(10, 'moi@x.vn', CompanyRole.MEMBER);
    expect(r.link).toMatch(/^http:\/\/web\/join-company\?token=/);
    expect(mail.sendTeamInvitation).toHaveBeenCalledWith('moi@x.vn', 'Chủ', 'ABC', r.link);
    const saved = invites.save.mock.calls[0][0] as { tokenHash: string };
    expect(saved.tokenHash).toMatch(/^[0-9a-f]{64}$/);
    expect(r.link).not.toContain(saved.tokenHash);
  });

  it('thành viên thường không mời được (403)', async () => {
    const { svc } = setup();
    await expect(svc.invite(20, 'x@x.vn', CompanyRole.MEMBER)).rejects.toThrow(ForbiddenException);
  });

  it('không mời tài khoản ứng viên / tài khoản đã thuộc công ty khác', async () => {
    await expect(setup({ existingUser: { id: 9, role: UserRole.CANDIDATE } }).svc.invite(10, 'a@x.vn', CompanyRole.MEMBER)).rejects.toThrow(BadRequestException);
    await expect(
      setup({ existingUser: { id: 9, role: UserRole.EMPLOYER, employerProfile: { companyId: 99 } } }).svc.invite(10, 'a@x.vn', CompanyRole.MEMBER),
    ).rejects.toThrow(ConflictException);
  });

  it('chấp nhận lời mời: phải đúng email, chưa thuộc công ty nào', async () => {
    const free: P = { id: 3, userId: 30, companyId: null, companyRole: CompanyRole.OWNER, fullName: 'Mới' };
    const base = () => [
      { id: 1, userId: 10, companyId: 5, companyRole: CompanyRole.OWNER, fullName: 'Chủ' },
      { ...free },
    ];
    const wrong = setup({ profiles: base(), userEmail: 'khac@x.vn' });
    await expect(wrong.svc.accept(30, 'tok')).rejects.toThrow('Lời mời dành cho moi@x.vn');

    const ok = setup({ profiles: base() });
    const r = await ok.svc.accept(30, 'tok');
    expect(r).toMatchObject({ companyId: 5, role: CompanyRole.MEMBER });
    expect(ok.profiles.find((p) => p.userId === 30)).toMatchObject({ companyId: 5, companyRole: CompanyRole.MEMBER });
  });

  it('lời mời hết hạn / đã dùng bị từ chối', async () => {
    const expired = setup({ invite: { id: 1, email: 'moi@x.vn', expiresAt: new Date(Date.now() - 1000), acceptedAt: null, revokedAt: null, company: {} } });
    await expect(expired.svc.preview('t')).rejects.toThrow('hết hạn');
    const used = setup({ invite: { id: 1, email: 'moi@x.vn', expiresAt: new Date(Date.now() + 1000), acceptedAt: new Date(), revokedAt: null, company: {} } });
    await expect(used.svc.preview('t')).rejects.toThrow('đã được sử dụng');
  });

  it('công ty luôn còn ít nhất 1 quản trị viên', async () => {
    const { svc } = setup();
    // Chủ duy nhất không được tự rời / hạ quyền mình
    await expect(svc.leave(10)).rejects.toThrow('ít nhất 1 quản trị viên');
    await expect(svc.changeRole(10, 10, CompanyRole.MEMBER)).rejects.toThrow('ít nhất 1 quản trị viên');
  });

  it('gỡ thành viên: về trạng thái chưa có công ty', async () => {
    const { svc, profiles } = setup();
    await svc.removeMember(10, 20);
    expect(profiles.find((p) => p.userId === 20)).toMatchObject({ companyId: null });
    await expect(svc.removeMember(10, 10)).rejects.toThrow('Rời công ty');
  });
});
