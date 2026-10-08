import { BadRequestException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate } from '../../common/dto/pagination.dto';
import { CompanyRole, NotificationType, ReviewStatus } from '../../common/enums';
import { AuthUser } from '../../common/types/auth-user';
import { AuditService } from '../audit/audit.service';
import { CandidateProfile } from '../candidates/entities/candidate-profile.entity';
import { Company } from '../companies/entities/company.entity';
import { EmployerProfile } from '../companies/entities/employer-profile.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { StorageService } from '../storage/storage.service';
import { AdminReviewsQuery, UpsertReviewDto } from './dto/review.dto';
import { CompanyReview } from './entities/company-review.entity';

export interface ReviewSummary {
  average: number;
  count: number;
  /** distribution[0] = số đánh giá 1 sao … distribution[4] = 5 sao */
  distribution: number[];
}

@Injectable()
export class ReviewsService {
  constructor(
    @InjectRepository(CompanyReview) private readonly reviews: Repository<CompanyReview>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    @InjectRepository(CandidateProfile) private readonly candidates: Repository<CandidateProfile>,
    @InjectRepository(EmployerProfile) private readonly employers: Repository<EmployerProfile>,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
    private readonly storage: StorageService,
  ) {}

  // ================= Công khai =================

  async summary(companyId: number): Promise<ReviewSummary> {
    const rows: { rating: number; cnt: number }[] = await this.reviews
      .createQueryBuilder('r')
      .select('r.rating', 'rating')
      .addSelect('COUNT(*)', 'cnt')
      .where('r.company_id = :id AND r.status = :st', { id: companyId, st: ReviewStatus.APPROVED })
      .groupBy('r.rating')
      .getRawMany();
    const distribution = [0, 0, 0, 0, 0];
    let count = 0;
    let sum = 0;
    for (const r of rows) {
      const n = Number(r.cnt);
      distribution[Number(r.rating) - 1] = n;
      count += n;
      sum += n * Number(r.rating);
    }
    return { average: count ? Math.round((sum / count) * 10) / 10 : 0, count, distribution };
  }

  async publicList(slug: string, page: number, limit: number) {
    const company = await this.companies.findOne({ where: { slug }, select: { id: true } });
    if (!company) throw new NotFoundException('Không tìm thấy công ty');
    const [rows, total] = await this.reviews.findAndCount({
      where: { companyId: company.id, status: ReviewStatus.APPROVED },
      relations: { candidate: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return { summary: await this.summary(company.id), ...paginate(rows.map((r) => this.publicView(r)), total, page, limit) };
  }

  private publicView(r: CompanyReview) {
    return {
      id: r.id,
      rating: r.rating,
      title: r.title,
      pros: r.pros,
      cons: r.cons,
      relation: r.relation,
      author: r.isAnonymous ? null : r.candidate?.fullName ?? null,
      createdAt: r.createdAt,
      employerReply: r.employerReply,
      repliedAt: r.repliedAt,
    };
  }

  // ================= Ứng viên =================

  private async candidateId(userId: number) {
    const p = await this.candidates.findOne({ where: { userId }, select: { id: true } });
    if (!p) throw new NotFoundException('Không tìm thấy hồ sơ ứng viên');
    return p.id;
  }

  async mine(userId: number) {
    const rows = await this.reviews.find({
      where: { candidateId: await this.candidateId(userId) },
      relations: { company: true },
      order: { updatedAt: 'DESC' },
    });
    return rows.map((r) => ({
      ...this.publicView(r),
      status: r.status,
      rejectReason: r.rejectReason,
      isAnonymous: r.isAnonymous,
      company: { id: r.company.id, name: r.company.name, slug: r.company.slug, logoUrl: this.storage.publicUrl(r.company.logoUrl) },
    }));
  }

  async myForCompany(userId: number, companyId: number) {
    const r = await this.reviews.findOneBy({ companyId, candidateId: await this.candidateId(userId) });
    return r ? { ...this.publicView(r), status: r.status, rejectReason: r.rejectReason, isAnonymous: r.isAnonymous } : null;
  }

  /** Tạo hoặc sửa đánh giá → luôn về "chờ duyệt" */
  async upsert(user: AuthUser, companyId: number, dto: UpsertReviewDto) {
    if (!user.emailVerified) throw new ForbiddenException('Vui lòng xác minh email trước khi đánh giá công ty');
    if (!(await this.companies.existsBy({ id: companyId }))) throw new NotFoundException('Không tìm thấy công ty');
    const candidateId = await this.candidateId(user.id);
    const data = {
      rating: dto.rating,
      title: dto.title,
      pros: dto.pros,
      cons: dto.cons,
      relation: dto.relation,
      isAnonymous: dto.isAnonymous ?? true,
      status: ReviewStatus.PENDING,
      rejectReason: null,
    };
    const existing = await this.reviews.findOneBy({ companyId, candidateId });
    if (existing) await this.reviews.update(existing.id, data);
    else await this.reviews.insert({ ...data, companyId, candidateId });
    return this.myForCompany(user.id, companyId);
  }

  async remove(userId: number, companyId: number) {
    const res = await this.reviews.delete({ companyId, candidateId: await this.candidateId(userId) });
    if (!res.affected) throw new NotFoundException('Bạn chưa đánh giá công ty này');
  }

  // ================= Nhà tuyển dụng =================

  private async employerProfile(userId: number) {
    const p = await this.employers.findOneBy({ userId });
    if (!p?.companyId) throw new ForbiddenException('Bạn cần tạo hồ sơ công ty trước');
    return p;
  }

  async employerList(userId: number, page: number, limit: number) {
    const p = await this.employerProfile(userId);
    const [rows, total] = await this.reviews.findAndCount({
      where: { companyId: p.companyId!, status: ReviewStatus.APPROVED },
      relations: { candidate: true },
      order: { createdAt: 'DESC' },
      skip: (page - 1) * limit,
      take: limit,
    });
    return {
      summary: await this.summary(p.companyId!),
      canReply: p.companyRole === CompanyRole.OWNER,
      ...paginate(rows.map((r) => this.publicView(r)), total, page, limit),
    };
  }

  /** Chủ công ty phản hồi công khai (chuỗi rỗng = xoá phản hồi) */
  async reply(userId: number, id: number, reply: string) {
    const p = await this.employerProfile(userId);
    if (p.companyRole !== CompanyRole.OWNER) throw new ForbiddenException('Chỉ quản trị viên của công ty mới phản hồi được đánh giá');
    const r = await this.reviews.findOne({ where: { id, companyId: p.companyId!, status: ReviewStatus.APPROVED }, relations: { candidate: true } });
    if (!r) throw new NotFoundException('Không tìm thấy đánh giá');
    r.employerReply = reply || null;
    r.repliedAt = reply ? new Date() : null;
    await this.reviews.update(id, { employerReply: r.employerReply, repliedAt: r.repliedAt });
    return this.publicView(r);
  }

  // ================= Admin =================

  async adminList(q: AdminReviewsQuery) {
    const [rows, total] = await this.reviews.findAndCount({
      where: q.status ? { status: q.status } : {},
      relations: { company: true, candidate: true },
      order: { updatedAt: 'DESC' },
      skip: (q.page - 1) * q.limit,
      take: q.limit,
    });
    return paginate(
      rows.map((r) => ({
        ...this.publicView(r),
        author: r.candidate.fullName,
        isAnonymous: r.isAnonymous,
        status: r.status,
        rejectReason: r.rejectReason,
        updatedAt: r.updatedAt,
        company: { id: r.company.id, name: r.company.name, slug: r.company.slug },
      })),
      total,
      q.page,
      q.limit,
    );
  }

  async pendingCount() {
    return this.reviews.countBy({ status: ReviewStatus.PENDING });
  }

  async approve(actor: AuthUser, id: number, ip?: string) {
    const r = await this.findForAdmin(id);
    if (r.status !== ReviewStatus.PENDING) throw new BadRequestException('Chỉ duyệt được đánh giá đang chờ duyệt');
    await this.reviews.update(id, { status: ReviewStatus.APPROVED, rejectReason: null });
    const employerIds = (await this.employers.find({ where: { companyId: r.companyId }, select: { userId: true } })).map((e) => e.userId);
    await this.notifications.create([
      { userId: r.candidate.userId, type: NotificationType.REVIEW_APPROVED, title: 'Đánh giá của bạn đã được đăng', message: `${r.company.name}: ${r.title}`, link: `/companies/${r.company.slug}?tab=reviews` },
      ...employerIds.map((uid) => ({ userId: uid, type: NotificationType.REVIEW_APPROVED, title: 'Công ty có đánh giá mới', message: `${r.rating}★ – ${r.title}`, link: '/employer/reviews' })),
    ]);
    await this.audit.log({ actorId: actor.id, action: 'REVIEW_APPROVE', entityType: 'review', entityId: id, metadata: { company: r.company.name, rating: r.rating }, ip });
    return { id, status: ReviewStatus.APPROVED };
  }

  /** Từ chối đánh giá chờ duyệt, hoặc gỡ đánh giá đã đăng */
  async reject(actor: AuthUser, id: number, reason: string, ip?: string) {
    const r = await this.findForAdmin(id);
    if (r.status === ReviewStatus.REJECTED) throw new BadRequestException('Đánh giá đã bị từ chối');
    await this.reviews.update(id, { status: ReviewStatus.REJECTED, rejectReason: reason });
    await this.notifications.create({
      userId: r.candidate.userId,
      type: NotificationType.REVIEW_REJECTED,
      title: r.status === ReviewStatus.APPROVED ? 'Đánh giá của bạn đã bị gỡ' : 'Đánh giá của bạn chưa được duyệt',
      message: `${r.company.name}: ${reason}`,
      link: '/candidate/reviews',
    });
    await this.audit.log({ actorId: actor.id, action: 'REVIEW_REJECT', entityType: 'review', entityId: id, metadata: { company: r.company.name, reason }, ip });
    return { id, status: ReviewStatus.REJECTED };
  }

  private async findForAdmin(id: number) {
    const r = await this.reviews.findOne({ where: { id }, relations: { company: true, candidate: true } });
    if (!r) throw new NotFoundException('Không tìm thấy đánh giá');
    return r;
  }
}
