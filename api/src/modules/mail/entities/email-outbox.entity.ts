import { Column, CreateDateColumn, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

export enum EmailStatus {
  PENDING = 'PENDING',
  SENDING = 'SENDING',
  SENT = 'SENT',
  FAILED = 'FAILED',
}

/** Hàng đợi email (outbox) lưu trong SQL Server: gửi nền, tự thử lại khi lỗi */
@Entity('email_outbox')
@Index('IX_email_outbox_status_next', ['status', 'nextAttemptAt'])
export class EmailOutbox {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Column({ name: 'to_email', type: 'nvarchar', length: 255 })
  to!: string;

  @Column({ type: 'nvarchar', length: 300 })
  subject!: string;

  @Column({ type: 'nvarchar', length: 'MAX' })
  html!: string;

  @Column({ type: 'simple-enum', enum: EmailStatus, length: 10, default: EmailStatus.PENDING })
  status!: EmailStatus;

  @Column({ type: 'int', default: 0 })
  attempts!: number;

  @Column({ name: 'last_error', type: 'nvarchar', length: 1000, nullable: true })
  lastError!: string | null;

  @Column({ name: 'next_attempt_at', type: 'datetime2' })
  nextAttemptAt!: Date;

  @Column({ name: 'locked_at', type: 'datetime2', nullable: true })
  lockedAt!: Date | null;

  @Column({ name: 'sent_at', type: 'datetime2', nullable: true })
  sentAt!: Date | null;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt!: Date;
}
