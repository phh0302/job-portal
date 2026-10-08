import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { AlertFrequency } from '../../../common/enums';
import type { User } from '../../users/entities/user.entity';
import type { Location } from '../../catalog/entities/location.entity';
import type { Category } from '../../catalog/entities/category.entity';

/** Đăng ký nhận email việc làm phù hợp */
@Entity('job_alerts')
export class JobAlert extends BaseEntity {
  @Index('IX_job_alerts_user')
  @Column({ name: 'user_id', type: 'int' })
  userId!: number;

  @ManyToOne('User', { onDelete: 'CASCADE' })
  @JoinColumn({ name: 'user_id', foreignKeyConstraintName: 'FK_job_alerts_user' })
  user!: Relation<User>;

  @Column({ type: 'nvarchar', length: 200, nullable: true })
  keyword!: string | null;

  @Column({ name: 'location_id', type: 'int', nullable: true })
  locationId!: number | null;

  @ManyToOne('Location', { nullable: true })
  @JoinColumn({ name: 'location_id', foreignKeyConstraintName: 'FK_job_alerts_location' })
  location!: Relation<Location> | null;

  @Column({ name: 'category_id', type: 'int', nullable: true })
  categoryId!: number | null;

  @ManyToOne('Category', { nullable: true })
  @JoinColumn({ name: 'category_id', foreignKeyConstraintName: 'FK_job_alerts_category' })
  category!: Relation<Category> | null;

  @Column({ type: 'simple-enum', enum: AlertFrequency, length: 10, default: AlertFrequency.DAILY })
  frequency!: AlertFrequency;

  @Column({ name: 'is_active', type: 'bit', default: true })
  isActive!: boolean;

  @Column({ name: 'last_sent_at', type: 'datetime2', nullable: true })
  lastSentAt!: Date | null;
}
