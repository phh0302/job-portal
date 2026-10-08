import { DataSourceOptions } from 'typeorm';
import configuration from '../config/configuration';

/** Cấu hình TypeORM dùng chung cho Nest app và TypeORM CLI (migration). */
export function buildTypeOrmOptions(): DataSourceOptions {
  const { db } = configuration();
  return {
    type: 'mssql',
    host: db.host,
    port: db.instanceName ? undefined : db.port,
    username: db.username,
    password: db.password,
    database: db.database,
    synchronize: db.synchronize,
    logging: db.logging,
    entities: [__dirname + '/../**/*.entity{.ts,.js}'],
    migrations: [__dirname + '/migrations/*{.ts,.js}'],
    options: {
      encrypt: db.encrypt,
      trustServerCertificate: db.trustServerCertificate,
      instanceName: db.instanceName,
    },
  };
}
