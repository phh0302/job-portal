import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { CatalogController } from './catalog.controller';
import { Category } from './entities/category.entity';
import { Location } from './entities/location.entity';
import { Skill } from './entities/skill.entity';

@Module({
  imports: [TypeOrmModule.forFeature([Category, Location, Skill])],
  controllers: [CatalogController],
})
export class CatalogModule {}
