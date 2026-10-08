import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
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
})
export class DatabaseModule {}
