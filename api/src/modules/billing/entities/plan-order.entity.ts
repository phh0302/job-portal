import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { OrderStatus } from '../../../common/enums';
import type { Company } from '../../companies/entities/company.entity';
import type { ServicePlan } from './service-plan.entity';

/** Đơn mua gói. Lưu bản sao giá/quyền lợi tại thời điểm mua. */
@Entity('plan_orders')
export class PlanOrder extends BaseEntity {
  /** Mã đơn – dùng làm nội dung chuyển khoản */
  @Index('UQ_plan_orders_code', { unique: true })
  @Column({ type: 'nvarchar', length: 20 })
  code!: string;

  @Index('IX_plan_orders_company')
  @Column({ name: 'company_id', type: 'int' })
  companyId!: number;

  @ManyToOne('Company', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id', foreignKeyConstraintName: 'FK_plan_orders_company' })
  company!: Relation<Company>;

  @Column({ name: 'plan_id', type: 'int' })
  planId!: number;

  @ManyToOne('ServicePlan')
  @JoinColumn({ name: 'plan_id', foreignKeyConstraintName: 'FK_plan_orders_plan' })
  plan!: Relation<ServicePlan>;

  @Column({ name: 'plan_name', type: 'nvarchar', length: 100 })
  planName!: string;

  @Column({ type: 'decimal', precision: 18, scale: 0 })
  amount!: string;

  @Column({ name: 'duration_days', type: 'int' })
  durationDays!: number;

  @Column({ name: 'featured_credits', type: 'int' })
  featuredCredits!: number;

  @Column({ name: 'contact_credits', type: 'int' })
  contactCredits!: number;

  @Index('IX_plan_orders_status')
  @Column({ type: 'simple-enum', enum: OrderStatus, length: 10, default: OrderStatus.PENDING })
  status!: OrderStatus;

  @Column({ name: 'created_by_id', type: 'int' })
  createdById!: number;

  @Column({ name: 'paid_at', type: 'datetime2', nullable: true })
  paidAt!: Date | null;

  @Column({ name: 'confirmed_by_id', type: 'int', nullable: true })
  confirmedById!: number | null;

  @Column({ name: 'cancel_reason', type: 'nvarchar', length: 500, nullable: true })
  cancelReason!: string | null;
}
