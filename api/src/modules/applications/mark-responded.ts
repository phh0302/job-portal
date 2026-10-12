import { Repository } from 'typeorm';
import { Application } from './entities/application.entity';

/** Ghi nhận lần phản hồi đầu tiên của NTD cho đơn (không ghi đè nếu đã có) */
export async function markResponded(apps: Repository<Application>, applicationId: number) {
  await apps
    .createQueryBuilder()
    .update(Application)
    .set({ respondedAt: () => 'GETDATE()' })
    .where('id = :id AND responded_at IS NULL', { id: applicationId })
    .execute();
}
