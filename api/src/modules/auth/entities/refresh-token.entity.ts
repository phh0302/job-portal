import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import type { User } from '../../users/entities/user.entity';

/** Refresh token (chỉ lưu hash SHA-256, không lưu token gốc) */
@Entity('refresh_tokens')
export class RefreshToken {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Index('IX_refresh_tokens_user')
  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_refresh_tokens_user' })
  user!: Relation<User>;

  @Index('UQ_refresh_tokens_hash', { unique: true })
  @Column({ name: 'token_hash', type: 'char', length: 64 })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'datetime2' })
  expiresAt!: Date;

  @Column({ name: 'revoked_at', type: 'datetime2', nullable: true })
  revokedAt!: Date | null;

  @Column({ name: 'user_agent', type: 'nvarchar', length: 300, nullable: true })
  userAgent!: string | null;

  @Column({ name: 'ip_address', type: 'nvarchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt!: Date;
}
