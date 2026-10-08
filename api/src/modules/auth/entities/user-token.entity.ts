import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { UserTokenType } from '../../../common/enums';
import type { User } from '../../users/entities/user.entity';

/** Token dùng 1 lần: xác minh email, đặt lại mật khẩu (lưu hash) */
@Entity('user_tokens')
@Index('IX_user_tokens_user_type', ['userId', 'type'])
export class UserToken {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_user_tokens_user' })
  user!: Relation<User>;

  @Column({ type: 'simple-enum', enum: UserTokenType, length: 20 })
  type!: UserTokenType;

  @Index('UQ_user_tokens_hash', { unique: true })
  @Column({ name: 'token_hash', type: 'char', length: 64 })
  tokenHash!: string;

  @Column({ name: 'expires_at', type: 'datetime2' })
  expiresAt!: Date;

  @Column({ name: 'used_at', type: 'datetime2', nullable: true })
  usedAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt!: Date;
}
