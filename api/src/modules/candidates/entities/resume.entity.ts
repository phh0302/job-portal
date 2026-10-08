import { Column, Entity, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import type { CandidateProfile } from './candidate-profile.entity';

/** CV đã upload */
@Entity('resumes')
export class Resume extends BaseEntity {
  @Column({ name: 'candidate_id', type: 'int' })
  candidateId!: number;

  @ManyToOne('CandidateProfile', (c: CandidateProfile) => c.resumes, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id', foreignKeyConstraintName: 'FK_resumes_candidate' })
  candidate!: Relation<CandidateProfile>;

  @Column({ name: 'file_name', type: 'nvarchar', length: 255 })
  fileName!: string;

  /** Đường dẫn lưu trữ (local path hoặc key trên S3) — không công khai trực tiếp */
  @Column({ name: 'file_url', type: 'nvarchar', length: 500 })
  fileUrl!: string;

  @Column({ name: 'mime_type', type: 'nvarchar', length: 100 })
  mimeType!: string;

  @Column({ name: 'size_bytes', type: 'int' })
  sizeBytes!: number;

  @Column({ name: 'is_default', type: 'bit', default: false })
  isDefault!: boolean;
}
