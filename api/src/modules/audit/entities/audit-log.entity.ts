import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import type { User } from '../../users/entities/user.entity';

/** Lịch sử thao tác của admin (chỉ ghi, không sửa) */
@Entity('audit_logs')
@Index('IX_audit_logs_entity', ['entityType', 'entityId'])
export class AuditLog {
  @PrimaryGeneratedColumn({ type: 'bigint' })
  id!: string;

  @Index('IX_audit_logs_actor')
  @Column({ name: 'actor_id', type: 'int', nullable: true })
  actorId!: number | null;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'actor_id', foreignKeyConstraintName: 'FK_audit_logs_actor' })
  actor!: Relation<User> | null;

  /** vd: JOB_APPROVE, JOB_REJECT, USER_LOCK, COMPANY_VERIFY */
  @Column({ type: 'nvarchar', length: 50 })
  action!: string;

  /** vd: job, user, company */
  @Column({ name: 'entity_type', type: 'nvarchar', length: 50 })
  entityType!: string;

  @Column({ name: 'entity_id', type: 'nvarchar', length: 50, nullable: true })
  entityId!: string | null;

  /** Dữ liệu thêm dạng JSON */
  @Column({ type: 'nvarchar', length: 'MAX', nullable: true })
  metadata!: string | null;

  @Column({ name: 'ip_address', type: 'nvarchar', length: 45, nullable: true })
  ipAddress!: string | null;

  @Index('IX_audit_logs_created')
  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt!: Date;
}
