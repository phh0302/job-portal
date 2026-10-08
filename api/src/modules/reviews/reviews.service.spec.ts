import { BadRequestException, ForbiddenException } from '@nestjs/common';
import { CompanyRole, ReviewRelation, ReviewStatus, UserRole } from '../../common/enums';
import { ReviewsService } from './reviews.service';

const dto = { rating: 4, title: 'Môi trường tốt', pros: 'Đồng nghiệp thân thiện, hỗ trợ nhau', cons: 'Lương tăng chậm so với thị trường', relation: ReviewRelation.FORMER_EMPLOYEE };
const user = (emailVerified = true) => ({ id: 70, email: 'a@b.c', role: UserRole.CANDIDATE, emailVerified });

function setup(existing: Record<string, unknown> | null = null, role = CompanyRole.OWNER) {
  const review = { id: 9, companyId: 5, candidateId: 7, rating: 4, title: 't', status: ReviewStatus.PENDING, company: { name: 'ABC', slug: 'abc' }, candidate: { userId: 70, fullName: 'A' }, ...existing };
  const reviews = {
    findOneBy: jest.fn(async () => existing),
    update: jest.fn(),
    insert: jest.fn(),
    findOne: jest.fn(async () => review),
    createQueryBuilder: () => ({ select: () => ({ addSelect: () => ({ where: () => ({ groupBy: () => ({ getRawMany: async () => [{ rating: 5, cnt: 3 }, { rating: 2, cnt: 1 }] }) }) }) }) }),
  };
  const companies = { existsBy: async () => true };
  const candidates = { findOne: async () => ({ id: 7 }) };
  const employers = { findOneBy: async () => ({ userId: 10, companyId: 5, companyRole: role }), find: async () => [{ userId: 10 }, { userId: 11 }] };
  const notifications = { create: jest.fn() };
  const audit = { log: jest.fn() };
  const svc = new ReviewsService(reviews as never, companies as never, candidates as never, employers as never, notifications as never, audit as never, { publicUrl: () => null } as never);
  return { svc, reviews, notifications, audit, review };
}

describe('ReviewsService', () => {
  it('tính điểm trung bình và phân bố sao', async () => {
    const { svc } = setup();
    expect(await svc.summary(5)).toEqual({ average: 4.3, count: 4, distribution: [0, 1, 0, 0, 3] });
  });

  it('phải xác minh email mới được đánh giá', async () => {
    const { svc } = setup();
    await expect(svc.upsert(user(false), 5, dto)).rejects.toBeInstanceOf(ForbiddenException);
  });

  it('tạo mới → chờ duyệt, mặc định ẩn danh', async () => {
    const { svc, reviews } = setup();
    await svc.upsert(user(), 5, dto);
    expect(reviews.insert).toHaveBeenCalledWith(expect.objectContaining({ companyId: 5, candidateId: 7, status: ReviewStatus.PENDING, isAnonymous: true }));
  });

  it('sửa đánh giá đã đăng → quay về chờ duyệt', async () => {
    const { svc, reviews } = setup({ id: 9, status: ReviewStatus.APPROVED });
    await svc.upsert(user(), 5, { ...dto, isAnonymous: false });
    expect(reviews.update).toHaveBeenCalledWith(9, expect.objectContaining({ status: ReviewStatus.PENDING, isAnonymous: false, rejectReason: null }));
    expect(reviews.insert).not.toHaveBeenCalled();
  });

  it('admin duyệt: thông báo người viết + NTD của công ty, ghi nhật ký', async () => {
    const { svc, notifications, audit } = setup();
    await svc.approve(user() as never, 9);
    const sent = notifications.create.mock.calls[0][0] as { userId: number }[];
    expect(sent.map((n) => n.userId)).toEqual([70, 10, 11]);
    expect(audit.log).toHaveBeenCalledWith(expect.objectContaining({ action: 'REVIEW_APPROVE' }));
  });

  it('không duyệt lại đánh giá đã đăng', async () => {
    const { svc } = setup({ status: ReviewStatus.APPROVED });
    await expect(svc.approve(user() as never, 9)).rejects.toBeInstanceOf(BadRequestException);
  });

  it('thành viên (không phải chủ) không phản hồi được', async () => {
    const { svc } = setup(null, CompanyRole.MEMBER);
    await expect(svc.reply(11, 9, 'Cảm ơn')).rejects.toBeInstanceOf(ForbiddenException);
  });
});
