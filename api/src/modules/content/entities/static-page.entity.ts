import { Column, Entity, Index, JoinColumn, ManyToOne, Relation } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import type { User } from '../../users/entities/user.entity';

/** Trang tĩnh: Giới thiệu, Điều khoản, Chính sách bảo mật… */
@Entity('static_pages')
export class StaticPage extends BaseEntity {
  @Index('UQ_static_pages_slug', { unique: true })
  @Column({ type: 'nvarchar', length: 100 })
  slug!: string;

  @Column({ type: 'nvarchar', length: 200 })
  title!: string;

  /** Nội dung dạng văn bản / markdown đơn giản */
  @Column({ type: 'nvarchar', length: 'MAX' })
  content!: string;

  @Column({ name: 'is_published', type: 'bit', default: true })
  isPublished!: boolean;

  @Column({ name: 'updated_by_id', type: 'int', nullable: true })
  updatedById!: number | null;

  @ManyToOne('User', { nullable: true })
  @JoinColumn({ name: 'updated_by_id', foreignKeyConstraintName: 'FK_static_pages_updated_by' })
  updatedBy!: Relation<User> | null;
}
