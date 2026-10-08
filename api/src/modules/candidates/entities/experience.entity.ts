import { Column, Entity, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import type { CandidateProfile } from './candidate-profile.entity';

/** Kinh nghiệm làm việc */
@Entity('experiences')
export class Experience extends BaseEntity {
  @Column({ name: 'candidate_id', type: 'int' })
  candidateId!: number;

  @ManyToOne('CandidateProfile', (c: CandidateProfile) => c.experiences, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id', foreignKeyConstraintName: 'FK_experiences_candidate' })
  candidate!: Relation<CandidateProfile>;

  @Column({ name: 'company_name', type: 'nvarchar', length: 200 })
  companyName!: string;

  @Column({ type: 'nvarchar', length: 150 })
  position!: string;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: string | null;

  /** null = đang làm */
  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  description!: string | null;
}
