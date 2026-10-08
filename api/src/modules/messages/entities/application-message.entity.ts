import { Column, CreateDateColumn, Entity, Index, JoinColumn, ManyToOne, PrimaryGeneratedColumn, Relation } from 'typeorm';
import { UserRole } from '../../../common/enums';
import type { Application } from '../../applications/entities/application.entity';
import type { User } from '../../users/entities/user.entity';

/** Tin nhắn giữa NTD và ứng viên, gắn với 1 đơn ứng tuyển */
@Entity('application_messages')
@Index('IX_application_messages_app', ['applicationId', 'id'])
export class ApplicationMessage {
  @PrimaryGeneratedColumn({ type: 'int' })
  id!: number;

  @Column({ name: 'application_id', type: 'int' })
  applicationId!: number;

  @ManyToOne('Application', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'application_id', foreignKeyConstraintName: 'FK_application_messages_application' })
  application!: Relation<Application>;

  /** Không CASCADE: SQL Server cấm nhiều đường cascade (users → … → applications) */
  @Column({ name: 'sender_user_id', type: 'int' })
  senderUserId!: number;

  @ManyToOne('User')
  @JoinColumn({ name: 'sender_user_id', foreignKeyConstraintName: 'FK_application_messages_sender' })
  sender!: Relation<User>;

  /** EMPLOYER | CANDIDATE */
  @Column({ name: 'sender_role', type: 'simple-enum', enum: UserRole, length: 20 })
  senderRole!: UserRole;

  @Column({ type: 'nvarchar', length: 2000 })
  body!: string;

  @CreateDateColumn({ name: 'created_at', type: 'datetime2' })
  createdAt!: Date;
}
