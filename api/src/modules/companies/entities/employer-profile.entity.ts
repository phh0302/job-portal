import { Column, Entity, JoinColumn, ManyToOne, OneToOne, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { CompanyRole } from '../../../common/enums';
import type { User } from '../../users/entities/user.entity';
import type { Company } from './company.entity';

@Entity('employer_profiles')
export class EmployerProfile extends BaseEntity {
  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @OneToOne('User', (u: User) => u.employerProfile, { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_employer_profiles_user' })
  user!: Relation<User>;

  /** null khi NTD mới đăng ký, chưa tạo công ty */
  @Column({ name: 'company_id', type: 'int', nullable: true })
  companyId!: number | null;

  @ManyToOne('Company', (c: Company) => c.employers, { nullable: true })
  @JoinColumn({ name: 'company_id', foreignKeyConstraintName: 'FK_employer_profiles_company' })
  company!: Relation<Company> | null;

  /** Vai trò trong công ty (người tạo công ty là OWNER) */
  @Column({ name: 'company_role', type: 'simple-enum', enum: CompanyRole, length: 10, default: CompanyRole.OWNER })
  companyRole!: CompanyRole;

  @Column({ name: 'full_name', type: 'nvarchar', length: 150 })
  fullName!: string;

  @Column({ type: 'nvarchar', length: 20, nullable: true })
  phone!: string | null;

  /** Chức vụ */
  @Column({ type: 'nvarchar', length: 100, nullable: true })
  position!: string | null;
}
