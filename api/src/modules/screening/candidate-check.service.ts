import { ForbiddenException, HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { createHash } from 'crypto';
import { MoreThan, Repository } from 'typeorm';
import { JobStatus } from '../../common/enums';
import { todayVN } from '../../common/utils/date';
import { CandidateProfile } from '../candidates/entities/candidate-profile.entity';
import { Resume } from '../candidates/entities/resume.entity';
import { SettingsService } from '../content/settings.service';
import { Job } from '../jobs/entities/job.entity';
import { StorageService } from '../storage/storage.service';
import { readCv, toCandidateBrief, toJobBrief } from './briefs';
import { cvPlainText } from './screening.engine';
import { AiCandidateChecker, CandidateCheckResult, rulesCandidateCheck } from './candidate-check.engine';
import { CvJobCheck } from './entities/cv-job-check.entity';

/** Kết quả trong vòng 24h cho cùng (tin, CV) và hồ sơ chưa đổi → trả lại, không tốn lượt */
/** Tăng khi đổi cách chấm/đọc CV để không trả lại kết quả cũ từ cache */
const ENGINE_VERSION = 2;
const CACHE_MS = 24 * 3600_000;

/**
 * Ứng viên tự kiểm tra CV với JD: % tương thích + điểm cần cải thiện.
 * Kết quả RIÊNG TƯ của ứng viên – nhà tuyển dụng không xem được.
 */
@Injectable()
export class CandidateCheckService {
  private readonly logger = new Logger(CandidateCheckService.name);

  constructor(
    @InjectRepository(CvJobCheck) private readonly checks: Repository<CvJobCheck>,
    @InjectRepository(CandidateProfile) private readonly candidates: Repository<CandidateProfile>,
    @InjectRepository(Resume) private readonly resumes: Repository<Resume>,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    private readonly settings: SettingsService,
    private readonly storage: StorageService,
    private readonly ai: AiCandidateChecker,
  ) {}

  private async profile(userId: number) {
    const p = await this.candidates.findOne({ where: { userId }, relations: { skills: true, experiences: true, educations: true } });
    if (!p) throw new NotFoundException('Không tìm thấy hồ sơ ứng viên');
    return p;
  }

  async quota(userId: number) {
    const p = await this.candidates.findOne({ where: { userId }, select: { id: true } });
    const limit = await this.settings.get('aiCvCheckPerDay');
    if (!p) return { used: 0, limit, remaining: limit, aiEnabled: this.ai.enabled };
    const [row] = (await this.checks.query(
      `SELECT COUNT(*) AS cnt FROM cv_job_checks WHERE candidate_id = @0 AND created_at >= CAST(CAST(GETDATE() AS date) AS datetime2)`,
      [p.id],
    )) as { cnt: number }[];
    const used = Number(row?.cnt ?? 0);
    return { used, limit, remaining: Math.max(0, limit - used), aiEnabled: this.ai.enabled };
  }

  /** Lần kiểm tra gần nhất của ứng viên với tin này (để hiện lại khi mở trang) */
  async latest(userId: number, jobId: number) {
    const p = await this.candidates.findOne({ where: { userId }, select: { id: true } });
    if (!p) return null;
    const c = await this.checks.findOne({ where: { candidateId: p.id, jobId }, order: { id: 'DESC' } });
    return c ? this.view(c) : null;
  }

  async check(userId: number, jobId: number, resumeId: number | undefined) {
    const p = await this.profile(userId);
    const job = await this.jobs.findOne({ where: { id: jobId }, relations: { skills: true, categories: true } });
    if (!job || job.status !== JobStatus.APPROVED || job.deadline < todayVN()) throw new NotFoundException('Tin tuyển dụng không tồn tại hoặc đã hết hạn');

    let resume: Resume | null = null;
    if (resumeId) {
      resume = await this.resumes.findOneBy({ id: resumeId, candidateId: p.id });
      if (!resume) throw new NotFoundException('Không tìm thấy CV');
    }

    const jobBrief = toJobBrief(job);
    const cand = toCandidateBrief(p);
    const inputHash = createHash('sha256')
      .update(JSON.stringify([ENGINE_VERSION, jobBrief, cand, resume ? [resume.id, resume.fileUrl] : null, this.ai.enabled && this.ai.model]))
      .digest('hex');
    // Cùng JD + hồ sơ + CV trong 24h → dùng lại kết quả, không tốn lượt
    const recent = await this.checks.findOne({
      where: { candidateId: p.id, inputHash, createdAt: MoreThan(new Date(Date.now() - CACHE_MS)) },
      order: { id: 'DESC' },
    });
    if (recent) return { ...this.view(recent), cached: true };
    const q = await this.quota(userId);
    if (!q.limit) throw new ForbiddenException('Tính năng kiểm tra CV bằng AI đang tắt');
    if (!q.remaining) throw new HttpException(`Bạn đã dùng hết ${q.limit} lượt kiểm tra hôm nay, hãy quay lại vào ngày mai nhé`, HttpStatus.TOO_MANY_REQUESTS);

    const cv = await readCv(this.storage, resume?.fileUrl);

    let result: CandidateCheckResult | null = null;
    if (this.ai.enabled) {
      try {
        result = await this.ai.check(jobBrief, cand, cv);
      } catch (err) {
        this.logger.warn(`AI kiểm tra CV lỗi, dùng so khớp từ khoá: ${(err as Error).message}`);
      }
    }
    result ??= rulesCandidateCheck(jobBrief, cand, cvPlainText(cv));
    if (resume && cv.kind === 'none') result.cvReadable = false;

    const saved = await this.checks.save(this.checks.create({ candidateId: p.id, jobId, resumeId: resume?.id ?? null, inputHash, score: result.matchPercent, result }));
    return { ...this.view(saved), cached: false };
  }

  private view(c: CvJobCheck) {
    return { id: c.id, jobId: c.jobId, resumeId: c.resumeId, createdAt: c.createdAt, ...c.result };
  }
}
