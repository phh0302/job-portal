import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import type { CandidateProfile } from '../../candidates/entities/candidate-profile.entity';
import type { CandidateCheckResult } from '../candidate-check.engine';

/**
 * Ứng viên tự kiểm tra CV với JD trước khi ứng tuyển.
 * RIÊNG TƯ: chỉ ứng viên xem được, nhà tuyển dụng không thấy.
 */
@Entity('cv_job_checks')
@Index('IX_cv_job_checks_candidate_created', ['candidateId', 'createdAt'])
@Index('IX_cv_job_checks_lookup', ['candidateId', 'inputHash'])
export class CvJobCheck {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'candidate_id', type: 'int' })
  candidateId!: number;

  @ManyToOne('CandidateProfile', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id', foreignKeyConstraintName: 'FK_cv_job_checks_candidate' })
  candidate!: Relation<CandidateProfile>;

  /** Không FK: tin / CV có thể bị xoá, vẫn giữ lịch sử */
  @Column({ name: 'job_id', type: 'int' })
  jobId!: number;

  /** null = kiểm tra bằng hồ sơ (chưa có CV) */
  @Column({ name: 'resume_id', type: 'int', nullable: true })
  resumeId!: number | null;

  /** Hash của (JD, hồ sơ, CV) – trùng trong 24h thì dùng lại kết quả, không tốn lượt */
  @Column({ name: 'input_hash', type: 'char', length: 64 })
  inputHash!: string;

  @Column({ type: 'tinyint' })
  score!: number;

  @Column({ type: 'simple-json' })
  result!: CandidateCheckResult;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt!: Date;
}
