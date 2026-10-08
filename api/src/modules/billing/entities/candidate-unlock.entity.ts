import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import type { CandidateProfile } from '../../candidates/entities/candidate-profile.entity';
import type { Company } from '../../companies/entities/company.entity';

/** Công ty đã dùng lượt để mở thông tin liên hệ của ứng viên (mở 1 lần, xem mãi) */
@Entity('candidate_unlocks')
@Index('UQ_candidate_unlocks_company_candidate', ['companyId', 'candidateId'], { unique: true })
export class CandidateUnlock {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'company_id', type: 'int' })
  companyId!: number;

  @ManyToOne('Company', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id', foreignKeyConstraintName: 'FK_candidate_unlocks_company' })
  company!: Relation<Company>;

  @Column({ name: 'candidate_id', type: 'int' })
  candidateId!: number;

  @ManyToOne('CandidateProfile', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'candidate_id', foreignKeyConstraintName: 'FK_candidate_unlocks_candidate' })
  candidate!: Relation<CandidateProfile>;

  @Column({ name: 'unlocked_by_id', type: 'int' })
  unlockedById!: number;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt!: Date;
}
