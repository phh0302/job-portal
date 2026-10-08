import { Global, Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { Company } from '../companies/entities/company.entity';
import { Job } from '../jobs/entities/job.entity';
import { ContentController } from './content.controller';
import { SitemapController } from './sitemap.controller';
import { Setting } from './entities/setting.entity';
import { StaticPage } from './entities/static-page.entity';
import { PagesService } from './pages.service';
import { SettingsService } from './settings.service';

@Global()
@Module({
  imports: [TypeOrmModule.forFeature([StaticPage, Setting, Job, Company])],
  controllers: [ContentController, SitemapController],
  providers: [PagesService, SettingsService],
  exports: [PagesService, SettingsService],
})
export class ContentModule {}
