import { CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import type { User } from '../../users/entities/user.entity';
import type { Job } from '../../jobs/entities/job.entity';

/** Việc làm ứng viên đã lưu */
@Entity('saved_jobs')
export class SavedJob {
  @PrimaryColumn({ name: 'user_id', type: 'int' })
  userId!: number;

  @Index('IX_saved_jobs_job')
  @PrimaryColumn({ name: 'job_id', type: 'int' })
  jobId!: number;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_saved_jobs_user' })
  user!: Relation<User>;

  @ManyToOne('Job', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'job_id', foreignKeyConstraintName: 'FK_saved_jobs_job' })
  job!: Relation<Job>;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt!: Date;
}
