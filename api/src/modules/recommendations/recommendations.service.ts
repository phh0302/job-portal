import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { In, MoreThanOrEqual, Repository } from 'typeorm';
import { JobStatus } from '../../common/enums';
import { todayVN } from '../../common/utils/date';
import { htmlToPlainText } from '../../common/utils/rich-text';
import { Application } from '../applications/entities/application.entity';
import { CandidatesService } from '../candidates/candidates.service';
import { CandidateProfile } from '../candidates/entities/candidate-profile.entity';
import { SavedJob } from '../engagement/entities/saved-job.entity';
import { Job } from '../jobs/entities/job.entity';
import { JobsService } from '../jobs/jobs.service';
import { AiExplainerService, AiInsights } from './ai-explainer.service';
import { CandidateFeatures, MatchScore, ruleReasons, scoreJob, tokenize } from './scoring';

/** Số tin mới nhất đem ra chấm điểm (đủ cho quy mô vừa; lớn hơn nên lọc trước bằng SQL) */
const POOL_SIZE = 500;
const MIN_SCORE = 25;
const AI_TOP_N = 8;

const salaryText = (j: Job) => {
  if (j.salaryNegotiable || (j.salaryMin === null && j.salaryMax === null)) return 'Thỏa thuận';
  const m = (v: string | null) => (v === null ? null : Math.round(Number(v) / 100_000) / 10);
  const [a, b] = [m(j.salaryMin), m(j.salaryMax)];
  return a !== null && b !== null ? `${a}-${b} triệu` : a !== null ? `từ ${a} triệu` : `đến ${b} triệu`;
};

@Injectable()
export class RecommendationsService {
  constructor(
    private readonly candidates: CandidatesService,
    private readonly jobsService: JobsService,
    private readonly ai: AiExplainerService,
    @InjectRepository(Job) private readonly jobs: Repository<Job>,
    @InjectRepository(CandidateProfile) private readonly profiles: Repository<CandidateProfile>,
    @InjectRepository(Application) private readonly apps: Repository<Application>,
    @InjectRepository(SavedJob) private readonly saved: Repository<SavedJob>,
  ) {}

  /** Danh sách việc làm gợi ý (thuật toán chấm điểm, nhanh, không tốn phí) */
  async recommend(userId: number, limit = 20) {
    const { profile, features, appliedIds, savedIds } = await this.loadCandidate(userId);
    const ranked = await this.rank(features, appliedIds);
    const top = ranked.slice(0, limit);

    return {
      aiEnabled: this.ai.enabled,
      profileTips: this.profileTips(profile),
      items: top.map(({ job, score }) => {
        const names = (ids: number[]) => (job.skills ?? []).filter((s) => ids.includes(s.id)).map((s) => s.name);
        const matchedSkills = names(score.matchedSkillIds);
        return {
          job: this.jobsService.toCard(job),
          score: score.total,
          breakdown: score.breakdown,
          matchedSkills,
          missingSkills: names(score.missingSkillIds),
          saved: savedIds.has(job.id),
          reasons: ruleReasons(score, {
            matchedSkillNames: matchedSkills,
            sameLocation: !!profile.locationId && profile.locationId === job.locationId,
            remote: job.jobType === 'REMOTE',
            salaryOk: score.breakdown.salary >= 10,
            expOk: score.breakdown.experience >= 10,
            categoryHit: features.categoryAffinity.size > 0 && score.breakdown.category >= 7.5,
          }),
        };
      }),
    };
  }

  /** Nhận xét & lý do do AI viết cho các việc đứng đầu (gọi riêng vì chậm hơn) */
  async insights(userId: number): Promise<{ enabled: boolean } & Partial<AiInsights>> {
    if (!this.ai.enabled) return { enabled: false };
    const { profile, features, appliedIds } = await this.loadCandidate(userId);
    const top = (await this.rank(features, appliedIds)).slice(0, AI_TOP_N);
    if (!top.length) return { enabled: true, summary: '', items: [] };

    const skillName = (job: Job, ids: number[]) => (job.skills ?? []).filter((s) => ids.includes(s.id)).map((s) => s.name);
    const result = await this.ai.explain(
      {
        headline: profile.headline,
        summary: profile.summary?.slice(0, 600) ?? null,
        yearsOfExperience: profile.yearsOfExperience,
        skills: (profile.skills ?? []).map((s) => s.name),
        location: profile.location?.name ?? null,
        expectedSalaryMillion: profile.expectedSalary === null ? null : Number(profile.expectedSalary) / 1_000_000,
      },
      top.map(({ job, score }) => ({
        jobId: job.id,
        title: job.title,
        company: job.company.name,
        location: job.location?.name ?? null,
        salary: salaryText(job),
        experienceYears: job.experienceYears,
        skills: (job.skills ?? []).map((s) => s.name),
        matchedSkills: skillName(job, score.matchedSkillIds),
        missingSkills: skillName(job, score.missingSkillIds),
        score: score.total,
        description: htmlToPlainText(job.description).slice(0, 400),
      })),
    );
    return result ? { enabled: true, ...result } : { enabled: true, summary: '', items: [] };
  }

  // ===== Nội bộ =====

  private async loadCandidate(userId: number) {
    const { id } = await this.candidates.getProfileByUser(userId);
    const profile = await this.profiles.findOneOrFail({ where: { id }, relations: { skills: true, location: true } });

    const [applied, saved] = await Promise.all([
      this.apps.find({ where: { candidateId: id }, select: { jobId: true } }),
      this.saved.find({ where: { userId }, select: { jobId: true } }),
    ]);
    const appliedIds = new Set(applied.map((a) => a.jobId));
    const savedIds = new Set(saved.map((s) => s.jobId));

    // Ngành nghề quan tâm: từ việc đã ứng tuyển (trọng số 2) và đã lưu (1)
    const affinity = new Map<number, number>();
    const historyIds = [...new Set([...appliedIds, ...savedIds])];
    if (historyIds.length) {
      const hist = await this.jobs.find({ where: { id: In(historyIds) }, relations: { categories: true }, select: { id: true, categories: { id: true } } });
      for (const j of hist) {
        const w = appliedIds.has(j.id) ? 2 : 1;
        for (const c of j.categories ?? []) affinity.set(c.id, (affinity.get(c.id) ?? 0) + w);
      }
    }

    const features: CandidateFeatures = {
      skillIds: new Set((profile.skills ?? []).map((s) => s.id)),
      headlineTokens: tokenize(profile.headline),
      locationId: profile.locationId,
      yearsOfExperience: profile.yearsOfExperience,
      expectedSalary: profile.expectedSalary === null ? null : Number(profile.expectedSalary),
      categoryAffinity: affinity,
    };
    return { profile, features, appliedIds, savedIds };
  }

  private async rank(features: CandidateFeatures, excludeIds: Set<number>): Promise<{ job: Job; score: MatchScore }[]> {
    const pool = await this.jobs.find({
      where: { status: JobStatus.APPROVED, deadline: MoreThanOrEqual(todayVN()) },
      relations: { company: true, location: true, skills: true, categories: true },
      order: { publishedAt: 'DESC', id: 'DESC' },
      take: POOL_SIZE,
    });
    return pool
      .filter((j) => !excludeIds.has(j.id))
      .map((job) => ({
        job,
        score: scoreJob(features, {
          id: job.id,
          title: job.title,
          skillIds: (job.skills ?? []).map((s) => s.id),
          categoryIds: (job.categories ?? []).map((c) => c.id),
          locationId: job.locationId,
          jobType: job.jobType,
          experienceYears: job.experienceYears,
          salaryMin: job.salaryMin === null ? null : Number(job.salaryMin),
          salaryMax: job.salaryMax === null ? null : Number(job.salaryMax),
          salaryNegotiable: job.salaryNegotiable,
        }),
      }))
      .filter((r) => r.score.total >= MIN_SCORE)
      .sort((a, b) => b.score.total - a.score.total || (b.job.publishedAt?.getTime() ?? 0) - (a.job.publishedAt?.getTime() ?? 0));
  }

  /** Gợi ý hoàn thiện hồ sơ để đề xuất chính xác hơn */
  private profileTips(p: CandidateProfile): string[] {
    const tips: string[] = [];
    if (!(p.skills ?? []).length) tips.push('Thêm kỹ năng vào hồ sơ — đây là yếu tố quan trọng nhất khi chấm độ phù hợp.');
    if (!p.headline) tips.push('Thêm tiêu đề nghề nghiệp (vd: "Lập trình viên Frontend") để khớp chức danh.');
    if (!p.locationId) tips.push('Chọn tỉnh/thành bạn muốn làm việc.');
    if (p.expectedSalary === null) tips.push('Nhập mức lương mong muốn để lọc việc phù hợp thu nhập.');
    return tips;
  }
}
