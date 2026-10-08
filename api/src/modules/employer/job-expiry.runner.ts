import { Injectable, Logger, OnApplicationBootstrap, OnModuleDestroy } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { LessThan, Repository } from 'typeorm';
import { JobStatus } from '../../common/enums';
import { todayVN } from '../../common/utils/date';
import { Job } from '../jobs/entities/job.entity';

/** Định kỳ chuyển tin APPROVED đã quá hạn nộp sang EXPIRED */
@Injectable()
export class JobExpiryRunner implements OnApplicationBootstrap, OnModuleDestroy {
  private readonly logger = new Logger(JobExpiryRunner.name);
  private timer?: NodeJS.Timeout;

  constructor(@InjectRepository(Job) private readonly jobs: Repository<Job>) {}

  onApplicationBootstrap() {
    if (process.env.NODE_ENV === 'test') return;
    setTimeout(() => void this.run(), 10_000);
    this.timer = setInterval(() => void this.run(), 60 * 60 * 1000); // mỗi giờ
  }

  onModuleDestroy() {
    if (this.timer) clearInterval(this.timer);
  }

  async run() {
    try {
      const res = await this.jobs.update(
        { status: JobStatus.APPROVED, deadline: LessThan(todayVN()) },
        { status: JobStatus.EXPIRED },
      );
      if (res.affected) this.logger.log(`Đã chuyển ${res.affected} tin sang hết hạn`);
    } catch (err) {
      this.logger.error(`Lỗi cập nhật tin hết hạn: ${(err as Error).message}`);
    }
  }
}
