import { BadRequestException, ConflictException, ForbiddenException } from '@nestjs/common';
import { CompanyRole, JobStatus, OrderStatus, UserRole } from '../../common/enums';
import { BillingService, FEATURE_DAYS } from './billing.service';

const admin = { id: 1, email: 'admin@x', role: UserRole.ADMIN, emailVerified: true };
const DAY = 86_400_000;

function setup(o: { role?: CompanyRole; company?: Record<string, unknown>; job?: Record<string, unknown> | null; creditOk?: boolean; order?: Record<string, unknown>; claim?: number } = {}) {
  const company = { id: 5, name: 'ABC', planExpiresAt: new Date(Date.now() + 10 * DAY), featuredCredits: 2, contactCredits: 5, ...o.company };
  const profile = { userId: 10, companyRole: o.role ?? CompanyRole.OWNER, company };
  const execute = jest.fn(async () => ({ affected: o.creditOk === false ? 0 : 1 }));
  const qbUpdate = { update: () => qbUpdate, set: () => qbUpdate, where: () => qbUpdate, execute };
  const companies = { createQueryBuilder: () => qbUpdate, findOneByOrFail: async () => company, increment: jest.fn() };
  const plans = { findOneBy: async () => ({ id: 2, name: 'Pro', price: '2490000', durationDays: 30, featuredCredits: 10, contactCredits: 80 }) };
  const orders = {
    countBy: async () => 0,
    create: (x: object) => x,
    save: jest.fn(async (x: object) => ({ id: 9, status: OrderStatus.PENDING, createdAt: new Date(), ...x })),
    update: jest.fn(async () => ({ affected: 1 })),
  };
  const jobs = { findOneBy: async () => (o.job === undefined ? { id: 3, status: JobStatus.APPROVED, featuredUntil: null } : o.job), update: jest.fn() };
  const order = { id: 9, code: 'JP1', planName: 'Pro', amount: '2490000', durationDays: 30, featuredCredits: 10, contactCredits: 80, companyId: 5, company, ...o.order };
  const m = {
    update: jest.fn(async (entity: { name: string }) => (entity.name === 'PlanOrder' ? { affected: o.claim ?? 1 } : { affected: 1 })),
    existsBy: async () => true,
    findOneOrFail: async () => order,
  };
  const ds = { transaction: (fn: (mm: typeof m) => unknown) => fn(m) };
  const employers = { findOne: async () => profile, find: async () => [{ userId: 10 }] };
  const unlocks = { existsBy: jest.fn(async () => false), insert: jest.fn() };
  const candidates = { findOne: async () => ({ id: 7, user: { status: 'ACTIVE' } }) };
  const settings = { all: async () => ({ paymentBankName: 'VCB', paymentAccountNo: '1', paymentAccountName: 'X' }) };
  const notifications = { create: jest.fn(), notifyAdmins: jest.fn() };
  const audit = { log: jest.fn() };
  const svc = new BillingService(ds as never, plans as never, orders as never, companies as never, employers as never, jobs as never, unlocks as never, candidates as never, settings as never, notifications as never, audit as never);
  return { svc, company, orders, jobs, execute, m, unlocks, notifications };
}

describe('BillingService', () => {
  it('chủ công ty tạo đơn: lưu bản sao giá, mã đơn JP…, báo admin', async () => {
    const { svc, orders, notifications } = setup();
    const r = await svc.createOrder(10, 2);
    expect(r.code).toMatch(/^JP\d{6}[A-Z2-9]{4}$/);
    expect(orders.save).toHaveBeenCalledWith(expect.objectContaining({ companyId: 5, amount: '2490000', contactCredits: 80 }));
    expect(notifications.notifyAdmins).toHaveBeenCalled();
  });

  it('thành viên không mua gói được', async () => {
    const { svc } = setup({ role: CompanyRole.MEMBER });
    await expect(svc.createOrder(10, 2)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('đẩy tin nổi bật: trừ lượt, nổi bật FEATURE_DAYS ngày', async () => {
    const { svc, jobs, execute } = setup();
    const before = Date.now();
    await svc.featureJob(10, 3);
    expect(execute).toHaveBeenCalled();
    const until = (jobs.update.mock.calls[0] as unknown as [number, { featuredUntil: Date }])[1].featuredUntil.getTime();
    expect(until - before).toBeGreaterThanOrEqual(FEATURE_DAYS * DAY - 1000);
  });

  it('hết lượt / gói hết hạn → báo lỗi, không đổi tin', async () => {
    const { svc, jobs } = setup({ creditOk: false, company: { planExpiresAt: new Date(Date.now() - DAY) } });
    await expect(svc.featureJob(10, 3)).rejects.toThrow('Cần có gói dịch vụ còn hạn');
    expect(jobs.update).not.toHaveBeenCalled();
  });

  it('chỉ đẩy nổi bật tin đang hiển thị', async () => {
    const { svc } = setup({ job: { id: 3, status: JobStatus.PENDING } });
    await expect(svc.featureJob(10, 3)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('mở liên hệ ứng viên đã mở trước đó: không trừ lượt', async () => {
    const { svc, unlocks, execute } = setup();
    unlocks.existsBy.mockResolvedValueOnce(true);
    expect(await svc.unlockCandidate(10, 7)).toEqual({ unlocked: true, charged: false });
    expect(execute).not.toHaveBeenCalled();
  });

  it('admin xác nhận: gói còn hạn → cộng dồn lượt và gia hạn từ ngày hết hạn cũ', async () => {
    const { svc, m, company } = setup();
    await svc.confirm(admin, 9);
    const call = m.update.mock.calls.find((c) => (c[0] as { name: string }).name === 'Company') as unknown as [unknown, number, Record<string, unknown>];
    expect(call[2]).toMatchObject({ planName: 'Pro', featuredCredits: 12, contactCredits: 85 });
    expect((call[2].planExpiresAt as Date).getTime()).toBe((company.planExpiresAt as Date).getTime() + 30 * DAY);
  });

  it('admin xác nhận: gói đã hết hạn → lượt cũ bỏ, tính từ hôm nay', async () => {
    const { svc, m } = setup({ company: { planExpiresAt: new Date(Date.now() - DAY) } });
    await svc.confirm(admin, 9);
    const call = m.update.mock.calls.find((c) => (c[0] as { name: string }).name === 'Company') as unknown as [unknown, number, Record<string, unknown>];
    expect(call[2]).toMatchObject({ featuredCredits: 10, contactCredits: 80 });
  });

  it('không xác nhận 2 lần', async () => {
    const { svc } = setup({ claim: 0 });
    await expect(svc.confirm(admin, 9)).rejects.toBeInstanceOf(ConflictException);
  });
});
