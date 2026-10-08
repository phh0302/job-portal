import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { CompanyRole } from '../../../common/enums';
import type { User } from '../../users/entities/user.entity';
import type { Company } from './company.entity';

/** Lời mời đồng nghiệp tham gia công ty (token gửi qua email, chỉ lưu hash) */
@Entity('company_invitations')
@Index('IX_company_invitations_company_email', ['companyId', 'email'])
export class CompanyInvitation {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'company_id', type: 'int' })
  companyId!: number;

  @ManyToOne('Company', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'company_id', foreignKeyConstraintName: 'FK_company_invitations_company' })
  company!: Relation<Company>;

  @Column({ type: 'nvarchar', length: 255 })
  email!: string;

  @Column({ type: 'simple-enum', enum: CompanyRole, length: 10, default: CompanyRole.MEMBER })
  role!: CompanyRole;

  @Index('UQ_company_invitations_token', { unique: true })
  @Column({ name: 'token_hash', type: 'char', length: 64 })
  tokenHash!: string;

  @Column({ name: 'invited_by_id', type: 'int', nullable: true })
  invitedById!: number | null;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'invited_by_id', foreignKeyConstraintName: 'FK_company_invitations_invited_by' })
  invitedBy!: Relation<User> | null;

  @Column({ name: 'expires_at', type: 'datetime2' })
  expiresAt!: Date;

  @Column({ name: 'accepted_at', type: 'datetime2', nullable: true })
  acceptedAt!: Date | null;

  @Column({ name: 'revoked_at', type: 'datetime2', nullable: true })
  revokedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt!: Date;
}
