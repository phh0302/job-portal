import { Column, Entity, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import type { CandidateProfile } from './candidate-profile.entity';

/** Học vấn */
@Entity('educations')
export class Education extends BaseEntity {
  @Column({ name: 'candidate_id', type: 'int' })
  candidateId!: number;

  @ManyToOne('CandidateProfile', (c: CandidateProfile) => c.educations, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id', foreignKeyConstraintName: 'FK_educations_candidate' })
  candidate!: Relation<CandidateProfile>;

  @Column({ type: 'nvarchar', length: 200 })
  school!: string;

  @Column({ type: 'nvarchar', length: 150, nullable: true })
  major!: string | null;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  degree!: string | null;

  @Column({ name: 'start_date', type: 'date', nullable: true })
  startDate!: string | null;

  @Column({ name: 'end_date', type: 'date', nullable: true })
  endDate!: string | null;

  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  description!: string | null;
}
