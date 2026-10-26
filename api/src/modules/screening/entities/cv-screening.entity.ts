import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { ScreeningVerdict } from '../../../common/enums';
import type { Application } from '../../applications/entities/application.entity';

export type RequirementStatus = 'MET' | 'PARTIAL' | 'MISSING' | 'UNKNOWN';
export interface RequirementCheck {
  requirement: string;
  status: RequirementStatus;
  evidence: string | null;
}

/** Một lần AI chấm CV của đơn ứng tuyển (giữ lịch sử; hiển thị bản mới nhất) */
@Entity('cv_screenings')
@Index('IX_cv_screenings_app', ['applicationId', 'id'])
@Index('IX_cv_screenings_company_created', ['companyId', 'createdAt'])
export class CvScreening {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'application_id', type: 'int' })
  applicationId!: number;

  @ManyToOne('Application', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id', foreignKeyConstraintName: 'FK_cv_screenings_application' })
  application!: Relation<Application>;

  /** Để đếm hạn mức theo công ty (không FK: tránh nhiều đường cascade) */
  @Column({ name: 'company_id', type: 'int' })
  companyId!: number;

  @Column({ type: 'tinyint' })
  score!: number;

  @Column({ type: 'simple-enum', enum: ScreeningVerdict, length: 10 })
  verdict!: ScreeningVerdict;

  @Column({ type: 'nvarchar', length: 1000 })
  summary!: string;

  @Column({ type: 'simple-json' })
  requirements!: RequirementCheck[];

  @Column({ type: 'simple-json' })
  strengths!: string[];

  @Column({ type: 'simple-json' })
  gaps!: string[];

  @Column({ name: 'interview_questions', type: 'simple-json' })
  interviewQuestions!: string[];

  /** AI = Claude đọc CV; RULES = so khớp kỹ năng/kinh nghiệm (khi không có AI) */
  @Column({ type: 'nvarchar', length: 10 })
  source!: 'AI' | 'RULES';

  /** AI có đọc được nội dung file CV không */
  @Column({ name: 'cv_readable', type: 'bit', default: true })
  cvReadable!: boolean;

  @Column({ type: 'nvarchar', length: 60, nullable: true })
  model!: string | null;

  @Column({ name: 'created_by_id', type: 'int' })
  createdById!: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt!: Date;
}
