import { BadRequestException, ConflictException, ForbiddenException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { randomInt } from 'crypto';
import { DataSource, Repository } from 'typeorm';
import { paginate } from '../../common/dto/pagination.dto';
import { CompanyRole, JobStatus, NotificationType, OrderStatus, UserStatus } from '../../common/enums';
import { AuthUser } from '../../common/types/auth-user';
import { AuditService } from '../audit/audit.service';
import { CandidateProfile } from '../candidates/entities/candidate-profile.entity';
import { Company } from '../companies/entities/company.entity';
import { EmployerProfile } from '../companies/entities/employer-profile.entity';
import { SettingsService } from '../content/settings.service';
import { Job } from '../jobs/entities/job.entity';
import { NotificationsService } from '../notifications/notifications.service';
import { OrdersQuery, UpdatePlanDto } from './dto/billing.dto';
import { CandidateUnlock } from './entities/candidate-unlock.entity';
import { PlanOrder } from './entities/plan-order.entity';
import { ServicePlan } from './entities/service-plan.entity';

/** Số ngày một lượt "tin nổi bật" có hiệu lực */
export const FEATURE_DAYS = 7;
const MAX_PENDING_ORDERS = 3;
const DAY = 86_400_000;

const esc = (s: string) => `%${s.replace(/[[\]%_]/g, (ch) => `[${ch}]`)}%`;

/**
 * Gói dịch vụ cho NTD – thanh toán GIẢ LẬP:
 * NTD tạo đơn → chuyển khoản theo mã đơn → admin bấm "Xác nhận đã thanh toán" → cộng lượt + gia hạn gói.
 */
@Injectable()
export class BillingService {
  constructor(
    private readonly ds: DataSource,
    @InjectRepository(ServicePlan) private readonly plans: Repository<ServicePlan>,
    @InjectRepository(PlanOrder) private readonly orders: Repository<PlanOrder>,
    @InjectRepository(Company) private readonly companies: Repository<Company>,
    @InjectRepository(EmployerProfile) private readonly employers: Repository<EmployerProfile>,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(CandidateUnlock) private readonly unlocks: Repository<CandidateUnlock>,
    @InjectRepository(CandidateProfile) private readonly candidates: Repository<CandidateProfile>,
    private readonly settings: SettingsService,
    private readonly notifications: NotificationsService,
    private readonly audit: AuditService,
  ) {}

  // ================= Công khai =================

  async publicPlans() {
    const rows = await this.plans.find({ where: { isActive: true }, order: { sortOrder: 'ASC', price: 'ASC' } });
    return rows.map((p) => this.planView(p));
  }

  private planView(p: ServicePlan) {
    return {
      id: p.id,
      code: p.code,
      name: p.name,
      description: p.description,
      price: Number(p.price),
      durationDays: p.durationDays,
      featuredCredits: p.featuredCredits,
      contactCredits: p.contactCredits,
      isActive: p.isActive,
    };
  }

  // ================= Nhà tuyển dụng =================

  private async employer(userId: number, ownerOnly = false) {
    const p = await this.employers.findOne({ where: { userId }, relations: { company: true } });
    if (!p?.company) throw new ForbiddenException('Bạn cần tạo hồ sơ công ty trước');
    if (ownerOnly && p.companyRole !== CompanyRole.OWNER) {
      throw new ForbiddenException('Chỉ quản trị viên của công ty mới mua / huỷ gói được');
    }
    return p as EmployerProfile & { company: Company };
  }

  static isActive(c: Pick<Company, 'planExpiresAt'>, now = new Date()) {
    return !!c.planExpiresAt && c.planExpiresAt > now;
  }

  async overview(userId: number) {
    const p = await this.employer(userId);
    const c = p.company;
    const [orders, s] = await Promise.all([
      this.orders.find({ where: { companyId: c.id }, order: { createdAt: 'DESC' }, take: 20 }),
      this.settings.all(),
    ]);
    return {
      canPurchase: p.companyRole === CompanyRole.OWNER,
      plan: {
        name: c.planName,
        expiresAt: c.planExpiresAt,
        active: BillingService.isActive(c),
        featuredCredits: c.featuredCredits,
        contactCredits: c.contactCredits,
      },
      bank: { bankName: s.paymentBankName, bankCode: s.paymentBankCode, accountNo: s.paymentAccountNo, accountName: s.paymentAccountName },
      featureDays: FEATURE_DAYS,
      orders: orders.map((o) => this.orderView(o)),
    };
  }

  async createOrder(userId: number, planId: number) {
    const p = await this.employer(userId, true);
    const plan = await this.plans.findOneBy({ id: planId, isActive: true });
    if (!plan) throw new NotFoundException('Gói dịch vụ không tồn tại hoặc đã ngừng bán');
    const pending = await this.orders.countBy({ companyId: p.company.id, status: OrderStatus.PENDING });
    if (pending >= MAX_PENDING_ORDERS) {
      throw new BadRequestException(`Bạn đang có ${pending} đơn chờ thanh toán. Hãy thanh toán hoặc huỷ bớt trước khi tạo đơn mới.`);
    }
    let saved: PlanOrder | null = null;
    for (let i = 0; i < 3 && !saved; i++) {
      try {
        saved = await this.orders.save(
          this.orders.create({
            code: this.newCode(),
            companyId: p.company.id,
            planId: plan.id,
            planName: plan.name,
            amount: plan.price,
            durationDays: plan.durationDays,
            featuredCredits: plan.featuredCredits,
            contactCredits: plan.contactCredits,
            createdById: userId,
          }),
        );
      } catch (err) {
        if (i === 2 || !/UNIQUE|duplicate/i.test((err as Error).message)) throw err;
      }
    }
    await this.notifications.notifyAdmins({
      type: NotificationType.SYSTEM,
      title: 'Đơn mua gói mới',
      message: `${p.company.name} – ${plan.name} (${saved!.code})`,
      link: '/admin/billing',
    });
    return this.orderView(saved!);
  }

  async cancelOwnOrder(userId: number, id: number) {
    const p = await this.employer(userId, true);
    const res = await this.orders.update(
      { id, companyId: p.company.id, status: OrderStatus.PENDING },
      { status: OrderStatus.CANCELLED, cancelReason: 'Nhà tuyển dụng huỷ' },
    );
    if (!res.affected) throw new BadRequestException('Chỉ huỷ được đơn đang chờ thanh toán');
    return { id, status: OrderStatus.CANCELLED };
  }

  /** Dùng 1 lượt: đẩy tin lên "nổi bật" FEATURE_DAYS ngày (cộng dồn nếu đang nổi bật) */
  async featureJob(userId: number, jobId: number) {
    const p = await this.employer(userId);
    const job = await this.jobs.findOneBy({ id: jobId, companyId: p.company.id });
    if (!job) throw new NotFoundException('Không tìm thấy tin tuyển dụng');
    if (job.status !== JobStatus.APPROVED) throw new BadRequestException('Chỉ đẩy nổi bật được tin đang hiển thị');
    await this.useCredit(p.company.id, 'featured_credits', 'đẩy tin nổi bật');
    const now = new Date();
    const from = job.featuredUntil && job.featuredUntil > now ? job.featuredUntil : now;
    const featuredUntil = new Date(from.getTime() + FEATURE_DAYS * DAY);
    await this.jobs.update(job.id, { featuredUntil });
    return { id: job.id, featuredUntil };
  }

  /** Dùng 1 lượt: mở thông tin liên hệ của ứng viên (mở rồi thì không trừ nữa) */
  async unlockCandidate(userId: number, candidateId: number) {
    const p = await this.employer(userId);
    const c = await this.candidates.findOne({ where: { id: candidateId, isPublic: true }, relations: { user: true } });
    if (!c || c.user.status !== UserStatus.ACTIVE) throw new NotFoundException('Hồ sơ không tồn tại hoặc đã ẩn');
    if (await this.unlocks.existsBy({ companyId: p.company.id, candidateId })) return { unlocked: true, charged: false };

    await this.useCredit(p.company.id, 'contact_credits', 'mở thông tin liên hệ');
    try {
      await this.unlocks.insert({ companyId: p.company.id, candidateId, unlockedById: userId });
    } catch (err) {
      // Đồng nghiệp vừa mở cùng lúc → hoàn lượt
      await this.companies.increment({ id: p.company.id }, 'contactCredits', 1);
      if (!/UNIQUE|duplicate/i.test((err as Error).message)) throw err;
    }
    return { unlocked: true, charged: true };
  }

  /** Trừ 1 lượt nguyên tử: chỉ khi gói còn hạn và còn lượt */
  private async useCredit(companyId: number, column: 'featured_credits' | 'contact_credits', what: string) {
    const res = await this.companies
      .createQueryBuilder()
      .update(Company)
      .set({ [column === 'featured_credits' ? 'featuredCredits' : 'contactCredits']: () => `${column} - 1` })
      .where('id = :id AND ' + column + ' > 0 AND plan_expires_at > :now', { id: companyId, now: new Date() })
      .execute();
    if (!res.affected) {
      const c = await this.companies.findOneByOrFail({ id: companyId });
      throw new BadRequestException(
        BillingService.isActive(c)
          ? `Bạn đã hết lượt ${what}. Hãy mua thêm gói dịch vụ.`
          : `Cần có gói dịch vụ còn hạn để ${what}.`,
      );
    }
  }

  // ================= Admin =================

  async adminOrders(q: OrdersQuery) {
    const qb = this.orders.createQueryBuilder('o').innerJoinAndSelect('o.company', 'c');
    if (q.status) qb.andWhere('o.status = :st', { st: q.status });
    if (q.q) qb.andWhere('(o.code LIKE :kw OR c.name LIKE :kw)', { kw: esc(q.q) });
    const [rows, total] = await qb
      .orderBy('o.created_at', 'DESC')
      .offset((q.page - 1) * q.limit)
      .limit(q.limit)
      .getManyAndCount();

    const monthStart = new Date();
    monthStart.setDate(1);
    monthStart.setHours(0, 0, 0, 0);
    const rev = await this.orders
      .createQueryBuilder('o')
      .select('COALESCE(SUM(o.amount), 0)', 'sum')
      .addSelect('COUNT(*)', 'cnt')
      .where('o.status = :paid AND o.paid_at >= :from', { paid: OrderStatus.PAID, from: monthStart })
      .getRawOne<{ sum: string; cnt: number }>();

    return {
      revenueThisMonth: Number(rev?.sum ?? 0),
      paidThisMonth: Number(rev?.cnt ?? 0),
      ...paginate(
        rows.map((o) => ({ ...this.orderView(o), company: { id: o.company.id, name: o.company.name, slug: o.company.slug } })),
        total,
        q.page,
        q.limit,
      ),
    };
  }

  pendingCount() {
    return this.orders.countBy({ status: OrderStatus.PENDING });
  }

  /** Xác nhận đã nhận tiền → cộng lượt, gia hạn gói (trong 1 transaction) */
  async confirm(actor: AuthUser, id: number, ip?: string) {
    const order = await this.ds.transaction(async (m) => {
      const claimed = await m.update(PlanOrder, { id, status: OrderStatus.PENDING }, { status: OrderStatus.PAID, paidAt: new Date(), confirmedById: actor.id });
      if (!claimed.affected) {
        if (!(await m.existsBy(PlanOrder, { id }))) throw new NotFoundException('Không tìm thấy đơn');
        throw new ConflictException('Đơn không ở trạng thái chờ thanh toán');
      }
      const o = await m.findOneOrFail(PlanOrder, { where: { id }, relations: { company: true } });
      const c = o.company;
      const now = new Date();
      const base = BillingService.isActive(c, now) ? c.planExpiresAt! : now;
      await m.update(Company, c.id, {
        planName: o.planName,
        planExpiresAt: new Date(base.getTime() + o.durationDays * DAY),
        // Gói đã hết hạn → lượt cũ không còn giá trị, bắt đầu lại từ lượt của gói mới
        featuredCredits: (BillingService.isActive(c, now) ? c.featuredCredits : 0) + o.featuredCredits,
        contactCredits: (BillingService.isActive(c, now) ? c.contactCredits : 0) + o.contactCredits,
      });
      return o;
    });

    await this.notifyCompany(order.companyId, {
      type: NotificationType.ORDER_PAID,
      title: 'Thanh toán thành công',
      message: `Gói ${order.planName} (${order.code}) đã được kích hoạt`,
      link: '/employer/billing',
    });
    await this.audit.log({ actorId: actor.id, action: 'ORDER_CONFIRM', entityType: 'order', entityId: id, metadata: { code: order.code, amount: Number(order.amount), company: order.company.name }, ip });
    return { id, status: OrderStatus.PAID };
  }

  async adminCancel(actor: AuthUser, id: number, reason: string | undefined, ip?: string) {
    const o = await this.orders.findOne({ where: { id }, relations: { company: true } });
    if (!o) throw new NotFoundException('Không tìm thấy đơn');
    const res = await this.orders.update({ id, status: OrderStatus.PENDING }, { status: OrderStatus.CANCELLED, cancelReason: reason || 'Quản trị viên huỷ' });
    if (!res.affected) throw new ConflictException('Chỉ huỷ được đơn đang chờ thanh toán');
    await this.notifyCompany(o.companyId, {
      type: NotificationType.ORDER_CANCELLED,
      title: 'Đơn mua gói đã bị huỷ',
      message: `${o.code}${reason ? `: ${reason}` : ''}`,
      link: '/employer/billing',
    });
    await this.audit.log({ actorId: actor.id, action: 'ORDER_CANCEL', entityType: 'order', entityId: id, metadata: { code: o.code, reason }, ip });
    return { id, status: OrderStatus.CANCELLED };
  }

  async adminPlans() {
    return (await this.plans.find({ order: { sortOrder: 'ASC', price: 'ASC' } })).map((p) => this.planView(p));
  }

  async updatePlan(actor: AuthUser, id: number, dto: UpdatePlanDto, ip?: string) {
    const p = await this.plans.findOneBy({ id });
    if (!p) throw new NotFoundException('Không tìm thấy gói');
    await this.plans.update(id, { ...dto, description: dto.description ?? null, price: String(dto.price) });
    await this.audit.log({ actorId: actor.id, action: 'PLAN_UPDATE', entityType: 'plan', entityId: id, metadata: { ...dto }, ip });
    return this.planView((await this.plans.findOneBy({ id }))!);
  }

  // ================= Hỗ trợ =================

  private orderView(o: PlanOrder) {
    return {
      id: o.id,
      code: o.code,
      planName: o.planName,
      amount: Number(o.amount),
      durationDays: o.durationDays,
      featuredCredits: o.featuredCredits,
      contactCredits: o.contactCredits,
      status: o.status,
      createdAt: o.createdAt,
      paidAt: o.paidAt,
      cancelReason: o.cancelReason,
    };
  }

  /** JP + yymmdd + 4 ký tự (bỏ chữ dễ nhầm) */
  private newCode() {
    const d = new Date();
    const ymd = `${String(d.getFullYear()).slice(2)}${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}`;
    const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    const rnd = Array.from({ length: 4 }, () => A[randomInt(A.length)]).join('');
    return `JP${ymd}${rnd}`;
  }

  private async notifyCompany(companyId: number, n: { type: NotificationType; title: string; message: string; link: string }) {
    const emps = await this.employers.find({ where: { companyId }, select: { userId: true } });
    await this.notifications.create(emps.map((e) => ({ ...n, userId: e.userId })));
  }
}
