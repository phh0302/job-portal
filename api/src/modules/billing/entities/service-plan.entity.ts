import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/** Gói dịch vụ cho nhà tuyển dụng (admin sửa giá / bật tắt) */
@Entity('service_plans')
export class ServicePlan extends BaseEntity {
  @Index('UQ_service_plans_code', { unique: true })
  @Column({ type: 'nvarchar', length: 30 })
  code!: string;

  @Column({ type: 'nvarchar', length: 100 })
  name!: string;

  @Column({ type: 'nvarchar', length: 500, nullable: true })
  description!: string | null;

  /** Giá (VNĐ) */
  @Column({ type: 'decimal', precision: 18, scale: 0 })
  price!: string;

  @Column({ name: 'duration_days', type: 'int' })
  durationDays!: number;

  @Column({ name: 'featured_credits', type: 'int', default: 0 })
  featuredCredits!: number;

  @Column({ name: 'contact_credits', type: 'int', default: 0 })
  contactCredits!: number;

  @Column({ name: 'is_active', type: 'bit', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;
}
