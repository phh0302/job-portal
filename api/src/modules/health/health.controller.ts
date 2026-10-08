import { Controller, Get } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { Public } from '../../common/decorators/public.decorator';
import { DataSource } from 'typeorm';

@ApiTags('health')
@Public()
@Controller('health')
export class HealthController {
  constructor(private readonly dataSource: DataSource) {}

  @Get()
  async check() {
    let db = 'down';
    try {
      await this.dataSource.query('SELECT 1');
      db = 'up';
    } catch {
      db = 'down';
    }
    return { status: 'ok', db, time: new Date().toISOString() };
  }
}
