import { CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryColumn, Relation } from 'typeorm';
import type { User } from '../../users/entities/user.entity';
import type { Company } from '../../companies/entities/company.entity';

/** Công ty ứng viên đang theo dõi */
@Entity('followed_companies')
export class FollowedCompany {
  @PrimaryColumn({ name: 'user_id', type: 'int' })
  userId!: number;

  @Index('IX_followed_companies_company')
  @PrimaryColumn({ name: 'company_id', type: 'int' })
  companyId!: number;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_followed_companies_user' })
  user!: Relation<User>;

  @ManyToOne('Company', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id', foreignKeyConstraintName: 'FK_followed_companies_company' })
  company!: Relation<Company>;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt!: Date;
}
