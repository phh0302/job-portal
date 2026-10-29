import { BadRequestException, ForbiddenException, HttpException, HttpStatus, Injectable, Logger, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { ApplicationStatus } from '../../common/enums';
import { Application } from '../applications/entities/application.entity';
import { CandidateProfile } from '../candidates/entities/candidate-profile.entity';
import { EmployerProfile } from '../companies/entities/employer-profile.entity';
import { SettingsService } from '../content/settings.service';
import { Job } from '../jobs/entities/job.entity';
import { StorageService } from '../storage/storage.service';
import { CvScreening } from './entities/cv-screening.entity';
import { readCv, toCandidateBrief, toJobBrief } from './briefs';
import { AiCvScreener, ScreeningResult, cvPlainText, rulesScreen } from './screening.engine';

const BATCH_MAX = 5;

/**
 * AI sàng lọc CV: so sánh CV + hồ sơ ứng viên với yêu cầu tin, trả về điểm, kết luận,
 * bảng đối chiếu yêu cầu, điểm mạnh / còn thiếu và câu hỏi phỏng vấn gợi ý.
 * Chỉ hỗ trợ tham khảo – quyết định thuộc về nhà tuyển dụng.
 */
@Injectable()
export class ScreeningService {
  private readonly logger = new Logger(ScreeningService.name);

  constructor(
    @InjectRepository(CvScreening) private readonly screenings: Repository<CvScreening>,
    @InjectRepository(Application) private readonly apps: Repository<Application>,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(CandidateProfile) private readonly candidates: Repository<CandidateProfile>,
    @InjectRepository(EmployerProfile) private readonly employers: Repository<EmployerProfile>,
    private readonly settings: SettingsService,
    private readonly storage: StorageService,
    private readonly ai: AiCvScreener,
  ) {}

  private async companyId(userId: number) {
    const p = await this.employers.findOneBy({ userId });
    if (!p?.companyId) throw new ForbiddenException('Bạn cần tạo hồ sơ công ty trước');
    return p.companyId;
  }

  async quota(userId: number) {
    const companyId = await this.companyId(userId);
    const limit = await this.settings.get('aiScreeningPerDay');
    const [row] = (await this.screenings.query(
      `SELECT COUNT(*) AS cnt FROM cv_screenings WHERE company_id = @0 AND created_at >= CAST(CAST(GETDATE() AS date) AS datetime2)`,
      [companyId],
    )) as { cnt: number }[];
    const used = Number(row?.cnt ?? 0);
    return { used, limit, remaining: Math.max(0, limit - used), aiEnabled: this.ai.enabled };
  }

  async latest(userId: number, applicationId: number) {
    await this.ownApp(userId, applicationId);
    const s = await this.screenings.findOne({ where: { applicationId }, order: { id: 'DESC' } });
    return s ? this.view(s) : null;
  }

  /** Điểm mới nhất của nhiều đơn (cho danh sách) */
  async latestMap(applicationIds: number[]) {
    const map = new Map<number, { score: number; verdict: string }>();
    if (!applicationIds.length) return map;
    const rows: { application_id: number; score: number; verdict: string }[] = await this.screenings
      .createQueryBuilder('s')
      .select(['s.application_id AS application_id', 's.score AS score', 's.verdict AS verdict'])
      .where((qb) => `s.id IN ${qb.subQuery().select('MAX(x.id)').from(CvScreening, 'x').where('x.application_id IN (:...ids)').groupBy('x.application_id').getQuery()}`)
      .setParameter('ids', applicationIds)
      .getRawMany();
    for (const r of rows) map.set(Number(r.application_id), { score: Number(r.score), verdict: r.verdict });
    return map;
  }

  async screen(userId: number, applicationId: number) {
    const a = await this.ownApp(userId, applicationId);
    if (a.status === ApplicationStatus.WITHDRAWN) throw new BadRequestException('Ứng viên đã rút đơn');
    await this.ensureQuota(userId, 1);
    return this.view(await this.run(userId, a));
  }

  /** Chấm các đơn chưa chấm của 1 tin (tối đa BATCH_MAX đơn / lần, trong hạn mức) */
  async screenNew(userId: number, jobId: number) {
    const companyId = await this.companyId(userId);
    const job = await this.jobs.findOneBy({ id: jobId, companyId });
    if (!job) throw new NotFoundException('Không tìm thấy tin tuyển dụng');
    const q = await this.quota(userId);
    if (!q.remaining) throw new HttpException('Đã hết lượt AI chấm CV hôm nay, vui lòng thử lại vào ngày mai', HttpStatus.TOO_MANY_REQUESTS);

    const pending = await this.apps
      .createQueryBuilder('a')
      .innerJoinAndSelect('a.job', 'j')
      .where('a.job_id = :jobId', { jobId })
      .andWhere('a.status NOT IN (:...st)', { st: [ApplicationStatus.WITHDRAWN, ApplicationStatus.REJECTED] })
      .andWhere('NOT EXISTS (SELECT 1 FROM cv_screenings s WHERE s.application_id = a.id)')
      .orderBy('a.created_at', 'ASC')
      .limit(Math.min(BATCH_MAX, q.remaining))
      .getMany();

    let done = 0;
    for (const a of pending) {
      try {
        await this.run(userId, a);
        done++;
      } catch (err) {
        this.logger.warn(`Không chấm được đơn #${a.id}: ${(err as Error).message}`);
      }
    }
    const left = await this.apps
      .createQueryBuilder('a')
      .where('a.job_id = :jobId', { jobId })
      .andWhere('a.status NOT IN (:...st)', { st: [ApplicationStatus.WITHDRAWN, ApplicationStatus.REJECTED] })
      .andWhere('NOT EXISTS (SELECT 1 FROM cv_screenings s WHERE s.application_id = a.id)')
      .getCount();
    return { screened: done, remainingUnscreened: left, quota: await this.quota(userId) };
  }

  // ------------------------------------------------------------------

  private async ensureQuota(userId: number, need: number) {
    const q = await this.quota(userId);
    if (!q.limit) throw new ForbiddenException('Tính năng AI chấm CV đang tắt');
    if (q.remaining < need) throw new HttpException('Đã hết lượt AI chấm CV hôm nay, vui lòng thử lại vào ngày mai', HttpStatus.TOO_MANY_REQUESTS);
  }

  private async ownApp(userId: number, id: number) {
    const companyId = await this.companyId(userId);
    const a = await this.apps.findOne({ where: { id }, relations: { job: true } });
    if (!a || a.job.companyId !== companyId) throw new NotFoundException('Không tìm thấy đơn ứng tuyển');
    return a;
  }

  private async run(userId: number, a: Application): Promise<CvScreening> {
    const [job, c] = await Promise.all([
      this.jobs.findOneOrFail({ where: { id: a.jobId }, relations: { skills: true, categories: true } }),
      this.candidates.findOneOrFail({ where: { id: a.candidateId }, relations: { skills: true, experiences: true, educations: true } }),
    ]);
    const jobBrief = toJobBrief(job);
    const cand = toCandidateBrief(c, a.coverLetter);
    const cv = await readCv(this.storage, a.resumeFileUrl);
    const cvText = cvPlainText(cv);

    let result: ScreeningResult | null = null;
    if (this.ai.enabled) {
      try {
        result = await this.ai.screen(jobBrief, cand, cv);
      } catch (err) {
        this.logger.warn(`AI chấm CV lỗi, dùng so khớp từ khoá: ${(err as Error).message}`);
      }
    }
    result ??= rulesScreen(jobBrief, cand, cvText);

    return this.screenings.save(
      this.screenings.create({
        applicationId: a.id,
        companyId: a.job.companyId,
        createdById: userId,
        score: result.score,
        verdict: result.verdict,
        summary: result.summary || '—',
        requirements: result.requirements,
        strengths: result.strengths,
        gaps: result.gaps,
        interviewQuestions: result.interviewQuestions,
        source: result.source,
        cvReadable: result.cvReadable,
        model: result.model,
      }),
    );
  }

  private view(s: CvScreening) {
    return {
      id: s.id,
      applicationId: s.applicationId,
      score: s.score,
      verdict: s.verdict,
      summary: s.summary,
      requirements: s.requirements,
      strengths: s.strengths,
      gaps: s.gaps,
      interviewQuestions: s.interviewQuestions,
      source: s.source,
      cvReadable: s.cvReadable,
      model: s.model,
      createdAt: s.createdAt,
    };
  }
}

