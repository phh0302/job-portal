import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Public } from '../../common/decorators/public.decorator';
import { Category } from './entities/category.entity';
import { Location } from './entities/location.entity';
import { Skill } from './entities/skill.entity';

/** Danh mục dùng cho bộ lọc và form */
@ApiTags('catalog')
@Public()
@Controller('catalog')
export class CatalogController {
  constructor(
    @InjectRepository(Category) private readonly categories: Repository<Category>,
    @InjectRepository(Location) private readonly locations: Repository<Location>,
    @InjectRepository(Skill) private readonly skills: Repository<Skill>,
  ) {}

  @Get('categories')
  getCategories() {
    return this.categories.find({
      where: { isActive: true },
      select: { id: true, name: true, slug: true, icon: true },
      order: { name: 'ASC' },
    });
  }

  @Get('locations')
  getLocations() {
    return this.locations.find({ select: { id: true, name: true, slug: true }, order: { sortOrder: 'ASC' } });
  }

  @Get('skills')
  getSkills() {
    return this.skills.find({ select: { id: true, name: true, slug: true }, order: { name: 'ASC' } });
  }
}
