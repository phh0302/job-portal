import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ReportStatus, ReportTargetType } from '../../../common/enums';
import type { User } from '../../users/entities/user.entity';
import type { Job } from '../../jobs/entities/job.entity';
import type { Company } from '../../companies/entities/company.entity';

/** Báo cáo tin tuyển dụng / công ty vi phạm */
@Entity('reports')
export class Report extends BaseEntity {
  @Column({ name: 'reporter_id', type: 'int' })
  reporterId!: number;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'reporter_id', foreignKeyConstraintName: 'FK_reports_reporter' })
  reporter!: Relation<User>;

  @Column({ name: 'target_type', type: 'simple-enum', enum: ReportTargetType, length: 20 })
  targetType!: ReportTargetType;

  @Column({ name: 'job_id', type: 'int', nullable: true })
  jobId!: number | null;

  @ManyToOne('Job', { nullable: true })
  @JoinColumn({ name: 'job_id', foreignKeyConstraintName: 'FK_reports_job' })
  job!: Relation<Job> | null;

  @Column({ name: 'company_id', type: 'int', nullable: true })
  companyId!: number | null;

  @ManyToOne('Company', { nullable: true })
  @JoinColumn({ name: 'company_id', foreignKeyConstraintName: 'FK_reports_company' })
  company!: Relation<Company> | null;

  @Column({ type: 'nvarchar', length: 200 })
  reason!: string;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  details!: string | null;

  @Index('IX_reports_status')
  @Column({ type: 'simple-enum', enum: ReportStatus, length: 20, default: ReportStatus.OPEN })
  status!: ReportStatus;

  @Column({ name: 'resolved_by_id', type: 'int', nullable: true })
  resolvedById!: number | null;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'resolved_by_id', foreignKeyConstraintName: 'FK_reports_resolved_by' })
  resolvedBy!: Relation<User> | null;

  @Column({ name: 'resolution_note', type: 'nvarchar', length: 1000, nullable: true })
  resolutionNote!: string | null;

  @Column({ name: 'resolved_at', type: 'datetime2', nullable: true })
  resolvedAt!: Date | null;
}
