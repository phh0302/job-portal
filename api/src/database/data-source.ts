import 'reflect-metadata';
import 'dotenv/config';
import { DataSource } from 'typeorm';
import { buildTypeOrmOptions } from './typeorm.config';

/** DataSource cho TypeORM CLI: npm run migration:run */
export default new DataSource(buildTypeOrmOptions());
