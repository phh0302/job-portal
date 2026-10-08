import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/** Ngành nghề */
@Entity('categories')
export class Category extends BaseEntity {
  @Column({ type: 'nvarchar', length: 150 })
  name!: string;

  @Index('UQ_categories_slug', { unique: true })
  @Column({ type: 'nvarchar', length: 170 })
  slug!: string;

  @Column({ type: 'nvarchar', length: 100, nullable: true })
  icon!: string | null;

  @Column({ name: 'is_active', type: 'bit', default: true })
  isActive!: boolean;
}
