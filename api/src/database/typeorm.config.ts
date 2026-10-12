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
      /**
       * Mọi thời điểm lưu theo GIỜ MÁY CHỦ SQL Server:
       * created_at/updated_at do SQL Server tự điền bằng GETDATE() (giờ máy chủ), nên giá trị
       * do Node ghi (expires_at, published_at…) cũng phải theo giờ địa phương để cùng mốc.
       * Yêu cầu: Node và SQL Server cùng múi giờ (cùng máy Windows, hoặc cùng UTC trong Docker/Azure)
       * – khi khởi động API sẽ kiểm tra và cảnh báo nếu lệch.
       */
      useUTC: false,
      encrypt: db.encrypt,
      trustServerCertificate: db.trustServerCertificate,
      instanceName: db.instanceName,
    },
  };
}
