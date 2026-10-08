import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ReviewRelation, ReviewStatus } from '../../../common/enums';
import type { CandidateProfile } from '../../candidates/entities/candidate-profile.entity';
import type { Company } from '../../companies/entities/company.entity';

/** Đánh giá công ty của ứng viên. Mỗi ứng viên 1 đánh giá / 1 công ty; sửa lại → chờ duyệt lại. */
@Entity('company_reviews')
@Index('UQ_company_reviews_company_candidate', ['companyId', 'candidateId'], { unique: true })
@Index('IX_company_reviews_company_status', ['companyId', 'status'])
export class CompanyReview extends BaseEntity {
  @Column({ name: 'company_id', type: 'int' })
  companyId!: number;

  @ManyToOne('Company', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id', foreignKeyConstraintName: 'FK_company_reviews_company' })
  company!: Relation<Company>;

  @Column({ name: 'candidate_id', type: 'int' })
  candidateId!: number;

  @ManyToOne('CandidateProfile', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id', foreignKeyConstraintName: 'FK_company_reviews_candidate' })
  candidate!: Relation<CandidateProfile>;

  /** 1–5 sao */
  @Column({ type: 'tinyint' })
  rating!: number;

  @Column({ type: 'nvarchar', length: 150 })
  title!: string;

  @Column({ type: 'nvarchar', length: 2000 })
  pros!: string;

  @Column({ type: 'nvarchar', length: 2000 })
  cons!: string;

  @Column({ type: 'simple-enum', enum: ReviewRelation, length: 20 })
  relation!: ReviewRelation;

  /** Ẩn tên người đánh giá khi hiển thị công khai (mặc định có) */
  @Column({ name: 'is_anonymous', type: 'bit', default: true })
  isAnonymous!: boolean;

  @Index('IX_company_reviews_status')
  @Column({ type: 'simple-enum', enum: ReviewStatus, length: 10, default: ReviewStatus.PENDING })
  status!: ReviewStatus;

  @Column({ name: 'reject_reason', type: 'nvarchar', length: 500, nullable: true })
  rejectReason!: string | null;

  /** Phản hồi công khai của công ty */
  @Column({ name: 'employer_reply', type: 'nvarchar', length: 2000, nullable: true })
  employerReply!: string | null;

  @Column({ name: 'replied_at', type: 'datetime2', nullable: true })
  repliedAt!: Date | null;
}
