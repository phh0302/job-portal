import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { paginate } from '../../common/dto/pagination.dto';
import { AuditLog } from './entities/audit-log.entity';

export interface AuditEntry {
  actorId: number;
  action: string;
  entityType: string;
  entityId?: string | number | null;
  metadata?: Record<string, unknown> | null;
  ip?: string | null;
}

/** Ghi lịch sử thao tác của admin (không bao giờ làm hỏng thao tác chính nếu ghi lỗi) */
@Injectable()
export class AuditService {
  private readonly logger = new Logger(AuditService.name);

  constructor(@InjectRepository(AuditLog) private readonly repo: Repository<AuditLog>) {}

  async log(e: AuditEntry) {
    try {
      await this.repo.insert({
        actorId: e.actorId,
        action: e.action,
        entityType: e.entityType,
        entityId: e.entityId == null ? null : String(e.entityId),
        metadata: e.metadata ? JSON.stringify(e.metadata).slice(0, 8000) : null,
        ipAddress: e.ip?.slice(0, 45) ?? null,
      });
    } catch (err) {
      this.logger.error(`Không ghi được audit log: ${(err as Error).message}`);
    }
  }

  async list(q: { page: number; limit: number; action?: string; entityType?: string; actorId?: number }) {
    const qb = this.repo
      .createQueryBuilder('l')
      .leftJoin('l.actor', 'u')
      .addSelect(['u.id', 'u.email'])
      .orderBy('l.created_at', 'DESC')
      .addOrderBy('l.id', 'DESC');
    if (q.action) qb.andWhere('l.action = :action', { action: q.action });
    if (q.entityType) qb.andWhere('l.entity_type = :et', { et: q.entityType });
    if (q.actorId) qb.andWhere('l.actor_id = :aid', { aid: q.actorId });
    const [rows, total] = await qb.offset((q.page - 1) * q.limit).limit(q.limit).getManyAndCount();
    return paginate(
      rows.map((r) => ({
        id: r.id,
        action: r.action,
        entityType: r.entityType,
        entityId: r.entityId,
        metadata: r.metadata ? safeParse(r.metadata) : null,
        ipAddress: r.ipAddress,
        createdAt: r.createdAt,
        actor: r.actor ? { id: r.actor.id, email: r.actor.email } : null,
      })),
      total,
      q.page,
      q.limit,
    );
  }

  async actions() {
    const rows: { action: string }[] = await this.repo.createQueryBuilder('l').select('DISTINCT l.action', 'action').getRawMany();
    return rows.map((r) => r.action).sort();
  }
}

function safeParse(s: string) {
  try {
    return JSON.parse(s);
  } catch {
    return s;
  }
}
