import { Column, Entity, Index, OneToOne, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { UserRole, UserStatus } from '../../../common/enums';
import type { CandidateProfile } from '../../candidates/entities/candidate-profile.entity';
import type { EmployerProfile } from '../../companies/entities/employer-profile.entity';

@Entity('users')
export class User extends BaseEntity {
  @Index('UQ_users_email', { unique: true })
  @Column({ type: 'nvarchar', length: 255 })
  email!: string;

  @Column({ name: 'password_hash', type: 'nvarchar', length: 255, select: false })
  passwordHash!: string;

  @Index('IX_users_role')
  @Column({ type: 'simple-enum', enum: UserRole, length: 20 })
  role!: UserRole;

  @Column({ type: 'simple-enum', enum: UserStatus, length: 20, default: UserStatus.ACTIVE })
  status!: UserStatus;

  @Column({ name: 'email_verified', type: 'bit', default: false })
  emailVerified!: boolean;

  /** Super admin: được tạo / khóa tài khoản admin khác */
  @Column({ name: 'is_super_admin', type: 'bit', default: false })
  isSuperAdmin!: boolean;

  /** Lý do khóa tài khoản (hiển thị cho admin) */
  @Column({ name: 'locked_reason', type: 'nvarchar', length: 500, nullable: true })
  lockedReason!: string | null;

  @Column({ name: 'last_login_at', type: 'datetime2', nullable: true })
  lastLoginAt!: Date | null;

  @OneToOne('CandidateProfile', (p: CandidateProfile) => p.user)
  candidateProfile?: Relation<CandidateProfile>;

  @OneToOne('EmployerProfile', (p: EmployerProfile) => p.user)
  employerProfile?: Relation<EmployerProfile>;
}
