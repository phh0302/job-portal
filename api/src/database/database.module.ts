import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { TimezoneCheck } from './timezone-check';
import { buildTypeOrmOptions } from './typeorm.config';

@Module({
  imports: [
    TypeOrmModule.forRootAsync({
      useFactory: () => ({
        ...buildTypeOrmOptions(),
        autoLoadEntities: true,
      }),
    }),
  ],
  providers: [TimezoneCheck],
})
export class DatabaseModule {}
