import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { SupportStatus } from '../../../common/enums';
import type { User } from '../../users/entities/user.entity';

/** Một cuộc hỗ trợ của người dùng (ứng viên / NTD) */
@Entity('support_tickets')
@Index('IX_support_tickets_status_last', ['status', 'lastMessageAt'])
export class SupportTicket extends BaseEntity {
  @Index('IX_support_tickets_user')
  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_support_tickets_user' })
  user!: Relation<User>;

  @Column({ type: 'simple-enum', enum: SupportStatus, length: 10, default: SupportStatus.BOT })
  status!: SupportStatus;

  /** Tóm tắt (lấy từ tin nhắn đầu) */
  @Column({ type: 'nvarchar', length: 200 })
  subject!: string;

  @Column({ name: 'assigned_admin_id', type: 'int', nullable: true })
  assignedAdminId!: number | null;

  @Column({ name: 'last_message_at', type: 'datetime2' })
  lastMessageAt!: Date;

  @Column({ name: 'user_read_at', type: 'datetime2', nullable: true })
  userReadAt!: Date | null;

  @Column({ name: 'admin_read_at', type: 'datetime2', nullable: true })
  adminReadAt!: Date | null;

  @Column({ name: 'escalated_at', type: 'datetime2', nullable: true })
  escalatedAt!: Date | null;

  @Column({ name: 'closed_at', type: 'datetime2', nullable: true })
  closedAt!: Date | null;
}
