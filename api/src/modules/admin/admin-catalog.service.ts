import { BadRequestException, ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Not, Repository } from 'typeorm';
import { AuthUser } from '../../common/types/auth-user';
import { slugify } from '../../common/utils/slug';
import { AuditService } from '../audit/audit.service';
import { Category } from '../catalog/entities/category.entity';
import { Location } from '../catalog/entities/location.entity';
import { Skill } from '../catalog/entities/skill.entity';
import { CategoryDto, LocationDto, NameDto } from './dto/admin.dto';

type Kind = 'category' | 'skill' | 'location';
const LABEL: Record<Kind, string> = { category: 'Ngành nghề', skill: 'Kỹ năng', location: 'Tỉnh/thành' };

/** Số lần đang được dùng (để chặn xóa mục đang dùng) */
const USAGE_SQL: Record<Kind, string> = {
  category: '(SELECT COUNT(*) FROM job_categories x WHERE x.category_id = t.id) + (SELECT COUNT(*) FROM job_alerts x WHERE x.category_id = t.id)',
  skill: '(SELECT COUNT(*) FROM job_skills x WHERE x.skill_id = t.id) + (SELECT COUNT(*) FROM candidate_skills x WHERE x.skill_id = t.id)',
  location:
    '(SELECT COUNT(*) FROM jobs x WHERE x.location_id = t.id) + (SELECT COUNT(*) FROM companies x WHERE x.location_id = t.id) + ' +
    '(SELECT COUNT(*) FROM candidate_profiles x WHERE x.location_id = t.id) + (SELECT COUNT(*) FROM job_alerts x WHERE x.location_id = t.id)',
};

@Injectable()
export class AdminCatalogService {
  constructor(
    private readonly audit: AuditService,
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Skill) private readonly skills: Repository<Skill>,
    @InjectRepository(Location) private readonly locations: Repository<Location>,
  ) {}

  async list(kind: Kind) {
    const repo = this.repo(kind);
    const { entities, raw } = await repo
      .createQueryBuilder('t')
      .addSelect(USAGE_SQL[kind], 'usage')
      .orderBy(kind === 'location' ? 't.sort_order' : 't.name', 'ASC')
      .getRawAndEntities();
    return entities.map((e, i) => ({ ...e, usage: Number(raw[i]?.usage ?? 0) }));
  }

  async create(actor: AuthUser, kind: Kind, dto: CategoryDto | NameDto | LocationDto) {
    const repo = this.repo(kind);
    const slug = slugify(dto.name);
    if (!slug) throw new BadRequestException('Tên không hợp lệ');
    if (await repo.existsBy({ slug })) throw new ConflictException(`${LABEL[kind]} "${dto.name}" đã tồn tại`);
    const { identifiers } = await repo.insert({ ...dto, slug } as never);
    const id = Number(identifiers[0]?.id);
    await this.audit.log({ actorId: actor.id, action: `${kind.toUpperCase()}_CREATE`, entityType: kind, entityId: id, metadata: { name: dto.name } });
    return repo.findOneByOrFail({ id });
  }

  async update(actor: AuthUser, kind: Kind, id: number, dto: Partial<CategoryDto & LocationDto>) {
    const repo = this.repo(kind);
    const row = await repo.findOneBy({ id });
    if (!row) throw new NotFoundException(`Không tìm thấy ${LABEL[kind].toLowerCase()}`);
    const patch: Record<string, unknown> = { ...dto };
    if (dto.name) {
      const slug = slugify(dto.name);
      if (await repo.existsBy({ slug, id: Not(id) })) throw new ConflictException(`${LABEL[kind]} "${dto.name}" đã tồn tại`);
      patch.slug = slug;
    }
    await repo.update(id, patch as never);
    await this.audit.log({ actorId: actor.id, action: `${kind.toUpperCase()}_UPDATE`, entityType: kind, entityId: id, metadata: { from: row.name, ...dto } });
    return repo.findOneByOrFail({ id });
  }

  async remove(actor: AuthUser, kind: Kind, id: number) {
    const all = await this.list(kind);
    const row = all.find((r) => r.id === id);
    if (!row) throw new NotFoundException(`Không tìm thấy ${LABEL[kind].toLowerCase()}`);
    if (row.usage > 0) {
      throw new BadRequestException(
        `${LABEL[kind]} đang được dùng ${row.usage} lần, không thể xóa.${kind === 'category' ? ' Bạn có thể ẩn ngành nghề này.' : ''}`,
      );
    }
    await this.repo(kind).delete(id);
    await this.audit.log({ actorId: actor.id, action: `${kind.toUpperCase()}_DELETE`, entityType: kind, entityId: id, metadata: { name: row.name } });
  }

  private repo(kind: Kind): Repository<Category | Skill | Location> {
    return (kind === 'category' ? this.categories : kind === 'skill' ? this.skills : this.locations) as Repository<Category | Skill | Location>;
  }
}
