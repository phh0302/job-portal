import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { ApplicationStatus } from '../../../common/enums';
import type { Job } from '../../jobs/entities/job.entity';
import type { CandidateProfile } from '../../candidates/entities/candidate-profile.entity';
import type { Resume } from '../../candidates/entities/resume.entity';

/** Đơn ứng tuyển. Mỗi ứng viên chỉ nộp 1 đơn / 1 tin. */
@Entity('applications')
@Index('UQ_applications_job_candidate', ['jobId', 'candidateId'], { unique: true })
export class Application extends BaseEntity {
  @Column({ name: 'job_id', type: 'int' })
  jobId!: number;

  @ManyToOne('Job', (j: Job) => j.applications, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id', foreignKeyConstraintName: 'FK_applications_job' })
  job!: Relation<Job>;

  @Index('IX_applications_candidate')
  @Column({ name: 'candidate_id', type: 'int' })
  candidateId!: number;

  @ManyToOne('CandidateProfile', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id', foreignKeyConstraintName: 'FK_applications_candidate' })
  candidate!: Relation<CandidateProfile>;

  /**
   * CV đã chọn. Không CASCADE (SQL Server cấm nhiều đường cascade từ candidate_profiles);
   * khi xoá CV, service sẽ set NULL — file vẫn giữ qua resume_file_url bên dưới.
   */
  @Column({ name: 'resume_id', type: 'int', nullable: true })
  resumeId!: number | null;

  @ManyToOne('Resume', { nullable: true })
  @JoinColumn({ name: 'resume_id', foreignKeyConstraintName: 'FK_applications_resume' })
  resume!: Relation<Resume> | null;

  /** Bản sao thông tin CV tại thời điểm nộp */
  @Column({ name: 'resume_file_name', type: 'nvarchar', length: 255 })
  resumeFileName!: string;

  @Column({ name: 'resume_file_url', type: 'nvarchar', length: 500 })
  resumeFileUrl!: string;

  @Column({ name: 'cover_letter', type: 'nvarchar', length: 'MAX', nullable: true })
  coverLetter!: string | null;

  @Index('IX_applications_status')
  @Column({
    type: 'simple-enum',
    enum: ApplicationStatus,
    length: 20,
    default: ApplicationStatus.SUBMITTED,
  })
  status!: ApplicationStatus;

  /** Ghi chú nội bộ của nhà tuyển dụng */
  @Column({ name: 'employer_note', type: 'nvarchar', length: 'MAX', nullable: true })
  employerNote!: string | null;

  @Column({ name: 'status_changed_at', type: 'datetime2', nullable: true })
  statusChangedAt!: Date | null;

  /**
   * Lần đầu NTD phản hồi (đổi sang Phù hợp / Phỏng vấn / Offer / Từ chối, hoặc nhắn tin).
   * Ghi bằng GETDATE() của SQL Server để cùng mốc giờ với created_at.
   */
  @Column({ name: 'responded_at', type: 'datetime2', nullable: true })
  respondedAt!: Date | null;

  /** Thời điểm tin nhắn gần nhất (null = chưa có cuộc trò chuyện) */
  @Index('IX_applications_last_message')
  @Column({ name: 'last_message_at', type: 'datetime2', nullable: true })
  lastMessageAt!: Date | null;

  /** Lần cuối phía NTD (bất kỳ ai trong công ty) đọc tin nhắn */
  @Column({ name: 'employer_read_at', type: 'datetime2', nullable: true })
  employerReadAt!: Date | null;

  /** Lần cuối ứng viên đọc tin nhắn */
  @Column({ name: 'candidate_read_at', type: 'datetime2', nullable: true })
  candidateReadAt!: Date | null;
}
