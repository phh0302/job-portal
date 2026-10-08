import { Controller, Get, Param } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { PagesService } from './pages.service';
import { SettingsService } from './settings.service';

@ApiTags('content')
@Public()
@Controller()
export class ContentController {
  constructor(
    private readonly pages: PagesService,
    private readonly settings: SettingsService,
  ) {}

  @Get('pages')
  list() {
    return this.pages.publicList();
  }

  @Get('pages/:slug')
  page(@Param('slug') slug: string) {
    return this.pages.publicPage(slug);
  }

  @Get('settings/public')
  publicSettings() {
    return this.settings.publicSettings();
  }
}
