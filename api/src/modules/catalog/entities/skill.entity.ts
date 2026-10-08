import { Column, Entity, Index } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';

/** Kỹ năng (dùng chung cho hồ sơ ứng viên và tin tuyển dụng) */
@Entity('skills')
export class Skill extends BaseEntity {
  @Column({ type: 'nvarchar', length: 100 })
  name!: string;

  @Index('UQ_skills_slug', { unique: true })
  @Column({ type: 'nvarchar', length: 120 })
  slug!: string;
}
