import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/** Tỉnh / thành phố */
@Entity('locations')
export class Location extends BaseEntity {
  @Column({ type: 'nvarchar', length: 100 })
  name!: string;

  @Index('UQ_locations_slug', { unique: true })
  @Column({ type: 'nvarchar', length: 120 })
  slug!: string;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;
}
