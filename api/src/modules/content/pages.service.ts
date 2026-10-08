import { Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { StaticPage } from './entities/static-page.entity';

/** Các trang tĩnh mặc định (được tạo khi seed) */
export const DEFAULT_PAGES = [
  { slug: 'gioi-thieu', title: 'Giới thiệu' },
  { slug: 'dieu-khoan', title: 'Điều khoản sử dụng' },
  { slug: 'chinh-sach-bao-mat', title: 'Chính sách bảo mật' },
];

@Injectable()
export class PagesService {
  constructor(@InjectRepository(StaticPage) private readonly repo: Repository<StaticPage>) {}

  async publicPage(slug: string) {
    const p = await this.repo.findOneBy({ slug, isPublished: true });
    if (!p) throw new NotFoundException('Trang không tồn tại');
    return { slug: p.slug, title: p.title, content: p.content, updatedAt: p.updatedAt };
  }

  async publicList() {
    return this.repo.find({ where: { isPublished: true }, select: { slug: true, title: true }, order: { id: 'ASC' } });
  }

  adminList() {
    return this.repo.find({ order: { id: 'ASC' } });
  }

  async upsert(slug: string, data: { title: string; content: string; isPublished?: boolean }, actorId: number) {
    const existing = await this.repo.findOneBy({ slug });
    await this.repo.save({ ...(existing ?? {}), slug, ...data, updatedById: actorId });
    return this.repo.findOneByOrFail({ slug });
  }

  async remove(slug: string) {
    if (DEFAULT_PAGES.some((p) => p.slug === slug)) {
      throw new NotFoundException('Không xóa được trang mặc định, bạn có thể ẩn trang');
    }
    await this.repo.delete({ slug });
  }
}
