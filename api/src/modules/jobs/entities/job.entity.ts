import {
  Column,
  Entity,
  Index,
  JoinColumn,
  JoinTable,
  ManyToMany,
  ManyToOne,
  OneToMany,
  Relation,
} from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { JobLevel, JobStatus, JobType } from '../../../common/enums';
import type { Company } from '../../companies/entities/company.entity';
import type { User } from '../../users/entities/user.entity';
import type { Location } from '../../catalog/entities/location.entity';
import type { Category } from '../../catalog/entities/category.entity';
import type { Skill } from '../../catalog/entities/skill.entity';
import type { Application } from '../../applications/entities/application.entity';

@Entity('jobs')
@Index('IX_jobs_status_published', ['status', 'publishedAt'])
export class Job extends BaseEntity {
  @Index('IX_jobs_company')
  @Column({ name: 'company_id', type: 'int' })
  companyId!: number;

  @ManyToOne('Company', (c: Company) => c.jobs, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id', foreignKeyConstraintName: 'FK_jobs_company' })
  company!: Relation<Company>;

  /** NTD tạo tin */
  @Column({ name: 'posted_by_id', type: 'int', nullable: true })
  postedById!: number | null;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'posted_by_id', foreignKeyConstraintName: 'FK_jobs_posted_by' })
  postedBy!: Relation<User> | null;

  @Column({ type: 'nvarchar', length: 200 })
  title!: string;

  @Index('UQ_jobs_slug', { unique: true })
  @Column({ type: 'nvarchar', length: 250 })
  slug!: string;

  @Column({ type: 'nvarchar', length: 'MAX' })
  description!: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  requirements!: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  benefits!: string | null;

  /** Lương (VND/tháng). Dùng string vì decimal có thể vượt giới hạn số của JS */
  @Column({ name: 'salary_min', type: 'decimal', precision: 18, scale: 0, nullable: true })
  salaryMin!: string | null;

  @Column({ name: 'salary_max', type: 'decimal', precision: 18, scale: 0, nullable: true })
  salaryMax!: string | null;

  @Column({ name: 'salary_negotiable', type: 'bit', default: false })
  salaryNegotiable!: boolean;

  @Column({ name: 'job_type', type: 'simple-enum', enum: JobType, length: 20 })
  jobType!: JobType;

  @Column({ type: 'simple-enum', enum: JobLevel, length: 20 })
  level!: JobLevel;

  /** Số năm kinh nghiệm tối thiểu */
  @Column({ name: 'experience_years', type: 'int', default: 0 })
  experienceYears!: number;

  /** Số lượng cần tuyển */
  @Column({ type: 'int', default: 1 })
  quantity!: number;

  @Index('IX_jobs_deadline')
  @Column({ type: 'date' })
  deadline!: string;

  @Index('IX_jobs_location')
  @Column({ name: 'location_id', type: 'int', nullable: true })
  locationId!: number | null;

  @ManyToOne('Location', { nullable: true })
  @JoinColumn({ name: 'location_id', foreignKeyConstraintName: 'FK_jobs_location' })
  location!: Relation<Location> | null;

  /** Địa chỉ làm việc cụ thể */
  @Column({ name: 'work_address', type: 'nvarchar', length: 255, nullable: true })
  workAddress!: string | null;

  @Column({ type: 'simple-enum', enum: JobStatus, length: 20, default: JobStatus.DRAFT })
  status!: JobStatus;

  /** Lý do admin từ chối */
  @Column({ name: 'reject_reason', type: 'nvarchar', length: 500, nullable: true })
  rejectReason!: string | null;

  @Column({ name: 'published_at', type: 'datetime2', nullable: true })
  publishedAt!: Date | null;

  /** Tin nổi bật đến thời điểm này (gói trả phí) */
  @Index('IX_jobs_featured_until')
  @Column({ name: 'featured_until', type: 'datetime2', nullable: true })
  featuredUntil!: Date | null;

  @Column({ name: 'view_count', type: 'int', default: 0 })
  viewCount!: number;

  @ManyToMany('Category')
  @JoinTable({
    name: 'job_categories',
    joinColumn: { name: 'job_id', foreignKeyConstraintName: 'FK_job_categories_job' },
    inverseJoinColumn: { name: 'category_id', foreignKeyConstraintName: 'FK_job_categories_category' },
  })
  categories?: Relation<Category[]>;

  @ManyToMany('Skill')
  @JoinTable({
    name: 'job_skills',
    joinColumn: { name: 'job_id', foreignKeyConstraintName: 'FK_job_skills_job' },
    inverseJoinColumn: { name: 'skill_id', foreignKeyConstraintName: 'FK_job_skills_skill' },
  })
  skills?: Relation<Skill[]>;

  @OneToMany('Application', (a: Application) => a.job)
  applications?: Relation<Application[]>;
}
