import { Column, Entity } from 'typeorm';
import { BaseEntity } from '../../../common/entities/base.entity';
import { FaqAudience } from '../../../common/enums';

/** Câu hỏi thường gặp – nguồn kiến thức của trợ lý hỗ trợ (admin soạn) */
@Entity('faq_articles')
export class FaqArticle extends BaseEntity {
  @Column({ type: 'nvarchar', length: 300 })
  question!: string;

  @Column({ type: 'nvarchar', length: 4000 })
  answer!: string;

  /** Từ khoá bổ sung để tìm kiếm, cách nhau bởi dấu phẩy */
  @Column({ type: 'nvarchar', length: 500, nullable: true })
  keywords!: string | null;

  @Column({ type: 'simple-enum', enum: FaqAudience, length: 10, default: FaqAudience.ALL })
  audience!: FaqAudience;

  @Column({ name: 'is_active', type: 'bit', default: true })
  isActive!: boolean;

  @Column({ name: 'sort_order', type: 'int', default: 0 })
  sortOrder!: number;
}
