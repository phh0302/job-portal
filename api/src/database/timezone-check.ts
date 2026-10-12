import { Injectable, Logger, OnApplicationBootstrap } from '@nestjs/common';
import { DataSource } from 'typeorm';

/**
 * Kiểm tra Node và SQL Server cùng múi giờ (bắt buộc vì useUTC=false).
 * Lệch → thời gian hiển thị / hết hạn token / thống kê theo ngày sẽ sai.
 */
@Injectable()
export class TimezoneCheck implements OnApplicationBootstrap {
  private readonly logger = new Logger('Timezone');

  constructor(private readonly ds: DataSource) {}

  async onApplicationBootstrap() {
    try {
      const [row] = (await this.ds.query('SELECT DATEDIFF(minute, GETUTCDATE(), GETDATE()) AS off')) as { off: number }[];
      const dbOffset = Number(row?.off ?? 0);
      const nodeOffset = -new Date().getTimezoneOffset();
      if (Math.abs(dbOffset - nodeOffset) > 1) {
        this.logger.warn(
          `Múi giờ lệch: SQL Server UTC${fmt(dbOffset)}, Node UTC${fmt(nodeOffset)}. ` +
            'Hãy đặt cùng múi giờ (biến môi trường TZ cho Node, hoặc múi giờ máy chủ SQL).',
        );
      } else {
        this.logger.log(`Node và SQL Server cùng múi giờ UTC${fmt(dbOffset)}`);
      }
    } catch (err) {
      this.logger.warn(`Không kiểm tra được múi giờ: ${(err as Error).message}`);
    }
  }
}

function fmt(min: number) {
  const sign = min >= 0 ? '+' : '-';
  const a = Math.abs(min);
  return `${sign}${Math.floor(a / 60)}${a % 60 ? `:${String(a % 60).padStart(2, '0')}` : ''}`;
}
