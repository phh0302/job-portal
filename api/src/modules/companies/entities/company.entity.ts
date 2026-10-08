import { Column, Entity, Index, JoinColumn, ManyToOne, OneToMany, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CompanySize, CompanyVerification } from '../../../common/enums';
import type { Location } from '../../catalog/entities/location.entity';
import type { Job } from '../../jobs/entities/job.entity';
import type { EmployerProfile } from './employer-profile.entity';

@Entity('companies')
export class Company extends BaseEntity {
  @Column({ type: 'nvarchar', length: 200 })
  name!: string;

  @Index('UQ_companies_slug', { unique: true })
  @Column({ type: 'nvarchar', length: 220 })
  slug!: string;

  @Column({ name: 'logo_url', type: 'nvarchar', length: 500, nullable: true })
  logoUrl!: string | null;

  @Column({ name: 'cover_url', type: 'nvarchar', length: 500, nullable: true })
  coverUrl!: string | null;

  /** Mã số thuế (không đặt UNIQUE vì SQL Server chỉ cho 1 giá trị NULL trong cột UNIQUE) */
  @Index('IX_companies_tax_code')
  @Column({ name: 'tax_code', type: 'nvarchar', length: 20, nullable: true })
  taxCode!: string | null;

  @Column({ type: 'simple-enum', enum: CompanySize, length: 20, nullable: true })
  size!: CompanySize | null;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  website!: string | null;

  @Column({ type: 'nvarchar', length: 255, nullable: true })
  address!: string | null;

  @Column({ name: 'location_id', type: 'int', nullable: true })
  locationId!: number | null;

  @ManyToOne('Location', { nullable: true })
  @JoinColumn({ name: 'location_id', foreignKeyConstraintName: 'FK_companies_location' })
  location!: Relation<Location> | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  description!: string | null;

  @Index('IX_companies_verification')
  @Column({
    name: 'verification_status',
    type: 'simple-enum',
    enum: CompanyVerification,
    length: 20,
    default: CompanyVerification.UNVERIFIED,
  })
  verificationStatus!: CompanyVerification;

  /** File giấy phép kinh doanh gửi kèm yêu cầu xác minh */
  @Column({ name: 'license_url', type: 'nvarchar', length: 500, nullable: true })
  licenseUrl!: string | null;

  @Column({ name: 'verification_note', type: 'nvarchar', length: 500, nullable: true })
  verificationNote!: string | null;

  @Column({ name: 'verified_at', type: 'datetime2', nullable: true })
  verifiedAt!: Date | null;

  // ----- Gói dịch vụ -----
  /** Tên gói đang dùng (null = miễn phí) */
  @Column({ name: 'plan_name', type: 'nvarchar', length: 100, nullable: true })
  planName!: string | null;

  /** Hết hạn gói; lượt dùng chỉ có hiệu lực khi gói còn hạn */
  @Column({ name: 'plan_expires_at', type: 'datetime2', nullable: true })
  planExpiresAt!: Date | null;

  /** Số lượt đẩy tin nổi bật còn lại */
  @Column({ name: 'featured_credits', type: 'int', default: 0 })
  featuredCredits!: number;

  /** Số lượt mở thông tin liên hệ ứng viên còn lại */
  @Column({ name: 'contact_credits', type: 'int', default: 0 })
  contactCredits!: number;

  @OneToMany('EmployerProfile', (e: EmployerProfile) => e.company)
  employers?: Relation<EmployerProfile[]>;

  @OneToMany('Job', (j: Job) => j.company)
  jobs?: Relation<Job[]>;
}
