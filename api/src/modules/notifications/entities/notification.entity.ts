import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { NotificationType } from '../../../common/enums';
import type { User } from '../../users/entities/user.entity';

@Entity('notifications')
@Index('IX_notifications_user_read', ['userId', 'isRead'])
export class Notification extends BaseEntity {
  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_notifications_user' })
  user!: Relation<User>;

  @Column({ type: 'simple-enum', enum: NotificationType, length: 30 })
  type!: NotificationType;

  @Column({ type: 'nvarchar', length: 200 })
  title!: string;

  @Column({ type: 'nvarchar', length: 1000, nullable: true })
  message!: string | null;

  /** Đường dẫn trong web khi bấm vào thông báo, vd: /candidate/applications/12 */
  @Column({ type: 'nvarchar', length: 300, nullable: true })
  link!: string | null;

  @Column({ name: 'is_read', type: 'bit', default: false })
  isRead!: boolean;
}
